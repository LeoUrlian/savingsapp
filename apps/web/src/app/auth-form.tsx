"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type Mode = "login" | "register";

const COPY = {
  login: {
    title: "Entrar",
    button: "Entrar",
    busy: "Entrando…",
    path: "/auth/login",
    other: {
      text: "Ainda não tem conta?",
      label: "Criar conta",
      href: "/cadastro",
    },
  },
  register: {
    title: "Criar conta",
    button: "Criar conta",
    busy: "Criando…",
    path: "/auth/register",
    other: { text: "Já tem conta?", label: "Entrar", href: "/login" },
  },
} as const;

/** Mensagem em português para cada erro que a API pode devolver. */
function messageFor(status: number, mode: Mode): string {
  if (status === 401) return "E-mail ou senha incorretos.";
  if (status === 409) return "Este e-mail já tem uma conta.";
  if (status === 429) return "Muitas tentativas. Espere alguns minutos.";
  if (status === 400) {
    return mode === "register"
      ? "Informe um e-mail válido e uma senha com 8 caracteres ou mais."
      : "Informe um e-mail válido e a senha.";
  }
  return `Algo deu errado (erro ${status}).`;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));

    if (mode === "register") {
      if (password.length < 8) {
        setError("A senha precisa ter 8 caracteres ou mais.");
        return;
      }
      if (password !== String(data.get("confirm"))) {
        setError("As senhas não são iguais.");
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}${copy.path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email")).trim(),
          password,
        }),
      });
      if (!res.ok) {
        setError(messageFor(res.status, mode));
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Não consegui falar com a API. Ela está rodando?");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h1 className="text-2xl font-bold">{copy.title}</h1>

      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={input}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={
            mode === "register" ? "new-password" : "current-password"
          }
          className={input}
        />
        {mode === "register" && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Mínimo de 8 caracteres.
          </span>
        )}
      </label>

      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">
          Repita a senha
          <input
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            className={input}
          />
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? copy.busy : copy.button}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {copy.other.text}{" "}
        <Link href={copy.other.href} className="text-green-600 hover:underline">
          {copy.other.label}
        </Link>
      </p>
    </form>
  );
}
