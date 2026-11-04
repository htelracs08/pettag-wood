import Link from "next/link";

const PASOS = [
  { titulo: "Registra a tu mascota", texto: "Su nombre, una foto y cómo contactarte si se pierde." },
  { titulo: "Convierte su foto en grabado", texto: "Quitamos el fondo y la preparamos para el láser. Tú ajustas cómo queda." },
  { titulo: "Diseña su placa", texto: "Elige forma y tamaño. Al frente su carita, atrás un QR único." },
  { titulo: "Haz tu pedido", texto: "La grabamos en madera y te avisamos cuando esté lista." },
];

export default function Inicio() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="text-5xl font-extrabold sm:text-6xl">Su carita en madera. Tu número a un escaneo.</h1>
          <p className="mt-5 max-w-lg text-lg text-tinta-suave">
            Una placa grabada con láser a partir de la foto de tu mascota, con un código QR. Si se pierde, quien
            la encuentre podrá escribirte al instante, sin descargar nada.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primario px-7 py-3.5 text-lg">
              Crear la placa de mi mascota
            </Link>
            <a href="#como-funciona" className="btn-secundario px-6 py-3.5 text-lg">
              Cómo funciona
            </a>
          </div>
        </div>
        <PlacaHero />
      </section>

      {/* Cómo funciona (es una secuencia real, por eso va numerada) */}
      <section id="como-funciona" className="scroll-mt-24">
        <h2 className="text-4xl font-extrabold">Lista en cuatro pasos</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="tarjeta p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sol font-titulo text-xl font-extrabold">
                {i + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold">{p.titulo}</h3>
              <p className="mt-1 text-tinta-suave">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Qué ve quien la encuentra */}
      <section className="grid items-center gap-10 rounded-3xl bg-collar px-6 py-10 text-white sm:px-10 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-extrabold">Quien la encuentre sabrá qué hacer</h2>
          <p className="mt-3 text-lg text-collar-claro">
            Al escanear el QR se abre su perfil: foto, nombre y botones para llamarte o escribirte por WhatsApp.
            Si la marcas como perdida, aparece un aviso bien visible.
          </p>
          <p className="mt-3 text-collar-claro">Tú decides qué datos se muestran.</p>
        </div>
        <TelefonoMuestra />
      </section>
    </div>
  );
}

function PlacaHero() {
  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 300 360" className="w-full max-w-xs" role="img" aria-label="Placa de madera redonda con la cara de un perro grabada">
        <defs>
          <radialGradient id="madera" cx="40%" cy="35%" r="75%">
            <stop offset="0" stopColor="#ecd0a6" />
            <stop offset="1" stopColor="#d3a46e" />
          </radialGradient>
        </defs>
        {/* argolla */}
        <circle cx="150" cy="38" r="26" fill="none" stroke="#9aa5a3" strokeWidth="7" />
        <g className="placa-balanceo" style={{ transformOrigin: "150px 40px" }}>
          <circle cx="150" cy="200" r="135" fill="url(#madera)" stroke="#b98a55" strokeWidth="4" />
          {/* vetas */}
          <g fill="none" stroke="#b98a55" strokeOpacity=".35" strokeWidth="2">
            <path d="M40 150 Q150 130 260 160" />
            <path d="M28 205 Q150 185 272 215" />
            <path d="M40 262 Q150 245 262 270" />
          </g>
          <circle cx="150" cy="82" r="11" fill="#f5faf9" stroke="#b98a55" strokeWidth="3" />
          {/* perrito grabado */}
          <g fill="#3a2012">
            <path d="M95 150 q-22 10 -18 50 q4 25 22 22 q8 -30 6 -72z" />
            <path d="M205 150 q22 10 18 50 q-4 25 -22 22 q-8 -30 -6 -72z" />
            <path d="M150 128 c-38 0 -55 30 -52 70 c3 40 25 62 52 62 s49 -22 52 -62 c3 -40 -14 -70 -52 -70z" fillOpacity=".18" />
            <circle cx="130" cy="190" r="8" />
            <circle cx="170" cy="190" r="8" />
            <ellipse cx="150" cy="218" rx="13" ry="9" />
            <path d="M150 227 v10 M138 240 q12 8 24 0" stroke="#3a2012" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
          <text x="150" y="300" textAnchor="middle" fontFamily="var(--font-baloo)" fontWeight="800" fontSize="34" fill="#3a2012">
            Duffy
          </text>
        </g>
      </svg>
    </div>
  );
}

function TelefonoMuestra() {
  return (
    <div className="mx-auto w-64 rounded-[2rem] border-8 border-tinta bg-white p-4 text-tinta shadow-2xl">
      <div className="rounded-xl bg-alerta px-3 py-2 text-center text-sm font-bold text-white">Estoy perdido 🧭</div>
      <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-madera-claro text-5xl">🐶</div>
      <p className="mt-3 text-center font-titulo text-2xl font-extrabold">¡Hola! Soy Duffy</p>
      <p className="text-center text-sm text-tinta-suave">Ayúdame a volver con Ana</p>
      <div className="mt-4 space-y-2">
        <div className="rounded-full bg-[#25D366] py-2 text-center text-sm font-bold text-white">Escribir por WhatsApp</div>
        <div className="rounded-full border-2 border-borde py-2 text-center text-sm font-bold">Llamar</div>
      </div>
    </div>
  );
}
