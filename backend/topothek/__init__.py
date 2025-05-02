from swak.funcflow import Pipe, Map
from helpers.fs import download, SaveImage

__all__ = ['crawl', 'save_to']

from .crawl import crawl
save_to = lambda path, compress=True:  Map( Pipe( download, SaveImage(path, compress=compress) ) ) # tuple -> none
