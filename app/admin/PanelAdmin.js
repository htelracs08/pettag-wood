"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/Avisos";
import { Cargando, ESTADOS_PEDIDO, EstadoPedido, Vacio } from "@/components/ui";
import { FORMAS } from "@/lib/placa";

// Panel para el equipo PetTag Wood: ver pedidos, descargar el archivo y cambiar el estado.
export default function PanelAdmin() {
  const supabase = createClient();
  const avisar = useAvisos();
  const [acceso, setAcceso] = useState("revisando");
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("pendiente");
  const [actualizando, setActualizando] = useState(null);

  async function cargar() {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*, mascotas(nombre, foto_url, codigo_qr, perfiles(nombre, telefono, whatsapp, ciudad))")
      .order("creado_en", { ascending: true });
    if (error) avisar("No se pudieron cargar los pedidos: " + error.message, "error");
    setPedidos(data ?? []);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const { data } = await supabase.from("perfiles").select("es_admin").eq("id", user?.id).maybeSingle();
      if (!data?.es_admin) return setAcceso("no");
      setAcceso("si");
      cargar();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cambiarEstado(p, estado) {
    setActualizando(p.id);
    const { error } = await supabase.from("pedidos").update({ estado }).eq("id", p.id);
    setActualizando(null);
    if (error) return avisar("No se pudo cambiar el estado: " + error.message, "error");
    setPedidos((lista) => lista.map((x) => (x.id === p.id ? { ...x, estado } : x)));
    avisar(`Pedido de ${p.mascotas?.nombre}: ${ESTADOS_PEDIDO[estado].texto}`);
  }

  if (acceso === "revisando") return <Cargando />;
  if (acceso === "no")
    return (
      <Vacio
        icono="🔒"
        titulo="Esta sección es solo para el equipo"
        texto="Si eres parte del equipo, pide que activen «es_admin» en tu perfil."
        accion={<Link href="/panel" className="btn-primario">Ir a mis mascotas</Link>}
      />
    );

  const conteo = (e) => pedidos.filter((p) => p.estado === e).length;
  const visibles = pedidos.filter((p) => filtro === "todos" || p.estado === filtro);

  return (
    <div>
      <h1 className="text-4xl font-extrabold">Pedidos</h1>
      <p className="text-tinta-suave">Descarga el archivo, grábalo y actualiza el estado para que el cliente lo vea.</p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {[...Object.entries(ESTADOS_PEDIDO).map(([id, e]) => [id, e.texto, conteo(id)]), ["todos", "Todos", pedidos.length]].map(([id, texto, n]) => (
          <button
            key={id}
            role="tab"
            aria-selected={filtro === id}
            onClick={() => setFiltro(id)}
            className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold ${filtro === id ? "border-collar bg-collar text-white" : "border-borde bg-white hover:border-collar"}`}
          >
            {texto} <span className="opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="mt-6">
          <Vacio icono="🎉" titulo="Nada por aquí" texto="No hay pedidos en este estado." />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visibles.map((p) => {
            const dueno = p.mascotas?.perfiles;
            const wa = dueno?.whatsapp?.replace(/\D/g, "");
            return (
              <li key={p.id} className="tarjeta grid gap-4 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-madera-claro">
                  {p.mascotas?.foto_url && <img src={p.mascotas.foto_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold">{p.texto || p.mascotas?.nombre}</p>
                    <EstadoPedido estado={p.estado} />
                  </div>
                  <p className="text-sm text-tinta-suave">
                    {FORMAS[p.forma]?.nombre ?? p.forma} · {p.tamano_mm} mm · {new Date(p.creado_en).toLocaleString("es")}
                  </p>
                  <p className="text-sm">
                    {dueno?.nombre ?? "Sin nombre"}
                    {dueno?.ciudad && ` · ${dueno.ciudad}`}
                    {dueno?.telefono && ` · ${dueno.telefono}`}
                    {wa && (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-collar hover:underline">
                        WhatsApp
                      </a>
                    )}
                  </p>
                  {p.observaciones && <p className="mt-1 rounded-lg bg-sol-claro px-2 py-1 text-sm">💬 {p.observaciones}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                  {p.archivo_url && (
                    <a href={p.archivo_url} download className="btn-secundario px-4 py-2 text-sm">
                      Descargar SVG
                    </a>
                  )}
                  <label className="sr-only" htmlFor={`estado-${p.id}`}>Estado</label>
                  <select
                    id={`estado-${p.id}`}
                    value={p.estado}
                    disabled={actualizando === p.id}
                    onChange={(e) => cambiarEstado(p, e.target.value)}
                    className="input py-2 text-sm font-semibold"
                  >
                    {Object.entries(ESTADOS_PEDIDO).map(([id, e]) => (
                      <option key={id} value={id}>
                        {e.texto}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
