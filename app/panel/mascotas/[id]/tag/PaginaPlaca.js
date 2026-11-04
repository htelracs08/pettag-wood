"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import DisenadorPlaca from "@/components/DisenadorPlaca";
import { Cargando, Migas, Pasos, Vacio } from "@/components/ui";
import { useMascota } from "@/lib/useMascota";

export default function PaginaPlaca() {
  const { id } = useParams();
  const { mascota, estado } = useMascota(id);

  if (estado === "cargando") return <Cargando />;
  if (estado === "no-existe")
    return <Vacio icono="🔍" titulo="No encontramos esta mascota" accion={<Link href="/panel" className="btn-primario">Ver mis mascotas</Link>} />;

  return (
    <div>
      <Migas items={[{ texto: "Mis mascotas", href: "/panel" }, { texto: mascota.nombre, href: `/panel/mascotas/${id}` }, { texto: "Placa" }]} />
      <h1 className="mb-1 text-4xl font-extrabold">La placa de {mascota.nombre}</h1>
      <p className="mb-4 text-tinta-suave">Paso 3 de 3. Al frente su grabado, atrás el QR que lleva a su perfil.</p>
      <Pasos mascota={mascota} actual="placa" />
      <DisenadorPlaca mascota={mascota} />
    </div>
  );
}
