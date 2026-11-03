import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "PetTag Wood",
  description: "Placas de madera grabadas con láser y código QR para identificar a tu mascota",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 font-sans text-stone-800">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
