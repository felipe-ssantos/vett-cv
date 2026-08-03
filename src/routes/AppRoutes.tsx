import { Route, Routes } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { AnalisarForm } from "../features/analises/components/AnalisarForm";
import { AnaliseDetalhe } from "../features/analises/components/AnaliseDetalhe";
import { AnaliseList } from "../features/analises/components/AnaliseList";
import { ReanalisarForm } from "../features/analises/components/ReanalisarForm";

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AnalisarForm />} />
        <Route path="/historico" element={<AnaliseList />} />
        <Route path="/analises/:id" element={<AnaliseDetalhe />} />
        <Route path="/analises/:id/reanalisar" element={<ReanalisarForm />} />
      </Routes>
    </Layout>
  );
}
