import QRCode from "qrcode";

/*
  Genera el diseño de la placa en SVG, con medidas reales en milímetros.

  Convención para el láser (LightBurn, LaserGRBL, etc.):
    - Rojo  (#FF0000, línea fina) = CORTE: contorno de la placa y agujero de la argolla
    - Negro (#000000, relleno)    = GRABADO: foto, nombre y código QR
*/

export const FORMAS = {
  circulo: { nombre: "Círculo", tamanos: [30, 35, 40, 45, 50], medida: "diámetro", conFoto: true },
  rectangulo: { nombre: "Rectángulo", tamanos: [25, 30, 35, 40], medida: "alto", conFoto: true },
  hueso: { nombre: "Hueso", tamanos: [30, 35, 40, 45], medida: "alto", conFoto: false },
};

export const QR_MINIMO_MM = 17; // por debajo, a muchos celulares les cuesta leerlo en madera
const RADIO_AGUJERO = 1.6; // 3,2 mm: pasa una argolla normal

// ---------- Geometría de cada forma (todas las medidas en mm) ----------
function geometria(forma, t, conImagen) {
  if (forma === "circulo") {
    const s = t;
    return {
      W: s,
      H: s,
      contorno: `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/>`,
      agujero: { cx: s / 2, cy: 3.2 },
      frente: conImagen
        ? { img: { x: 0.2 * s, y: 0.19 * s, w: 0.6 * s, h: 0.5 * s }, nombre: { x: s / 2, y: 0.82 * s, maxW: 0.62 * s, max: 0.12 * s } }
        : { nombre: { x: s / 2, y: 0.55 * s, maxW: 0.78 * s, max: 0.2 * s } },
      reverso: {
        qr: { x: 0.25 * s, y: 0.25 * s, lado: 0.5 * s },
        textos: [
          { t: "Si me encuentras", x: s / 2, y: 0.2 * s, maxW: 0.5 * s, max: 0.062 * s },
          { t: "escanéame", x: s / 2, y: 0.81 * s, maxW: 0.5 * s, max: 0.07 * s },
        ],
        telefono: { x: s / 2, y: 0.89 * s, maxW: 0.55 * s, max: 0.058 * s },
      },
    };
  }

  if (forma === "rectangulo") {
    const H = t, W = 1.7 * t, rx = 0.18 * t;
    return {
      W,
      H,
      contorno: `<rect x="0" y="0" width="${W}" height="${H}" rx="${rx}"/>`,
      agujero: { cx: 0.13 * H, cy: H / 2 },
      frente: conImagen
        ? { img: { x: 0.26 * H, y: 0.08 * H, w: 0.64 * H, h: 0.84 * H }, nombre: { x: 1.29 * H, y: 0.5 * H, maxW: 0.66 * H, max: 0.22 * H } }
        : { nombre: { x: 0.98 * H, y: 0.5 * H, maxW: 1.3 * H, max: 0.3 * H } },
      reverso: {
        qr: { x: 0.27 * H, y: 0.15 * H, lado: 0.7 * H },
        textos: [
          { t: "Si me", x: 1.32 * H, y: 0.3 * H, maxW: 0.6 * H, max: 0.1 * H },
          { t: "encuentras,", x: 1.32 * H, y: 0.44 * H, maxW: 0.6 * H, max: 0.1 * H },
          { t: "escanéame", x: 1.32 * H, y: 0.58 * H, maxW: 0.6 * H, max: 0.1 * H },
        ],
        telefono: { x: 1.32 * H, y: 0.76 * H, maxW: 0.6 * H, max: 0.085 * H },
      },
    };
  }

  // Hueso: dos pares de lóbulos unidos por una barra central
  const H = t, W = 1.7 * t, r = 0.28 * H, b = 0.2 * H;
  const xa = r + Math.sqrt(r * r - (r - b) * (r - b)); // donde la barra toca el lóbulo
  const xo = Math.sqrt(r * r - (H / 2 - r) * (H / 2 - r)); // cruce entre lóbulos
  const n = (v) => +v.toFixed(3);
  const d = [
    `M ${n(xa)} ${n(b)}`,
    `L ${n(W - xa)} ${n(b)}`,
    `A ${n(r)} ${n(r)} 0 1 1 ${n(W - r + xo)} ${n(H / 2)}`,
    `A ${n(r)} ${n(r)} 0 1 1 ${n(W - xa)} ${n(H - b)}`,
    `L ${n(xa)} ${n(H - b)}`,
    `A ${n(r)} ${n(r)} 0 1 1 ${n(r - xo)} ${n(H / 2)}`,
    `A ${n(r)} ${n(r)} 0 1 1 ${n(xa)} ${n(b)}`,
    "Z",
  ].join(" ");
  return {
    W,
    H,
    contorno: `<path d="${d}"/>`,
    agujero: { cx: r * 0.85, cy: r * 0.85 },
    frente: { nombre: { x: W / 2, y: H / 2, maxW: 0.95 * H, max: 0.32 * H } },
    reverso: { qr: { x: (W - 0.5 * H) / 2, y: 0.25 * H, lado: 0.5 * H }, textos: [] },
  };
}

