import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isPreviewHost =
  window.location.hostname.startsWith('id-preview--') ||
  window.location.hostname.startsWith('preview--') ||
  window.location.hostname.endsWith('.lovableproject.com') ||
  window.location.hostname.endsWith('.lovableproject-dev.com') ||
  window.location.hostname.endsWith('.beta.lovable.dev');

if (import.meta.env.PROD && window.self === window.top && !isPreviewHost && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
