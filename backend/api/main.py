from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from rio_tiler.io import Reader
import io
from rio_tiler.profiles import img_profiles
from fastapi.responses import Response
from rio_tiler.utils import render
from PIL import Image
from helpers.fs import serve_static_binary

app = FastAPI()

@app.get("/timetiles/preview")
def get_preview():
    with Reader(TIF) as reader:
            img = reader.read()
    content = img.render(img_format="PNG", **img_profiles.get("png"))
    return Response(content, media_type="image/png")

@app.get("/timetiles/{t}/{z}/{x}/{y}")
def get_tile(z: int, x: int, y: int):
    with Reader(TIF) as reader:
            img = reader.tile(x, y, z)
    content = img.render(img_format="PNG", **img_profiles.get("png"))
    return Response(content, media_type="image/png")


    # I am fed up with titiler!
    """
    cog = TilerFactory()


    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allows all origins (for development - be more specific in production)
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Create a TilerFactory for Cloud-Optimized GeoTIFFs

    # Register all the COG endpoints automatically
    app.include_router(cog.router, tags=["Cloud Optimized GeoTIFF"])


    # Optional: Add a welcome message for the root endpoint
    @app.get("/")
    def read_index():
        return {"message": "Welcome to Timestrolls"}
    """
