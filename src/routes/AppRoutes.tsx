import { Route, Routes } from "react-router-dom";
import { ResultadoAnalise } from "../features/analises/components/ResultadoAnalise";
import { CandidaturaForm } from "../features/candidaturas/components/CandidaturaForm";
import { VagaDetalhe } from "../features/vagas/components/VagaDetalhe";
import { VagaForm } from "../features/vagas/components/VagaForm";
import { VagaList } from "../features/vagas/components/VagaList";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<VagaList />} />
      <Route path="/vagas/nova" element={<VagaForm />} />
      <Route path="/vagas/:id" element={<VagaDetalhe />} />
      <Route path="/vagas/:id/candidatura" element={<CandidaturaForm />} />
      <Route
        path="/vagas/:id/candidatura/:candidaturaId/resultado"
        element={<ResultadoAnalise />}
      />
    </Routes>
  );
}
