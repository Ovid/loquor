import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./ui/fonts.css";
import "./ui/theme.css";
import "./index.css";
import App from "./ui/App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
