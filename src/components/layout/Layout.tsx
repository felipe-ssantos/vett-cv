import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageContainer } from "./PageContainer";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#conteudo-principal" className="vett-skip-link">
        Pular para o conteúdo
      </a>
      <Header />
      <PageContainer>{children}</PageContainer>
      <Footer />
    </div>
  );
}
