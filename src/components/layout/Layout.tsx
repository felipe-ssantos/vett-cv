import type { ReactNode } from "react";
import { Header } from "./Header";
import { PageContainer } from "./PageContainer";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PageContainer>{children}</PageContainer>
    </div>
  );
}