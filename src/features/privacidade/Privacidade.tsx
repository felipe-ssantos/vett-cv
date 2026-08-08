import { Link } from "react-router";
import {
  LuArrowLeft,
  LuDatabase,
  LuExternalLink,
  LuLock,
  LuServer,
  LuShieldCheck,
  LuSparkles,
  LuTrash2,
} from "react-icons/lu";
import cardStyles from "../../styles/ui/Card.module.css";
import motionStyles from "../../styles/ui/Motion.module.css";
import pageStyles from "../../styles/ui/Page.module.css";
import styles from "./Privacidade.module.css";

export function Privacidade() {
  return (
    <div className={`${motionStyles.fadeInUp} ${pageStyles.narrow}`}>
      <div className="mb-3">
        <Link
          to="/"
          className={`text-decoration-none d-inline-flex align-items-center gap-1 text-secondary ${pageStyles.backLink}`}
        >
          <LuArrowLeft size={15} /> Voltar ao início
        </Link>
      </div>

      <div className={`${cardStyles.card} p-4`}>
        <div className={`${cardStyles.cardHeader} mb-2`}>
          <div className={cardStyles.iconCircle}>
            <LuShieldCheck />
          </div>
          <div>
            <h1 className="h5 fw-bold mb-0">Política de Privacidade</h1>
            <p className={`mb-0 text-secondary ${styles.updatedAt}`}>
              Última atualização: agosto de 2026
            </p>
          </div>
        </div>

        <div className={styles.prose}>
          <p>
            O <strong>Vett</strong> é uma ferramenta com IA que compara o seu
            currículo com uma descrição de vaga e devolve um relatório de
            compatibilidade. Esta política explica, de forma simples, quais
            dados são processados, o que é armazenado e como você pode excluir
            tudo.
          </p>

          <h2>1. Dados que você fornece</h2>
          <p>
            Para gerar a análise, você informa: o <strong>currículo</strong>{" "}
            (texto colado ou arquivo PDF/DOCX) e a{" "}
            <strong>descrição da vaga</strong>. Esses dados são usados
            exclusivamente para produzir o relatório de compatibilidade.
          </p>

          <h2>2. O que é armazenado</h2>
          <p>
            Somente o <strong>resultado da análise</strong> é salvo no banco de
            dados (Supabase): score de compatibilidade, palavras-chave
            presentes e faltantes, pontos fortes, sugestões e os dados da vaga
            (título, descrição, empresa, skills). O{" "}
            <strong>
              texto integral do seu currículo não é armazenado
            </strong>{" "}
            — ele é usado apenas durante a análise e descartado.
          </p>

          <h2>3. Uso da IA (Google Gemini)</h2>
          <p>
            O texto do currículo e a descrição da vaga são enviados à API do{" "}
            <a
              href="https://ai.google.dev/gemini-api/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Gemini <LuExternalLink size={12} aria-hidden="true" />
            </a>{" "}
            apenas para gerar a análise. Esses dados não são usados para
            treinar modelos da Google e não são vendidos nem compartilhados com
            terceiros.
          </p>

          <h2>4. Sessão anônima e isolamento</h2>
          <p>
            O Vett usa <strong>sessão anônima</strong> — você não cria conta
            nem informa nome ou e-mail. Cada navegador recebe uma sessão
            exclusiva, e as análises salvas ficam vinculadas a ela. As
            políticas de segurança do banco (RLS) garantem que cada visitante
            enxerga <strong>apenas o próprio histórico</strong>.
          </p>

          <h2>5. Exclusão e retenção</h2>
          <p>
            Você pode apagar uma análise ou o histórico inteiro a qualquer
            momento pelo ícone de lixeira na página Histórico — a exclusão
            remove os dados do banco. Não há prazo automático de retenção além
            disso: os dados permanecem somente até você excluí-los.
          </p>

          <h2>6. Limites de uso</h2>
          <p>
            Para proteger as cotas gratuitas dos serviços, cada navegador pode
            fazer até <strong>5 análises por dia</strong>, com um teto global
            de <strong>100 análises por dia</strong>. Esses contadores não
            armazenam nenhum dado pessoal.
          </p>

          <h2>7. Serviços de terceiros</h2>
          <ul>
            <li>
              <LuDatabase size={13} aria-hidden="true" />{" "}
              <strong>Supabase</strong> — banco de dados e autenticação anônima
            </li>
            <li>
              <LuSparkles size={13} aria-hidden="true" />{" "}
              <strong>Google Gemini</strong> — geração da análise com IA
            </li>
            <li>
              <LuServer size={13} aria-hidden="true" />{" "}
              <strong>Vercel</strong> — hospedagem da aplicação e da API
            </li>
          </ul>

          <h2>8. Segurança</h2>
          <p>
            A comunicação é feita por <strong>HTTPS</strong>. A chave da API de
            IA vive somente no servidor e nunca é exposta ao navegador. A
            aplicação aplica uma Content Security Policy e proteção contra
            clickjacking, e o acesso aos dados é isolado por sessão.
          </p>

          <h2>9. Alterações desta política</h2>
          <p>
            Esta política pode ser atualizada conforme o projeto evolui. A data
            no topo reflete a versão vigente.
          </p>

          <h2>10. Contato</h2>
          <p>
            Dúvidas sobre privacidade ou pedidos de remoção de dados podem ser
            enviados pelo{" "}
            <a
              href="https://github.com/felipe-ssantos"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub <LuExternalLink size={12} aria-hidden="true" />
            </a>{" "}
            do autor.
          </p>

          <div
            className={`d-flex align-items-center gap-2 text-secondary ${styles.footerNote}`}
          >
            <LuLock size={14} aria-hidden="true" />
            <span>
              Resumo: sem contas, sem rastreamento e sem armazenamento do texto
              do seu currículo.
            </span>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-center mt-3">
        <Link
          to="/historico"
          className={`btn btn-light border text-secondary d-inline-flex align-items-center gap-2`}
        >
          <LuTrash2 size={15} aria-hidden="true" /> Gerenciar meu histórico
        </Link>
      </div>
    </div>
  );
}
