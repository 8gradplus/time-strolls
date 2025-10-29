import { useState, useEffect, useRef } from "react";

// smooth heading hook
export const useSmoothHeading = (targetHeading) => {
  const [smoothHeading, setSmoothHeading] = useState(targetHeading);
  const rafRef = useRef(null);
  const duration = 300;

  useEffect(() => {
    const start = smoothHeading;
    const diff = ((targetHeading - start + 540) % 360) - 180;
    const startTime = performance.now();

    const animate = (t) => {
      const progress = Math.min((t - startTime) / duration, 1);
      setSmoothHeading(start + diff * progress);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [targetHeading]); // don't include smoothHeading as small variations would result in recomputation

  return smoothHeading;
};

export const useTrack = () => {
  const [position, setPosition] = useState(null);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(latlng);

        if (pos.coords.heading != null) {
          setHeading(pos.coords.heading);
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Device orientation fallback for stationary heading
  /*
  useEffect(() => {
    if (trackingMode !== "navigate") return;

    const handleOrientation = (event) => {
      const alpha = event.alpha; // rotation around z-axis in degrees
      if (alpha != null) {
        setHeading(alpha);
      }
    };

    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true,
    );

    return () =>
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation,
      );
  }, [trackingMode]);
  */

  // simulation - remove this
  /*
  useEffect(() => {
    if (
      trackingMode === "navigate" &&
      !("ondeviceorientationabsolute" in window)
    ) {
      // simulate rotation on desktop
      const id = setInterval(() => {
        setHeading((prev) => (prev + 5) % 360);
      }, 200);
      return () => clearInterval(id);
    }
  }, [trackingMode]);
  */
  const smoothHeading = useSmoothHeading(heading);
  console.log("Heading / smooth heading", heading, smoothHeading);
  return { position, smoothHeading };
};
