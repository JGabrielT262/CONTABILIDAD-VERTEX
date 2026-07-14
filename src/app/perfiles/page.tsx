import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import PerfilesClient from "./PerfilesClient";
import { getSessionUser, USUARIOS_TABLE } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase";

export default async function PerfilesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.puede_gestionar) redirect("/dashboard");

  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from(USUARIOS_TABLE)
    .select(
      "id, nombre, puede_crear_movimientos, puede_borrar_movimientos, puede_gestionar_perfiles, activo, created_at"
    )
    .order("created_at", { ascending: true });

  const usuarios = (data || []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    puede_crear_movimientos: u.puede_crear_movimientos,
    puede_borrar_movimientos: u.puede_borrar_movimientos,
    puede_gestionar_perfiles: u.puede_gestionar_perfiles,
    activo: u.activo,
    created_at: u.created_at,
  }));

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <Navbar initialUser={user} />
      <main className="vertex-page space-y-4 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Perfiles</h1>
          <p className="text-vertex-muted text-xs mt-0.5">
            Usuarios, códigos de acceso y permisos
          </p>
        </div>
        <PerfilesClient usuarios={usuarios} currentUserId={user.id} />
      </main>
    </div>
  );
}
