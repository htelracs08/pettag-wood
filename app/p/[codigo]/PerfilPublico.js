"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Cargando } from "@/components/ui";
import { Logo } from "@/components/Navbar";

// Lo que ve quien encuentra a la mascota. Pensado para celular y para alguien con prisa:
// lo primero que aparece es cómo contactar al dueño.
export default function PerfilPublico() {
  const { codigo } = useParams();
  const [m, setM] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    createClient()
      .rpc("perfil_publico", { codigo })
      .then(({ data, error }) => {
        if (error || !data?.length) return setEstado("no-existe");
        setM(data[0]);
        setEstado("ok");
      });
  }, [codigo]);

  if (estado === "cargando") return <Cargando texto="Buscando a esta mascota..." />;

  if (estado === "no-existe")
    return (
      <div className="mx-auto max-w-sm py-10 text-center">
        <Logo tamano={64} />
        <h1 className="mt-4 text-3xl font-extrabold">No encontramos esta placa</h1>
        <p className="mt-2 text-tinta-suave">
          El código puede estar dañado o la mascota fue dada de baja. Si encontraste una mascota, llévala al veterinario
          más cercano: pueden revisar si tiene microchip.
        </p>
      </div>
    );

  const whatsapp = m.whatsapp?.replace(/\D/g, "");
  const mensaje = encodeURIComponent(`¡Hola! Encontré a ${m.nombre}. Escaneé su placa PetTag Wood.`);
  const hayContacto = Boolean(whatsapp || m.telefono);

  return (
    <div className="mx-auto max-w-md">
      {m.perdida && (
        <div role="alert" className="mb-5 rounded-3xl bg-alerta p-5 text-center text-white">
          <p className="font-titulo text-3xl font-extrabold">Estoy perdido</p>
          <p className="mt-1 text-alerta-claro">Mi familia me está buscando. Por favor avísales que estoy contigo.</p>
        </div>
      )}

      <div className="tarjeta overflow-hidden text-center">
        <div className="bg-madera-claro px-6 pb-6 pt-8">
          <div className="mx-auto h-44 w-44 overflow-hidden rounded-full border-8 border-white bg-madera shadow-md">
            {m.foto_url ? (
              <img src={m.foto_url} alt={`Foto de ${m.nombre}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl" aria-hidden>
                🐾
              </div>
            )}
          </div>
          <h1 className="mt-4 text-4xl font-extrabold">¡Hola! Soy {m.nombre}</h1>
          {m.dueno_nombre && <p className="mt-1 text-lg text-tinta-suave">Ayúdame a volver con {m.dueno_nombre}</p>}
        </div>

        <div className="space-y-3 p-6">
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}?text=${mensaje}`} className="btn w-full bg-[#1f9e4e] py-3.5 text-lg text-white hover:bg-[#178040]">
              Escribir por WhatsApp
            </a>
          )}
          {m.telefono && (
            <a href={`tel:${m.telefono}`} className="btn-secundario w-full py-3.5 text-lg">
              Llamar al {m.telefono}
            </a>
          )}
          {!hayContacto && (
            <p className="rounded-2xl bg-fondo p-4 text-sm text-tinta-suave">
              Su familia no dejó un teléfono visible. Llévalo al veterinario o refugio más cercano{m.ciudad ? ` en ${m.ciudad}` : ""}.
            </p>
          )}
        </div>
      </div>

      <dl className="tarjeta mt-4 divide-y divide-borde">
        <Dato titulo="Especie" valor={[m.especie, m.raza].filter(Boolean).join(" · ")} />
        <Dato titulo="Color" valor={m.color} />
        <Dato titulo="Edad" valor={m.edad} />
        <Dato titulo="Ciudad" valor={m.ciudad} />
        <Dato titulo="Salud" valor={m.info_medica} destacar />
        <Dato titulo="Notas" valor={m.notas} />
      </dl>

      <p className="mt-8 text-center text-sm text-tinta-suave">
        Placa creada con{" "}
        <Link href="/" className="font-semibold text-collar hover:underline">
          PetTag Wood
        </Link>
      </p>
    </div>
  );
}

function Dato({ titulo, valor, destacar }) {
  if (!valor) return null;
  return (
    <div className={`px-5 py-3 ${destacar ? "bg-sol-claro" : ""}`}>
      <dt className="text-sm font-semibold text-tinta-suave">{titulo}</dt>
      <dd className="mt-0.5 whitespace-pre-line">{valor}</dd>
    </div>
  );
}
