// abas/notas.js
// ---------------------------------------------------------------------
// Aba Notas — hoje é só um campo de texto livre (data-field="notas"),
// sincronizado direto na raiz da ficha (estado.fichaAtual.notas). O
// salvamento (autosave) continua no listener genérico de [data-field]
// em ficha.js, junto com todos os outros campos simples — aqui fica só
// a parte de RENDERIZAR (puxar o valor salvo pro campo na tela).
//
// Movido do ficha.js (de dentro de renderizarDarknetENotas) como parte
// do plano de modularização (ver docs/estado-compartilhado.md e
// plano-modularizacao-ficha-js.txt, Passo 10).
// ---------------------------------------------------------------------

import { estado } from "../estado.js";

export function renderizarNotas() {
    const notas = document.querySelector('[data-field="notas"]');
    if (notas && document.activeElement !== notas) notas.value = estado.fichaAtual.notas || "";
}
