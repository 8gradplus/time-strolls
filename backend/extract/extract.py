import numpy as np
import cv2

def get_coordinates(landmarks: dict):
    pixel = np.array([v["pixel"] for v in landmarks.values()], dtype=np.float32)
    gps = np.array([v["gps"] for v in landmarks.values()], dtype=np.float32)
    return pixel, gps

def read_image(path):
    image = cv2.imread(path)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    return image_rgb
