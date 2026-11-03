"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Panel: lista de mascotas del usuario
export default function Panel() {
  const supabase = createClient();
  const [mascotas, setMascotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("mascotas")
      .select("id, nombre, especie, raza, foto_url, codigo_qr, perdida")
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setMascotas(data ?? []);
        setCargando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-900">Mis mascotas</h1>
        <Link href="/panel/mascotas/nueva" className="btn-primario">
          + Agregar mascota
        </Link>
      </div>

      {error && <p className="mt-4 text-red-600">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-stone-500">Cargando...</p>
      ) : mascotas.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          Todavía no registras ninguna mascota.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mascotas.map((m) => (
            <Link
              key={m.id}
              href={`/panel/mascotas/${m.id}`}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
            >
              {m.foto_url ? (
                <img src={m.foto_url} alt={m.nombre} className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center bg-amber-50 text-4xl">🐾</div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{m.nombre}</h2>
                  {m.perdida && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Perdida</span>
                  )}
                </div>
                <p className="text-sm text-stone-500">
                  {[m.especie, m.raza].filter(Boolean).join(" · ") || "Sin detalles"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
