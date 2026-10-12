import { NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/site-config";
export async function POST(request: Request) {
  return validateAdminPassword(request.headers.get("x-admin-password"))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Senha inválida." }, { status: 401 });
}
