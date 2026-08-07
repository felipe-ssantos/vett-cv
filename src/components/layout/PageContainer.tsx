import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="conteudo-principal" className="app-main pb-4" tabIndex={-1}>
      {children}
    </main>
  );
}
