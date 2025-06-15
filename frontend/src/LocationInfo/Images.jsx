import { useState } from "react";
import { Box } from "@mui/material";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import Counter from "yet-another-react-lightbox/plugins/counter";

const DisplayImages = (props) => {
  const { images } = props;

  // Image carroussel
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return null;

  const slides = images.map((img) => ({
    src: img.url,
    title: img.title,
    year: img.year,
    owner: img.owner,
    url: img.url,
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
      {images.map((image, idx) => (
        <Box
          key={`img-${idx}-${image.url}`}
          sx={{ mb: 1 }}
          onClick={() => openLightbox(idx)}
        >
          <img
            src={image.url}
            alt={`img-${idx}-${image.url}`}
            loading="lazy"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </Box>
      ))}
      {/* Image Slides */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={closeLightbox}
          index={currentIndex}
          animation={{ fade: 450, swipe: 350 }}
          slides={slides}
          plugins={[Counter]}
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
                        href={slide.src}
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