// ---------- Utilidades ----------
const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function texto({ t, x, y, maxW, max }, color) {
  // Ajusta el tamaño para que el texto quepa en el ancho disponible
  const tam = Math.min(max, maxW / (Math.max(t.length, 1) * 0.6));
  return `<text x="${x.toFixed(2)}" y="${(y + tam * 0.35).toFixed(2)}" font-size="${tam.toFixed(2)}" font-family="Arial Rounded MT Bold, Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle" fill="${color}">${escapar(t)}</text>`;
}

function qrSvg(url, { x, y, lado }, color) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const m = qr.modules.data;
  // Une los módulos negros de cada fila en rectángulos (formas cerradas = buen grabado)
  let d = "";
  for (let fila = 0; fila < n; fila++) {
    let col = 0;
    while (col < n) {
      if (m[fila * n + col]) {
        const ini = col;
        while (col < n && m[fila * n + col]) col++;
        d += `M${ini} ${fila}h${col - ini}v1h${ini - col}z`;
      } else col++;
    }
  }
  const escala = lado / n;
  return `<path transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${escala.toFixed(5)})" d="${d}" fill="${color}" shape-rendering="crispEdges"/>`;
}

// ---------- API pública ----------
/**
 * @param {object} o
 * @param {"circulo"|"rectangulo"|"hueso"} o.forma
 * @param {number} o.tamano  mm
 * @param {string} o.nombre
 * @param {string} [o.imagen] imagen del grabado como data URL
 * @param {string} o.url     dirección del perfil público (va en el QR)
 * @param {string} [o.telefono]
 * @param {"vista"|"laser"|"grabado"} o.modo  vista = simulación en madera, laser = corte + grabado, grabado = solo grabado
 */
export function generarPlaca(o) {
  const conImagen = Boolean(o.imagen) && FORMAS[o.forma].conFoto;
  const g = geometria(o.forma, o.tamano, conImagen);
  const vista = o.modo === "vista";
  const tinta = vista ? "#3a2012" : "#000000";

  const contorno = (cara) => {
    if (o.modo === "grabado") return "";
    const agujero = `<circle cx="${g.agujero.cx}" cy="${g.agujero.cy}" r="${RADIO_AGUJERO}"/>`;
    return vista
      ? `<g fill="url(#madera-${cara})" stroke="#b98a55" stroke-width="0.35">${g.contorno}</g>
         <g fill="#f5faf9" stroke="#b98a55" stroke-width="0.35">${agujero}</g>`
      : `<g fill="none" stroke="#FF0000" stroke-width="0.1">${g.contorno}${agujero}</g>`;
  };
  const degradado = (cara) =>
    vista
      ? `<defs><radialGradient id="madera-${cara}" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#ecd0a6"/><stop offset="1" stop-color="#d3a46e"/></radialGradient></defs>`
      : "";

  const f = g.frente;
  const frente =
    degradado("f") +
    contorno("f") +
    (conImagen
      ? `<image href="${o.imagen}" x="${f.img.x}" y="${f.img.y}" width="${f.img.w}" height="${f.img.h}" preserveAspectRatio="xMidYMid meet"${
          vista ? ' style="mix-blend-mode:multiply"' : ""
        }/>`
      : "") +
    texto({ t: o.nombre || "Nombre", ...f.nombre }, tinta);

  const rv = g.reverso;
  const reverso =
    degradado("r") +
    contorno("r") +
    qrSvg(o.url, rv.qr, tinta) +
    rv.textos.map((x) => texto(x, tinta)).join("") +
    (o.telefono && rv.telefono ? texto({ t: o.telefono, ...rv.telefono }, tinta) : "");

  return { W: g.W, H: g.H, frente, reverso, ladoQr: rv.qr.lado, conImagen };
}

// Archivo completo: frente y reverso lado a lado, en milímetros reales
export function svgCompleto(o) {
  const p = generarPlaca(o);
  const sep = 6;
  const W = p.W * 2 + sep;
  const fondo = o.modo === "grabado" ? `<rect width="${W}" height="${p.H}" fill="#ffffff"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${p.H}mm" viewBox="0 0 ${W} ${p.H}">
<!-- PetTag Wood · ${escapar(o.nombre)} · ${FORMAS[o.forma].nombre} ${o.tamano} mm · Rojo = corte, Negro = grabado -->
${fondo}<g id="frente">${p.frente}</g>
<g id="reverso" transform="translate(${p.W + sep} 0)">${p.reverso}</g>
</svg>`;
}

// Convierte el SVG en PNG a 20 px por mm (≈ 508 ppp)
export async function svgAPng(svg, anchoMm) {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await new Promise((ok, mal) => {
    img.onload = ok;
    img.onerror = mal;
    img.src = url;
  });
  const escala = 20;
  const c = document.createElement("canvas");
  c.width = Math.round(anchoMm * escala);
  c.height = Math.round((img.naturalHeight / img.naturalWidth) * c.width);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
