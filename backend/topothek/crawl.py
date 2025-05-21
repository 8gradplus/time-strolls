from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from pydantic import BaseModel, HttpUrl
from typing import Optional

class Image(BaseModel):
    document_url: HttpUrl
    document_id: str
    url: HttpUrl
    title: Optional[str]
    description: Optional[str]
    owner: Optional[str]
    year: Optional[int]

def get_driver():
    """Set up google chrome driver for Selenium"""
    options = Options()
    options.add_argument("--headless=new")
    return webdriver.Chrome(options=options)

def get_property(driver, prop):
    return driver.find_element(By.XPATH, f'//meta[@property="og:{prop}"]').get_attribute("content")

def get_from_table(driver, prop):
    return driver.find_element(By.XPATH, f'//tr[td[1][normalize-space(text())="{prop}"]]/td[2]/div').text

def crawl_document(url):
    with  get_driver() as driver:
        driver.get(url)
        return Image(
            document_url=url,
            document_id=get_from_table(driver, 'ID'),
            url=get_property(driver, 'image'),
            title=get_property(driver, 'title'),
            description=get_property(driver, 'description'),
            owner = get_from_table(driver, 'Besitzer'),
            year = int(get_from_table(driver, 'Datum').strip().split()[-1])

        )

'''
def base_url(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

is_empty_list = lambda result: isinstance(result, list) and len(result) == 0

@retry(retry=retry_if_result(is_empty_list), wait=wait_fixed(2),stop=stop_after_attempt(5))
def crawl_from_search_results(url):
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
'''
