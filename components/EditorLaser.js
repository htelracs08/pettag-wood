"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Tamaño máximo (en píxeles) con el que se procesa la imagen.
// 1200 px alcanza de sobra para un tag de 2–5 cm a 300 ppp.
const TAM_MAX = 1200;

const MODOS = [
  { id: "silueta", nombre: "Silueta", ayuda: "Solo blanco y negro. Ideal para corte o grabado vectorial (SVG)." },
  { id: "tramado", nombre: "Fotograbado", ayuda: "Puntos que simulan sombras. Ideal para grabar la foto en madera." },
  { id: "grises", nombre: "Escala de grises", ayuda: "Para máquinas que controlan la potencia según el tono." },
];

export default function EditorLaser({ mascota }) {
  const supabase = createClient();

  // Imágenes
  const [imgOriginal, setImgOriginal] = useState(null); // HTMLImageElement
  const [imgSinFondo, setImgSinFondo] = useState(null);
  const [usarSinFondo, setUsarSinFondo] = useState(false);

  // Ajustes
  const [modo, setModo] = useState("tramado");
  const [contraste, setContraste] = useState(20);
  const [brillo, setBrillo] = useState(0);
  const [umbral, setUmbral] = useState(128);
  const [invertir, setInvertir] = useState(false);
  const [vista, setVista] = useState("madera"); // "madera" o "byn"

  // Estado
  const [estado, setEstado] = useState("Cargando foto...");
  const [quitandoFondo, setQuitandoFondo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const canvasResultado = useRef(null); // imagen final en blanco y negro (la que se exporta)
  const canvasVista = useRef(null); // vista previa (madera o blanco y negro)

  // 1. Cargar la foto de la mascota
  useEffect(() => {
    if (!mascota.foto_url) return;
    cargarImagen(mascota.foto_url)
      .then((img) => {
        setImgOriginal(img);
        setEstado("");
      })
      .catch(() => setEstado("No se pudo cargar la foto."));
  }, [mascota.foto_url]);

  // 2. Procesar cada vez que cambia un ajuste
  const imagen = usarSinFondo && imgSinFondo ? imgSinFondo : imgOriginal;

  useEffect(() => {
    if (!imagen || !canvasResultado.current) return;
    procesar(imagen, canvasResultado.current, { modo, contraste, brillo, umbral, invertir });
    dibujarVista(canvasResultado.current, canvasVista.current, vista);
  }, [imagen, modo, contraste, brillo, umbral, invertir, vista]);

  // Quitar el fondo (se hace en el navegador, gratis)
  async function quitarFondo() {
    setQuitandoFondo(true);
    setMensaje("");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blobFoto = await (await fetch(mascota.foto_url)).blob();
      const blobSinFondo = await removeBackground(blobFoto, {
        model: "isnet_quint8",
        progress: (clave, actual, total) => {
          if (clave.startsWith("fetch")) {
            setEstado(`Descargando el modelo (solo la primera vez)... ${Math.round((actual / total) * 100)}%`);
          } else {
            setEstado("Quitando el fondo...");
          }
        },
      });
      const img = await cargarImagen(URL.createObjectURL(blobSinFondo));
      setImgSinFondo(img);
      setUsarSinFondo(true);
      setEstado("");
    } catch (e) {
      console.error(e);
      setEstado("");
      setMensaje("No se pudo quitar el fondo. Prueba con otra foto o desde otro navegador (Chrome o Edge).");
    }
    setQuitandoFondo(false);
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
      pathomit: 8, // ignora manchitas muy pequeñas
      ltres: 1,
      qtres: 1,
    });
    // Dejamos solo las zonas negras (lo que se graba)
    svg = svg
      .replace(/<path fill="rgb\(255,255,255\)"[^>]*\/>/g, "")
      .replace(/stroke="rgb\(0,0,0\)" stroke-width="1"/g, 'stroke="none"');
    descargar(new Blob([svg], { type: "image/svg+xml" }), `${nombreArchivo()}.svg`);
  }

  // Guardar el diseño en Supabase para que quede asociado a la mascota
  async function guardarDiseno() {
    setGuardando(true);
    setMensaje("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const blob = await new Promise((r) => canvasResultado.current.toBlob(r, "image/png"));
    const ruta = `${user.id}/diseno-${mascota.id}-${Date.now()}.png`;

    const { error: errSubida } = await supabase.storage.from("fotos").upload(ruta, blob, { contentType: "image/png" });
    if (errSubida) {
      setGuardando(false);
      return setMensaje("No se pudo guardar: " + errSubida.message);
    }
    const url = supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
    const { error } = await supabase.from("mascotas").update({ diseno_url: url }).eq("id", mascota.id);
    setGuardando(false);
    setMensaje(error ? "No se pudo guardar: " + error.message : "Diseño guardado ✔");
  }

  function nombreArchivo() {
    return `pettag-${mascota.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${modo}`;
  }

  if (!mascota.foto_url) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-600">
        Esta mascota no tiene foto.{" "}
        <Link href={`/panel/mascotas/${mascota.id}`} className="font-medium text-amber-800 hover:underline">
          Sube una foto primero
        </Link>
        .
      </div>
    );
  }

  const modoActual = MODOS.find((m) => m.id === modo);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Vista previa */}
      <div>
        <div className="mb-3 flex gap-2 text-sm">
          <BotonPestana activo={vista === "madera"} onClick={() => setVista("madera")}>
            Vista en madera
          </BotonPestana>
          <BotonPestana activo={vista === "byn"} onClick={() => setVista("byn")}>
            Archivo para láser
          </BotonPestana>
        </div>

        <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-4">
          {estado && !imagen ? (
            <p className="text-stone-500">{estado}</p>
          ) : (
            <canvas ref={canvasVista} className="h-auto max-h-[70vh] w-auto max-w-full rounded-lg" />
          )}
        </div>
        {/* Canvas oculto con el resultado real en blanco y negro */}
        <canvas ref={canvasResultado} className="hidden" />

        {estado && imagen && <p className="mt-2 text-sm text-amber-800">{estado}</p>}
      </div>

      {/* Controles */}
      <div className="space-y-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <Seccion titulo="1. Fondo">
          {!imgSinFondo ? (
            <button onClick={quitarFondo} disabled={quitandoFondo || !imgOriginal} className="btn-secundario w-full">
              {quitandoFondo ? "Procesando..." : "✨ Quitar fondo"}
            </button>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={usarSinFondo} onChange={(e) => setUsarSinFondo(e.target.checked)} />
              Usar foto sin fondo
            </label>
          )}
          <p className="mt-1 text-xs text-stone-500">La primera vez tarda un poco porque descarga el modelo de IA.</p>
        </Seccion>

        <Seccion titulo="2. Estilo de grabado">
          <div className="grid grid-cols-3 gap-1">
            {MODOS.map((m) => (
              <BotonPestana key={m.id} activo={modo === m.id} onClick={() => setModo(m.id)}>
                {m.nombre}
              </BotonPestana>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">{modoActual.ayuda}</p>
        </Seccion>

        <Seccion titulo="3. Ajustes">
          <Deslizador etiqueta="Contraste" valor={contraste} min={-100} max={100} onChange={setContraste} />
          <Deslizador etiqueta="Brillo" valor={brillo} min={-100} max={100} onChange={setBrillo} />
          {modo !== "grises" && (
            <Deslizador etiqueta="Umbral (cuánto se quema)" valor={umbral} min={1} max={254} onChange={setUmbral} />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={invertir} onChange={(e) => setInvertir(e.target.checked)} />
            Invertir (para madera oscura)
          </label>
          <button
            onClick={() => {
              setContraste(20);
              setBrillo(0);
              setUmbral(128);
              setInvertir(false);
            }}
            className="text-xs text-amber-800 hover:underline"
          >
            Restablecer ajustes
          </button>
        </Seccion>

        <Seccion titulo="4. Exportar">
          <div className="grid gap-2">
            <button onClick={descargarPNG} disabled={!imagen} className="btn-secundario">
              ⬇ Descargar PNG
            </button>
            <button
              onClick={descargarSVG}
              disabled={!imagen || modo !== "silueta"}
              className="btn-secundario"
              title={modo !== "silueta" ? "El SVG solo está disponible en modo Silueta" : ""}
            >
              ⬇ Descargar SVG {modo !== "silueta" && "(solo Silueta)"}
            </button>
            <button onClick={guardarDiseno} disabled={!imagen || guardando} className="btn-primario">
              {guardando ? "Guardando..." : "Guardar diseño"}
            </button>
          </div>
          {mensaje && <p className="mt-2 text-sm text-stone-700">{mensaje}</p>}
        </Seccion>
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
    <div>
      <h3 className="mb-2 text-sm font-semibold text-stone-800">{titulo}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function BotonPestana({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
        activo ? "bg-amber-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

function Deslizador({ etiqueta, valor, min, max, onChange }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-stone-700">
        {etiqueta} <span className="text-stone-500">{valor}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-800"
      />
    </label>
  );
}
