"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const VACIO = {
  nombre: "",
  especie: "Perro",
  raza: "",
  color: "",
  edad: "",
  info_medica: "",
  notas: "",
  perdida: false,
  foto_url: "",
};

// Formulario para crear o editar una mascota.
// Si recibe "mascota", está en modo edición.
export default function PetForm({ mascota }) {
  const supabase = createClient();
  const router = useRouter();
  const editando = Boolean(mascota);

  const [datos, setDatos] = useState(mascota ?? VACIO);
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(mascota?.foto_url ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function cambiar(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  function elegirFoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("La foto pesa más de 5 MB. Elige una más liviana.");
      return;
    }
    setError("");
    setArchivo(f);
    setVistaPrevia(URL.createObjectURL(f));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    // 1. Subir la foto (si eligió una nueva) a la carpeta del usuario
    let foto_url = datos.foto_url;
    if (archivo) {
      const ext = archivo.name.split(".").pop().toLowerCase();
      const ruta = `${user.id}/${Date.now()}.${ext}`;
      const { error: errSubida } = await supabase.storage.from("fotos").upload(ruta, archivo);
      if (errSubida) {
        setGuardando(false);
        return setError("No se pudo subir la foto: " + errSubida.message);
      }
      foto_url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    }

    // 2. Guardar los datos
    const fila = {
      nombre: datos.nombre,
      especie: datos.especie,
      raza: datos.raza,
      color: datos.color,
      edad: datos.edad,
      info_medica: datos.info_medica,
      notas: datos.notas,
      perdida: datos.perdida,
      foto_url,
    };

    const { error: errDatos } = editando
      ? await supabase.from("mascotas").update(fila).eq("id", mascota.id)
      : await supabase.from("mascotas").insert({ ...fila, dueno_id: user.id });

    setGuardando(false);
    if (errDatos) return setError("No se pudo guardar: " + errDatos.message);

    router.push("/panel");
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar a ${mascota.nombre}? Su código QR dejará de funcionar.`)) return;
    const { error } = await supabase.from("mascotas").delete().eq("id", mascota.id);
    if (error) return setError(error.message);
    router.push("/panel");
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="space-y-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      {/* Foto */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-50 text-5xl">
          {vistaPrevia ? <img src={vistaPrevia} alt="Vista previa" className="h-full w-full object-cover" /> : "🐾"}
        </div>
        <div className="text-sm text-stone-600">
          <p className="font-medium text-stone-800">Foto de tu mascota</p>
          <p className="mt-1">
            Usa una foto bien iluminada, de frente y con fondo simple. Así el grabado queda mejor. Máximo 5 MB.
          </p>
          <label className="btn-secundario mt-3 inline-block cursor-pointer">
            {vistaPrevia ? "Cambiar foto" : "Elegir foto"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegirFoto} className="hidden" />
          </label>
        </div>
      </div>

      {/* Datos básicos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre *">
          <input required value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Especie">
          <select value={datos.especie} onChange={(e) => cambiar("especie", e.target.value)} className="input">
            <option>Perro</option>
            <option>Gato</option>
            <option>Otro</option>
          </select>
        </Campo>
        <Campo etiqueta="Raza">
          <input value={datos.raza ?? ""} onChange={(e) => cambiar("raza", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Color">
          <input value={datos.color ?? ""} onChange={(e) => cambiar("color", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Edad">
          <input
            placeholder="Ej: 3 años"
            value={datos.edad ?? ""}
            onChange={(e) => cambiar("edad", e.target.value)}
            className="input"
          />
        </Campo>
      </div>

      {/* Información complementaria */}
      <Campo etiqueta="Información médica (alergias, medicación, veterinario)">
        <textarea
          rows={3}
          value={datos.info_medica ?? ""}
          onChange={(e) => cambiar("info_medica", e.target.value)}
          className="input"
        />
      </Campo>
      <Campo etiqueta="Notas (carácter, señas particulares, recompensa...)">
        <textarea rows={3} value={datos.notas ?? ""} onChange={(e) => cambiar("notas", e.target.value)} className="input" />
      </Campo>

      {editando && (
        <label className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <input type="checkbox" checked={datos.perdida} onChange={(e) => cambiar("perdida", e.target.checked)} />
          Mi mascota está perdida (se mostrará un aviso en su perfil público)
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={guardando} className="btn-primario">
          {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Registrar mascota"}
        </button>
        <button type="button" onClick={() => router.push("/panel")} className="btn-secundario">
          Cancelar
        </button>
        {editando && (
          <button type="button" onClick={eliminar} className="ml-auto text-sm text-red-600 hover:underline">
            Eliminar mascota
          </button>
        )}
      </div>
    </form>
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
