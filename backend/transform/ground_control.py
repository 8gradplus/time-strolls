from rasterio.control import GroundControlPoint
import rasterio

def gcp_to_rasterio(gcp: dict):
    return GroundControlPoint(
        row = gcp['pixel'].y,
        col= gcp['pixel'].x,
        x = gcp['gps'].y,
        y = gcp['gps'].x,
        z = gcp['zoom'],
        id = gcp['id'],
        info = gcp['info']
    )

def get_transformation(gcps: list[GroundControlPoint]):
    """
    Computes an affine transformation from a list of ground control points (GCPs).

    Parameters
    ----------
    gcps : list of GroundControlPoint
        List of GCPs used to derive the affine transformation.

    Returns
    -------
    Affine
        An affine transformation object representing the spatial reference.
    """
    return rasterio.transform.from_gcps(gcps)
