import { NextResponse } from "next/server";
import { readLinktree, writeLinktree } from "@/lib/linktree-store";
import { validateAdminPassword } from "@/lib/site-config";
import { jsonContent, apiError } from "@/lib/api-response";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return jsonContent(
      await readLinktree(
        validateAdminPassword(request.headers.get("x-admin-password")),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(request: Request) {
  if (!validateAdminPassword(request.headers.get("x-admin-password")))
    return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
  try {
    return jsonContent(
      await writeLinktree(
        await request.json(),
        request.headers.get("if-match"),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
