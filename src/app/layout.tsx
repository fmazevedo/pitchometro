import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Favicon, icon.png and apple-icon.png in src/app are picked up automatically (generated from public/ico.png).
export const metadata: Metadata = {
  title: {
    default: "Pitchômetro — Avaliação de bancas e pitches",
    template: "%s · Pitchômetro",
  },
  description:
    "Plataforma para organizar bancas de avaliação de pitches: sorteio da ordem, fichas com notas ponderadas, dashboard em tempo real e devolutiva para os grupos.",
  openGraph: {
    title: "Pitchômetro — Avaliação de bancas e pitches",
    description: "Organize bancas, colete notas ponderadas e entregue devolutivas profissionais em um só lugar.",
    images: ["/logo.png"],
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
