from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from pydantic import BaseModel
from typing import Optional
import asyncio

class Image(BaseModel):
    source_url: str
    source_id: str
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    year: Optional[int] = None

def get_driver():
    """Set up google chrome driver for Selenium"""
    options = Options()
    options.add_argument("--headless=new")
    return webdriver.Chrome(options=options)

def get_property(driver, prop):
    return driver.find_element(By.XPATH, f'//meta[@property="og:{prop}"]').get_attribute("content")

def get_from_table(driver, prop: str):
    return driver.find_element(By.XPATH, f'//tr[td[1][normalize-space(text())="{prop}"]]/td[2]/div').text

def crawl_document(url):
    with  get_driver() as driver:
        driver.get(url)
        return Image(
            source_url=url,
            source_id=get_from_table(driver, 'ID'),
            url=get_property(driver, 'image'),
            title=get_property(driver, 'title'),
            #description=get_property(driver, 'description'),
            owner = get_from_table(driver, 'Besitzer'),
            year = int(get_from_table(driver, 'Datum').strip().split()[-1])
        )

async def crawl_document_async(url):
    return await asyncio.to_thread(crawl_document, url)
