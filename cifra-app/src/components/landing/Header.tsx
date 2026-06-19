"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Header() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-3.5">
        <Logo />
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/test"
            className="inline-flex items-center gap-2 rounded-[13px] bg-petrol px-[18px] py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px"
          >
            Empezar test
          </Link>
        </div>
      </div>
    </header>
  );
}
