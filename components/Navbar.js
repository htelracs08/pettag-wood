"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const ruta = usePathname();
  const [usuario, setUsuario] = useState(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [rutaMenu, setRutaMenu] = useState(null); // el menú se cierra solo al cambiar de página
  const menuAbierto = rutaMenu === ruta;

  useEffect(() => {
    async function revisar(user) {
      setUsuario(user);
      if (!user) return setEsAdmin(false);
      const { data } = await supabase.from("perfiles").select("es_admin").eq("id", user.id).maybeSingle();
      setEsAdmin(Boolean(data?.es_admin));
    }
    supabase.auth.getUser().then(({ data }) => revisar(data.user));
    const { data: escucha } = supabase.auth.onAuthStateChange((_e, sesion) => revisar(sesion?.user ?? null));
    return () => escucha.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El perfil público (lo que ve quien encuentra a la mascota) no lleva menú
  if (ruta.startsWith("/p/")) return null;

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const enlaces = usuario
    ? [
        { href: "/panel", texto: "Mis mascotas", activo: ruta === "/panel" || ruta.startsWith("/panel/mascotas") },
        { href: "/panel/datos", texto: "Mis datos", activo: ruta === "/panel/datos" },
        ...(esAdmin ? [{ href: "/admin", texto: "Pedidos (admin)", activo: ruta.startsWith("/admin") }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-30 border-b border-borde bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href={usuario ? "/panel" : "/"} className="flex items-center gap-2">
          <Logo />
          <span className="font-titulo text-xl font-extrabold tracking-tight">PetTag Wood</span>
        </Link>

        {/* Escritorio */}
        <div className="hidden items-center gap-1 sm:flex">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={e.activo ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                e.activo ? "bg-collar-claro text-collar-oscuro" : "text-tinta-suave hover:text-tinta"
              }`}
            >
              {e.texto}
            </Link>
          ))}
          {usuario ? (
            <button onClick={cerrarSesion} className="ml-2 rounded-full px-4 py-2 text-sm font-semibold text-tinta-suave hover:text-alerta">
              Cerrar sesión
            </button>
          ) : (
            <Link href="/login" className="btn-primario text-sm">
              Ingresar
            </Link>
          )}
        </div>

        {/* Móvil */}
        <button
          className="rounded-lg p-2 sm:hidden"
          onClick={() => setRutaMenu(menuAbierto ? null : ruta)}
          aria-expanded={menuAbierto}
          aria-label="Abrir menú"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {menuAbierto && (
        <div className="border-t border-borde px-4 py-3 sm:hidden">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={`block rounded-xl px-3 py-2.5 font-semibold ${e.activo ? "bg-collar-claro text-collar-oscuro" : ""}`}
            >
              {e.texto}
            </Link>
          ))}
          {usuario ? (
            <button onClick={cerrarSesion} className="block w-full rounded-xl px-3 py-2.5 text-left font-semibold text-alerta">
              Cerrar sesión
            </button>
          ) : (
            <Link href="/login" className="btn-primario mt-1 w-full">
              Ingresar
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

// Logo: una placa de madera redonda con huella
export function Logo({ tamano = 34 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="22" r="17" fill="#e2bc8a" stroke="#2b1a10" strokeWidth="2" />
      <circle cx="20" cy="9" r="2.6" fill="#f5faf9" stroke="#2b1a10" strokeWidth="1.5" />
      <g fill="#2b1a10">
        <ellipse cx="20" cy="27" rx="5.5" ry="4.5" />
        <circle cx="13.5" cy="20.5" r="2.3" />
        <circle cx="17.5" cy="17" r="2.3" />
        <circle cx="22.5" cy="17" r="2.3" />
        <circle cx="26.5" cy="20.5" r="2.3" />
      </g>
    </svg>
  );
}
