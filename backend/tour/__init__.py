import gpxpy
from shapely.geometry import LineString

def extract_linestring(gpx):
    points = []
    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                if point.elevation is not None:
                    points.append((point.longitude, point.latitude, point.elevation))
    return LineString(points)


def parse_gpx(file):
    gpx = gpxpy.parse(file)
    gpx = extract_linestring(gpx)
    return gpx.wkt
