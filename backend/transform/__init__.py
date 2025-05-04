from config import config
from .tiles import CreateTiles
from helpers.fs import write_local
from helpers.cdn import write_s3

writer = write_s3
output_dir = config.cdn.path.tile

if not config.cdn.endpoint.startswith('https'):
    writer = write_local
    output_dir= config.cdn.endpoint + config.cdn.path.tile

create_tiles = lambda year: CreateTiles(
    year= year,
    zooms = range(config.tile.zoom.min, config.tile.zoom.max),
    output_dir = output_dir,
    tile_size = config.tile.size,
    format = config.tile.format,
    writer=writer
)
