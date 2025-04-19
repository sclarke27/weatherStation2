const fs = require('fs');
const path = require('path');
const http = require('http');
const yf = require('yahoo-finance2').default;
const mime = require('mime-types');
const axios = require('axios');
const { createCanvas } = require('canvas');
const dayjs = require('dayjs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const WIDTH = 780;
const HEIGHT = 160;
const FONT = '10px sans-serif';
const STOCKS = ["AAPL", "AMZN", "DASH", "FSELX", "GOOGL", "NOW",  "NVDA", "RDDT"];
const COST_BASIS = {
    AAPL: 185.25,
    AMZN: 179.31,
    DASH: 111.56,
    FSELX: 23.29,
    GOOGL: 149.76,
    NOW: 750.00,
    NVDA: 102.45,
    RDDT: 48.08    
};
const PUBLIC_DIR = path.join(__dirname, 'public');
const STOCK_OUTPUT_PATH = path.join(PUBLIC_DIR, 'stock-data.json');
const WEATHER_OUTPUT_PATH = path.join(PUBLIC_DIR, 'weather-data.json');
const GRAPH_OUTPUT_PATH = path.join(PUBLIC_DIR, 'weather-graph.png');
const PORT = 8080;
const STOCK_INTERVAL = 15 * 60 * 1000; // 15 minutes
const WEATHER_INTERVAL = 1 * 30 * 1000; // 15 minutes

const cityList = [
    "Albuquerque, Nm",
    "Sandia Peak, Nm",
    "Roswell, Nm",
    "Los Angeles, Ca",
    "San Diego, Ca",
    "Crown Point, Ca",
    "Death Valley, Ca",
    "Honolulu, Hi",
    "Waimea Bay, Hi",
    "New York, Ny",
    "Seattle, Wa",
    "Chicago, Il",
    "Denver, Co",
    "Colorado Springs, Co",
    "Phoenix, Az",
    "Yuma, Az",
    "Anchorage, Ak",
    "Prudhoe Bay, Ak",
    "El Alto, Bolivia",
    "Paris, France",
    "Tokyo, Japan",
    "London, En",
    "Stockholm, Sweden",
    "Amsterdam, Netherlands",
    "Auckland, New Zealand",
    "Melbourne",
    "Teahupoʻo, Tahiti",
    "McMurdo Station",
    "North Pole",
    "South Pole"
]
let cityIndex = 0;

const fetchWeather = async () => {

    const cityName = cityList[cityIndex];
    cityIndex++;
    if(cityIndex >= cityList.length) {
        cityIndex = 0;
    }
    console.info(`fetch weather for ${cityName}`)
    
    const { lat, lon } = await geocodeCity(cityName);


    const API_URL = 'https://api.open-meteo.com/v1/forecast';
    // const LAT = 35.0844;
    // const LON = -106.6504;

    try {
        const res = await axios.get(API_URL, {
            params: {
                latitude: lat,
                longitude: lon,
                current_weather: true,
                daily: ["weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset", "precipitation_probability_max"],
                hourly: ["temperature_2m", "relative_humidity_2m", "precipitation_probability", "uv_index"],
                current: ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "precipitation", "rain", "weather_code", "wind_speed_10m", "wind_direction_10m", "showers"],
                temperature_unit: 'fahrenheit',
                windspeed_unit: 'mph',
                timezone: 'auto'
            }
        });

        const { current_weather, hourly, daily } = res.data;
        const json = {
            cityName: cityName,
            current: current_weather,
            temps: hourly.temperature_2m.slice(0, 24),
            times: hourly.time.slice(0, 24),
            precipitation: hourly.precipitation_probability.slice(0, 24),
            humidity: hourly.relative_humidity_2m.slice(0, 24),
            uvIndex: hourly.uv_index.slice(0, 24),
            min: daily.temperature_2m_min[0],
            max: daily.temperature_2m_max[0],
            sunrise: daily.sunrise[0],
            sunset: daily.sunset[0],
            precipProb: daily.precipitation_probability_max[0],
            elevation: res.data.elevation
        };


        fs.writeFileSync(WEATHER_OUTPUT_PATH, JSON.stringify(json, null, 2));
        console.log(`Weather data saved to ${WEATHER_OUTPUT_PATH}`);
        drawGraph();
    } catch (err) {
        console.info(err)
    }
}

async function fetchPrices() {
    const results = [];
    try {
        for (const symbol of STOCKS) {
            try {
                const quote = await yf.quote(symbol);
                const price = quote.regularMarketPrice;
                const cost = COST_BASIS[symbol];
                const delta = price - cost;
                const percent = (delta / cost) * 100;
                results.push({
                    symbol,
                    price: parseFloat(price.toFixed(2)),
                    delta: parseFloat(delta.toFixed(2)),
                    percent: parseFloat(percent.toFixed(2)),
                    cost
                });
            } catch (err) {
                results.push({
                    symbol,
                    price: null,
                    delta: null,
                    percent: null,
                    cost,
                    error: true
                });
            }
        }
        fs.writeFileSync(STOCK_OUTPUT_PATH, JSON.stringify(results, null, 2));
        console.log(`Wrote ${results.length} stock records to ${STOCK_OUTPUT_PATH}`);
    } catch (err) {
        console.info(err);
    }
}



