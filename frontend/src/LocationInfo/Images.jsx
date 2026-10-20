import { useState } from "react";
import Box from "@mui/material/Box";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { useLanguage } from "../LanguageContext";
import { serif } from "../theme";

// The year as a small label inside the photo
const YearBadge = ({ year }) => (
  <Box
    component="span"
    sx={{
      position: "absolute",
      left: 8,
      bottom: 8,
      px: 1,
      py: 0.25,
      borderRadius: 0.5,
      bgcolor: "rgba(14, 14, 13, 0.62)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {year}
  </Box>
);

// The viewer's wall label: year, title, credit and the source on the
// Topothek. On phones it lies over the bottom of the photo, which gets the
// whole screen; on large screens it sits below the photo (.viewer in
// index.css).
const WallLabel = ({ slide }) => {
  const { t } = useLanguage();

  return (
    <Box
      className="viewer-label"
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        // The text stays in a centred column of at most 680 px
        px: "max(16px, calc((100% - 680px) / 2))",
        pt: 1.25,
        pb: "max(14px, env(safe-area-inset-bottom, 0px))",
        display: "grid",
        gap: 0.25,
        color: "text.primary",
      }}
    >
      {slide.year && (
        <Box
          component="span"
          sx={{
            fontFamily: serif,
            fontWeight: 600,
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          {slide.year}
        </Box>
      )}
      {slide.title && (
        <Box
          component="span"
          className="viewer-title"
          sx={{ fontSize: 14, lineHeight: 1.4 }}
        >
          {slide.title}
        </Box>
      )}
      <Box component="span" sx={{ fontSize: 12, color: "text.secondary" }}>
        {slide.owner && `${t.photo}: ${slide.owner}`}
        {slide.owner && slide.origin && " · "}
        {slide.origin && (
          <Box
            component="a"
            href={slide.origin}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "inherit" }}
          >
            Topothek ↗
          </Box>
        )}
      </Box>
    </Box>
  );
};

const DisplayImages = (props) => {
  const { images } = props;
  const { t } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // A tap on the photo hides the label and buttons: only the photo is left
  const [photoOnly, setPhotoOnly] = useState(false);
  if (!images || images.length === 0) return null;

  const slides = images.map((img) => ({
    src: img.url,
    alt: img.title,
    origin: img.source_url,
    title: img.title,
    year: img.year,
    owner: img.owner,
  }));

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setPhotoOnly(false);
    setLightboxOpen(true);
    // Full screen where the browser allows it, for the most room on phones
    const root = document.documentElement;
    (root.requestFullscreen ?? root.webkitRequestFullscreen)
      ?.call(root)
      ?.catch?.(() => {});
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  };

  return (
    <>
      {/* Only the photos, for quick scrolling; the details are in the viewer */}
      <Box sx={{ display: "grid", gap: 1.5, px: 2.5 }}>
        {images.map((image, idx) => (
          <Box
            component="button"
            type="button"
            key={`img-${idx}-${image.url}`}
            onClick={() => openLightbox(idx)}
            aria-label={[image.year, image.title].filter(Boolean).join(": ")}
            sx={{
              all: "unset",
              position: "relative",
              display: "block",
              cursor: "pointer",
              borderRadius: 0.5,
              overflow: "hidden",
              bgcolor: "divider",
              "&:focus-visible": { outline: 2, outlineColor: "primary.main" },
            }}
          >
            <Box
              component="img"
              src={image.url}
              alt=""
              loading="lazy"
              sx={{ display: "block", width: "100%", height: "auto" }}
            />
            {image.year && <YearBadge year={image.year} />}
          </Box>
        ))}
      </Box>

      {/* Full-screen viewer in the app's light or dark surface; pinch or
          double-tap to zoom. Its key presses must not reach the place panel
          around it (React passes them up through the portal), or Escape would
          close both. */}
      {lightboxOpen && (
        <Box component="span" onKeyDown={(event) => event.stopPropagation()}>
          <Lightbox
            open={lightboxOpen}
            close={closeLightbox}
            index={currentIndex}
            slides={slides}
            plugins={[Counter, Zoom]}
            className={photoOnly ? "viewer photo-only" : "viewer"}
            on={{ click: () => setPhotoOnly((only) => !only) }}
            animation={{ fade: 250, swipe: 300 }}
            carousel={{ padding: 0 }}
            zoom={{
              maxZoomPixelRatio: 3,
              scrollToZoom: true,
              zoomInMultiplier: 2,
              doubleTapDelay: 300,
              doubleClickDelay: 300,
              doubleClickMaxStops: 2,
            }}
            toolbar={{ buttons: ["close"] }}
            labels={{
              Close: t.close,
              Previous: t.previous,
              Next: t.next,
              Lightbox: t.photoViewer,
            }}
            render={{ slideFooter: ({ slide }) => <WallLabel slide={slide} /> }}
          />
        </Box>
      )}
    </>
  );
};

export default DisplayImages;
