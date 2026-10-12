import { NextResponse } from "next/server";
import { revisionFor, StoreConflict } from "./json-store";
export const jsonContent = (data: unknown) =>
  NextResponse.json(data, {
    headers: { "Cache-Control": "no-store", ETag: revisionFor(data) },
  });
export function apiError(error: unknown) {
  if (error instanceof StoreConflict)
    return NextResponse.json({ error: error.message }, { status: 409 });
  const message = error instanceof Error ? error.message : "";
  const invalid = /inválid|duplicad|URL|Nenhum conteúdo/.test(message);
  return NextResponse.json(
    {
      error: invalid
        ? message
        : "Não foi possível acessar o conteúdo. Nenhum arquivo corrompido será substituído; confira o volume e os backups.",
    },
    { status: invalid ? 400 : 500 },
  );
}
