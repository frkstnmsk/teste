// estado.js
// ---------------------------------------------------------------------
// Módulo central de estado compartilhado do ficha.js.
//
// Antes, essas ~44 variáveis viviam soltas no topo do ficha.js e
// qualquer função do arquivo podia ler/escrever nelas livremente, só
// por estarem no mesmo arquivo. Isso funcionava, mas impedia dividir
// o ficha.js em arquivos menores (uma função movida pra outro arquivo
// perderia acesso a essas variáveis).
//
// Agora elas moram todas dentro de um único objeto exportado, `estado`.
// Qualquer arquivo que precisar ler ou mudar uma delas importa esse
// objeto e usa `estado.nomeDaVariavel`. Por ser um objeto (não
// variáveis soltas), dá pra mudar o valor de dentro de qualquer
// arquivo sem problema nenhum de "binding" do JavaScript.
//
// Ver docs/estado-compartilhado.md pra explicação de cada campo.
// ---------------------------------------------------------------------

export const estado = {
    // Sessão / identidade
    sessao: null,
    isMestre: false,
    fichaAtualId: "",
    fichaAtual: null, // snapshot completo vindo do Firebase

    // Efeito visual de dano
    pvAtualUltimaSync: undefined,
    idUltimaSyncEfeitoDano: null,

    // Modo NPC (Mestre "atuando como" um NPC)
    modoNpc: false,
    npcAtualId: null,
    npcRawAtual: null, // último snapshot cru vindo de `npcs/{id}`

    // Listener ativo do Firebase
    listenerAtivo: null,
    listenerAtivoTipo: null, // "fichas" | "npcs"
    salvandoDebounce: null,

    // Modal genérico de item (Inventário, Receitas, Cenário...)
    modalContexto: null, // { lista: "inventario", id: "..." } | null = criando nova
    receitaAguardandoVinculo: null, // { receitaExistente, opcoesSlot, rascunho } | null
    idBancoParaRetomarReceita: null,
    criarItemApenasNoBanco: false,
    cenarioIdParaCriarItem: null,
    imagemItemModalAtual: null,

    // Configurações da mesa (Godmode e afins)
    godmodeAtivo: false,
    ignorarPenalidadeSaudeAtivo: false,
    fatorPrecoMateriaisVeiculoAtivo: 0,
    fatorPrecoDarknetAtivo: 50,

    // Calendário
    calendarioAtual: null,

    // Caches compartilhados entre toda a mesa (não só a ficha aberta)
    todasAsFichasCache: {},
    itensGlobaisCache: [],
    receitasGlobaisCache: [],
    npcsCache: [],
    combateAtivoCache: { ativo: false, participantes: {} },
    combateNpcFormVisivel: false,
    painelIniciativaJogadorAberto: false,
    pendentesCache: [],
    contadorPendentesAnterior: 0,
    cenariosCache: [],
    perseguicaoAtivaCache: { ativo: false, participantes: {} },

    // Específico da ficha atualmente aberta
    pvRecuperacaoContexto: null,
    ultimoContextoRecuperacaoPV: null,
    categoriaInventarioAtiva: "levando",
    containersInventarioAbertos: new Set(),
    ultimoAvisoCustoVida: {},
    feridasCache: [],
    unsubFeridas: null,
    feridasFichaIdOuvida: null,
    xpHistoricoCache: [],
    unsubXpHistorico: null,
    xpHistoricoFichaIdOuvida: null,

    // Controle interno de listeners do Painel do Mestre
    limpezaPainelMestreAtual: null,

    // Semáforo: quando > 0, o listener onValue de ativarSincronizacao
    // ignora os snapshots recebidos, pra evitar que o Firebase
    // re-entregue um estado parcialmente escrito durante uma sequência
    // de múltiplos updates. Incrementar antes de update composto,
    // decrementar ao final.
    _pausarListener: 0,
};

// Desliga o listener local "ao vivo" anterior de um painel do Mestre
// (Painel de NPCs, Biblioteca de Itens, Biblioteca de Receitas) antes
// de guardar o novo — assim nunca ficam dois listeners do mesmo tipo
// de painel vivos ao mesmo tempo.
export function definirLimpezaPainelMestre(funcaoLimpeza) {
    if (estado.limpezaPainelMestreAtual) estado.limpezaPainelMestreAtual();
    estado.limpezaPainelMestreAtual = funcaoLimpeza || null;
}
