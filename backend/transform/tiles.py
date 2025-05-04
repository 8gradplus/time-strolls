from rio_tiler.io import Reader
from rio_tiler.utils import render
from helpers.fs import serve_static_binary
import morecantile

WEB_MERCATOR_TMS = morecantile.tms.get("WebMercatorQuad")

class CreateTiles:
    def __init__(self,  year, zooms, output_dir, tile_size, format):
        self.year = year
        self.zooms = zooms
        self.output_dir = output_dir
        self.tile_size = tile_size
        self.format = format

    def __call__(self, path):
        with Reader(path, tms=WEB_MERCATOR_TMS) as src:
            # Requires gps coordinates. oh man!
            bounds = src.get_geographic_bounds('EPSG:4326')
            tiles = list(src.tms.tiles(*bounds, self.zooms))
            for tile in tiles:
                try:
                    tile_data, mask = src.tile(*tile, tilesize=self.tile_size)
                    png_bytes =  render(
                                 tile_data,
                                 mask=mask,
                                 img_format=self.format)
                    serve_static_binary(png_bytes, self.year, tile, self.output_dir)
                except Exception as e:
                    print(f"Skipping tile {year}/{tile.z}/{tile.x}/{tile.y}: {e}")
