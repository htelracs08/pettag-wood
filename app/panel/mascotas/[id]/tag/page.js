import { Suspense } from "react";
import PaginaPlaca from "./PaginaPlaca";
import { Cargando } from "@/components/ui";

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PaginaPlaca />
    </Suspense>
  );
}
