import Link from "next/link";
import type { ReactNode } from "react";

const categories: { title: string; href?: string }[] = [
  { title: "Lista dei Vini", href: "/wines" },
  { title: "Distillati", href: "/grappe-distillati" },
  { title: "Cognacs and Brandy" },
  { title: "Ports By The Bottle" },
  { title: "Dessert Wine By The Bottle" },
  { title: "Large Format Wine" },
  { title: "Single Malt Scotches" },
  { title: "Bourbon And Ryewhiskey" },
  { title: "Amari e Digestivi" },
  { title: "Italian Dessert Wine" },
  { title: "Canadian Ice Wines" },
  { title: "French Dessert Wine" },
  { title: "Tequila" },
  { title: "Half Bottle" },
  { title: "Wine By the Glass and By Bottle" },
  { title: "Champagne and Sparkpling Wines" },
  { title: "Rosè Wine of the World" }
];

function CategoryCard({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[5.5rem] flex-col justify-center rounded-xl border border-wine-paperEdge/70 bg-wine-paperSoft px-5 py-4 shadow-sm transition-shadow hover:border-wine-gold/60">
      <h2 className="text-center text-sm font-semibold leading-snug text-neutral-900 sm:text-base">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto bg-transparent">
      <header className="border-b border-wine-paperEdge/70 bg-wine-paperSoft/70 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8 md:px-6 md:py-10">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Wine List Manager
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">
            Seleziona una sezione per gestire l&apos;elenco corrispondente.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8 md:px-6 md:py-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {categories.map(({ title, href }) =>
            href ? (
              <Link
                key={title}
                href={href}
                className="group block rounded-xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                <CategoryCard title={title}>
                  <p className="mt-2 text-center text-xs font-medium text-neutral-500 group-hover:text-neutral-800">
                    Apri →
                  </p>
                </CategoryCard>
              </Link>
            ) : (
              <div key={title} className="cursor-default rounded-xl opacity-90">
                <CategoryCard title={title}>
                  <div className="mt-2 h-4" aria-hidden />
                </CategoryCard>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
