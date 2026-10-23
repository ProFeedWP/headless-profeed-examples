import "./style.css";
import type { ReactNode } from "react";
export const metadata = {
  title: "LinkedIn feed · Next.js example",
  description: "A server-rendered company feed using Headless Profeed.",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
