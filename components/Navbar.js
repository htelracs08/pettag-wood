"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUsuario(data.user));
    const { data: escucha } = supabase.auth.onAuthStateChange((_e, sesion) => {
      setUsuario(sesion?.user ?? null);
    });
    return () => escucha.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-amber-200 bg-amber-50">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-amber-900">
          🐾 PetTag Wood
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {usuario ? (
            <>
              <Link href="/panel" className="text-amber-900 hover:underline">
                Mis mascotas
              </Link>
              <Link href="/panel/datos" className="text-amber-900 hover:underline">
                Mis datos
              </Link>
              <button
                onClick={cerrarSesion}
                className="rounded-md border border-amber-300 px-3 py-1 text-amber-900 hover:bg-amber-100"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-amber-800 px-3 py-1.5 font-medium text-white hover:bg-amber-900"
            >
              Ingresar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
