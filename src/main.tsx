
  import { createRoot } from "react-dom/client";
  import { BrowserRouter, Routes, Route } from "react-router";
  import App from "./app/App.tsx";
  import { GettingStarted } from "./app/getting-started/GettingStarted.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/getting-started" element={<GettingStarted />} />
      </Routes>
    </BrowserRouter>
  );
