"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/Avisos";
import { Cargando, Confirmar, EstadoPedido, ESTADOS_PEDIDO, Vacio } from "@/components/ui";

export default function Panel() {
  const supabase = createClient();
  const avisar = useAvisos();
  const [mascotas, setMascotas] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [cancelando, setCancelando] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  function obtener() {
    return Promise.all([
      supabase
        .from("mascotas")
        .select("id, nombre, especie, raza, foto_url, diseno_url, perdida, pedidos(id)")
        .order("creado_en", { ascending: false }),
      supabase
        .from("pedidos")
        .select("id, forma, tamano_mm, estado, creado_en, mascotas(nombre, foto_url)")
        .order("creado_en", { ascending: false }),
    ]);
  }

  function cargar() {
    obtener().then(([m, p]) => {
      if (m.error) avisar("No pudimos cargar tus mascotas. Recarga la página.", "error");
      setMascotas(m.data ?? []);
      setPedidos(p.data ?? []);
    });
  }

  useEffect(() => {
    obtener().then(([m, p]) => {
      if (m.error) avisar("No pudimos cargar tus mascotas. Recarga la página.", "error");
      setMascotas(m.data ?? []);
      setPedidos(p.data ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelarPedido() {
    setOcupado(true);
    const { error } = await supabase.from("pedidos").delete().eq("id", cancelando.id);
    setOcupado(false);
    setCancelando(null);
    if (error) return avisar("No se pudo cancelar el pedido: " + error.message, "error");
    avisar("Pedido cancelado");
    cargar();
  }

  if (!mascotas) return <Cargando texto="Cargando tus mascotas..." />;

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold">Mis mascotas</h1>
            <p className="text-tinta-suave">Toca una mascota para seguir con su placa.</p>
          </div>
          {mascotas.length > 0 && (
            <Link href="/panel/mascotas/nueva" className="btn-primario">
              + Agregar mascota
            </Link>
          )}
        </div>

        {mascotas.length === 0 ? (
          <div className="mt-6">
            <Vacio
              titulo="Empieza con tu primera mascota"
              texto="Registra su nombre y una foto. En unos minutos tendrás el diseño de su placa."
              accion={
                <Link href="/panel/mascotas/nueva" className="btn-primario">
                  + Registrar mascota
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mascotas.map((m) => (
              <TarjetaMascota key={m.id} m={m} />
            ))}
          </div>
        )}
      </section>

      {pedidos.length > 0 && (
        <section>
          <h2 className="text-3xl font-extrabold">Mis pedidos</h2>
          <ul className="mt-4 divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-white">
            {pedidos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-madera-claro">
                  {p.mascotas?.foto_url && <img src={p.mascotas.foto_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-40 flex-1">
                  <p className="font-bold">Placa de {p.mascotas?.nombre}</p>
                  <p className="text-sm text-tinta-suave">
                    {nombreForma(p.forma)} de {p.tamano_mm} mm · {new Date(p.creado_en).toLocaleDateString("es")}
                  </p>
                </div>
                <div className="text-right">
                  <EstadoPedido estado={p.estado} />
                  <p className="mt-1 text-xs text-tinta-suave">{ESTADOS_PEDIDO[p.estado]?.ayuda}</p>
                </div>
                {p.estado === "pendiente" && (
                  <button onClick={() => setCancelando(p)} className="text-sm font-semibold text-alerta hover:underline">
                    Cancelar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Confirmar
        abierto={Boolean(cancelando)}
        titulo="¿Cancelar este pedido?"
        texto={`La placa de ${cancelando?.mascotas?.nombre} no se grabará. Podrás pedirla otra vez cuando quieras.`}
        textoConfirmar="Sí, cancelar pedido"
        peligro
        cargando={ocupado}
        alConfirmar={cancelarPedido}
        alCancelar={() => setCancelando(null)}
      />
    </div>
  );
}

function TarjetaMascota({ m }) {
  const pasos = [true, Boolean(m.diseno_url), m.pedidos.length > 0];
  const hechos = pasos.filter(Boolean).length;
  const siguiente = !m.diseno_url
    ? { texto: "Crear su grabado", href: `/panel/mascotas/${m.id}/diseno` }
    : m.pedidos.length === 0
      ? { texto: "Diseñar su placa", href: `/panel/mascotas/${m.id}/tag` }
      : { texto: "Ver su ficha", href: `/panel/mascotas/${m.id}` };

  return (
    <article className="tarjeta overflow-hidden">
      <Link href={`/panel/mascotas/${m.id}`} className="block">
        <div className="relative aspect-[4/3] bg-madera-claro">
          {m.foto_url ? (
            <img src={m.foto_url} alt={`Foto de ${m.nombre}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl" aria-hidden>
              🐾
            </div>
          )}
          {m.perdida && (
            <span className="absolute left-3 top-3 rounded-full bg-alerta px-3 py-1 text-xs font-bold text-white">
              Marcada como perdida
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <h2 className="text-2xl font-bold">{m.nombre}</h2>
        <p className="text-sm text-tinta-suave">{[m.especie, m.raza].filter(Boolean).join(" · ") || "Sin detalles"}</p>

        {/* Barra de progreso de la placa */}
        <div className="mt-3 flex items-center gap-2" aria-label={`${hechos} de 3 pasos completados`}>
          <div className="flex flex-1 gap-1">
            {pasos.map((h, i) => (
              <span key={i} className={`h-2 flex-1 rounded-full ${h ? "bg-collar" : "bg-borde"}`} />
            ))}
          </div>
          <span className="text-xs font-semibold text-tinta-suave">{hechos}/3</span>
        </div>

        <Link href={siguiente.href} className="btn-secundario mt-4 w-full text-sm">
          {siguiente.texto}
        </Link>
      </div>
    </article>
  );
}

function nombreForma(f) {
  return { circulo: "Círculo", hueso: "Hueso", rectangulo: "Rectángulo" }[f] ?? f;
}
