import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router";
import { garantirSessaoAnonima } from "./lib/authAnonimo";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    garantirSessaoAnonima()
      .catch((err) => console.error("Falha ao iniciar sessão:", err))
      .finally(() => setPronto(true));
  }, []);

  if (!pronto) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        role="status"
      >
        <p className="text-secondary">Carregando...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
