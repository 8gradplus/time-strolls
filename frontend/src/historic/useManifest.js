import { useEffect, useState } from "react";
import { MANIFEST_URL } from "./manifest";

// Loads the aerial-timeline manifest once, straight from the CDN (not via /api).
export const useManifest = () => {
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    fetch(MANIFEST_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Manifest response not ok");
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.times) {
          throw new Error("Manifest has no times");
        }
        setManifest(data);
      })
      .catch((error) => console.error("Error fetching manifest:", error));
  }, []);

  return manifest;
};
