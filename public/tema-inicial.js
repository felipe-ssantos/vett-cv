// Aplica o tema antes do primeiro paint para evitar "flash" de claro/escuro.
// Script externo (não inline) para respeitar a CSP `script-src 'self'`.
(function () {
  var tema = null;
  try {
    tema = localStorage.getItem("vett-tema");
  } catch (e) {
    // Armazenamento indisponível (modo privado): cai para a preferência do sistema.
  }
  if (tema !== "dark" && tema !== "light") {
    tema =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }
  document.documentElement.setAttribute("data-bs-theme", tema);
})();
