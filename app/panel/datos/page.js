"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/Avisos";
import { Campo, Cargando, Migas, Spinner } from "@/components/ui";

// Datos de contacto del dueño: los que verá quien encuentre a la mascota
export default function MisDatos() {
  const supabase = createClient();
  const avisar = useAvisos();
  const [perfil, setPerfil] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cambios, setCambios] = useState(false);
  const [errorWa, setErrorWa] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).maybeSingle();
      setPerfil(data ?? { id: user.id, nombre: "", telefono: "", whatsapp: "", ciudad: "", mostrar_telefono: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiar(campo, valor) {
    setPerfil((p) => ({ ...p, [campo]: valor }));
    setCambios(true);
    if (campo === "whatsapp") setErrorWa("");
  }

  async function guardar(e) {
    e.preventDefault();
    const wa = (perfil.whatsapp ?? "").replace(/\D/g, "");
    if (wa && wa.length < 10) return setErrorWa("Incluye el código de país. Ej: 573001234567 (Colombia) o 593991234567 (Ecuador).");
    setGuardando(true);
    const { error } = await supabase
      .from("perfiles")
      .update({
        nombre: perfil.nombre,
        telefono: perfil.telefono,
        whatsapp: wa,
        ciudad: perfil.ciudad,
        mostrar_telefono: perfil.mostrar_telefono,
      })
      .eq("id", perfil.id);
    setGuardando(false);
    if (error) return avisar("No se pudieron guardar tus datos: " + error.message, "error");
    setCambios(false);
    avisar("Tus datos de contacto quedaron guardados");
  }

  if (!perfil) return <Cargando />;

  const sinContacto = !perfil.telefono && !perfil.whatsapp;

  return (
    <div className="mx-auto max-w-xl">
      <Migas items={[{ texto: "Mis mascotas", href: "/panel" }, { texto: "Mis datos" }]} />
      <h1 className="text-4xl font-extrabold">Mis datos de contacto</h1>
      <p className="mt-1 text-tinta-suave">Así te encontrarán cuando alguien escanee la placa de tu mascota.</p>

      {sinContacto && (
        <p role="alert" className="mt-5 rounded-2xl bg-sol-claro px-4 py-3 text-sm font-medium text-amber-900">
          ⚠️ Aún no tienes teléfono ni WhatsApp. Sin ellos, quien encuentre a tu mascota no podrá contactarte.
        </p>
      )}

      <form onSubmit={guardar} className="tarjeta mt-6 space-y-5 p-6 sm:p-8" noValidate>
        <Campo etiqueta="Tu nombre" ayuda="Se muestra como «Ayúdame a volver con …»">
          <input value={perfil.nombre ?? ""} onChange={(e) => cambiar("nombre", e.target.value)} className="input" />
        </Campo>
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo etiqueta="Teléfono para llamadas">
            <input type="tel" autoComplete="tel" value={perfil.telefono ?? ""} onChange={(e) => cambiar("telefono", e.target.value)} className="input" />
          </Campo>
          <Campo etiqueta="WhatsApp" ayuda="Con código de país, sin + ni espacios." error={errorWa}>
            <input
              type="tel"
              placeholder="573001234567"
              value={perfil.whatsapp ?? ""}
              onChange={(e) => cambiar("whatsapp", e.target.value)}
              aria-invalid={Boolean(errorWa)}
              className="input"
            />
          </Campo>
        </div>
        <Campo etiqueta="Ciudad">
          <input value={perfil.ciudad ?? ""} onChange={(e) => cambiar("ciudad", e.target.value)} className="input" />
        </Campo>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-borde p-4">
          <input
            type="checkbox"
            checked={perfil.mostrar_telefono}
            onChange={(e) => cambiar("mostrar_telefono", e.target.checked)}
            className="mt-1 h-5 w-5 accent-collar"
          />
          <span>
            <span className="block font-bold">Mostrar mi teléfono y WhatsApp en el perfil público</span>
            <span className="text-sm text-tinta-suave">
              Si lo desactivas, solo se verá tu nombre y ciudad. Te recomendamos dejarlo activado.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-5">
          <button disabled={guardando || !cambios} className="btn-primario">
            {guardando && <Spinner />} Guardar mis datos
          </button>
          {cambios && <span className="text-sm text-tinta-suave">Tienes cambios sin guardar</span>}
        </div>
      </form>
    </div>
  );
}
