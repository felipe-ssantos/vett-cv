import { useCallback, useEffect, useState } from "react";
import { buscarCotaAnalises, type CotaAnalises } from "../../../lib/usoApi";

export interface UseCotaAnalisesReturn {
  cota: CotaAnalises | null;
  carregando: boolean;
  /** Recarrega a cota (ex.: após uma análise concluída, que consumiu 1). */
  atualizarCota: () => Promise<void>;
}

/**
 * Carrega a cota diária de análises na montagem e expõe `atualizarCota()`
 * para recarregar depois de cada análise. Falhas viram `cota: null` (a UI
 * simplesmente não exibe o indicador).
 */
export function useCotaAnalises(): UseCotaAnalisesReturn {
  const [cota, setCota] = useState<CotaAnalises | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarCota = useCallback(async () => {
    setCarregando(true);
    const proxima = await buscarCotaAnalises();
    setCota(proxima);
    setCarregando(false);
  }, []);

  useEffect(() => {
    let cancelado = false;

    buscarCotaAnalises()
      .then((proxima) => {
        if (!cancelado) setCota(proxima);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return { cota, carregando, atualizarCota };
}
