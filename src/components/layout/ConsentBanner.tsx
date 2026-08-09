import { useState } from "react";
import { LuShieldCheck } from "react-icons/lu";
import { Link } from "react-router";
import styles from "./ConsentBanner.module.css";

// Chave usada no localStorage para lembrar a aceitação da política. O banner
// só reaparece se o usuário limpar os dados do navegador.
const CHAVE_CONSENTIMENTO = "vett-consentimento-privacidade";

// Lê o localStorage no primeiro render (lazy initializer, sem effect).
// Armazenamento indisponível (modo privado restrito) mostra o banner.
function jaAceitou(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO) === "aceito";
  } catch {
    return false;
  }
}

/**
 * Banner de consentimento de privacidade/cookies: aparece uma única vez (até
 * o usuário aceitar) e nunca bloqueia o uso do app — apenas informa e pede
 * aceite, com link para a Política de Privacidade.
 */
export function ConsentBanner() {
  const [visivel, setVisivel] = useState(() => !jaAceitou());

  function aceitar() {
    try {
      localStorage.setItem(CHAVE_CONSENTIMENTO, "aceito");
    } catch {
      // Sem armazenamento: esconde apenas nesta sessão.
    }
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Aviso de privacidade">
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
      <button type="button" onClick={aceitar} className={styles.aceitarButton}>
        Aceitar
      </button>
    </div>
  );
}
