import { Suspense } from "react";
import EditarMascota from "./EditarMascota";

export default function Pagina() {
  return (
    <Suspense fallback={<p className="text-stone-500">Cargando...</p>}>
      <EditarMascota />
    </Suspense>
  );
}
