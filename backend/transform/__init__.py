from config import config
from .tiles import CreateTiles

def writer(stuff, path):
    with open(path, 'wb') as f:
        f.write(stuff)


create_tiles = lambda year: CreateTiles(
    year= year,
    zooms = range(config.tile.zoom.min, config.tile.zoom.max),
    output_dir = config.cdn.endpoint + config.cdn.path.tile,
    tile_size = config.tile.size,
    format = config.tile.format,
    writer=None
)
