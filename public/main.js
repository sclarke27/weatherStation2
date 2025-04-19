const getWeatherIconFile = (code) => {
    switch (true) {
        case [0].includes(code):
            return 'clear.png';
        case [1].includes(code):
            return 'mainly_clear.png';
        case [2].includes(code):
            return 'partly_cloudy.png';
        case [3].includes(code):
            return 'overcast.png';
        case [45, 48].includes(code):
            return 'cloudy.png';
        case [51, 56, 61, 66].includes(code):
            return 'light_rain.png';
        case [53, 63, 73].includes(code):
            return 'moderate_rain.png';
        case [55, 57, 65, 67].includes(code):
            return 'heavy_rain.png';
        case [95, 96, 99].includes(code):
            return 'storm.png';
        case [71, 77, 80, 85].includes(code):
            return 'light_snow.png';
        case [73, 81].includes(code):
            return 'moderate_snow.png';
        case [75, 82, 86].includes(code):
            return 'heavy_snow.png';
        default:
            return 'cloudy.png';
    }
}

const renderStockCard = (stockData, targetElement) => {
    const cardHtml = `<div class='stock-card'>
        <h4 class='${stockData.price > stockData.cost ? 'up' : 'down'}'>${stockData.symbol}</h4>
        <span>$${stockData.price}</span>
        <span>${stockData.delta > 0 ? '+' : ''}${stockData.percent}%</span>
        <span>${stockData.delta > 0 ? '+' : ''}${stockData.delta}</span>
    </div>`

    targetElement.innerHTML += cardHtml;
}

const updateWeatherData = (weatherData, graphImg, weatherIcon) => {
    const currentData = weatherData.current;
    const formatter = new Intl.DateTimeFormat('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.querySelector('.city-name').innerHTML = weatherData.cityName;
    document.querySelector('.temp').innerHTML = parseInt(currentData.temperature) + '&deg;F';
    document.querySelector('.wind-speed').innerHTML = currentData.windspeed + 'mph';
    document.querySelector('.sunrise-text').innerHTML = formatter.format(new Date(weatherData.sunrise));
    document.querySelector('.sunset-text').innerHTML = formatter.format(new Date(weatherData.sunset));
    document.querySelector('.low-temp-text').innerHTML = weatherData.min + '&deg;F';
    document.querySelector('.high-temp-text').innerHTML = weatherData.max + '&deg;F';
    document.querySelector('.compass-arrow').style.transform = `rotate(${currentData.winddirection}deg)`
    document.querySelector('.humidity').innerHTML = weatherData.humidity[0] + '%';
    document.querySelector('.percipitation').innerHTML = weatherData.precipProb + '%';
    document.querySelector('.elevation').innerHTML = (parseInt(weatherData.elevation * 3.3)) + 'ft';

    graphImg.src = `weather-graph.png?t=${Date.now()}`;
    weatherIcon.src = `images/${getWeatherIconFile(currentData.weathercode)}`;

}


const start = () => {

    const stocksRow = document.querySelector('.stock-cards');
    const graphImg = document.querySelector('.graph > img');
    const weatherIcon = document.querySelector('.weather-icon');

    // console.info('starting', {stocksRow});
    async function loadStockData() {
        stocksRow.innerHTML = "";

        try {
            const res = await fetch('stock-data.json');
            const data = await res.json();
            data.map(stockData => renderStockCard(stockData, stocksRow))
            // const lines = data.map(r => `${r.symbol.padEnd(6)} $${r.price?.toFixed(2) || 'ERROR'}   Δ ${r.delta?.toFixed(2) || 'N/A'} (${r.percent?.toFixed(2) || 'N/A'}%)`);
            // document.getElementById('output').textContent = lines.join('\n');
        } catch (err) {
            console.error(err);
            document.getElementById('output').textContent = 'Failed to load data.';
        }
    }

    async function loadWeatherData() {
        try {
            const res = await fetch('weather-data.json');
            const data = await res.json();
            // console.info(data);
            updateWeatherData(data, graphImg, weatherIcon);
    
            // data.map(stockData => renderStockCard(stockData, stocksRow))
            // const lines = data.map(r => `${r.symbol.padEnd(6)} $${r.price?.toFixed(2) || 'ERROR'}   Δ ${r.delta?.toFixed(2) || 'N/A'} (${r.percent?.toFixed(2) || 'N/A'}%)`);
            // document.getElementById('output').textContent = lines.join('\n');
        } catch (err) {
            console.error(err);
            document.getElementById('output').textContent = 'Failed to load data.';
        }
    }

    loadWeatherData();
    loadStockData();
    setInterval(() => {
        loadWeatherData();
    }, 1 * 1000)
    setInterval(() => {
        loadStockData();
    }, 10* 60 * 1000)

}