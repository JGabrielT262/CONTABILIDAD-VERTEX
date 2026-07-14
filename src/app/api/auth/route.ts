import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE,
  createSessionToken,
  findUserByAccessCode,
  verifyAccessCodeFromDb,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    const user = await findUserByAccessCode(code);
    if (user) {
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          nombre: user.nombre,
          puede_crear: user.puede_crear,
          puede_borrar: user.puede_borrar,
          puede_gestionar: user.puede_gestionar,
        },
      });
      response.cookies.set(AUTH_COOKIE, await createSessionToken(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: AUTH_MAX_AGE,
        path: "/",
      });
      return response;
    }

    // Fallback admin legacy
    const valid = await verifyAccessCodeFromDb(code);
    if (!valid) {
      return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
    }

    const legacy = {
      id: "legacy",
      nombre: "Administrador",
      puede_crear: true,
      puede_borrar: true,
      puede_gestionar: true,
    };
    const response = NextResponse.json({ success: true, user: legacy });
    response.cookies.set(AUTH_COOKIE, await createSessionToken(legacy), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Error al autenticar:", error);
    return NextResponse.json({ error: "Error al autenticar" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

export async function GET() {
  const { getSessionUser } = await import("@/lib/auth");
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
