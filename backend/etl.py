from swak.funcflow import Pipe, Map
from helpers.image import read_image
from topothek import crawl, save_to
from transform import create_tiles
from collections import namedtuple
from transform import create_tif



IMAGE_PATH = '../resources/us-army-1945.jpeg'
AUDIO_PATH = '../resources/test.mp3'
RASTER_TIF_PATH = '../resources/tifs/geo1945.tif'



Point = namedtuple('Point', ['x', 'y'])
# lat / lon convention - assume input taken from google
# Todo Make Proper object!
GROUND_CONTROL_POINTS = [
    {
        'info': 'Kirche St. Oswald',
        'pixel': Point(286, 2125),
        'gps': Point(48.619095, 14.030765),
        'id': None,
        'zoom': None,
    },
    {
        'info': 'Laher Unteruresch',
        'pixel': Point(863, 2610) ,
        'gps': Point(48.61017854015886, 14.04406485511563) ,
        'id': None,
        'zoom': None,
    },
    {
        'info': 'Ruine Wittinghausen',
        'pixel': Point(2919, 143),
        'gps': Point(48.64500581431426, 14.103290101060226),
        'id': None,
        'zoom': None,
    },
]




if __name__ == '__main__':
    print()
    #EXAMPLE_TOPOTHEK_URL = 'https://lichtenau.topothek.at/#ipp=500&p=1&searchterm=Atalla%20Margarete%20(geb.%20Eckerstorfer%20Margarete)&t=1%2C2%2C4%2C7&sf=chk_docname%2Cchk_mainkeywords%2Cchk_subkeywords&vp=false&sort=publish_date&sortdir=desc'
    #Pipe(crawl, save_to(config.cdn.endpoint + config.cdn.path.imag))(EXAMPLE_TOPOTHEK_URL) # url -> tuple -> none
    create_tif(GROUND_CONTROL_POINTS, read_image(IMAGE_PATH), RASTER_TIF_PATH)
    create_tiles(1945)(RASTER_TIF_PATH)
