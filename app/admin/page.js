import { Suspense } from "react";
import PanelAdmin from "./PanelAdmin";
import { Cargando } from "@/components/ui";

export default function Pagina() {
  return (
    <Suspense fallback={<Cargando />}>
      <PanelAdmin />
    </Suspense>
  );
}
