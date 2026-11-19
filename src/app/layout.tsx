import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const lato = localFont({ src: [{ path: "../fonts/lato-400.woff2", weight: "400" }, { path: "../fonts/lato-700.woff2", weight: "700" }, { path: "../fonts/lato-900.woff2", weight: "900" }], variable: "--font-lato", display: "swap" });
const roboto = localFont({ src: [{ path: "../fonts/roboto-400.woff2", weight: "400" }, { path: "../fonts/roboto-500.woff2", weight: "500" }, { path: "../fonts/roboto-700.woff2", weight: "700" }], variable: "--font-roboto", display: "swap" });

export const metadata: Metadata = { title: "Data Maker", description: "Simulador de entrenamiento analítico con datos ficticios" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${lato.variable} ${roboto.variable}`}><body>{children}</body></html>;
}
