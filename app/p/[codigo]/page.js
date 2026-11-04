import { Suspense } from "react";
import PerfilPublico from "./PerfilPublico";

export const metadata = { title: "¿Me encontraste? · PetTag Wood" };

export default function Pagina() {
  return (
    <Suspense fallback={null}>
      <PerfilPublico />
    </Suspense>
  );
}
