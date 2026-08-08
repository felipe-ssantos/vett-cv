import { Route, Routes } from "react-router";
import { Layout } from "../components/layout/Layout";
import { AnaliseDetalhe } from "../features/analises/components/AnaliseDetalhe";
import { AnaliseList } from "../features/analises/components/AnaliseList";
import { AnaliseWorkspace } from "../features/analises/components/AnaliseWorkspace";
import { ReanalisarForm } from "../features/analises/components/ReanalisarForm";
import { Privacidade } from "../features/privacidade/Privacidade";

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AnaliseWorkspace />} />
        <Route path="/historico" element={<AnaliseList />} />
        <Route path="/analises/:id" element={<AnaliseDetalhe />} />
        <Route path="/analises/:id/reanalisar" element={<ReanalisarForm />} />
        <Route path="/privacidade" element={<Privacidade />} />
      </Routes>
    </Layout>
  );
}
