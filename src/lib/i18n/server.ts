import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang, type Lang } from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

/** Lingua e dizionario lato server (layout, metadata), dal cookie scelto dall'utente. */
export async function getServerI18n(): Promise<{ lang: Lang; t: Dictionary }> {
  const lang = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  return { lang, t: dictionaries[lang] };
}
