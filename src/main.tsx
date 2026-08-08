import "bootstrap/dist/css/bootstrap.min.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IconContext } from "react-icons";
import App from "./App.tsx";
import "./index.css";

// Todos os ícones deste projeto são decorativos (sempre acompanham texto
// visível), portanto são ocultados de leitores de tela por padrão.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IconContext.Provider value={{ attr: { "aria-hidden": true } }}>
      <App />
    </IconContext.Provider>
  </StrictMode>,
);
