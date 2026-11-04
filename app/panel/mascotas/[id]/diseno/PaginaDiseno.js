"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import EditorLaser from "@/components/EditorLaser";

export default function PaginaDiseno() {
  const { id } = useParams();
  const supabase = createClient();
  const [mascota, setMascota] = useState(null);
  const [noExiste, setNoExiste] = useState(false);

  useEffect(() => {
    supabase
      .from("mascotas")
      .select("id, nombre, foto_url, diseno_url")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => (data ? setMascota(data) : setNoExiste(true)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (noExiste) return <p className="text-stone-500">No se encontró esta mascota.</p>;
  if (!mascota) return <p className="text-stone-500">Cargando...</p>;

  return (
    <div>
      <Link href={`/panel/mascotas/${id}`} className="text-sm text-amber-800 hover:underline">
        ← Volver a {mascota.nombre}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-amber-900">Diseño para láser de {mascota.nombre}</h1>
      <EditorLaser mascota={mascota} />
    </div>
  );
}
