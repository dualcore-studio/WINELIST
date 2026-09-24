import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { I18nProvider } from "@/lib/i18n/provider";
import { getServerI18n } from "@/lib/i18n/server";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const displaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Wine List Manager",
  description: "Wine list admin"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { lang } = await getServerI18n();
  return (
    <html lang={lang} className={`${dmSans.variable} ${displaySerif.variable}`}>
      <body className="min-h-dvh antialiased">
        <I18nProvider initialLang={lang}>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
