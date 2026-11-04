import PetForm from "@/components/PetForm";
import { Migas } from "@/components/ui";

export default function NuevaMascota() {
  return (
    <div className="mx-auto max-w-3xl">
      <Migas items={[{ texto: "Mis mascotas", href: "/panel" }, { texto: "Nueva mascota" }]} />
      <h1 className="text-4xl font-extrabold">Registra a tu mascota</h1>
      <p className="mb-6 mt-1 text-tinta-suave">Paso 1 de 3. Solo el nombre y la foto son obligatorios.</p>
      <PetForm />
    </div>
  );
}
