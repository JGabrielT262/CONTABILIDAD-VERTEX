import { redirect } from "next/navigation";

export default function NuevoMovimientoPage() {
  redirect("/movimientos?nuevo=1");
}
