import Link from "next/link";

// Página de inicio provisional (se mejora en la semana 4)
export default function Inicio() {
  return (
    <section className="py-12 text-center">
      <h1 className="text-4xl font-bold text-amber-900">PetTag Wood</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-stone-600">
        Convierte la foto de tu mascota en una placa de madera grabada con láser,
        con un código QR para que te encuentren si se pierde.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block rounded-lg bg-amber-800 px-6 py-3 font-medium text-white hover:bg-amber-900"
      >
        Crear mi tag
      </Link>
    </section>
  );
}
