import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-vertex-muted">Cargando...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
