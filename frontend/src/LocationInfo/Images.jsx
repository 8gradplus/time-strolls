import { useState } from "react";
import { Box } from "@mui/material";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

const DisplayImages = (props) => {
  const { images } = props;

  // Image carroussel
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return null;

  const slides = images.map((img) => ({
    src: img.url,
    origin: img.source_url,
    title: img.title,
    year: img.year,
    owner: img.owner,
  }));

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    // Enter fullscreen mode automatically
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    // Exit fullscreen mode if active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  };

  return (
    <>
      {/* Images one below the other, tap to open full screen */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, px: 2.5 }}>
        {images.map((image, idx) => (
          <Box
            component="figure"
            key={`img-${idx}-${image.url}`}
            onClick={() => openLightbox(idx)}
            sx={{ m: 0, cursor: "pointer" }}
          >
            <Box
              component="img"
              src={image.url}
              alt={image.title || `img-${idx}`}
              loading="lazy"
              sx={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
              }}
            />
            {(image.year || image.title) && (
              <Box component="figcaption" sx={{ mt: 0.75, fontSize: 14 }}>
                {image.year && (
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                  >
                    {image.year}
                  </Box>
                )}
                {image.year && image.title && " · "}
                <Box component="span" sx={{ color: "text.secondary" }}>
                  {image.title}
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      {/* Image Slides */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={closeLightbox}
          index={currentIndex}
          animation={{ fade: 450, swipe: 350 }}
          slides={slides}
          plugins={[Counter, Zoom]}
          zoom={{
            maxZoomPixelRatio: 3,
            scrollToZoom: true,
            zoomInMultiplier: 2,
            doubleTapDelay: 300,
            doubleClickDelay: 300,
            doubleClickMaxStops: 2,
          }}
          toolbar={{
            buttons: ["close"],
          }}
          render={{
            slideHeader: ({ slide }) => (
              <div className="image-slide-footer">
                <div className="footer-title-row">
                  <div className="footer-year">{slide.year}</div>
                  <div>
                    <div className="footer-title">
                      {slide.title}
                      <strong className="middot">&middot;</strong> {slide.owner}
                      <strong className="middot">&middot;</strong>{" "}
                      <a
                        href={slide.origin}
                        className="footer-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Topothek
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ),
          }}
        />
      )}
    </>
  );
};

export default DisplayImages;
