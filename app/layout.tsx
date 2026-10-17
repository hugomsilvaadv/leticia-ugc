import type { Metadata } from "next";
import "./globals.css";
import "./refero-editorial.css";
import "./editorial-layout.css";
import { Footer, Header } from "@/components/Site";
import PreviewBridge from "@/components/PreviewBridge";

export const metadata: Metadata = {
  metadataBase: new URL("https://byleticia.com.br"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Letícia Leite",
    url: "/",
    images: [{ url: "/images/leticia-hero.jpg", alt: "Letícia Leite" }],
  },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Letícia Leite | Moda, beleza e lifestyle",
    template: "%s | Letícia Leite",
  },
  description:
    "Blog autoral de moda, beleza e lifestyle de Letícia Leite, com portfólio e serviços UGC.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skipLink" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Header />
        {children}
        <Footer />
        <PreviewBridge />
      </body>
    </html>
  );
}
