from waveshare_epd import epd7in3f
from PIL import Image, ImageDraw
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import sys
import os

# Check args
# if len(sys.argv) < 2:
#     print("Usage: python3 display_png.py path/to/image.png")
#     sys.exit(1)


print("Set up headless Chrome")
options = Options()
options.add_argument('--headless=new') 
driver = webdriver.Chrome(options=options)

driver.set_window_size(800, 480)

print("Load the page")
driver.get("https://www.google.com/")

print("Optional: wait for dynamic content to load")
driver.implicitly_wait(5)  # seconds

print("Save screenshot")
driver.save_screenshot("images/page.png")

print("Cleanup")
driver.quit()


# image_path = sys.argv[1]
# IMAGE_PATH = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'images')
# BACKGROUND_IMAGE_FILE = "background.png"
# # Init and clear
# epd = epd7in3f.EPD()
# epd.init()
# epd.Clear()

# # Load and convert image
# bg = Image.open(os.path.join(IMAGE_PATH, BACKGROUND_IMAGE_FILE))
# draw = ImageDraw.Draw(bg)

# # Optional: rotate if image is portrait
# # image_bw = image_bw.rotate(90, expand=True)

# # Display image
# epd.display(epd.getbuffer(bg))
# epd.sleep()
