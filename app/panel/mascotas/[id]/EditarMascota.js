"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PetForm from "@/components/PetForm";

export default function EditarMascota() {
  const { id } = useParams();
  const supabase = createClient();
  const [mascota, setMascota] = useState(null);
  const [noExiste, setNoExiste] = useState(false);

  useEffect(() => {
    supabase
      .from("mascotas")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => (data ? setMascota(data) : setNoExiste(true)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (noExiste) return <p className="text-stone-500">No se encontró esta mascota.</p>;
  if (!mascota) return <p className="text-stone-500">Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-amber-900">Editar a {mascota.nombre}</h1>
        <Link href={`/panel/mascotas/${mascota.id}/diseno`} className="btn-primario">
          🔥 Crear diseño para láser
        </Link>
      </div>
      <PetForm mascota={mascota} />
    </div>
  );
}
