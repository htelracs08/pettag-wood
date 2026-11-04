import { Baloo_2, Figtree } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ProveedorAvisos } from "@/components/Avisos";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });

export const metadata = {
  title: "PetTag Wood",
  description: "Placas de madera grabadas con láser y código QR para que tu mascota siempre vuelva a casa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${baloo.variable} ${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <ProveedorAvisos>
          <Suspense fallback={<div className="h-[61px] border-b border-borde bg-white" />}>
            <Navbar />
          </Suspense>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">{children}</main>
          <footer className="border-t border-borde py-6 text-center text-sm text-tinta-suave">
            PetTag Wood · Placas de madera con QR para mascotas
          </footer>
        </ProveedorAvisos>
      </body>
    </html>
  );
}
