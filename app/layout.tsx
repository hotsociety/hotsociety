import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { SITE } from "./_lib/site";
import UtmCaptura from "./_components/UtmCaptura";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} · ${SITE.slogan}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.name,
    description: SITE.slogan,
    images: ["/img/hero-neve.jpg"],
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Tema claro/escuro antes da página aparecer (sem piscar). */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("hs-tema")==="claro")document.documentElement.dataset.tema="claro"}catch(e){}` }} />
      </head>
      <body>
        <UtmCaptura />
        {children}
      </body>
    </html>
  );
}