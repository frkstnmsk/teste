// =====================================================================
// CHUVA DE NEON — Saúde e Ferimentos
// =====================================================================
// Sistema de feridas persistentes (ver plano-sistema-saude-ferimentos.txt).
// Escopo desta fase: só fichas de JOGADOR (npcs/{id}/feridas fica pra
// depois). Regras puras (dificuldades, perícias aceitas, penalidade de
// item) ficam em regras.js — aqui só a leitura/escrita no Firebase e a
// resolução de cada rolagem de tratamento.
//
// Etapa 1 do plano: só a base (schema + criar/tratar ferida). Ainda SEM
// UI (aba Saúde) e SEM o gatilho automático que cria a ferida na hora
// do golpe — isso entra nas próximas etapas, por cima do que está aqui.
// ---------------------------------------------------------------------

import { db } from "./firebase-config.js";
import { ref, get, set, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import { normalizarFicha } from "./normalizacao.js?v=20260822-fixhistorico";
import {
    rolarD20, coletarModificadores, calcularDificuldadeDefesaJogador,
    TRATAMENTOS_FERIDA, feridaAceitaSutura, feridaEstaFechada, modificadorPorSituacaoItem,
    danoPorMargemFalha
} from "./regras.js";
import { aplicarDano, criarAcaoPendente, cancelarStatusSangramentoPorFerida } from "./mestre.js?v=20260830-npcnivelpv";
import { SUB_LOCAIS_FERIDA, ZONAS_SILHUETA } from "./dados-manual.js";

// Nível de uma perícia pelo nome, direto do objeto `pericias` da ficha
// (mesmo helper que já existe, sem exportar, dentro de mestre.js —
// duplicado aqui pra não criar uma dependência circular entre os dois
// módulos de orquestração).
function nivelDaPericia(pericias, nome) {
    const entrada = Object.values(pericias || {}).find(p => p.nome === nome);
    return entrada ? (Number(entrada.nivel) || 0) : 0;
}

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

// Listener em tempo real das feridas de UMA ficha — usado pela aba
// Saúde (quando existir) pra manter a lista sempre atualizada.
export function ouvirFeridas(fichaId, callback) {
    return onValue(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)), (snap) => {
        const valores = snap.exists() ? snap.val() : {};
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Leitura única (sem listener) — usada dentro de tratarFerida/testarInfeccaoFerida
// pra pegar o estado atual da ferida antes de decidir o que fazer.
async function obterFerida(fichaId, feridaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)));
    return snap.exists() ? { id: feridaId, ...snap.val() } : null;
}

// ---------------------------------------------------------------------
// Fase 8 do plano de efeitos médicos (Torniquete Tático) — limpa a
// flag `dados.torniquete` (gravada por abrirModalTratarFerida em
// ficha.js quando um item de nome "Torniquete..." é usado com sucesso
// em Estancar Sangramento) sempre que ESSA MESMA ferida receber
// qualquer outro tratamento bem-sucedido depois — sinal de que o
// torniquete foi substituído por um cuidado de verdade (ou já não é
// mais a solução em uso). Silencioso, não trava o tratamento se falhar.
async function limparTorniqueteSeCorresponde(fichaId, feridaId) {
    try {
        const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/dados/torniquete`)));
        if (snap.exists() && snap.val() && snap.val().feridaId === feridaId) {
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { torniquete: null });
        }
    } catch (e) {
        // não crítico o suficiente pra travar o tratamento
    }
}

// Constituição efetiva (atributo + modificadores estruturados) de uma
// ficha, direto pelo fichaId — versão sem depender de participante de
// combate (diferente de obterConstituicaoParticipante em mestre.js, que
// só funciona com um Gerenciador de Combate ativo). É essa versão que
// o teste de Infecção por ferida usa, já que agora ele roda de dentro
// da aba Saúde, fora de combate.
export async function obterConstituicaoFicha(fichaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}`)));
    if (!snap.exists()) return 0;
    const ficha = normalizarFicha(snap.val());
    const modificadoresPlanos = coletarModificadores(ficha);
    return calcularDificuldadeDefesaJogador(ficha.dados, "constituicao", modificadoresPlanos, 0);
}

// ---------------------------------------------------------------------
// Criação de ferida
// ---------------------------------------------------------------------

