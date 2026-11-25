import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import App from "./App";
import "./index.css";

// The app bundle does not sit next to MapLibre's worker, so point at the
// raw worker file served by the Vite plugin. Without this the map stays blank.
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
