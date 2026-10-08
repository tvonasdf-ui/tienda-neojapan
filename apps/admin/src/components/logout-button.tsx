"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  createSupabaseBrowserClient,
  getSupabasePublicConfig,
} from "@/lib/supabase";

export function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  if (!getSupabasePublicConfig() || pathname === "/login") {
    return null;
  }

  async function logout() {
    setError(null);
    const { error: signOutError } =
      await createSupabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setError(`No se pudo cerrar la sesión: ${signOutError.message}`);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={logout}
        className="inline-flex min-h-10 items-center rounded-xl border border-white/[0.08] px-3 text-sm text-gray-300 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        Cerrar sesión
      </button>
      {error ? (
        <span role="alert" className="text-xs text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
