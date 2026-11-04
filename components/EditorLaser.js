"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAvisos } from "@/components/Avisos";
import { Spinner, Vacio } from "@/components/ui";

// Tamaño máximo (en píxeles) con el que se procesa la imagen.
// 1200 px alcanza de sobra para una placa de 2–5 cm a 300 ppp.
const TAM_MAX = 1200;

const MODOS = [
  { id: "tramado", nombre: "Fotograbado", ayuda: "Puntitos que imitan las sombras de la foto. El más usado para grabar fotos en madera." },
  { id: "silueta", nombre: "Silueta", ayuda: "Solo blanco y negro, con bordes marcados. Permite descargar SVG." },
  { id: "grises", nombre: "Grises", ayuda: "Para máquinas que cambian la potencia según el tono (modo Grayscale)." },
];

// Atajos con valores probados (heurística 7: flexibilidad y eficiencia)
const RECOMENDADOS = [
  { nombre: "Foto detallada", modo: "tramado", contraste: 30, brillo: 0, umbral: 128 },
  { nombre: "Silueta marcada", modo: "silueta", contraste: 40, brillo: 10, umbral: 140 },
];

export default function EditorLaser({ mascota, alGuardar }) {
  const supabase = createClient();
  const avisar = useAvisos();

  const [imgOriginal, setImgOriginal] = useState(null);
  const [imgSinFondo, setImgSinFondo] = useState(null);
  const [usarSinFondo, setUsarSinFondo] = useState(false);

  const [modo, setModo] = useState("tramado");
  const [contraste, setContraste] = useState(20);
  const [brillo, setBrillo] = useState(0);
  const [umbral, setUmbral] = useState(128);
  const [invertir, setInvertir] = useState(false);
  const [vista, setVista] = useState("madera");

  const [estado, setEstado] = useState("Cargando foto...");
  const [quitandoFondo, setQuitandoFondo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const canvasResultado = useRef(null);
  const canvasVista = useRef(null);

  useEffect(() => {
    if (!mascota.foto_url) return;
    cargarImagen(mascota.foto_url)
      .then((img) => {
        setImgOriginal(img);
        setEstado("");
      })
      .catch(() => setEstado("No pudimos abrir la foto. Vuelve a subirla desde la ficha de tu mascota."));
  }, [mascota.foto_url]);

  const imagen = usarSinFondo && imgSinFondo ? imgSinFondo : imgOriginal;

  useEffect(() => {
    if (!imagen || !canvasResultado.current) return;
    procesar(imagen, canvasResultado.current, { modo, contraste, brillo, umbral, invertir });
    dibujarVista(canvasResultado.current, canvasVista.current, vista);
    setGuardado(false);
  }, [imagen, modo, contraste, brillo, umbral, invertir, vista]);

  async function quitarFondo() {
    setQuitandoFondo(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blobFoto = await (await fetch(mascota.foto_url)).blob();
      const blobSinFondo = await removeBackground(blobFoto, {
        model: "isnet_quint8",
        progress: (clave, actual, total) => {
          setEstado(
            clave.startsWith("fetch")
              ? `Preparando la herramienta (solo la primera vez)... ${Math.round((actual / total) * 100)}%`
              : "Quitando el fondo..."
          );
        },
      });
      const img = await cargarImagen(URL.createObjectURL(blobSinFondo));
      setImgSinFondo(img);
      setUsarSinFondo(true);
      avisar("Fondo quitado");
    } catch (e) {
      console.error(e);
      avisar("No pudimos quitar el fondo. Prueba en Chrome o Edge, o con una foto de fondo más simple.", "error");
    }
    setEstado("");
    setQuitandoFondo(false);
  }

  function aplicarRecomendado(r) {
    setModo(r.modo);
    setContraste(r.contraste);
    setBrillo(r.brillo);
    setUmbral(r.umbral);
    setInvertir(false);
  }

  function descargarPNG() {
    canvasResultado.current.toBlob((blob) => descargar(blob, `${nombreArchivo()}.png`), "image/png");
  }

  async function descargarSVG() {
    const ImageTracer = (await import("imagetracerjs")).default;
    const c = canvasResultado.current;
    const datos = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    let svg = ImageTracer.imagedataToSVG(datos, {
      numberofcolors: 2,
      colorsampling: 0,
      pal: [
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 },
      ],
      pathomit: 8,
      ltres: 1,
      qtres: 1,
    });
    svg = svg
      .replace(/<path fill="rgb\(255,255,255\)"[^>]*\/>/g, "")
      .replace(/stroke="rgb\(0,0,0\)" stroke-width="1"/g, 'stroke="none"');
    descargar(new Blob([svg], { type: "image/svg+xml" }), `${nombreArchivo()}.svg`);
  }

  async function guardarDiseno() {
    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const blob = await new Promise((r) => canvasResultado.current.toBlob(r, "image/png"));
    const ruta = `${user.id}/diseno-${mascota.id}-${Date.now()}.png`;

    const { error: errSubida } = await supabase.storage.from("fotos").upload(ruta, blob, { contentType: "image/png" });
    if (errSubida) {
      setGuardando(false);
      return avisar("No se pudo guardar el grabado. Revisa tu conexión e intenta otra vez.", "error");
    }
    const url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    const { error } = await supabase.from("mascotas").update({ diseno_url: url }).eq("id", mascota.id);
    setGuardando(false);
    if (error) return avisar("No se pudo guardar el grabado: " + error.message, "error");
    setGuardado(true);
    alGuardar?.(url);
    avisar("Grabado guardado. ¡Ahora diseña su placa!");
  }

  function nombreArchivo() {
    return `pettag-${mascota.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${modo}`;
  }

  if (!mascota.foto_url) {
    return (
      <Vacio
        icono="📷"
        titulo="Falta la foto"
        texto="Para crear el grabado necesitamos una foto de tu mascota."
        accion={<Link href={`/panel/mascotas/${mascota.id}`} className="btn-primario">Subir una foto</Link>}
      />
    );
  }

  const modoActual = MODOS.find((m) => m.id === modo);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Vista previa */}
      <div>
        <div className="mb-3 inline-flex rounded-full bg-white p-1 ring-1 ring-borde" role="tablist" aria-label="Tipo de vista">
          <BotonPestana activo={vista === "madera"} onClick={() => setVista("madera")}>
            Así se verá en madera
          </BotonPestana>
          <BotonPestana activo={vista === "byn"} onClick={() => setVista("byn")}>
            Archivo para el láser
          </BotonPestana>
        </div>

        <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-3xl border border-borde bg-white p-5">
          {!imagen ? (
            <p className="flex items-center gap-2 text-tinta-suave">
              {!estado.startsWith("No") && <Spinner />} {estado}
            </p>
          ) : (
            <canvas ref={canvasVista} className="h-auto max-h-[65vh] w-auto max-w-full rounded-xl" />
          )}
          {imagen && quitandoFondo && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80" role="status">
              <p className="flex items-center gap-2 rounded-full bg-tinta px-4 py-2 font-semibold text-white">
                <Spinner /> {estado || "Procesando..."}
              </p>
            </div>
          )}
        </div>
        <canvas ref={canvasResultado} className="hidden" />
      </div>

      {/* Controles */}
      <div className="space-y-6 rounded-3xl border border-borde bg-white p-5">
        <Seccion titulo="Fondo">
          {!imgSinFondo ? (
            <>
              <button onClick={quitarFondo} disabled={quitandoFondo || !imgOriginal} className="btn-sol w-full">
                {quitandoFondo ? <Spinner /> : "✨"} {quitandoFondo ? "Quitando fondo..." : "Quitar fondo automáticamente"}
              </button>
              <p className="text-xs text-tinta-suave">Recomendado: así solo se graba tu mascota. La primera vez tarda unos segundos.</p>
            </>
          ) : (
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={usarSinFondo} onChange={(e) => setUsarSinFondo(e.target.checked)} className="h-5 w-5 accent-collar" />
              Usar la foto sin fondo
            </label>
          )}
        </Seccion>

        <Seccion titulo="Estilo de grabado">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-fondo p-1">
            {MODOS.map((m) => (
              <BotonPestana key={m.id} activo={modo === m.id} onClick={() => setModo(m.id)}>
                {m.nombre}
              </BotonPestana>
            ))}
          </div>
          <p className="text-sm text-tinta-suave">{modoActual.ayuda}</p>
        </Seccion>

        <Seccion titulo="Ajustes">
          <div className="flex flex-wrap gap-2">
            {RECOMENDADOS.map((r) => (
              <button key={r.nombre} onClick={() => aplicarRecomendado(r)} className="rounded-full bg-collar-claro px-3 py-1 text-xs font-bold text-collar-oscuro hover:bg-collar hover:text-white">
                ⚡ {r.nombre}
              </button>
            ))}
          </div>
          <Deslizador etiqueta="Contraste" valor={contraste} min={-100} max={100} onChange={setContraste} />
          <Deslizador etiqueta="Brillo" valor={brillo} min={-100} max={100} onChange={setBrillo} />
          {modo !== "grises" && (
            <Deslizador etiqueta="Intensidad del quemado" valor={256 - umbral} min={2} max={255} onChange={(v) => setUmbral(256 - v)} />
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={invertir} onChange={(e) => setInvertir(e.target.checked)} className="h-4 w-4 accent-collar" />
            Invertir colores (para madera oscura)
          </label>
          <button
            onClick={() => aplicarRecomendado({ modo, contraste: 20, brillo: 0, umbral: 128 })}
            className="text-sm font-semibold text-collar hover:underline"
          >
            ↺ Deshacer ajustes
          </button>
        </Seccion>

        <div className="space-y-2 border-t border-borde pt-5">
          {guardado ? (
            <Link href={`/panel/mascotas/${mascota.id}/tag`} className="btn-primario w-full py-3">
              Siguiente: diseñar la placa
            </Link>
          ) : (
            <button onClick={guardarDiseno} disabled={!imagen || guardando} className="btn-primario w-full py-3">
              {guardando && <Spinner />} Guardar este grabado
            </button>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer py-1 font-semibold text-tinta-suave">Descargar archivos</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={descargarPNG} disabled={!imagen} className="btn-secundario px-3 text-sm">
                PNG
              </button>
              <button
                onClick={descargarSVG}
                disabled={!imagen || modo !== "silueta"}
                className="btn-secundario px-3 text-sm"
                title={modo !== "silueta" ? "Disponible solo en estilo Silueta" : ""}
              >
                SVG
              </button>
            </div>
            {modo !== "silueta" && <p className="mt-1 text-xs text-tinta-suave">El SVG solo está disponible en estilo Silueta.</p>}
          </details>
        </div>
      </div>
    </div>
  );
}

/* ================= Procesamiento de imagen ================= */

function cargarImagen(url) {
  // Se descarga como blob para que el canvas pueda exportar sin problemas de permisos (CORS)
  return fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error("No se pudo descargar");
      return r.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        })
    );
}

