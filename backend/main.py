from rasterio.shutil import copy
from swak.funcflow import Pipe, Map

from extract.extract import get_coordinates
from extract.extract import read_image
from helpers.fs import SaveImage, clear_directory, binary_copy_file, download
from topothek import crawl, save_to
from transform.coordinates import get_affine_transform
from transform.coordinates import to_web_mercator
from transform.tiles import create_tiles
from transform.geotiff import geotiff

EXAMPLE_TOPOTHEK_URL = 'https://lichtenau.topothek.at/#ipp=500&p=1&searchterm=Atalla%20Margarete%20(geb.%20Eckerstorfer%20Margarete)&t=1%2C2%2C4%2C7&sf=chk_docname%2Cchk_mainkeywords%2Cchk_subkeywords&vp=false&sort=publish_date&sortdir=desc'
IMAGE_PATH = '../resources/us-army-1945.jpeg'
AUDIO_PATH = '../resources/test.mp3'
RASTER_TIFF_PATH = '../resources/geo.tif'

# currently we serve data with react from public folder.
# This will be replaced in the future DB / API
# With a dynamic tile server zoom levels will get obsolete
ZOOM_LEVELS = range (10, 18)
STATIC_TILES_PATH = '../frontend/public/tiles'
STATIC_TOPOTHEK_PATH = '../resources/images'
STATIC_AUDIO_PATH = '../frontend/public/audio'

# lat / lon convention!
LANDMARKS = {
    'Kirche St. Oswald': {
        'pixel': (286, 2125),
        'gps': (48.619095, 14.030765)
    },
    'Laher Unteruresch': {
        'pixel': (863, 2610) ,
        'gps': (48.61017854015886, 14.04406485511563) ,
                },
    'Ruine Wittinghausen': {
        'pixel': (2919, 143),
        'gps': (48.64500581431426, 14.103290101060226),
              },
}

def create_raster_tif():
    pixel, gps = get_coordinates(LANDMARKS)
    meters = to_web_mercator(gps)
    tif = geotiff(read_image(IMAGE_PATH), get_affine_transform(pixel, meters))
    with tif.open() as src:
        copy(src, RASTER_TIFF_PATH, driver="GTiff")
    create_tiles(RASTER_TIFF_PATH, ZOOM_LEVELS, STATIC_TILES_PATH)


if __name__ == '__main__':
    # Use CDN as sink
    clear_directory(STATIC_TILES_PATH)
    Pipe(crawl, save_to(STATIC_TOPOTHEK_PATH, compress=False))(EXAMPLE_TOPOTHEK_URL) # url -> tuple -> none
    create_raster_tif()
