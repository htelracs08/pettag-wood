"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/Avisos";
import { Campo, Confirmar, Spinner } from "@/components/ui";
import { FORMAS, QR_MINIMO_MM, generarPlaca, svgAPng, svgCompleto } from "@/lib/placa";
import { urlPerfil } from "@/lib/useMascota";

export default function DisenadorPlaca({ mascota }) {
  const supabase = createClient();
  const router = useRouter();
  const avisar = useAvisos();

  const [forma, setForma] = useState("circulo");
  const [tamano, setTamano] = useState(35);
  const [nombre, setNombre] = useState(mascota.nombre);
  const [conTelefono, setConTelefono] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [imagen, setImagen] = useState(null);
  const [cara, setCara] = useState("ambas"); // en móvil se puede ver una cara a la vez

  const [pidiendo, setPidiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  const url = urlPerfil(mascota.codigo_qr);
  const esLocal = url.includes("localhost");

  // El grabado guardado se convierte en data URL para incrustarlo en el SVG
  useEffect(() => {
    if (!mascota.diseno_url) return;
    fetch(mascota.diseno_url)
      .then((r) => r.blob())
      .then(
        (b) =>
          new Promise((ok) => {
            const lector = new FileReader();
            lector.onload = () => ok(lector.result);
            lector.readAsDataURL(b);
          })
      )
      .then(setImagen)
      .catch(() => avisar("No pudimos cargar el grabado. La placa se mostrará sin foto.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mascota.diseno_url]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("perfiles").select("telefono").eq("id", user.id).maybeSingle();
      if (data?.telefono) setTelefono(data.telefono);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarForma(f) {
    setForma(f);
    if (!FORMAS[f].tamanos.includes(tamano)) setTamano(FORMAS[f].tamanos[1]);
  }

  const opciones = { forma, tamano, nombre: nombre.trim() || mascota.nombre, imagen, url, telefono: conTelefono ? telefono : "" };
  const vista = useMemo(() => generarPlaca({ ...opciones, modo: "vista" }), [forma, tamano, nombre, imagen, url, conTelefono, telefono]); // eslint-disable-line react-hooks/exhaustive-deps
  const qrPequeno = vista.ladoQr < QR_MINIMO_MM;
  const archivoBase = `placa-${mascota.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${forma}-${tamano}mm`;

  function descargarSVG() {
    descargar(new Blob([svgCompleto({ ...opciones, modo: "laser" })], { type: "image/svg+xml" }), `${archivoBase}.svg`);
  }
  async function descargarPNG() {
    const svg = svgCompleto({ ...opciones, modo: "grabado" });
    descargar(await svgAPng(svg, vista.W * 2 + 6), `${archivoBase}.png`);
  }

  async function enviarPedido() {
    setEnviando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ruta = `${user.id}/placa-${mascota.id}-${marcaTiempo()}.svg`;
    const archivo = new Blob([svgCompleto({ ...opciones, modo: "laser" })], { type: "image/svg+xml" });
    const { error: errArchivo } = await supabase.storage.from("fotos").upload(ruta, archivo, { contentType: "image/svg+xml" });
    if (errArchivo) {
      setEnviando(false);
      return avisar("No se pudo preparar el archivo de la placa. Intenta de nuevo.", "error");
    }
    const archivo_url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    const { error } = await supabase.from("pedidos").insert({
      mascota_id: mascota.id,
      forma,
      tamano_mm: tamano,
      texto: opciones.nombre,
      observaciones: observaciones.trim() || null,
      archivo_url,
    });
    setEnviando(false);
    if (error) return avisar("No se pudo enviar el pedido: " + error.message, "error");
    avisar(`¡Pedido enviado! Te avisaremos cuando la placa de ${mascota.nombre} esté lista.`);
    router.push("/panel");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Vista previa de ambas caras */}
      <div>
        <div className="mb-3 inline-flex rounded-full bg-white p-1 ring-1 ring-borde sm:hidden" role="tablist">
          {[
            ["ambas", "Ambas"],
            ["frente", "Frente"],
            ["reverso", "Reverso"],
          ].map(([id, t]) => (
            <button key={id} role="tab" aria-selected={cara === id} onClick={() => setCara(id)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${cara === id ? "bg-collar text-white" : "text-tinta-suave"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-borde bg-white p-5 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {(cara === "ambas" || cara === "frente") && <Cara titulo="Frente" W={vista.W} H={vista.H} contenido={vista.frente} />}
            {(cara === "ambas" || cara === "reverso") && <Cara titulo="Reverso" W={vista.W} H={vista.H} contenido={vista.reverso} />}
          </div>
          <p className="mt-5 text-center text-sm text-tinta-suave">
            Tamaño real: {vista.W.toFixed(0)} × {vista.H.toFixed(0)} mm · QR de {vista.ladoQr.toFixed(0)} mm
          </p>
        </div>

        {/* Advertencias (prevención de errores) */}
        {qrPequeno && (
          <p role="alert" className="mt-3 rounded-2xl bg-sol-claro px-4 py-3 text-sm font-medium text-amber-900">
            ⚠️ Con este tamaño el QR mide {vista.ladoQr.toFixed(0)} mm y puede costar leerlo. Te recomendamos {FORMAS[forma].medida} de al menos{" "}
            {FORMAS[forma].tamanos.find((t) => generarPlaca({ ...opciones, tamano: t, modo: "vista" }).ladoQr >= QR_MINIMO_MM) ?? "el máximo"} mm.
          </p>
        )}
        {!mascota.diseno_url && FORMAS[forma].conFoto && (
          <p className="mt-3 rounded-2xl bg-collar-claro px-4 py-3 text-sm text-collar-oscuro">
            La placa va sin foto porque aún no guardas su grabado.{" "}
            <Link href={`/panel/mascotas/${mascota.id}/diseno`} className="font-bold underline">
              Crear el grabado
            </Link>
          </p>
        )}
        {esLocal && (
          <p className="mt-3 rounded-2xl bg-alerta-claro px-4 py-3 text-sm text-alerta">
            El QR apunta a <b>localhost</b> y solo funcionará en tu computadora. Configura NEXT_PUBLIC_SITE_URL antes de grabar placas reales.
          </p>
        )}
      </div>

      {/* Controles */}
      <div className="space-y-6 rounded-3xl border border-borde bg-white p-5">
        <section>
          <h2 className="mb-2 text-lg font-bold">Forma</h2>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(FORMAS).map(([id, f]) => (
              <button
                key={id}
                onClick={() => cambiarForma(id)}
                aria-pressed={forma === id}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm font-semibold ${
                  forma === id ? "border-collar bg-collar-claro text-collar-oscuro" : "border-borde hover:border-collar"
                }`}
              >
                <IconoForma forma={id} />
                {f.nombre}
              </button>
            ))}
          </div>
          {!FORMAS[forma].conFoto && <p className="mt-2 text-xs text-tinta-suave">En forma de hueso el frente lleva solo el nombre.</p>}
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">Tamaño ({FORMAS[forma].medida})</h2>
          <div className="flex flex-wrap gap-2">
            {FORMAS[forma].tamanos.map((t) => (
              <button
                key={t}
                onClick={() => setTamano(t)}
                aria-pressed={tamano === t}
                className={`rounded-full border-2 px-3.5 py-1.5 text-sm font-bold ${
                  tamano === t ? "border-collar bg-collar text-white" : "border-borde hover:border-collar"
                }`}
              >
                {t} mm
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-tinta-suave">Referencia: una moneda grande mide unos 25 mm.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Textos</h2>
          <Campo etiqueta="Nombre en la placa" ayuda={`${nombre.length}/14 caracteres`}>
            <input value={nombre} maxLength={14} onChange={(e) => setNombre(e.target.value)} className="input" />
          </Campo>
          {forma !== "hueso" && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={conTelefono} onChange={(e) => setConTelefono(e.target.checked)} className="mt-0.5 h-4 w-4 accent-collar" />
              <span>
                Grabar mi teléfono en el reverso
                <span className="block text-xs text-tinta-suave">Útil si quien la encuentra no puede escanear.</span>
              </span>
            </label>
          )}
          {conTelefono && forma !== "hueso" && (
            <Campo etiqueta="Teléfono" ayuda={!telefono ? "Agrégalo aquí o en «Mis datos»." : undefined}>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input" />
            </Campo>
          )}
        </section>

        <div className="space-y-2 border-t border-borde pt-5">
          <button onClick={() => setPidiendo(true)} className="btn-primario w-full py-3">
            Pedir esta placa
          </button>
          <details className="text-sm">
            <summary className="cursor-pointer py-1 font-semibold text-tinta-suave">Descargar archivos para el láser</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={descargarSVG} className="btn-secundario px-3 text-sm">SVG</button>
              <button onClick={descargarPNG} className="btn-secundario px-3 text-sm">PNG</button>
            </div>
            <p className="mt-2 text-xs text-tinta-suave">
              SVG en medidas reales: rojo = corte, negro = grabado. El PNG trae solo el grabado (para LaserGRBL).
            </p>
          </details>
        </div>
      </div>

      <Confirmar
        abierto={pidiendo}
        titulo="Confirma tu pedido"
        textoConfirmar="Enviar pedido"
        cargando={enviando}
        alConfirmar={enviarPedido}
        alCancelar={() => setPidiendo(false)}
      >
        <dl className="mt-4 grid grid-cols-2 gap-y-1 rounded-2xl bg-fondo p-4 text-sm">
          <dt className="text-tinta-suave">Mascota</dt>
          <dd className="font-semibold">{mascota.nombre}</dd>
          <dt className="text-tinta-suave">Forma</dt>
          <dd className="font-semibold">{FORMAS[forma].nombre}</dd>
          <dt className="text-tinta-suave">Tamaño</dt>
          <dd className="font-semibold">{vista.W.toFixed(0)} × {vista.H.toFixed(0)} mm</dd>
          <dt className="text-tinta-suave">Texto</dt>
          <dd className="font-semibold">{opciones.nombre}</dd>
        </dl>
        <div className="mt-4">
          <Campo etiqueta="Comentarios (opcional)" ayuda="Ej: dirección de entrega o un detalle especial.">
            <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="input" />
          </Campo>
        </div>
        <p className="mt-3 text-xs text-tinta-suave">Podrás cancelarlo mientras esté en estado «Recibido».</p>
      </Confirmar>
    </div>
  );
}

function Cara({ titulo, W, H, contenido }) {
  return (
    <figure className="flex flex-col items-center">
      <div className="flex aspect-square w-full max-w-64 items-center justify-center">
        <svg
          viewBox={`-1 -1 ${W + 2} ${H + 2}`}
          className="h-auto w-full drop-shadow-md"
          role="img"
          aria-label={`${titulo} de la placa`}
          dangerouslySetInnerHTML={{ __html: contenido }}
        />
      </div>
      <figcaption className="mt-2 text-sm font-semibold text-tinta-suave">{titulo}</figcaption>
    </figure>
  );
}

function IconoForma({ forma }) {
  const comun = { fill: "#e2bc8a", stroke: "#2b1a10", strokeWidth: 1.5 };
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden>
      {forma === "circulo" && <circle cx="20" cy="14" r="12" {...comun} />}
      {forma === "rectangulo" && <rect x="4" y="4" width="32" height="20" rx="4" {...comun} />}
      {forma === "hueso" && (
        <path d="M11 8 h18 a5 5 0 1 1 5 6 a5 5 0 1 1 -5 6 h-18 a5 5 0 1 1 -5 -6 a5 5 0 1 1 5 -6z" {...comun} />
      )}
    </svg>
  );
}

function descargar(blob, nombre) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

function marcaTiempo() {
  return Date.now();
}
