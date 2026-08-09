import { useState } from "react";
import { LuShieldCheck } from "react-icons/lu";
import { Link, useLocation } from "react-router";
import styles from "./ConsentBanner.module.css";

// Chave usada no localStorage para lembrar a resposta do usuário. O banner só
// reaparece se ele limpar os dados do navegador.
const CHAVE_CONSENTIMENTO = "vett-consentimento-privacidade";

// Lê o localStorage no primeiro render (lazy initializer, sem effect).
// Armazenamento indisponível (modo privado restrito) mostra o banner.
function jaRespondeu(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO) !== null;
  } catch {
    return false;
  }
}

/**
 * Banner de consentimento de privacidade/cookies: aparece uma única vez (até
 * o usuário aceitar ou recusar), nunca bloqueia o uso do app e é ocultado na
 * própria página da Política de Privacidade (onde o pedido já está na tela).
 */
export function ConsentBanner() {
  const [visivel, setVisivel] = useState(() => !jaRespondeu());
  const { pathname } = useLocation();

  function responder(valor: "aceito" | "recusado") {
    try {
      localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
    } catch {
      // Sem armazenamento: esconde apenas nesta sessão.
    }
    setVisivel(false);
  }

  if (!visivel || pathname === "/privacidade") return null;

  return (
    <div
      className={styles.banner}
      role="region"
      aria-label="Aviso de privacidade"
    >
      <div className={styles.icon}>
        <LuShieldCheck aria-hidden="true" />
      </div>
      <div className={styles.content}>
        <p className={`mb-0 ${styles.text}`}>
          Valorizamos sua privacidade. O Vett usa apenas uma sessão anônima e
          não usa cookies de rastreamento.{" "}
          <Link to="/privacidade" className={styles.link}>
            Leia nossa Política de Privacidade
          </Link>
          .
        </p>
      </div>
      <div className={styles.acoes}>
        <button
          type="button"
          onClick={() => responder("recusado")}
          className={styles.recusarButton}
        >
          Agora não
        </button>
        <button
          type="button"
          onClick={() => responder("aceito")}
          className={styles.aceitarButton}
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
