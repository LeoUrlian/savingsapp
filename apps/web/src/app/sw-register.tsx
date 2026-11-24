"use client";

import { useEffect } from "react";

/**
 * Registra o service worker. Só em produção: em desenvolvimento ele atrapalha
 * (o navegador guarda coisas e esconde as mudanças do código).
 */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sem service worker o app funciona igual, só não mostra a tela "sem conexão".
    });
  }, []);

  return null;
}