function procesar(img, canvas, { modo, contraste, brillo, umbral, invertir }) {
  const escala = Math.min(1, TAM_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * escala);
  const h = Math.round(img.naturalHeight * escala);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const datos = ctx.getImageData(0, 0, w, h);
  const p = datos.data;

  // Contraste y brillo -> tono de gris (0 = negro, 255 = blanco)
  const c = contraste * 2.55;
  const f = (259 * (c + 255)) / (255 * (259 - c));
  const b = brillo * 1.5;
  const gris = new Float32Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const r = p[i * 4], g = p[i * 4 + 1], bl = p[i * 4 + 2], a = p[i * 4 + 3] / 255;
    let v = 0.299 * r + 0.587 * g + 0.114 * bl;
    v = v * a + 255 * (1 - a); // lo transparente (fondo quitado) cuenta como blanco = no se graba
    v = f * (v - 128) + 128 + b;
    gris[i] = Math.max(0, Math.min(255, v));
  }

  if (modo === "tramado") {
    // Tramado Floyd–Steinberg: convierte tonos en puntos negros
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const viejo = gris[i];
        const nuevo = viejo < umbral ? 0 : 255;
        gris[i] = nuevo;
        const err = viejo - nuevo;
        if (x + 1 < w) gris[i + 1] += (err * 7) / 16;
        if (y + 1 < h) {
          if (x > 0) gris[i + w - 1] += (err * 3) / 16;
          gris[i + w] += (err * 5) / 16;
          if (x + 1 < w) gris[i + w + 1] += (err * 1) / 16;
        }
      }
    }
  } else if (modo === "silueta") {
    for (let i = 0; i < w * h; i++) gris[i] = gris[i] < umbral ? 0 : 255;
  }

  for (let i = 0; i < w * h; i++) {
    let v = Math.max(0, Math.min(255, gris[i]));
    if (invertir) v = 255 - v;
    p[i * 4] = p[i * 4 + 1] = p[i * 4 + 2] = v;
    p[i * 4 + 3] = 255;
  }
  ctx.putImageData(datos, 0, 0);
}

