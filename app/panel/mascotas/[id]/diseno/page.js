import { Suspense } from "react";
import PaginaDiseno from "./PaginaDiseno";

export default function Pagina() {
  return (
    <Suspense fallback={<p className="text-stone-500">Cargando...</p>}>
      <PaginaDiseno />
    </Suspense>
  );
}
