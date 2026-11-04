"use client";

import { createContext, useCallback, useContext, useState } from "react";

// Avisos flotantes (toasts): informan el resultado de cada acción.
// Heurística 1: visibilidad del estado del sistema.
const Contexto = createContext(() => {});

export function ProveedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);

  const avisar = useCallback((texto, tipo = "exito") => {
    const id = Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === "error" ? 7000 : 4000);
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === "error" ? "alert" : "status"}
            className={`aparecer flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 font-medium shadow-lg ${
              a.tipo === "error" ? "bg-alerta text-white" : "bg-tinta text-white"
            }`}
          >
            <span aria-hidden>{a.tipo === "error" ? "⚠️" : "✅"}</span>
            <span>{a.texto}</span>
            <button
              onClick={() => setAvisos((x) => x.filter((y) => y.id !== a.id))}
              className="ml-2 opacity-70 hover:opacity-100"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useAvisos() {
  return useContext(Contexto);
}
