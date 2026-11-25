import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import { setWorkerUrl } from "maplibre-gl";
import { MAP_GLOW } from "./map/glow";
import "maplibre-gl/dist/maplibre-gl.css";
import App from "./App";
import "./index.css";

// The app bundle does not sit next to MapLibre's worker, so point at the
// raw worker file served by the Vite plugin. Without this the map stays blank.
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);
document.documentElement.dataset.glow = MAP_GLOW ? "on" : "off";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
