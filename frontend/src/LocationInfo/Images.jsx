import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Icon } from "../icons";
import { useLanguage } from "../LanguageContext";

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

// Where the label goes on its slide: as wide as the photo, under it where
// there is room (phones upright, large screens), else over its bottom edge
// on a gradient (phones held sideways). Zoomed in, it moves to the bottom
// of the screen on the same gradient. The library renders the label inside
// the slide but knows nothing of it, so it is measured against the photo.
const usePlacement = (ref) => {
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    const label = ref.current;
    const slide = label?.closest(".yarl__slide");
    const img = slide?.querySelector(".yarl__slide_image");
    if (!img) return;
    const measure = () => {
      const s = slide.getBoundingClientRect();
      const i = img.getBoundingClientRect();
      if (!i.width) return;
      const below = s.bottom - i.bottom;
      setPlace({
        left: i.left - s.left,
        width: i.width,
        top: i.bottom - s.top,
        bottom: below,
        under: below >= label.offsetHeight + 8,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slide);
    observer.observe(img);
    img.addEventListener("load", measure);
    return () => {
      observer.disconnect();
      img.removeEventListener("load", measure);
    };
  }, [ref]);
  return place;
};

// The viewer's wall label: the year in bold, then the title, and under it
// the credit and the source on the Topothek; sizes as for the podcast in the
// place panel (Audio.jsx)
const WallLabel = ({ slide, zoomed }) => {
  const { t } = useLanguage();
  const ref = useRef(null);
  const place = usePlacement(ref);
  const under = place?.under && !zoomed;

  return (
    <Box
      ref={ref}
      className={under ? "viewer-label" : "viewer-label viewer-label-over"}
      sx={{
        position: "absolute",
        visibility: place ? "visible" : "hidden",
        left: zoomed ? 0 : (place?.left ?? 0),
        width: zoomed ? "100%" : (place?.width ?? "100%"),
        boxSizing: "border-box",
        ...(under
          ? { top: place.top, px: 2, pt: 1.5 }
          : {
              bottom: zoomed ? 0 : (place?.bottom ?? 0),
              px: 2,
              pt: 5,
              pb: "max(12px, env(safe-area-inset-bottom, 0px))",
              // From the surface colour at the bottom to clear at the top
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--mui-palette-background-paper) 88%, transparent), color-mix(in srgb, var(--mui-palette-background-paper) 68%, transparent) 50%, transparent)",
              // A soft halo in the surface colour keeps the letters clear of
              // busy parts of the photo
              textShadow: "0 0 10px var(--mui-palette-background-paper)",
            }),
        display: "grid",
        gap: 0.5,
        color: "text.primary",
      }}
    >
      {(slide.year || slide.title) && (
        <Box
          component="p"
          className="viewer-title"
          sx={{ m: 0, lineHeight: 1.45 }}
        >
          {slide.year && (
            <Box component="span" sx={{ fontWeight: 700 }}>
              {slide.year}
              {slide.title && " · "}
            </Box>
          )}
          {slide.title}
        </Box>
      )}
      <Box component="span" sx={{ fontSize: 13, color: "text.secondary" }}>
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
            Topothek
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
  const [zoomed, setZoomed] = useState(false);
  // The viewer goes back to `index` whenever it gets new slides, so they must
  // keep their identity across renders (the map re-renders often on phones)
  const slides = useMemo(
    () =>
      (images ?? []).map((img) => ({
        src: img.url,
        alt: img.title,
        origin: img.source_url,
        title: img.title,
        year: img.year,
        owner: img.owner,
      })),
    [images],
  );
  // Closing goes through here, however it starts: ✕, pulling the photo
  // down, Escape, the back gesture (which leaves full screen first on
  // Android) or the history entry the viewer adds, so that back closes only
  // the viewer and not the place panel
  const openRef = useRef(false);
  const closeLightbox = () => {
    if (!openRef.current) return;
    openRef.current = false;
    setLightboxOpen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
    if (window.history.state?.viewer) window.history.back();
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onPop = () => {
      if (!window.history.state?.viewer) closeLightbox();
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        closeLightbox();
      }
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
    };
  });

  if (slides.length === 0) return null;

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setZoomed(false);
    setLightboxOpen(true);
    openRef.current = true;
    // Keeps the router's state, so its own entries stay as they are
    if (!window.history.state?.viewer) {
      window.history.pushState({ ...window.history.state, viewer: true }, "");
    }
    // Full screen where the browser allows it, for the most room on phones
    const root = document.documentElement;
    (root.requestFullscreen ?? root.webkitRequestFullscreen)
      ?.call(root)
      ?.catch?.(() => {});
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
              justifySelf: "center",
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
              // At most 70% of the screen's height, so a whole photo fits on
              // a phone held sideways
              sx={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "70dvh",
                width: "auto",
                height: "auto",
              }}
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
            className="viewer"
            on={{
              view: ({ index }) => setCurrentIndex(index),
              zoom: ({ zoom }) => setZoomed(zoom > 1),
            }}
            animation={{ fade: 250, swipe: 300 }}
            carousel={{ padding: 0 }}
            controller={{ closeOnPullDown: true }}
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
            render={{
              // The app's own icons, as on the place panel and in the menu
              iconClose: () => <Icon name="close" />,
              iconPrev: () => <Icon name="arrow_back" size={32} />,
              iconNext: () => (
                <Icon
                  name="arrow_back"
                  size={32}
                  style={{ transform: "scaleX(-1)" }}
                />
              ),
              slideFooter: ({ slide }) => (
                <WallLabel slide={slide} zoomed={zoomed} />
              ),
            }}
          />
        </Box>
      )}
    </>
  );
};

export default DisplayImages;