// `estadoInicial` deixa o chamador decidir (o gatilho automático da
// etapa 2 vai passar "aberta" na maioria dos casos, mas fica explícito
// aqui em vez de assumido, já que cada tipo de ferida pode nascer num
// estado diferente no futuro).
export async function criarFerida(fichaId, { tipo, local, origem, estadoInicial = "aberta", danoPorTurno = null, turnosRestantes = null }) {
    if (!fichaId || !tipo) throw new Error("criarFerida: fichaId e tipo são obrigatórios.");
    const novaRef = push(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
    const ferida = {
        tipo,
        local: local || null,
        origem: origem || "",
        criadaEm: Date.now(),
        estado: estadoInicial,
        infeccaoAtiva: false,
        infeccaoGarantida: false,
        historico: []
    };
    // Ferida "sangramento": guarda o dano por turno e quantos ticks
    // faltam DIRETO na própria ferida (não só no status de combate por
    // turno, que é apagado quando o combate termina — ver
    // encerrarCombate, mestre.js). É esse par de campos que permite o
    // sangramento continuar existindo (e sendo aplicado manualmente
    // pelo Mestre, ver aplicarTickSangramento abaixo) mesmo fora de
    // combate, ou depois que o Gerenciador de Combate já foi encerrado.
    if (tipo === "sangramento" && danoPorTurno != null && turnosRestantes != null) {
        ferida.danoPorTurno = Number(danoPorTurno) || 0;
        ferida.turnosRestantes = Math.max(0, Number(turnosRestantes) || 0);
    }
    await set(novaRef, ferida);
    return { id: novaRef.key, ...ferida };
}

// Remoção manual de uma ferida (ex: Mestre corrigindo um lançamento
// errado, ou limpando uma ferida totalmente cicatrizada depois de um
// tempo narrativo). Tratamento normal NÃO remove a ferida — só muda o
// estado pra "tratada" (fica no histórico do personagem).
export async function removerFerida(fichaId, feridaId) {
    await remove(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)));
    await sincronizarFlagInfeccaoAgregada(fichaId);
}

// Fase D (plano mestre-tratar-feridas-sangramento.txt): a ferida
// "sangramento" (persistente, aba Saúde) e o status de combate por
// turno ("sangramento", com contagem regressiva em statusAtivos) são
// registros separados, mas passam a ficar vinculados na hora de criar
// (ver registrarFeridasDeSangramento/vincularFeridaAoStatusSangramento,
// mestre.js). Quando o status por turno expira sozinho
// (turnosRestantes chega em 0 — ver processarStatusInicioTurno,
// mestre.js), chama esta função pra apagar a ferida "sangramento"
// correspondente — o sangramento parou por conta própria, não faz
// sentido continuar pedindo Estancar Sangramento pra uma ferida que já
// nem sangra mais. A ferida "corte" criada junto (Fase C) continua
// existindo à parte, intacta — ainda precisa de Suturar Ferimento pra
// fechar de vez.
export async function resolverFimSangramentoNatural(fichaId, feridaId) {
    if (!fichaId || !feridaId) return;
    await removerFerida(fichaId, feridaId);
}

