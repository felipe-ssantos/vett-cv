import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <main className="container py-5">{children}</main>;
}
