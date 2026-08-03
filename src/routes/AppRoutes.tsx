import { Route, Routes } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { AnalisarForm } from "../features/analises/components/AnalisarForm";
import { ResultadoAnalise } from "../features/analises/components/ResultadoAnalise";
import { CandidaturaForm } from "../features/candidaturas/components/CandidaturaForm";
import { VagaDetalhe } from "../features/vagas/components/VagaDetalhe";
import { VagaList } from "../features/vagas/components/VagaList";

export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<AnalisarForm />} />
        <Route path="/historico" element={<VagaList />} />
        <Route path="/vagas/:id" element={<VagaDetalhe />} />
        <Route path="/vagas/:id/reanalisar" element={<CandidaturaForm />} />
        <Route
          path="/vagas/:id/candidatura/:candidaturaId/resultado"
          element={<ResultadoAnalise />}
        />
      </Routes>
    </Layout>
  );
}
