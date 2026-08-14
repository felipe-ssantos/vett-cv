// Aplica o tema antes do primeiro paint para evitar "flash" de claro/escuro.
// Script externo (não inline) para respeitar a CSP `script-src 'self'`.
(function () {
  var tema = null;
  try {
    tema = localStorage.getItem("vett-tema");
  } catch (e) {
    // Armazenamento indisponível (modo privado): cai para o padrão claro.
  }
  // Sem preferência salva, o site inicia no modo claro (light) — a preferência
  // do sistema não é mais consultada no primeiro acesso. Quem já escolheu o
  // tema escuro manualmente continua vendo o tema salvo.
  if (tema !== "dark" && tema !== "light") {
    tema = "light";
  }
  document.documentElement.setAttribute("data-bs-theme", tema);
})();
