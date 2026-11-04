"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/* Piezas de interfaz compartidas: mismo aspecto en toda la app (heurística 4). */

export function Spinner({ className = "" }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function Campo({ etiqueta, ayuda, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-tinta">{etiqueta}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm font-medium text-alerta">{error}</span>
      ) : (
        ayuda && <span className="mt-1 block text-xs text-tinta-suave">{ayuda}</span>
      )}
    </label>
  );
}

export function Cargando({ texto = "Cargando..." }) {
  return (
    <div className="flex items-center gap-3 py-10 text-tinta-suave" role="status">
      <Spinner /> {texto}
    </div>
  );
}

export function Vacio({ icono = "🐾", titulo, texto, accion }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-madera bg-madera-claro/40 px-6 py-12 text-center">
      <div className="text-5xl" aria-hidden>
        {icono}
      </div>
      <h2 className="mt-3 text-2xl font-bold">{titulo}</h2>
      {texto && <p className="mx-auto mt-1 max-w-md text-tinta-suave">{texto}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

// Migas de pan: el usuario siempre sabe dónde está y cómo volver (heurísticas 3 y 6)
export function Migas({ items }) {
  return (
    <nav aria-label="Ruta" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-tinta-suave">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>›</span>}
          {it.href ? (
            <Link href={it.href} className="font-medium text-collar hover:underline">
              {it.texto}
            </Link>
          ) : (
            <span aria-current="page">{it.texto}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// Progreso de cada mascota: Datos → Diseño → Placa → Pedido (heurísticas 1 y 6)
export function Pasos({ mascota, actual }) {
  const pasos = [
    { id: "datos", texto: "Datos", hecho: true, href: `/panel/mascotas/${mascota.id}` },
    { id: "diseno", texto: "Grabado", hecho: Boolean(mascota.diseno_url), href: `/panel/mascotas/${mascota.id}/diseno` },
    { id: "placa", texto: "Placa y pedido", hecho: (mascota.pedidos?.length ?? 0) > 0, href: `/panel/mascotas/${mascota.id}/tag` },
  ];
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Progreso">
      {pasos.map((p, i) => {
        const esActual = p.id === actual;
        return (
          <li key={p.id}>
            <Link
              href={p.href}
              aria-current={esActual ? "step" : undefined}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                esActual
                  ? "border-collar bg-collar-claro text-collar-oscuro"
                  : "border-borde bg-white text-tinta-suave hover:border-collar"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  p.hecho ? "bg-collar text-white" : "bg-borde text-tinta-suave"
                }`}
              >
                {p.hecho ? "✓" : i + 1}
              </span>
              <span className="truncate">{p.texto}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

// Ventana de confirmación para acciones que no se pueden deshacer (heurísticas 3 y 5)
export function Confirmar({ abierto, titulo, texto, textoConfirmar, peligro, cargando, alConfirmar, alCancelar, children }) {
  const botonCancelar = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    botonCancelar.current?.focus();
    const tecla = (e) => e.key === "Escape" && alCancelar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto, alCancelar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-tinta/40 p-4" onClick={alCancelar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmar"
        className="aparecer w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="titulo-confirmar" className="text-2xl font-bold">
          {titulo}
        </h2>
        {texto && <p className="mt-2 text-tinta-suave">{texto}</p>}
        {children}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button ref={botonCancelar} onClick={alCancelar} className="btn-secundario">
            Cancelar
          </button>
          <button onClick={alConfirmar} disabled={cargando} className={peligro ? "btn-peligro" : "btn-primario"}>
            {cargando && <Spinner />} {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ESTADOS_PEDIDO = {
  pendiente: { texto: "Recibido", clase: "bg-sol-claro text-amber-900", ayuda: "Revisaremos tu pedido pronto." },
  produccion: { texto: "En el láser", clase: "bg-collar-claro text-collar-oscuro", ayuda: "Estamos grabando tu placa." },
  entregado: { texto: "Entregado", clase: "bg-stone-200 text-stone-700", ayuda: "¡Disfruta tu placa!" },
};

export function EstadoPedido({ estado }) {
  const e = ESTADOS_PEDIDO[estado] ?? { texto: estado, clase: "bg-stone-100" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${e.clase}`}>{e.texto}</span>;
}
