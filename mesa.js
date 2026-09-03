// =====================================================================
// CHUVA DE NEON — Mesas (multi-mestre)
// =====================================================================
// Cada Mestre tem sua própria "mesa" (campanha) isolada: fichas de
// jogador, NPCs, calendário, log de dados, godmode, combate ativo e
// fila de aprovação do Mestre ficam TODOS dentro de `mesas/{mesaId}/...`
// no Realtime Database, então duas mesas nunca se veem.
//
// A ÚNICA coisa que continua compartilhada entre todas as mesas é o
// Banco Global de Itens (`itensGlobais`, ver itens-globais.js) — de
// propósito, pra Mestres diferentes poderem reaproveitar o mesmo
// catálogo de armas/equipamentos sem recriar tudo.
//
// `mesaId` é sempre o login do Mestre dono da mesa (ver MESTRES em
// auth.js) — simples, legível no banco, e garante 1 mesa por Mestre.

const CHAVE_SESSAO = "cdn_session";

// Lê a sessão salva no localStorage e devolve o mesaId ativo (ou null
// se não houver sessão válida — não deveria acontecer em nenhuma tela
// que já exige login, mas fica como guarda).
export function obterMesaIdAtual() {
    const saved = localStorage.getItem(CHAVE_SESSAO);
    if (!saved) return null;
    try {
        const sessao = JSON.parse(saved);
        return (sessao && sessao.mesaId) ? sessao.mesaId : null;
    } catch (e) {
        return null;
    }
}

// Monta o caminho completo `mesas/{mesaId}/{subCaminho}` a partir da
// sessão ativa. Lança erro se não houver mesa na sessão — melhor falhar
// alto e visível do que gravar dado "solto" fora de qualquer mesa.
export function caminhoMesa(subCaminho) {
    const mesaId = obterMesaIdAtual();
    if (!mesaId) {
        throw new Error("Sem mesa na sessão ativa — faça login novamente.");
    }
    return subCaminho ? `mesas/${mesaId}/${subCaminho}` : `mesas/${mesaId}`;
}
