from rio_tiler.io import Reader
from rio_tiler.utils import render
import morecantile
from PIL import Image
from helpers.fs import serve_static_binary

WEB_MERCATOR_TMS = morecantile.tms.get("WebMercatorQuad")

def create_tiles(path, zooms, output_dir, tile_size=256):
    """
    Create tiles and write it to file system.

    Parameters
    ----------
    path : str
        A geotiff file
    zooms : Zoom levels
        Part of the file system ('z')
    output_dir : str
        Directory where tiles are written
    tile_size : int
        Tile size
    Returns
    -------

    Notes
    -----
    At a latter point this should go into rasterio memfile or database upon creating an api
    """
    with Reader(path, tms=WEB_MERCATOR_TMS) as src:
        # Requires gps coordinates. oh man!
        bounds = src.get_geographic_bounds('EPSG:4326')
        tiles = list(src.tms.tiles(*bounds, zooms))
        for tile in tiles:
            try:
                tile_data = src.tile(*tile, tilesize=tile_size)
                # render png as bytes - could be also treated as normal png
                # But bytes help to avoid black areas upon out of bonds
                png_bytes =  render(
                             tile_data.data,
                             mask=tile_data.mask,
                             img_format="PNG"
                         )
                serve_static_binary(png_bytes, tile, output_dir)
            except Exception as e:
                print(f"Skipping tile {tile.z}/{tile.x}/{tile.y}: {e}")
