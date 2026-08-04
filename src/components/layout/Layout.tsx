import type { ReactNode } from "react";
import { Header } from "./Header";
import { PageContainer } from "./PageContainer";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
