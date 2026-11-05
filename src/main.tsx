import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { installResizeObserverFallback } from "./lib/resizeObserverFix";
import "./styles/base.css";

const PortfolioApp = lazy(() => import("./portfolio/PortfolioApp"));
installResizeObserverFallback();
const root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <StrictMode>
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0b0c10" }} aria-label="Loading portfolio" />}>
      <PortfolioApp />
    </Suspense>
  </StrictMode>,
);
