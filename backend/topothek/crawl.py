import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import urljoin
from urllib.parse import urlparse
from urllib.parse import unquote
from swak.funcflow import Pipe, Map
from tenacity import retry, retry_if_result, wait_fixed, stop_after_attempt

def get_driver():
    """Set up google chrome driver for Selenium"""
    options = Options()
    options.headless = False  # Set to True if you want headless mode
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def base_url(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

is_empty_list = lambda result: isinstance(result, list) and len(result) == 0

@retry(retry=retry_if_result(is_empty_list), wait=wait_fixed(2),stop=stop_after_attempt(5))
def crawl(url):
    """Get large resolution image urls"""
    driver = get_driver()
    driver.get(url)
    # Wait for the page to load completely
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'img')))
    image_urls = []
    image_elements = driver.find_elements(By.TAG_NAME, 'img')
    for img in image_elements:
        full_res_url = img.get_attribute('data-large-source')
        if full_res_url:
            full_res_url = urljoin(base_url(url), full_res_url)
            image_urls.append(full_res_url)
    driver.quit()
    return image_urls
