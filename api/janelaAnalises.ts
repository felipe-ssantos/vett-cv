// Matemática das janelas de renovação da cota por navegador (sessão/IP).
// Módulo deliberadamente SEM imports: depende apenas de `Date`, o que o torna
// trivial de testar isoladamente (bordas UTC, virada de dia, etc.) sem precisar
// do Supabase ou de Node.

// A cada 3 horas, em bordas UTC, o contador zera e a cota volta a ficar
// disponível (janelas 00–02, 03–05, 06–08, 09–11, 12–14, 15–17, 18–20, 21–23).
export const JANELA_ANALISES_HORAS = 3;

// Hora de início (UTC) da janela atual: múltiplo de JANELA_ANALISES_HORAS
// (ex.: 15h para a janela 15h–17h59). Base compartilhada das duas funções
// abaixo, para a matemática das bordas nunca divergir.
export function inicioJanelaUtc(agora: Date): number {
  return (
    Math.floor(agora.getUTCHours() / JANELA_ANALISES_HORAS) *
    JANELA_ANALISES_HORAS
  );
}

// Chave da janela atual (ex.: "2026-08-09T15" cobre 15h–17h59 UTC). Usada nos
// contadores por navegador — a renovação acontece a cada JANELA_ANALISES_HORAS.
export function janelaAtualUtc(): string {
  const agora = new Date();
  const horaJanela = inicioJanelaUtc(agora);
  return `${agora.toISOString().slice(0, 10)}T${String(horaJanela).padStart(2, "0")}`;
}

// Próximo limite da janela (ISO) — quando a cota por navegador renova.
// `Date.UTC` normaliza o rollover de meia-noite (21h + 3h vira o dia seguinte).
export function proximaLimiteJanelaUtc(): string {
  const agora = new Date();
  const horaJanela = inicioJanelaUtc(agora);
  const proxima = new Date(
    Date.UTC(
      agora.getUTCFullYear(),
      agora.getUTCMonth(),
      agora.getUTCDate(),
      horaJanela + JANELA_ANALISES_HORAS,
    ),
  );
  return proxima.toISOString();
}