// Aplica UM tick de sangramento manualmente — pra quando o Mestre
// clica no badge "🩸 Sangramento" da ferida na aba Saúde. Existe
// porque o sangramento não pode mais depender só do Gerenciador de
// Combate: o status por turno (combateAtivo/participantes/.../
// statusAtivos) é apagado inteiro quando o combate termina
// (encerrarCombate, mestre.js), então uma ferida "sangramento" que
// ainda tinha turnos restantes ficava com o contador congelado assim
// que a cena de combate acabava — sem mais dano, sem mais contagem,
// mas também sem nunca "acabar" de verdade. Como a ferida agora guarda
// seu próprio `danoPorTurno`/`turnosRestantes` (ver criarFerida acima),
// o Mestre pode aplicar os ticks restantes na mão, fora de combate,
// numa cadência narrativa (por cena, por hora in-game, etc.) — dentro
// de um combate ativo o normal continua sendo o tick automático de
// cada troca de turno (processarStatusInicioTurno); este botão é o
// caminho de fora do combate.
// Cada clique: aplica danoPorTurno de dano na ficha, desconta 1 de
// turnosRestantes. Ao chegar em 0, a ferida "sangramento" é removida
// (mesmo comportamento de esgotar sozinha em combate — a ferida
// "corte" criada junto continua existindo, intacta, ainda precisando
// de Suturar Ferimento) e qualquer vínculo de combate residual
// (participante ainda em algum combate ativo apontando pra essa
// feridaId) é cancelado junto, pra não sobrar lixo.
export async function aplicarTickSangramento(fichaId, feridaId, quem) {
    const ferida = await obterFerida(fichaId, feridaId);
    if (!ferida) throw new Error("Ferida não encontrada.");
    if (ferida.tipo !== "sangramento") throw new Error("Essa ferida não é um Sangramento ativo.");
    if (ferida.estado !== "aberta") throw new Error("Esse sangramento já foi tratado (estancado/suturado) — não sangra mais.");
    const turnosRestantesAtual = Number(ferida.turnosRestantes) || 0;
    if (turnosRestantesAtual <= 0) throw new Error("Esse sangramento não tem mais ticks registrados.");

    const dano = Number(ferida.danoPorTurno) || 0;
    const danoExtra = dano > 0 ? await aplicarDano("ficha", fichaId, dano, null) : null;
    const restante = turnosRestantesAtual - 1;

    if (restante <= 0) {
        await resolverFimSangramentoNatural(fichaId, feridaId);
        await cancelarStatusSangramentoPorFerida(fichaId, feridaId);
        return { dano, turnosRestantes: 0, encerrado: true, detalhe: `Sangramento: último tick aplicado (${dano} de dano) — parou de sangrar. Resta a ferida de Corte/Perfuração para suturar.` };
    }

    await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)), { turnosRestantes: restante });
    const detalhe = `Sangramento: tick aplicado manualmente pelo Mestre — ${dano} de dano fixo. Faltam ${restante} tick(s).`;
    await registrarHistorico(fichaId, feridaId, { acao: "Tick de Sangramento", quem, resultado: detalhe });
    return { dano, turnosRestantes: restante, encerrado: false, detalhe };
}

// ---------------------------------------------------------------------
// Infecção — agora por ferida, em vez de flag solta na ficha.
// dados.infeccao continua existindo (calcularTempoRecuperacaoPV lê de
// lá), mas passa a ser um espelho AGREGADO: ativo se qualquer ferida
// da ficha tiver infeccaoAtiva true.
// ---------------------------------------------------------------------
export async function sincronizarFlagInfeccaoAgregada(fichaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
    const feridas = snap.exists() ? Object.values(snap.val()) : [];
    const infectadas = feridas.filter(f => f && f.infeccaoAtiva);
    const caminho = caminhoMesa(`fichas/${fichaId}/dados/infeccao`);
    if (!infectadas.length) {
        await remove(ref(db, caminho));
        return;
    }
    const garantida = infectadas.some(f => f.infeccaoGarantida);
    const origens = infectadas.map(f => f.origem).filter(Boolean).join("; ");
    await set(ref(db, caminho), { ativo: true, garantida, origem: origens });
}

// Marca infecção GARANTIDA numa ferida específica, sem rolar teste —
// caso do manual: falha com complicação em Remover Projétil.
async function marcarInfeccaoGarantida(fichaId, feridaId) {
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)), {
        infeccaoAtiva: true,
        infeccaoGarantida: true
    });
    await sincronizarFlagInfeccaoAgregada(fichaId);
}

