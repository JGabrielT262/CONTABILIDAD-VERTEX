import { NextRequest, NextResponse } from "next/server";

/**
 * Consulta razón social por RUC (SUNAT vía APIs públicas).
 * GET /api/ruc?numero=20100070970
 */
export async function GET(request: NextRequest) {
  const numero = request.nextUrl.searchParams.get("numero")?.replace(/\D/g, "") || "";

  if (!/^\d{11}$/.test(numero)) {
    return NextResponse.json(
      { error: "El RUC debe tener 11 dígitos" },
      { status: 400 }
    );
  }

  try {
    // Intento 1: apis.net.pe v1
    const res1 = await fetch(`https://api.apis.net.pe/v1/ruc?numero=${numero}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (res1.ok) {
      const data = await res1.json();
      const razon =
        data.nombre ||
        data.razonSocial ||
        data.razon_social ||
        data.name ||
        null;
      if (razon) {
        return NextResponse.json({
          ruc: numero,
          razon_social: String(razon).trim(),
          estado: data.estado || null,
          direccion: data.direccion || null,
        });
      }
    }

    // Intento 2: endpoint alterno
    const res2 = await fetch(
      `https://api.apis.net.pe/v2/sunat/ruc?numero=${numero}`,
      {
        headers: {
          Accept: "application/json",
          ...(process.env.APIS_NET_TOKEN
            ? { Authorization: `Bearer ${process.env.APIS_NET_TOKEN}` }
            : {}),
        },
        next: { revalidate: 86400 },
      }
    );

    if (res2.ok) {
      const data = await res2.json();
      const razon =
        data.razonSocial ||
        data.nombre ||
        data.razon_social ||
        null;
      if (razon) {
        return NextResponse.json({
          ruc: numero,
          razon_social: String(razon).trim(),
          estado: data.estado || null,
          direccion: data.direccion || null,
        });
      }
    }

    return NextResponse.json(
      {
        error:
          "No se pudo consultar SUNAT automáticamente. Escribe la razón social manualmente.",
      },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Error al consultar RUC. Escribe la razón social manualmente.",
      },
      { status: 502 }
    );
  }
}
