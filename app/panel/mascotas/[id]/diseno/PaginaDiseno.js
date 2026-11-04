"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import EditorLaser from "@/components/EditorLaser";
import { Cargando, Migas, Pasos, Vacio } from "@/components/ui";
import { useMascota } from "@/lib/useMascota";

export default function PaginaDiseno() {
  const { id } = useParams();
  const { mascota, setMascota, estado } = useMascota(id);

  if (estado === "cargando") return <Cargando />;
  if (estado === "no-existe")
    return <Vacio icono="🔍" titulo="No encontramos esta mascota" accion={<Link href="/panel" className="btn-primario">Ver mis mascotas</Link>} />;

  return (
    <div>
      <Migas items={[{ texto: "Mis mascotas", href: "/panel" }, { texto: mascota.nombre, href: `/panel/mascotas/${id}` }, { texto: "Grabado" }]} />
      <h1 className="mb-1 text-4xl font-extrabold">El grabado de {mascota.nombre}</h1>
      <p className="mb-4 text-tinta-suave">Paso 2 de 3. Ajusta cómo se verá su foto quemada en la madera.</p>
      <Pasos mascota={mascota} actual="diseno" />
      <EditorLaser mascota={mascota} alGuardar={(url) => setMascota((m) => ({ ...m, diseno_url: url }))} />
    </div>
  );
}