// Teste de Constituição vs. Infecção, vinculado a UMA ferida (Mestre
// escolhe a dificuldade dentro da faixa do manual — 18 fixa pra
// tratamento malfeito/ambiente sujo, 18-22 pra ferimento profundo/grave
// — ver dificuldadeInfeccao/DIFICULDADE_INFECCAO_MINIMA/MAXIMA em
// regras.js, reaproveitadas aqui do jeito que já eram usadas no modal
// antigo). `modificadorItens` é o mesmo tipo de modificador manual que
// já existia (ex: Soro Fisiológico -2 na dificuldade).
export async function testarInfeccaoFerida(fichaId, feridaId, dificuldade, modificadorItens, origem) {
    const ferida = await obterFerida(fichaId, feridaId);
    if (!ferida) throw new Error("Ferida não encontrada.");
    const constituicaoAlvo = await obterConstituicaoFicha(fichaId);
    const dif = (Number(dificuldade) || 18) - (Number(modificadorItens) || 0);
    const bruto = rolarD20();
    const resultado = bruto + constituicaoAlvo;
    const sucesso = resultado >= dif;
    const detalhe = sucesso
        ? `Teste de Constituição vs. Infecção (dif ${dif}): d20 (${bruto}) ${constituicaoAlvo >= 0 ? "+" : ""}${constituicaoAlvo} = ${resultado} — RESISTIU, não infeccionou.`
        : `Teste de Constituição vs. Infecção (dif ${dif}): d20 (${bruto}) ${constituicaoAlvo >= 0 ? "+" : ""}${constituicaoAlvo} = ${resultado} — FALHOU, o ferimento INFECCIONOU.`;
    if (!sucesso) {
        await marcarInfeccaoGarantida(fichaId, feridaId);
    }
    await registrarHistorico(fichaId, feridaId, { acao: "Testar Infecção", resultado: detalhe });
    return { dificuldade: dif, bruto, modConstituicao: constituicaoAlvo, resultado, sucesso, detalhe };
}

// Isenta o Teste de Infecção de uma ferida (Fase 5.1 do plano de
// efeitos de equipamentos médicos — plano-efeitos-equipamentos-
// medicos.txt): disparado quando o item escolhido tem o efeito
// `isenta_infeccao` (ex.: Cicatrizador Dérmico). Pula a rolagem
// inteira — a ferida é tratada como tendo resistido, mesmo resultado
// final de um teste bem-sucedido (testarInfeccaoFerida acima), só que
// sem chance nenhuma de infeccionar. Não precisa mexer em
// infeccaoAtiva/infeccaoGarantida (já ficam false por padrão desde a
// criação da ferida — ver criarFerida — e um teste resistido nunca as
// alterava mesmo passando pelo caminho normal); só registra no
// histórico, pro Mestre ver que aquele teste da cena já foi coberto.
export async function isentarInfeccaoFerida(fichaId, feridaId, origem, nomeItemUsado) {
    const ferida = await obterFerida(fichaId, feridaId);
    if (!ferida) throw new Error("Ferida não encontrada.");
    const detalhe = `Teste de Infecção isentado — item usado${nomeItemUsado ? ` (${nomeItemUsado})` : ""}. RESISTIU, não infeccionou.${origem ? ` (${origem})` : ""}`;
    await registrarHistorico(fichaId, feridaId, { acao: "Testar Infecção", resultado: detalhe });
    return { dificuldade: null, bruto: null, modConstituicao: null, resultado: null, sucesso: true, detalhe };
}

