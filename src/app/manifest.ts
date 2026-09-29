import type { MetadataRoute } from "next";

// Icons for "Add to Home Screen" only — not a PWA (D45, D52). display "browser" means no
// standalone app mode and no install prompt; there is deliberately no service worker.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dramoir — The Drama Shelf",
    short_name: "Dramoir",
    start_url: "/",
    display: "browser",
    background_color: "#230612",
    theme_color: "#230612",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
