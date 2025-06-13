import { useState } from "react";
import { Box } from "@mui/material";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";

const DisplayImages = (props) => {
  const { images } = props;

  // Image carroussel
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return null;
  const slides = images.map((img) => ({ src: img.url }));

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
      {/* Image Caroussel */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={closeLightbox}
          index={currentIndex}
          slides={slides}
          animation={{ fade: 450, swipe: 350 }}
        />
      )}
    </>
  );
};

export default DisplayImages;
