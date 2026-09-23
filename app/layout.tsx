import type { Metadata } from "next";
import "./globals.css";
import { Footer, Header } from "@/components/Site";
import PreviewBridge from "@/components/PreviewBridge";

export const metadata: Metadata = {
  title: { default: "Letícia Leite | Moda, beleza e lifestyle", template: "%s | Letícia Leite" },
  description: "Blog autoral de moda, beleza e lifestyle de Letícia Leite, com portfólio e serviços UGC."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><Header />{children}<Footer /><PreviewBridge /></body></html>;
}
