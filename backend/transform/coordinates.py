import numpy as np
import cv2
from pyproj import Transformer

def to_web_mercator(gps: np.ndarray):
    """gps: shape points x 2 """
    f = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=False)
    transformed = f.transform(gps[:,0], gps[:,1])
    return np.stack(transformed).transpose().astype(np.float32)

def get_affine_transform(x: np.ndarray, y: np.ndarray):
    return cv2.getAffineTransform(x, y)
