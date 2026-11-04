"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Carga una mascota del usuario con sus pedidos. estado: "cargando" | "ok" | "no-existe"
export function useMascota(id) {
  const [mascota, setMascota] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    createClient()
      .from("mascotas")
      .select("*, pedidos(id, estado)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setMascota(data);
        setEstado(data ? "ok" : "no-existe");
      });
  }, [id]);

  return { mascota, setMascota, estado };
}

// Dirección pública a la que apunta el QR
export function urlPerfil(codigo) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/p/${codigo}`;
}