function dibujarVista(origen, destino, vista) {
  if (!destino) return;
  const w = origen.width, h = origen.height;
  destino.width = w;
  destino.height = h;
  const ctx = destino.getContext("2d");

  if (vista === "byn") {
    ctx.drawImage(origen, 0, 0);
    return;
  }

  // Simulación de madera: fondo con vetas + zonas negras como "quemado"
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#d9b48a");
  grad.addColorStop(0.5, "#cfa274");
  grad.addColorStop(1, "#c4956a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(120, 72, 36, 0.12)";
  for (let y = 0; y < h; y += 7) {
    ctx.lineWidth = 1 + ((y * 13) % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 40) ctx.lineTo(x, y + Math.sin((x + y * 3) / 90) * 4);
    ctx.stroke();
  }

  const fuente = origen.getContext("2d").getImageData(0, 0, w, h).data;
  const madera = ctx.getImageData(0, 0, w, h);
  const m = madera.data;
  for (let i = 0; i < w * h; i++) {
    const quemado = 1 - fuente[i * 4] / 255; // 1 = negro = quemado
    m[i * 4] = m[i * 4] * (1 - quemado) + 58 * quemado;
    m[i * 4 + 1] = m[i * 4 + 1] * (1 - quemado) + 32 * quemado;
    m[i * 4 + 2] = m[i * 4 + 2] * (1 - quemado) + 18 * quemado;
  }
  ctx.putImageData(madera, 0, 0);
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ================= Piezas de interfaz ================= */

function Seccion({ titulo, children }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold">{titulo}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function BotonPestana({ activo, onClick, children }) {
  return (
    <button
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        activo ? "bg-collar text-white" : "text-tinta-suave hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}

function Deslizador({ etiqueta, valor, min, max, onChange }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between font-medium">
        {etiqueta} <span className="tabular-nums text-tinta-suave">{valor}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-collar"
      />
    </label>
  );
}
