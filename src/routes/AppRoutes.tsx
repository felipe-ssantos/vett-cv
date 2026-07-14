import { Routes, Route } from 'react-router-dom'
import { VagaList } from '../features/vagas/components/VagaList'
import { VagaForm } from '../features/vagas/components/VagaForm'
import { VagaDetalhe } from '../features/vagas/components/VagaDetalhe'
import { CandidaturaForm } from '../features/candidaturas/components/CandidaturaForm'
import { ResultadoAnalise } from '../features/analises/components/ResultadoAnalise'

export function AppRoutes () {
  return (
    <Routes>
      <Route path='/' element={<VagaList />} />
      <Route path='/vagas/nova' element={<VagaForm />} />
      <Route path='/vagas/:id' element={<VagaDetalhe />} />
      <Route path='/vagas/:id/candidatura' element={<CandidaturaForm />} />
      <Route
        path='/vagas/:id/candidatura/:candidaturaId/resultado'
        element={<ResultadoAnalise />}
      />
    </Routes>
  )
}
