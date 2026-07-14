"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        setError("Código de acceso incorrecto");
        return;
      }

      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo-full-light.png"
            alt="Vertex Software"
            width={280}
            height={210}
            className="mb-5 w-52 sm:w-60 max-w-full h-auto"
            priority
            unoptimized
          />
          <h1 className="text-xl font-semibold text-vertex-text">Contabilidad</h1>
          <p className="text-vertex-muted text-sm mt-1">Ingresa tu código de acceso</p>
        </div>

        <form onSubmit={handleSubmit} className="vertex-card p-6 space-y-4">
          <div>
            <label htmlFor="code" className="vertex-label">
              Código de acceso
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="vertex-input"
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-vertex-danger text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="vertex-btn vertex-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-vertex-muted/70 text-xs mt-6">
          VERTEX SOFTWARE © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