// ---------------------------------------------------------------------
// Histórico (registro simples por ferida, mostrado na aba Saúde)
// ---------------------------------------------------------------------
async function registrarHistorico(fichaId, feridaId, { acao, quem, resultado }) {
    const historicoRef = push(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}/historico`)));
    await set(historicoRef, { acao, quem: quem || "", resultado, data: Date.now() });
}

// ---------------------------------------------------------------------
// Tratamento — função genérica que cobre as 5 ações (Estancar
// Sangramento / Remover Projétil / Suturar Ferimento / Tratar Fratura /
// Tratar Queimadura). Cada uma tem sua config (perícias aceitas, faixa
// de dificuldade, o que o sucesso faz com o estado) em
// TRATAMENTOS_FERIDA (regras.js).
//
// `tratadorPericias` = objeto `pericias` de quem está tratando (pode
// ser a própria ficha ou a de outro jogador — a etapa 4 do plano é que
// vai montar essa chamada a partir do modal "Tratar outro jogador";
// por enquanto a função só recebe o que precisa pra rolar e aplicar,
// sem se importar de onde veio).
// `situacaoItem`: "adequado" | "improvisado" | "nenhum" (penalidade 0/-1/-2
// — ver PENALIDADE_ITEM_TRATAMENTO em regras.js).
// `dificuldadeEscolhida`: valor dentro da faixa do manual pra essa ação,
// escolhido por quem está tratando conforme a gravidade narrativa.
// `modificadorExtra`: bônus manual do item específico usado (ex: Kit de
// Sutura nível 3 = +2), preenchido à mão por quem está tratando.
// `godmode`: atalho exclusivo do Mestre (checado por quem chama, ver
// abrirModalTratarFerida em ficha.js — aqui a função só confia no que
// recebeu) — quando true, pula rolagem, perícia e item por completo e
// aplica o sucesso da ação direto, sem chance de complicação.
// `sucessoAutomaticoItem`: mesmo atalho de sucesso automático do
// Godmode acima, só que disparado pelo uso de um equipamento médico com
// efeito `sucesso_automatico_tratamento` pra essa ação (Fase 4.3 do
// plano-efeitos-equipamentos-medicos.txt) — qualquer jogador com o item
// certo no inventário pode acionar, não só o Mestre. `nomeItemUsado`
// (opcional) só entra na mensagem de log, pra deixar claro qual item
// deu o sucesso automático.
// ---------------------------------------------------------------------
export async function tratarFerida(fichaId, feridaId, {
    acao, tratadorPericias, tratadorNome, situacaoItem = "nenhum",
    dificuldadeEscolhida, modificadorExtra = 0, godmode = false,
    sucessoAutomaticoItem = false, nomeItemUsado = ""
}) {
    const config = TRATAMENTOS_FERIDA[acao];
    if (!config) throw new Error(`Ação de tratamento desconhecida: ${acao}`);

    const ferida = await obterFerida(fichaId, feridaId);
    if (!ferida) throw new Error("Ferida não encontrada.");
    if (!config.tiposFerida.includes(ferida.tipo)) {
        throw new Error(`${config.label} não se aplica a uma ferida do tipo "${ferida.tipo}".`);
    }
    if (acao === "suturar_ferimento" && !feridaAceitaSutura(ferida)) {
        throw new Error("Esse ferimento ainda não pode ser suturado (projétil precisa ser removido antes).");
    }

    // Godmode OU sucesso automático de item: sucesso automático, sem
    // teste nem item pra escolher — encerra a função aqui, antes de
    // rolar dado, calcular perícia ou penalidade de item (nada disso
    // importa nesse caminho). Só muda a origem da mensagem de log.
    if (godmode || sucessoAutomaticoItem) {
        // Cirurgia de Campo não tem efeito fixo de sucesso (efeitoSucesso
        // é null) — mesmo em sucesso automático, não mexe no estado da
        // ferida.
        const ehCirurgiaDeCampo = acao === "cirurgia_de_campo";
        const ehRemoverProjetil = acao === "remover_projetil";
        // Remover Projétil (sucesso): o projétil sai, mas o ferimento que
        // ele abriu continua ali — vira uma ferida de Corte/Perfuração
        // normal (estado "aberta"), ainda precisando de Suturar Ferimento.
        // Sem isso, a ferida ficava rotulada "Projétil alojado" pra
        // sempre mesmo depois de removido (só o ESTADO mudava pra "Projétil
        // removido", o TIPO nunca acompanhava).
        const atualizacoesGodmode = ehCirurgiaDeCampo ? {}
            : ehRemoverProjetil ? { estado: "aberta", tipo: "corte" }
            : { estado: config.efeitoSucesso };
        const origemAutomatica = sucessoAutomaticoItem
            ? `sucesso automático — item usado${nomeItemUsado ? ` (${nomeItemUsado})` : ""}`
            : "pelo Mestre (Godmode), sem teste nem item";
        const detalheGodmode = ehCirurgiaDeCampo
            ? `${config.label}: sucesso automático ${sucessoAutomaticoItem ? `— item usado${nomeItemUsado ? ` (${nomeItemUsado})` : ""}` : "pelo Mestre (Godmode)"} — aplique manualmente o que fizer sentido na cena (reverter coma, estabilizar, etc.).`
            : ehRemoverProjetil
                ? `${config.label}: tratado automaticamente ${origemAutomatica}. O projétil saiu — a ferida vira Corte/Perfuração (aberta), ainda precisa ser suturada.`
                : `${config.label}: tratado automaticamente ${origemAutomatica}.`;
        if (Object.keys(atualizacoesGodmode).length) {
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)), atualizacoesGodmode);
        }
        await registrarHistorico(fichaId, feridaId, { acao: config.label, quem: tratadorNome, resultado: detalheGodmode });
        // Ferida "sangramento" tratada com sucesso (Estancar Sangramento
        // ou Suturar Ferimento fechando ela direto) para de sangrar NA
        // HORA — cancela também o status de combate por turno vinculado
        // a essa ferida, se houver (ver cancelarStatusSangramentoPorFerida,
        // mestre.js). Sem efeito se não houver combate ativo/vínculo.
        if (ferida.tipo === "sangramento" && (acao === "estancar_sangramento" || acao === "suturar_ferimento")) {
            await cancelarStatusSangramentoPorFerida(fichaId, feridaId);
        }
        // Fase 8 (Torniquete Tático): qualquer tratamento bem-sucedido
        // nesta MESMA ferida (inclusive por este caminho de sucesso
        // automático/Godmode) encerra o lembrete de torniquete pendente,
        // se houver — ver limparTorniqueteSeCorresponde acima.
        await limparTorniqueteSeCorresponde(fichaId, feridaId);
        return {
            acao, dificuldade: null, bruto: null, nivelPericia: null, penalidadeItem: null, modificadorExtra: null,
            resultado: null, sucesso: true, complicacao: false, danoExtra: null, detalhe: detalheGodmode,
            novoEstado: atualizacoesGodmode.estado || ferida.estado, godmode: !!godmode,
            sucessoAutomaticoItem: !!sucessoAutomaticoItem
        };
    }

    // Maior nível entre as perícias aceitas pra essa ação (ex: Suturar
    // aceita Primeiros Socorros OU Medicina — usa a maior das duas que
    // o tratador tiver).
    const nivelPericia = Math.max(0, ...config.pericias.map(p => nivelDaPericia(tratadorPericias, p)));

    const penalidadeItem = modificadorPorSituacaoItem(situacaoItem);
    const dificuldade = Math.min(config.dificuldadeMax, Math.max(config.dificuldadeMin,
        Number(dificuldadeEscolhida) || config.dificuldadeMin));

    const bruto = rolarD20();
    const totalModificador = nivelPericia + penalidadeItem + (Number(modificadorExtra) || 0);
    const resultado = bruto + totalModificador;
    const sucesso = resultado >= dificuldade;
    // "Falha com complicação" (manual): o d20 BRUTO saiu 1-3, não o
    // resultado total — mesma leitura usada pro resto do sistema.
    const complicacao = !sucesso && bruto <= 3;

    const atualizacoesFerida = {};
    let danoMargem = 0;
    let danoComplicacao = 0;
    let danoExtra = null;
    let detalheExtra = "";
    let comaSinalizado = false;

    if (sucesso) {
        // Cirurgia de Campo (item 8): efeitoSucesso é null de propósito
        // — sucesso não muda o estado da ferida sozinho, só fica
        // registrado no histórico pro Mestre ler e decidir manualmente
        // via Godmode (reverter coma, estabilizar, etc.).
        if (acao === "remover_projetil") {
            // Mesma lógica do Godmode acima: sucesso em Remover Projétil
            // não deixa a ferida "sem_sangramento" com tipo "projetil"
            // parado pra sempre — o projétil saiu, e o que sobra é o
            // ferimento que ele fez (Corte/Perfuração), aberto, ainda
            // precisando de Suturar Ferimento.
            atualizacoesFerida.estado = "aberta";
            atualizacoesFerida.tipo = "corte";
        } else if (acao !== "cirurgia_de_campo") {
            atualizacoesFerida.estado = config.efeitoSucesso;
        }
    } else {
        // Dano por margem de falha (manual, "Regras gerais de
        // tratamento"): 5 PVs por ponto abaixo da dificuldade, em
        // QUALQUER falha — base de toda falha, complicação ou não.
        danoMargem = danoPorMargemFalha(resultado, dificuldade);

        if (complicacao) {
            // Cada ação tem sua própria complicação (manual) — esse
            // dano SOMA em cima do dano por margem acima, não substitui.
            if (acao === "estancar_sangramento") {
                danoComplicacao = 10 + Math.floor(Math.random() * 21); // 10-30
                detalheExtra = ` O ferimento piorou: ${danoComplicacao} de dano adicional por complicação.`;
            } else if (acao === "remover_projetil") {
                danoComplicacao = 20 + Math.floor(Math.random() * 21); // 20-40
                atualizacoesFerida.infeccaoAtiva = true;
                atualizacoesFerida.infeccaoGarantida = true;
                detalheExtra = ` O projétil permanece alojado e causou ${danoComplicacao} de dano adicional por complicação — infecção garantida.`;
            } else if (acao === "cirurgia_de_campo") {
                // Falha com complicação na Cirurgia de Campo (manual):
                // "o paciente entra em coma se já não estiver" — dispara
                // a MESMA Ação Pendente "confirmar_coma" do item 6 (não
                // uma fila própria da Cirurgia de Campo), pro Mestre
                // confirmar/rejeitar como qualquer outra pendência.
                comaSinalizado = true;
                detalheExtra = " O paciente corre risco de entrar em coma — aviso enviado ao Mestre.";
            }
        }

        const danoTotal = danoMargem + danoComplicacao;
        if (danoTotal > 0) {
            danoExtra = await aplicarDano("ficha", fichaId, danoTotal, null);
        }
    }

    const detalheMargem = danoMargem > 0 ? ` ${danoMargem} PV(s) perdido(s) pela margem de falha (${dificuldade - resultado} ponto(s) abaixo da dificuldade).` : "";
    const notaCirurgiaSucesso = (sucesso && acao === "cirurgia_de_campo")
        ? " Aplique manualmente via Godmode, se fizer sentido na cena (reverter coma, estabilizar, etc.)."
        : (sucesso && acao === "remover_projetil")
            ? " O projétil saiu — a ferida vira Corte/Perfuração (aberta), ainda precisa ser suturada."
            : "";
    const detalhe = `${config.label} (dif ${dificuldade}): d20 (${bruto}) + ${nivelPericia} perícia `
        + `${penalidadeItem ? `${penalidadeItem} item ` : ""}${modificadorExtra ? `+${modificadorExtra} item específico ` : ""}`
        + `= ${resultado} — ${sucesso ? "SUCESSO" : (complicacao ? "FALHOU COM COMPLICAÇÃO" : "FALHOU")}.${detalheMargem}${detalheExtra}${notaCirurgiaSucesso}`;

    if (Object.keys(atualizacoesFerida).length) {
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaId}`)), atualizacoesFerida);
    }
    await registrarHistorico(fichaId, feridaId, { acao: config.label, quem: tratadorNome, resultado: detalhe });
    if (comaSinalizado) {
        await criarAcaoPendente({
            tipo: "confirmar_coma",
            fichaId,
            nomeJogador: tratadorNome,
            detalhe: `${tratadorNome}: Cirurgia de Campo falhou com complicação — paciente corre risco de entrar em coma. ${detalhe}`,
            payload: { fichaId, origem: "cirurgia_de_campo" }
        });
    }
    if (atualizacoesFerida.infeccaoAtiva) {
        await sincronizarFlagInfeccaoAgregada(fichaId);
    }
    // Mesmo cancelamento do caminho Godmode acima: ferida "sangramento"
    // tratada com sucesso (rolagem normal) para de sangrar na hora,
    // cancelando também o status de combate por turno vinculado.
    if (sucesso && ferida.tipo === "sangramento" && (acao === "estancar_sangramento" || acao === "suturar_ferimento")) {
        await cancelarStatusSangramentoPorFerida(fichaId, feridaId);
    }
    // Fase 8 (Torniquete Tático): idem ao caminho Godmode/sucesso
    // automático acima — só limpa em tratamento bem-sucedido.
    if (sucesso) {
        await limparTorniqueteSeCorresponde(fichaId, feridaId);
    }

    return {
        acao, dificuldade, bruto, nivelPericia, penalidadeItem, modificadorExtra,
        resultado, sucesso, complicacao, danoMargem, danoComplicacao, danoExtra, detalhe,
        novoEstado: atualizacoesFerida.estado || ferida.estado,
        comaSinalizado
    };
}

