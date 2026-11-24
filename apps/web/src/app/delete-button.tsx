"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Botão que chama DELETE em `path` (ex.: /goals/123), pede confirmação e atualiza a tela. */
export function DeleteButton({
  path,
  label,
  confirmText,
}: {
  path: string;
  label: string;
  confirmText: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Falha ao apagar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      {busy ? "Apagando…" : label}
    </button>
  );
}
