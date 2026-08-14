import { useCallback, useEffect, useState } from "react";

export type Tema = "light" | "dark";

const CHAVE_TEMA = "vett-tema";

export interface UseTemaReturn {
  tema: Tema;
  alternarTema: () => void;
}

/**
 * Hook global de tema (compartilhado entre features — por isso vive em
 * src/hooks). O tema inicial é aplicado pelo script `/tema-inicial.js` antes
 * do primeiro paint (sem preferência salva, o site inicia no modo claro);
 * aqui apenas sincronizamos o estado, alternamos e persistimos no
 * localStorage.
 */
export function useTema(): UseTemaReturn {
  // O tema já foi aplicado ao <html> pelo script /tema-inicial.js antes do
  // React montar — lemos o atributo no inicializador (sem efeito de sync).
  const [tema, setTema] = useState<Tema>(() =>
    document.documentElement.getAttribute("data-bs-theme") === "dark"
      ? "dark"
      : "light",
  );

  // Aplica e persiste a cada mudança (o efeito inicial é um no-op: mesma
  // valor já presente no atributo).
  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", tema);
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      // Armazenamento indisponível: o tema segue aplicado nesta sessão.
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((atual) => (atual === "dark" ? "light" : "dark"));
  }, []);

  return { tema, alternarTema };
}
