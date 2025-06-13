from helpers.image import read_image
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
    create_tif(GROUND_CONTROL_POINTS, read_image(IMAGE_PATH), RASTER_TIF_PATH)
    create_tiles(1945)(RASTER_TIF_PATH)
