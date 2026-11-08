"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Explorar" },
  { href: "/anunciantes", label: "Anunciantes" },
  { href: "/landings", label: "Landing pages" },
  { href: "/favoritos", label: "Favoritos" },
  { href: "/fuentes", label: "Fuentes" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex min-w-0 gap-1 overflow-x-auto text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/anuncio") : path.startsWith(l.href);
        return (
          <a
            key={l.href}
            href={l.href}
            className={clsx(
              "whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition",
              active ? "bg-accent-soft text-accent" : "text-soft hover:bg-surface-2 hover:text-text",
            )}
          >
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
