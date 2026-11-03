"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();

  const [modo, setModo] = useState("entrar"); // "entrar" o "registro"
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setMensaje("");
    setCargando(true);

    if (modo === "registro") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });
      setCargando(false);
      if (error) return setError(traducirError(error.message));
      if (!data.session) {
        return setMensaje("Cuenta creada. Revisa tu correo para confirmarla y luego ingresa.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setCargando(false);
      if (error) return setError(traducirError(error.message));
    }

    router.push("/panel");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-amber-900">
        {modo === "entrar" ? "Ingresar" : "Crear cuenta"}
      </h1>

      <form onSubmit={enviar} className="mt-6 space-y-4">
        {modo === "registro" && (
          <Campo etiqueta="Tu nombre">
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" />
          </Campo>
        )}
        <Campo etiqueta="Correo">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </Campo>
        <Campo etiqueta="Contraseña (mínimo 6 caracteres)">
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </Campo>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}

        <button disabled={cargando} className="btn-primario w-full">
          {cargando ? "Un momento..." : modo === "entrar" ? "Ingresar" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-600">
        {modo === "entrar" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
        <button
          onClick={() => {
            setModo(modo === "entrar" ? "registro" : "entrar");
            setError("");
            setMensaje("");
          }}
          className="font-medium text-amber-800 hover:underline"
        >
          {modo === "entrar" ? "Regístrate" : "Ingresa"}
        </button>
      </p>
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

function traducirError(msg) {
  if (msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("already registered")) return "Ese correo ya tiene una cuenta. Ingresa en su lugar.";
  if (msg.includes("Email not confirmed")) return "Primero confirma tu correo desde el enlace que te enviamos.";
  return msg;
}
