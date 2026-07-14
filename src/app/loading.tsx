export default function Loading() {
  return (
    <div className="min-h-dvh bg-vertex-bg">
      <div className="h-12 border-b border-vertex-border bg-white" />
      <main className="vertex-page space-y-4" aria-live="polite" aria-busy="true">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded bg-slate-200"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded bg-slate-200" />
        <p className="sr-only">Cargando información...</p>
      </main>
    </div>
  );
}