// ---------------------------------------------------------------------
// Recuperação de PV — trava por ferida aberta (usada pelo painel de
// Recursos Vitais em ficha.js). Retorna true só se TODAS as feridas da
// ficha estiverem "tratada" (ou não houver nenhuma).
// ---------------------------------------------------------------------
export async function todasFeridasFechadas(fichaId) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
    if (!snap.exists()) return true;
    return Object.values(snap.val()).every(feridaEstaFechada);
}

// ---------------------------------------------------------------------
// Silhueta de Saúde — agregação por zona (plano-silhueta-saude.txt,
// Fase 3). A Fase 1 já grava o local DETALHADO em ferida.local (braço/
// perna/mão/pé + lado, ou torso/cabeça sem lado); esta função só junta
// as feridas de cada uma das 10 zonas da silhueta pra a Fase 4 (cores/
// ícones) e a Fase 5 (caixinha flutuante) desenharem em cima, sem cada
// uma ter que reimplementar o agrupamento.
// ---------------------------------------------------------------------

// Prioridade do "pior estado" de uma zona (a mais grave decide a cor/
// ícone do marcador na silhueta — ver plano, Fase 4). Independe da
// ordem de criação das feridas: sempre a mais grave entre TODAS as
// feridas daquela zona, tratada ou não.
const PRIORIDADE_ESTADO_VISUAL = ["amputado", "sangrando", "infeccionada", "aberta", "tratada"];