const drawGraph = () => {
    const data = JSON.parse(fs.readFileSync(WEATHER_OUTPUT_PATH, 'utf8'));
    const { temps, precipitation, humidity, times } = data;

    const max = 110;
    const min = -10;
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    const x = 20, y = 20, width = 760, height = 120;
    const range = max - min || 1;
    const stepX = width / (temps.length - 1);
    const font = FONT;

    // Background
    // ctx.fillStyle = 'white';
    // ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Plot points
    const tempPoints = temps.map((t, i) => {
        const px = x + i * stepX;
        const py = y + height - ((t - min) / range) * height;
        return [px, py];
    });

    const precipitationPoints = precipitation.map((t, i) => {
        const px = x + i * stepX;
        const py = y + height - ((t - min) / range) * height;
        return [px, py];
    });

    const humidityPoints = humidity.map((t, i) => {
        const px = x + i * stepX;
        const py = y + height - ((t - min) / range) * height;
        return [px, py];
    });

    // Fill under curve
    ctx.beginPath();
    ctx.moveTo(tempPoints[0][0], y + height);
    tempPoints.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.lineTo(tempPoints[tempPoints.length - 1][0], y + height);
    ctx.closePath();
    ctx.fillStyle = 'yellow';
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(...tempPoints[0]);
    tempPoints.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...precipitationPoints[0]);
    precipitationPoints.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...humidityPoints[0]);
    humidityPoints.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Temp labels
    ctx.fillStyle = 'black';
    ctx.font = font;

    precipitationPoints.forEach(([px, py], i) => {
        ctx.fillText(`${precipitation[i]}%`, px - 10, py - 10);
    });

    humidityPoints.forEach(([px, py], i) => {
        ctx.fillText(`${humidity[i]}%`, px - 10, py - 10);
    });

    tempPoints.forEach(([px, py], i) => {
        ctx.fillText(`${Math.round(temps[i])}°`, px - 10, py - 10);
    });    

    // Time labels
    tempPoints.forEach(([px], i) => {
        const hour = dayjs(times[i]).format('hA');
        ctx.fillText(hour, px - 15, y + height + 20);
    });

    // Vertical current time line
    const now = dayjs();
    const dt_times = times.map(t => dayjs(t));
    for (let i = 0; i < dt_times.length - 1; i++) {
        if (now.isAfter(dt_times[i]) && now.isBefore(dt_times[i + 1])) {
            const ratio = now.diff(dt_times[i]) / dt_times[i + 1].diff(dt_times[i]);
            const px = tempPoints[i][0] + ratio * (tempPoints[i + 1][0] - tempPoints[i][0]);
            ctx.beginPath();
            ctx.moveTo(px, y);
            ctx.lineTo(px, y + height);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
        }
    }

    // Min/max labels
    // ctx.fillText(`${min.toFixed(0)}°`, x, y + height + 5);
    // ctx.fillText(`${max.toFixed(0)}°`, x + width - 40, y + height + 5);

    // Save to file
    const out = fs.createWriteStream(GRAPH_OUTPUT_PATH);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
        console.log(`Graph saved to ${GRAPH_OUTPUT_PATH}`)
        // setTimeout(() => {
        //     drawScreen();
        // }, 1000)
    });
}

async function drawScreen() {
    try {
        console.log("start draw screen")
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            headless: true,
            timeout: 0, // disables timeout (can take >10s on Pi Zero)
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process',
                '--disable-extensions',
                '--no-zygote',
                '--disable-software-rasterizer',
            ]
        });

        console.log('browser loaded');

        const page = await browser.newPage();

        console.log('browser new page created');
        // Set custom viewport size
        await page.setViewport({
            width: 800,
            height: 480,
        });

        console.log('browser start nav');
        await page.goto('http://127.0.0.1:8080/index.html');

        console.log('browser screenshot');
        // Screenshot only the viewport (not full page)
        await page.screenshot({
            path: 'images/background.png',
            fullPage: false, // only visible part, not entire scrollable area
        });

        console.log('browser close');
        await browser.close();

        const python = spawn('python3', ['update_screen.py', 'Node.js']);

        python.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        python.on('close', (code) => {
            console.log(`Python script exited with code ${code}`);
        });

        console.log('Saved screenshot');
    } catch (err) {
        console.log(err)
    }
    console.info('done.')
    setTimeout(() => {
        console.info("start fresh")
        fetchPrices();
    }, INTERVAL)
}

async function geocodeCity(cityName) {
    const url = 'https://nominatim.openstreetmap.org/search';
    const headers = {
        'User-Agent': 'epaper-dashboard/1.0 (your_email@example.com)'  // required
    };

    try {
        const response = await axios.get(url, {
            headers,
            params: {
                q: cityName,
                format: 'json',
                limit: 1
            },
            timeout: 5000
        });

        const result = response.data;
        if (result && result.length > 0) {
            const lat = parseFloat(result[0].lat);
            const lon = parseFloat(result[0].lon);
            return { lat, lon };
        } else {
            throw new Error('City not found');
        }
    } catch (err) {
        console.error(`Geocoding failed: ${err.message}`);
        return { lat: null, lon: null };
    }
}

// Schedule recurring price updates
fetchWeather();
fetchPrices();
setInterval(fetchPrices, STOCK_INTERVAL);
setInterval(fetchWeather, WEATHER_INTERVAL);

http.createServer((req, res) => {
    
    const hasParams = req.url.indexOf("?") >= 0;
    const urlLen = hasParams ? req.url.indexOf('?') : req.url.length;
    // console.info('req', req.url.indexOf("?"), urlLen);
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url.substring(0,urlLen));
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        res.writeHead(200, { 'Content-Type': mime.lookup(ext) || 'application/octet-stream' });
        res.end(content);
    });
}).listen(PORT);

console.log(`Server running at http://localhost:${PORT}/`);
