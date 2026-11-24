import { cookies } from "next/headers";

export const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3333";

/**
 * fetch para a API, feito no SERVIDOR do Next. O navegador não participa, então
 * o cookie de sessão precisa ser repassado à mão. Só use em Server Components
 * (dentro de <Suspense>, porque lê dados da requisição).
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookie = (await cookies()).toString();
  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
}

export interface Me {
  id: string;
  email: string;
}

/**
 * Quem está logado. `null` = não há sessão válida (mande para o login);
 * "offline" = a API não respondeu (não é o mesmo que estar deslogado).
 */
export async function getMe(): Promise<Me | null | "offline"> {
  try {
    const res = await apiFetch("/auth/me");
    if (res.status === 401) return null;
    if (!res.ok) return "offline";
    return (await res.json()) as Me;
  } catch {
    return "offline";
  }
}
