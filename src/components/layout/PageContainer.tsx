import type { ReactNode } from "react";
import styles from "./PageContainer.module.css";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="conteudo-principal" className={`${styles.appMain} pb-4`} tabIndex={-1}>
      {children}
    </main>
  );
}
