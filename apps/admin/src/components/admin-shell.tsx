"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/", label: "Resumen", number: "01" },
  { href: "/inventario", label: "Inventario", number: "02" },
  { href: "/pos", label: "Punto de venta", number: "03" },
  { href: "/pedidos", label: "Pedidos", number: "04" },
  { href: "/reportes", label: "Reportes", number: "05" },
] as const;

function Navigation({
  pathname,
  mobile = false,
}: {
  pathname: string;
  mobile?: boolean;
}) {
  return (
    <nav
      aria-label="Navegación principal"
      className={
        mobile
          ? "flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden"
          : "space-y-1"
      }
    >
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
              mobile ? "min-h-10 shrink-0 px-3" : "min-h-11 px-3",
              active
                ? "bg-cyan-400/10 text-cyan-200 ring-1 ring-inset ring-cyan-300/15"
                : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100",
            ].join(" ")}
          >
            <span
              className={[
                "font-mono text-[10px] tracking-wider",
                active
                  ? "text-cyan-300"
                  : "text-gray-600 group-hover:text-gray-400",
              ].join(" ")}
              aria-hidden="true"
            >
              {item.number}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3"
      aria-label="Neojapan, inicio"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 font-display text-sm font-bold text-gray-950">
        NJ
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-semibold tracking-wide text-gray-100">
          NEOJAPAN
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-gray-500">
          Panel de operaciones
        </span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0f14] px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-gray-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0d131a] px-4 py-6 lg:flex">
        <div className="px-2 pb-9">
          <Brand />
        </div>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
          Workspace
        </p>
        <Navigation pathname={pathname} />
        <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <span className="mb-2 block h-1 w-8 rounded-full bg-cyan-400" />
          <p className="text-xs font-medium text-gray-300">
            Operación Neojapan
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Inventario, pedidos y ventas en un solo lugar.
          </p>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0b0f14]/90 backdrop-blur-xl">
          <div className="flex min-h-[4.5rem] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden text-sm text-gray-400 lg:block">
              Administración <span className="mx-2 text-gray-700">/</span>
              <span className="text-gray-200">Operaciones</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-gray-400 sm:inline-flex">
                Chile · CLP
              </span>
              <LogoutButton />
            </div>
          </div>
          <Navigation pathname={pathname} mobile />
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
