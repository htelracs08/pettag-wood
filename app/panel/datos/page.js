"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Datos de contacto del dueño (los que verá quien encuentre a la mascota)
export default function MisDatos() {
  const supabase = createClient();
  const [perfil, setPerfil] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

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
    setMensaje("");
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    const { error } = await supabase
      .from("perfiles")
      .update({
        nombre: perfil.nombre,
        telefono: perfil.telefono,
        whatsapp: perfil.whatsapp,
        ciudad: perfil.ciudad,
        mostrar_telefono: perfil.mostrar_telefono,
      })
      .eq("id", perfil.id);
    setGuardando(false);
    setMensaje(error ? "Error: " + error.message : "Datos guardados ✔");
  }

  if (!perfil) return <p className="text-stone-500">Cargando...</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-amber-900">Mis datos de contacto</h1>
      <p className="mt-1 text-sm text-stone-600">
        Esto es lo que verá quien encuentre a tu mascota al escanear el QR.
      </p>

      <form onSubmit={guardar} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <Campo etiqueta="Nombre">
          <input value={perfil.nombre ?? ""} onChange={(e) => cambiar("nombre", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Teléfono">
          <input type="tel" value={perfil.telefono ?? ""} onChange={(e) => cambiar("telefono", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="WhatsApp (con código de país, ej: 593991234567)">
          <input type="tel" value={perfil.whatsapp ?? ""} onChange={(e) => cambiar("whatsapp", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Ciudad">
          <input value={perfil.ciudad ?? ""} onChange={(e) => cambiar("ciudad", e.target.value)} className="input" />
        </Campo>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={perfil.mostrar_telefono}
            onChange={(e) => cambiar("mostrar_telefono", e.target.checked)}
          />
          Mostrar mi teléfono y WhatsApp en el perfil público
        </label>

        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
        <button disabled={guardando} className="btn-primario">
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}

function Campo({ etiqueta, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{etiqueta}</span>
      {children}
    </label>
  );
}
