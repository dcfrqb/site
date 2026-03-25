"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Показываем контент даже до инициализации — страницы сами обрабатывают auth
  return <>{children}</>;
}
