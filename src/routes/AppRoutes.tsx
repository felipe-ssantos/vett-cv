import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router";
import { Layout } from "../components/layout/Layout";
import { AnaliseWorkspace } from "../features/analises/components/AnaliseWorkspace";

// Code-splitting por rota: histórico, detalhe, reanálise e privacidade são
// carregados sob demanda (React.lazy). O bundle inicial fica com o Layout e a
// página principal; cada rota secundária vira um chunk separado baixado apenas
// quando visitada.
const AnaliseList = lazy(() =>
  import("../features/analises/components/AnaliseList").then((m) => ({
    default: m.AnaliseList,
  })),
);
const AnaliseDetalhe = lazy(() =>
  import("../features/analises/components/AnaliseDetalhe").then((m) => ({
    default: m.AnaliseDetalhe,
  })),
);
const ReanalisarForm = lazy(() =>
  import("../features/analises/components/ReanalisarForm").then((m) => ({
    default: m.ReanalisarForm,
  })),
);
const Privacidade = lazy(() =>
  import("../features/privacidade/Privacidade").then((m) => ({
    default: m.Privacidade,
  })),
);

/** Fallback exibido enquanto um chunk de rota é baixado. */
function CarregandoRota() {
  return (
    <div className="d-flex justify-content-center py-5" role="status">
      <div className="spinner-border text-teal" aria-hidden="true" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Layout>
      <Suspense fallback={<CarregandoRota />}>
        <Routes>
          <Route path="/" element={<AnaliseWorkspace />} />
          <Route path="/historico" element={<AnaliseList />} />
          <Route path="/analises/:id" element={<AnaliseDetalhe />} />
          <Route path="/analises/:id/reanalisar" element={<ReanalisarForm />} />
          <Route path="/privacidade" element={<Privacidade />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