// Estado visual de UMA ferida, pra fins de cor/ícone (não confundir com
// ferida.estado, que é o estado mecânico usado por tratarFerida/
// feridaAceitaSutura em regras.js). "Sangrando" aqui é especificamente
// a ferida tipo "sangramento" ainda "aberta" (sangramento estancado ou
// suturado já não sangra mais, mesmo que a ferida em si ainda exista).
// `ferida.amputado` é o campo gravado pela Fase 6 do plano (Mestre
// confirma amputação via Ação Pendente "confirmar_amputacao", ver
// mestre.js) — checado aqui pra a silhueta refletir o ícone ✂️.
export function estadoVisualFerida(ferida) {
    if (!ferida) return "tratada";
    if (ferida.amputado) return "amputado";
    if (ferida.tipo === "sangramento" && ferida.estado === "aberta") return "sangrando";
    if (ferida.infeccaoAtiva) return "infeccionada";
    if (ferida.estado === "tratada") return "tratada";
    return "aberta"; // aberta / estancada / sem_sangramento — ainda não fechada
}

// Agrupa a lista de feridas (feridasCache) nas 10 zonas da silhueta.
// Devolve SEMPRE as 10 chaves de ZONAS_SILHUETA (mesmo zonas vazias),
// pra quem desenha não precisar checar `zona in resultado` toda hora.
//
// Compatibilidade (Fase 1.5/plano): uma ferida com local genérico
// antigo ("membro"/"extremidade", de antes deste plano existir) não dá
// pra saber o lado — em vez de escolher um lado arbitrário, ela entra
// nas 4 zonas do grupo inteiro (braço/perna ou mão/pé, os dois lados),
// e cada zona que a recebeu fica marcada `indefinido: true` (a Fase 4
// desenha essas zonas com contorno tracejado em vez de preenchido, pra
// sinalizar "essa ferida é de antes do sorteio de lado").
export function agruparFeridasPorLocal(feridas) {
    const zonas = {};
    ZONAS_SILHUETA.forEach(zonaKey => { zonas[zonaKey] = { feridas: [], indefinido: false }; });

    (feridas || []).forEach(ferida => {
        if (!ferida || !ferida.local) return;
        const grupoGenerico = SUB_LOCAIS_FERIDA[ferida.local];
        if (grupoGenerico) {
            grupoGenerico.forEach(zonaKey => {
                if (!zonas[zonaKey]) return;
                zonas[zonaKey].feridas.push(ferida);
                zonas[zonaKey].indefinido = true;
            });
        } else if (zonas[ferida.local]) {
            zonas[ferida.local].feridas.push(ferida);
        }
    });

    ZONAS_SILHUETA.forEach(zonaKey => {
        const zona = zonas[zonaKey];
        zona.quantidadeAbertas = zona.feridas.filter(f => f.estado !== "tratada").length;
        zona.piorEstado = zona.feridas.length
            ? (PRIORIDADE_ESTADO_VISUAL.find(estado => zona.feridas.some(f => estadoVisualFerida(f) === estado)) || "tratada")
            : null; // null = zona sem nenhuma ferida (contorno neutro, Fase 4)
    });

    return zonas;
}
