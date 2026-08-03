import { Route, Routes } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { AnalisarForm } from "../features/analises/components/AnalisarForm";

export function AppRoutes() {
  return +(
    <Layout>
      <Routes>
        <Route path="/" element={<AnalisarForm />} />
      </Routes>
    </Layout>
  );
}
