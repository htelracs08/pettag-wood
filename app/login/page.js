"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Campo, Spinner } from "@/components/ui";
import { Logo } from "@/components/Navbar";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();

  const [modo, setModo] = useState("entrar"); // "entrar" o "registro"
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const registro = modo === "registro";

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setMensaje("");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    setCargando(true);

    if (registro) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nombre } } });
      setCargando(false);
      if (error) return setError(traducirError(error.message));
      if (!data.session) return setMensaje("¡Cuenta creada! Abre el enlace que enviamos a tu correo y luego ingresa aquí.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setCargando(false);
      if (error) return setError(traducirError(error.message));
    }

    router.push("/panel");
    router.refresh();
  }

  function cambiarModo() {
    setModo(registro ? "entrar" : "registro");
    setError("");
    setMensaje("");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="tarjeta p-7 sm:p-9">
        <div className="flex justify-center">
          <Logo tamano={52} />
        </div>
        <h1 className="mt-3 text-center text-3xl font-extrabold">{registro ? "Crea tu cuenta" : "Hola de nuevo"}</h1>
        <p className="mt-1 text-center text-tinta-suave">
          {registro ? "Así guardamos las placas de tus mascotas." : "Ingresa para ver a tus mascotas."}
        </p>

        {/* Pestañas: dejan claro en qué modo estás (heurística 1) */}
        <div className="mt-6 grid grid-cols-2 rounded-full bg-fondo p-1" role="tablist">
          {[
            ["entrar", "Ingresar"],
            ["registro", "Crear cuenta"],
          ].map(([id, texto]) => (
            <button
              key={id}
              role="tab"
              aria-selected={modo === id}
              onClick={() => modo !== id && cambiarModo()}
              className={`rounded-full py-2 text-sm font-bold ${modo === id ? "bg-white text-collar shadow-sm" : "text-tinta-suave"}`}
            >
              {texto}
            </button>
          ))}
        </div>

        <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
          {registro && (
            <Campo etiqueta="Tu nombre" ayuda="Lo verá quien encuentre a tu mascota.">
              <input required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" />
            </Campo>
          )}
          <Campo etiqueta="Correo">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Campo>
          <Campo etiqueta="Contraseña" ayuda={registro ? "Mínimo 6 caracteres." : undefined}>
            <div className="relative">
              <input
                type={verPassword ? "text" : "password"}
                required
                autoComplete={registro ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-20"
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute inset-y-0 right-3 text-sm font-semibold text-collar"
              >
                {verPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </Campo>

          {error && (
            <p role="alert" className="rounded-xl bg-alerta-claro px-3 py-2 text-sm font-medium text-alerta">
              {error}
            </p>
          )}
          {mensaje && (
            <p role="status" className="rounded-xl bg-collar-claro px-3 py-2 text-sm font-medium text-collar-oscuro">
              {mensaje}
            </p>
          )}

          <button disabled={cargando} className="btn-primario w-full py-3 text-base">
            {cargando && <Spinner />}
            {cargando ? "Un momento..." : registro ? "Crear mi cuenta" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Errores en lenguaje claro y con la forma de solucionarlos (heurística 9)
function traducirError(msg) {
  if (msg.includes("Invalid login credentials")) return "El correo o la contraseña no coinciden. Revísalos e intenta otra vez.";
  if (msg.includes("already registered")) return "Ese correo ya tiene una cuenta. Usa la pestaña «Ingresar».";
  if (msg.includes("Email not confirmed")) return "Aún no confirmas tu correo. Abre el enlace que te enviamos.";
  if (msg.includes("valid email") || msg.includes("invalid format")) return "Escribe un correo válido, por ejemplo ana@gmail.com.";
  if (msg.includes("rate limit")) return "Hiciste muchos intentos seguidos. Espera un minuto e intenta de nuevo.";
  return "Algo salió mal: " + msg;
}
