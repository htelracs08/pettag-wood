"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/Avisos";
import { Campo, Confirmar, Spinner } from "@/components/ui";

const VACIO = { nombre: "", especie: "Perro", raza: "", color: "", edad: "", info_medica: "", notas: "", perdida: false, foto_url: "" };
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

// Crear o editar una mascota. Si recibe "mascota", está en modo edición.
export default function PetForm({ mascota, alGuardar }) {
  const supabase = createClient();
  const router = useRouter();
  const avisar = useAvisos();
  const editando = Boolean(mascota);

  const [datos, setDatos] = useState(mascota ?? VACIO);
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(mascota?.foto_url ?? "");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const [cambios, setCambios] = useState(false);

  function cambiar(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setCambios(true);
  }

  // Prevención de errores (heurística 5): se valida la foto antes de subirla
  function elegirFoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!TIPOS.includes(f.type)) return setErrores((x) => ({ ...x, foto: "Usa una foto JPG, PNG o WEBP." }));
    if (f.size > 5 * 1024 * 1024)
      return setErrores((x) => ({ ...x, foto: `La foto pesa ${(f.size / 1048576).toFixed(1)} MB. El máximo es 5 MB.` }));
    setErrores((x) => ({ ...x, foto: undefined }));
    setArchivo(f);
    setVistaPrevia(URL.createObjectURL(f));
    setCambios(true);
  }

  async function guardar(e) {
    e.preventDefault();
    const nuevos = {};
    if (!datos.nombre.trim()) nuevos.nombre = "Escribe el nombre de tu mascota.";
    if (!editando && !archivo) nuevos.foto = "Agrega una foto: la usaremos para el grabado.";
    if (Object.keys(nuevos).length) return setErrores(nuevos);

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    let foto_url = datos.foto_url;
    if (archivo) {
      const ext = archivo.name.split(".").pop().toLowerCase();
      const ruta = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("fotos").upload(ruta, archivo);
      if (error) {
        setGuardando(false);
        return avisar("No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.", "error");
      }
      foto_url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    }

    const fila = {
      nombre: datos.nombre.trim(),
      especie: datos.especie,
      raza: datos.raza,
      color: datos.color,
      edad: datos.edad,
      info_medica: datos.info_medica,
      notas: datos.notas,
      perdida: datos.perdida,
      foto_url,
    };

    if (editando) {
      const { error } = await supabase.from("mascotas").update(fila).eq("id", mascota.id);
      setGuardando(false);
      if (error) return avisar("No se pudieron guardar los cambios: " + error.message, "error");
      setCambios(false);
      setArchivo(null);
      setDatos((d) => ({ ...d, foto_url }));
      avisar("Cambios guardados");
      alGuardar?.({ ...fila });
    } else {
      const { data, error } = await supabase
        .from("mascotas")
        .insert({ ...fila, dueno_id: user.id })
        .select("id")
        .single();
      setGuardando(false);
      if (error) return avisar("No se pudo registrar: " + error.message, "error");
      avisar(`¡${fila.nombre} quedó registrado! Ahora creemos su grabado.`);
      router.push(`/panel/mascotas/${data.id}/diseno`);
    }
  }

  async function eliminar() {
    setGuardando(true);
    const { error } = await supabase.from("mascotas").delete().eq("id", mascota.id);
    setGuardando(false);
    if (error) return avisar("No se pudo eliminar: " + error.message, "error");
    avisar(`${mascota.nombre} fue eliminado`);
    router.push("/panel");
  }

  return (
    <form onSubmit={guardar} className="tarjeta space-y-7 p-6 sm:p-8" noValidate>
      {/* Foto */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className={`flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-madera-claro text-5xl ${
            errores.foto ? "border-alerta" : "border-madera"
          }`}
        >
          {vistaPrevia ? <img src={vistaPrevia} alt="Foto elegida" className="h-full w-full object-cover" /> : <span aria-hidden>📷</span>}
        </div>
        <div>
          <p className="font-bold">Foto de tu mascota {!editando && <span className="text-alerta">*</span>}</p>
          <ul className="mt-1 space-y-0.5 text-sm text-tinta-suave">
            <li>✓ De frente y bien iluminada</li>
            <li>✓ Fondo simple, sin otras personas o mascotas</li>
            <li>✓ JPG, PNG o WEBP de hasta 5 MB</li>
          </ul>
          <label className="btn-secundario mt-3 cursor-pointer text-sm">
            {vistaPrevia ? "Cambiar foto" : "Elegir foto"}
            <input type="file" accept={TIPOS.join(",")} onChange={elegirFoto} className="sr-only" />
          </label>
          {errores.foto && <p className="mt-2 text-sm font-medium text-alerta">{errores.foto}</p>}
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-xl font-bold">Sobre tu mascota</legend>
        <Campo etiqueta="Nombre *" error={errores.nombre} ayuda="Aparecerá grabado en la placa.">
          <input
            value={datos.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
            maxLength={20}
            aria-invalid={Boolean(errores.nombre)}
            className="input"
          />
        </Campo>
        <Campo etiqueta="Especie">
          <select value={datos.especie} onChange={(e) => cambiar("especie", e.target.value)} className="input">
            <option>Perro</option>
            <option>Gato</option>
            <option>Otro</option>
          </select>
        </Campo>
        <Campo etiqueta="Raza">
          <input value={datos.raza ?? ""} placeholder="Ej: Poodle, mestizo..." onChange={(e) => cambiar("raza", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Color">
          <input value={datos.color ?? ""} placeholder="Ej: blanco con manchas cafés" onChange={(e) => cambiar("color", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Edad">
          <input placeholder="Ej: 3 años" value={datos.edad ?? ""} onChange={(e) => cambiar("edad", e.target.value)} className="input" />
        </Campo>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xl font-bold">Lo que debe saber quien la encuentre</legend>
        <p className="text-sm text-tinta-suave">Esto se muestra en su perfil público al escanear el QR.</p>
        <Campo etiqueta="Salud" ayuda="Alergias, medicamentos o veterinario de confianza.">
          <textarea rows={2} value={datos.info_medica ?? ""} onChange={(e) => cambiar("info_medica", e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Notas" ayuda="Su carácter, señas particulares o si ofreces recompensa.">
          <textarea rows={2} value={datos.notas ?? ""} onChange={(e) => cambiar("notas", e.target.value)} className="input" />
        </Campo>
      </fieldset>

      {editando && (
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${
            datos.perdida ? "border-alerta bg-alerta-claro" : "border-borde"
          }`}
        >
          <input type="checkbox" checked={datos.perdida} onChange={(e) => cambiar("perdida", e.target.checked)} className="mt-1 h-5 w-5 accent-alerta" />
          <span>
            <span className="block font-bold">{datos.nombre || "Mi mascota"} está perdido</span>
            <span className="text-sm text-tinta-suave">Su perfil mostrará un aviso grande pidiendo ayuda para que vuelva a casa.</span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-borde pt-6">
        <button disabled={guardando || (editando && !cambios)} className="btn-primario">
          {guardando && <Spinner />}
          {editando ? "Guardar cambios" : "Registrar y crear su grabado"}
        </button>
        <button type="button" onClick={() => router.push("/panel")} className="btn-secundario">
          {editando && !cambios ? "Volver" : "Cancelar"}
        </button>
        {editando && cambios && <span className="text-sm text-tinta-suave">Tienes cambios sin guardar</span>}
        {editando && (
          <button type="button" onClick={() => setBorrar(true)} className="ml-auto text-sm font-semibold text-alerta hover:underline">
            Eliminar mascota
          </button>
        )}
      </div>

      <Confirmar
        abierto={borrar}
        titulo={`¿Eliminar a ${mascota?.nombre}?`}
        texto="Se borrarán sus datos y pedidos. Si ya tiene una placa, su código QR dejará de funcionar. Esto no se puede deshacer."
        textoConfirmar="Sí, eliminar"
        peligro
        cargando={guardando}
        alConfirmar={eliminar}
        alCancelar={() => setBorrar(false)}
      />
    </form>
  );
}
