import { NextResponse } from "next/server";
import { dictionaries, type ApiErrorCode } from "@/lib/i18n/dictionaries";

/** Risposta d'errore API: codice (tradotto dal client) + testo italiano di ripiego. */
export function apiError(code: ApiErrorCode, status: number) {
  return NextResponse.json({ error: dictionaries.it.apiErrors[code], code }, { status });
}
