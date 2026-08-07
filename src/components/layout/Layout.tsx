import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageContainer } from "./PageContainer";
import styles from "./Layout.module.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.appShell}>
      <a href="#conteudo-principal" className={styles.skipLink}>
        Pular para o conteúdo
      </a>
      <Header />
      <PageContainer>{children}</PageContainer>
      <Footer />
    </div>
  );
}
