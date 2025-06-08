from urllib.parse import urlparse, parse_qs
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from typing import Optional
import asyncio
from logging import getLogger
import re

logger = getLogger(__name__)

class Image(BaseModel):
    source_url: str
    source_id: str
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    year: Optional[int] = None

def get_ajax_url(url):
    parsed = urlparse(url)
    host = f"{parsed.scheme}://{parsed.netloc}"
    query_params = parse_qs(parsed.query)
    doc_id = query_params.get("doc", [None])[0]  # returns '742582'
    return f"{host}/includes/ajax.php?action=document&did={doc_id}&fastOpen=true&vp=false"

def get_property(soup, prop):
    tag = soup.find("meta", property=f"og:{prop}")
    return tag["content"] if tag else None

def get_csrf_token(soup):
    csrf_token_tag = soup.find("meta", attrs={"name": "csrf-token"})
    csrf_token = csrf_token_tag["content"] if csrf_token_tag else None
    return csrf_token

def extract_year(text):
    if not text:
        return None
    match = re.search(r'\b(18|19|20)\d{2}\b', text)
    if match:
        return int(match.group(0))
    return None

def crawl_document(url):
    with requests.Session() as session:
        resp = session.get(url)
        if status := resp.status_code != 200:
            logger.error(f"Bad reply from Topothek call: {status}, for requested {url}")
        soup = BeautifulSoup(resp.text, "html.parser")
        resp_ajax = session.get(get_ajax_url(url), headers={"Csrftoken": get_csrf_token(soup)})
        if status := resp_ajax.status_code != 200:
            logger.error(f"Bad request to Topothek Ajax call {status} for requested {url}")
        ajax = resp_ajax.json()
        return Image(
                source_url=url,
                source_id=ajax.get('id'),
                url=get_property(soup, 'image'),
                title=ajax.get('detail').get('Name'),
                description=get_property(soup, 'description'),
                owner=ajax.get('detail').get('Besitzer'),
                year=extract_year(ajax.get('detail').get('Datum'))
            )



async def crawl_document_async(url):
    return await asyncio.to_thread(crawl_document, url)
