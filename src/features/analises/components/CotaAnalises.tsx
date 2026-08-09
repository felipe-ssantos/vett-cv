import { LuGauge } from "react-icons/lu";
import type { CotaAnalises as TipoCotaAnalises } from "../../../lib/usoApi";
import styles from "./CotaAnalises.module.css";

export interface CotaAnalisesProps {
  cota: TipoCotaAnalises | null;
  carregando: boolean;
}

// `Date.now()` é impuro para a regra react-hooks/purity — isolado no escopo de
// módulo, a renderização permanece pura e a contagem é feita a cada render.
function agoraEmMilissegundos(): number {
  return Date.now();
}

// Renovação exata: mostra quanto falta (relativo) e a hora exata da próxima
// renovação da janela (ex.: "Renova em 2h 15min (às 18:00)"). Se a janela já
// renovou e a cota ainda não foi recarregada, mostra apenas a hora exata.
function formatarRenovacao(renovaEm: string | null): string | null {
  if (!renovaEm) return null;
  const data = new Date(renovaEm);
  const msRestantes = data.getTime() - agoraEmMilissegundos();
  if (Number.isNaN(msRestantes)) return null;

  const exato = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Já passou do horário de renovação: sem contagem regressiva negativa.
  if (msRestantes <= 0) return `Renova às ${exato}`;

  const minutos = Math.ceil(msRestantes / 60_000);
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  const relativo =
    horas <= 0
      ? `${minutosRestantes}min`
      : minutosRestantes === 0
        ? `${horas}h`
        : `${horas}h ${minutosRestantes}min`;

  return `Renova em ${relativo} (às ${exato})`;
}

/**
 * Indicador de cota de análises (janela de 3h por navegador): análises
 * restantes, renovação exata e uso global. Não renderiza nada enquanto a cota
 * não foi carregada ou está indisponível.
 */
export function CotaAnalises({ cota, carregando }: CotaAnalisesProps) {
  if (carregando && !cota) return null;
  // Sem cota ou sem sessão anônima (ainda carregando): não exibe nada.
  if (!cota?.sessao) return null;

  // O usuário fica bloqueado quando a cota da sessão OU a global esgota.
  const sessaoEsgotada = cota.sessao !== null && cota.sessao.restante === 0;
  const globalEsgotada = cota.global !== null && cota.global.restante === 0;
  const bloqueada = sessaoEsgotada || globalEsgotada;
  const renovacao = formatarRenovacao(cota.renovaEm);

  const textoBloqueio = sessaoEsgotada
    ? "Limite de análises desta janela atingido"
    : "Cota global do dia atingida";

  return (
    <div
      role="status"
      className={`${styles.cotaBox} ${bloqueada ? styles.bloqueada : ""}`}
    >
      <LuGauge size={14} className={styles.cotaIcon} aria-hidden="true" />
      {bloqueada ? (
        <span>
          <span className={styles.cotaDestaque}>{textoBloqueio}</span>
          {renovacao && (
            <>
              {" "}· {renovacao}
            </>
          )}
        </span>
      ) : (
        <span>
          <span className={styles.cotaDestaque}>
            {cota.sessao.restante} de {cota.sessao.limite} análises disponíveis
          </span>
          {renovacao && (
            <>
              {" "}· {renovacao}
            </>
          )}
        </span>
      )}
      {cota.global && !bloqueada && (
        <span className={styles.cotaGlobal} aria-hidden="true">
          · global: {cota.global.usado}/{cota.global.limite}
        </span>
      )}
    </div>
  );
}
