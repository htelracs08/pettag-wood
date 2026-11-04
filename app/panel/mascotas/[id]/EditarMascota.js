"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import PetForm from "@/components/PetForm";
import { Cargando, Migas, Pasos, Vacio } from "@/components/ui";
import { urlPerfil, useMascota } from "@/lib/useMascota";

export default function EditarMascota() {
  const { id } = useParams();
  const { mascota, setMascota, estado } = useMascota(id);

  if (estado === "cargando") return <Cargando />;
  if (estado === "no-existe")
    return (
      <Vacio
        icono="🔍"
        titulo="No encontramos esta mascota"
        texto="Puede que haya sido eliminada."
        accion={<Link href="/panel" className="btn-primario">Ver mis mascotas</Link>}
      />
    );

  return (
    <div className="mx-auto max-w-3xl">
      <Migas items={[{ texto: "Mis mascotas", href: "/panel" }, { texto: mascota.nombre }]} />
      <h1 className="mb-4 text-4xl font-extrabold">{mascota.nombre}</h1>
      <Pasos mascota={mascota} actual="datos" />

      {/* Siguiente paso sugerido + acceso al perfil público */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={mascota.diseno_url ? `/panel/mascotas/${id}/tag` : `/panel/mascotas/${id}/diseno`}
          className="flex items-center gap-4 rounded-2xl bg-collar p-4 text-white hover:bg-collar-oscuro"
        >
          <span className="text-3xl" aria-hidden>{mascota.diseno_url ? "🏷️" : "🔥"}</span>
          <span>
            <span className="block font-bold">{mascota.diseno_url ? "Diseñar su placa" : "Crear su grabado"}</span>
            <span className="text-sm text-collar-claro">Siguiente paso</span>
          </span>
        </Link>
        <a
          href={urlPerfil(mascota.codigo_qr)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 rounded-2xl border-2 border-borde bg-white p-4 hover:border-collar"
        >
          <span className="text-3xl" aria-hidden>📱</span>
          <span>
            <span className="block font-bold">Ver su perfil público</span>
            <span className="text-sm text-tinta-suave">Lo que verá quien escanee el QR</span>
          </span>
        </a>
      </div>

      <PetForm mascota={mascota} alGuardar={(cambios) => setMascota((m) => ({ ...m, ...cambios }))} />
    </div>
  );
}
