// =====================================================================
// CHUVA DE NEON — Painel exclusivo do Mestre
// =====================================================================
// Tudo que só o Mestre pode fazer: dar XP, ativar godmode (ignora a
// trava de edição), rolar dado, causar dano, gerenciar NPCs, avançar o
// dia (com a regra de Domingo) e confirmar avanço de treinamento.

import { db } from "./firebase-config.js";
import { ref, set, get, update, push, remove, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import {
    rolarD20, rolarDado, calcularDerivados, coletarModificadores, somaModificadoresPara,
    calcularEstadoSaude, aplicarEstadoSaudeVelocidade, temPericiaTreinada,
    calcularEstadoEnergia, dificuldadeSangramento, dificuldadeDesmaio, DIFICULDADE_BASE_DESMAIO,
    calcularDificuldadeDefesaJogador, DIFICULDADE_INFECCAO_MINIMA,
    calcularPvMaximo, avancarRecuperacaoPV, chanceFeridaPorDano,
    aplicarReducaoTratamentoHospital, aplicarFatoresRecuperacaoItens, horasTotaisCalendario, deveConfirmarDesmaio, limiarAmputacaoPorDano,
    golpeDilacera, deveTestarSangramentoProfundo, multiplicadorReducaoPorClasse, aplicarPisoDanoContundenteColete,
    aplicarDanoVeiculo, zerarDeterioracoesDoAtributoVeiculo, vencedorPerseguicao
} from "./regras.js";
import { registrarRolagem, passarUmDia, avancarNDias, dispararAvisoCustoVida } from "./calendario.js";
import { avancarDiasTreinamento } from "./treinamento.js";
import { calcularSecundariosNpc } from "./npc-detalhado.js";
import { normalizarFicha } from "./normalizacao.js?v=20260822-fixhistorico";
import { PERICIAS_ARMA_BRANCA, ehDanoPerfurante, ehDanoCortante, ehDanoContundente, bonusCobraKaiIniciativa, ehIdSaldoDeItem, idItemDoSaldo, campoSaldoDoItem, ehContainer, diferencaClasseCalibreVsColete, bairroPerseguicao, sortearLocalDetalhado, arredondarMoeda } from "./dados-manual.js";
import { itemCabeNoContainer, itemPodeSerLevadoSolto, resolverEntradaLevandoConsigo } from "./inventario.js";
import { criarFerida, resolverFimSangramentoNatural } from "./saude.js";
import { buscarItemBancoPorId, autopreencherItemDoBanco } from "./itens-globais.js";

// Nível de uma perícia pelo nome, direto do objeto `pericias` da ficha
// (jogador) ou `pericias`/`periciasNpc` de um NPC — 0 se não tiver.
function nivelDaPericia(pericias, nome) {
    const entrada = Object.values(pericias || {}).find(p => p.nome === nome);
    return entrada ? (Number(entrada.nivel) || 0) : 0;
}

// Normaliza texto pra comparação tolerante a acento/caixa (ex.: "Frágil",
// "fragil", "FRÁGIL" batem todos igual).
function normalizarTexto(txt) {
    return String(txt || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

// Desvantagem "Frágil" (manual pg. 18): cadastrada como entrada
// freeform em `desvantagens` (sem código/id fixo — o jogador digita o
// nome), então a detecção é por texto normalizado, batendo tanto
// "Frágil" quanto variações de caixa/acento. Só conta entradas ativas
// (`ativo !== false` — mesma regra usada em coletarModificadores, ver
// regras.js).
const MULTIPLICADOR_DANO_FRAGIL = 2; // dobro do dano recebido (manual pg. 18: +100%)
// Recuperação de PV em andamento (manual, "Saúde e PVs"): "Danos
// recebidos quando em recuperação são aumentados em 50%".
const MULTIPLICADOR_DANO_RECUPERACAO = 1.5;
function temDesvantagemFragil(desvantagens) {
    return Object.values(desvantagens || {}).some(
        (d) => d && d.ativo !== false && normalizarTexto(d.nome) === "fragil"
    );
}

// ---------------------------------------------------------------------
// Padrão de vida — valores semanais fixos do manual (pg. 105-106).
// ---------------------------------------------------------------------
export const PADROES_DE_VIDA = [
    { key: "miseravel", label: "Miserável", custoSemanal: 100, limiteRecuperacaoSemTratamento: 0 },
    { key: "pobre", label: "Pobre", custoSemanal: 200, limiteRecuperacaoSemTratamento: 20 },
    { key: "tranquilo", label: "Tranquilo", custoSemanal: 400, limiteRecuperacaoSemTratamento: 40 },
    { key: "playboy", label: "Playboy", custoSemanal: 1000, limiteRecuperacaoSemTratamento: 60 },
    { key: "rico", label: "Rico", custoSemanal: 2000, limiteRecuperacaoSemTratamento: 80 }
];

export function custoSemanalPadraoDeVida(key) {
    const p = PADROES_DE_VIDA.find(p => p.key === key);
    return p ? p.custoSemanal : 0;
}

export function limiteRecuperacaoSemTratamento(key) {
    const p = PADROES_DE_VIDA.find(p => p.key === key);
    return p ? p.limiteRecuperacaoSemTratamento : 0;
}

export function custoSemanalTotal(fichaAtual) {
    const base = custoSemanalPadraoDeVida(fichaAtual.dados.padraoDeVida);
    const extras = Object.values(fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    return base + extras;
}

// ---------------------------------------------------------------------
// Lista de fichas ativas (dashboard do Mestre).
// ---------------------------------------------------------------------
export function ouvirTodasAsFichas(callback) {
    return onValue(ref(db, caminhoMesa("fichas")), (snap) => {
        callback(snap.exists() ? snap.val() : {});
    });
}

// ---------------------------------------------------------------------
// Dar XP
// ---------------------------------------------------------------------
// `titulo` (opcional, texto livre — ex: "Sessão 12: venceram os capangas
// do Kessler") fica registrado junto com o valor e a data em
// fichas/{id}/xpHistorico, pro Mestre conseguir olhar depois "já dei XP
// dessa sessão pra esse jogador?" sem depender de memória (ver
// montarPainelXpMultiplo, ficha.js). Edições diretas no campo XP da
// ficha (fora deste fluxo) continuam possíveis pro Mestre, mas não
// passam por aqui — não geram registro no histórico.
export async function darXp(fichaId, quantidade, titulo = "") {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/dados/xp`)));
    const xpAtual = snap.exists() ? Number(snap.val()) : 0;
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { xp: xpAtual + Number(quantidade) });
    const novaRef = push(ref(db, caminhoMesa(`fichas/${fichaId}/xpHistorico`)));
    await set(novaRef, {
        valor: Number(quantidade),
        titulo: (titulo || "").trim(),
        data: Date.now()
    });
}

// Listener em tempo real do histórico de XP de UMA ficha — usado tanto
// pela caixa de histórico na aba Perfil (visível pro Mestre e pro
// jogador dono da ficha) quanto por qualquer outro lugar que precise
// saber o que já foi concedido. Mais recente primeiro.
export function ouvirXpHistorico(fichaId, callback) {
    return onValue(ref(db, caminhoMesa(`fichas/${fichaId}/xpHistorico`)), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        const registros = Object.entries(valores).map(([id, v]) => ({ id, ...v }));
        registros.sort((a, b) => (b.data || 0) - (a.data || 0));
        callback(registros);
    });
}

// ---------------------------------------------------------------------
// Godmode — toggle global. Quando ativo, a trava de edição (atributos/
// perícias só na criação/levelup/treino) é ignorada pro Mestre em
// QUALQUER ficha que ele esteja olhando.
// ---------------------------------------------------------------------
export function ouvirGodmode(callback) {
    return onValue(ref(db, caminhoMesa("godmode")), (snap) => callback(snap.exists() ? !!snap.val() : false));
}

export async function definirGodmode(ativo) {
    await set(ref(db, caminhoMesa("godmode")), !!ativo);
}

// Sub-opção do Godmode (ver acima): por padrão, Godmode ligado NÃO
// desliga a penalidade de Machucado/Muito Machucado sozinho — só quando
// esse toggle também estiver marcado. Guardado à parte (não dentro de
// "godmode") justamente pra poder ficar marcado/desmarcado independente
// do Godmode estar ativo ou não no momento em que for usado.
export function ouvirIgnorarPenalidadeSaude(callback) {
    return onValue(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")), (snap) => callback(snap.exists() ? !!snap.val() : false));
}

export async function definirIgnorarPenalidadeSaude(ativo) {
    await set(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")), !!ativo);
}

// ---------------------------------------------------------------------
// Fator de preço de materiais (veículos) — toggle por mesa, mesmo padrão
// de godmode acima. Algumas mesas encarecem o custo de materiais em
// relação ao valor "de fábrica" do manual (CUSTOS_UPGRADE_VEICULO,
// dados-manual.js); em vez de reescrever a tabela do manual por mesa,
// guarda-se só um percentual de ajuste (pode ser negativo, pra mesas que
// barateiam) aplicado por cima do preço de referência na hora de exibir.
// Não muda em nada os MATERIAIS consumidos (Fase 3) — só o texto de CN$
// mostrado como referência, que já era só informativo, o narrador decide
// se cobra à parte. 0 = sem ajuste (preço padrão do manual).
// ---------------------------------------------------------------------
export function ouvirFatorPrecoMateriaisVeiculo(callback) {
    return onValue(ref(db, caminhoMesa("fatorPrecoMateriaisVeiculo")), (snap) => callback(snap.exists() ? (Number(snap.val()) || 0) : 0));
}

export async function definirFatorPrecoMateriaisVeiculo(percentual) {
    await set(ref(db, caminhoMesa("fatorPrecoMateriaisVeiculo")), Number(percentual) || 0);
}

// ---------------------------------------------------------------------
// Fator de preço da Dark Net (Creators/BlackPrint) — toggle por mesa,
// mesmo padrão do fator de veículos acima. Define quantos CN$ de
// diferença em relação ao item mais barato cadastrado equivalem a +1 de
// dificuldade no sorteio (ver dificuldadeItemDarknet em regras.js,
// plano-darknet-passo9.txt Parte 4). 0 = sem fórmula ainda configurada
// (dificuldadeItemDarknet trata 0 como "todo item cai na base, 15").
// Valor padrão sugerido pelo plano: 50.
// ---------------------------------------------------------------------
export function ouvirFatorPrecoDarknet(callback) {
    return onValue(ref(db, caminhoMesa("fatorPrecoDarknet")), (snap) => callback(snap.exists() ? (Number(snap.val()) || 0) : 50));
}

export async function definirFatorPrecoDarknet(valor) {
    await set(ref(db, caminhoMesa("fatorPrecoDarknet")), Number(valor) || 0);
}

// ---------------------------------------------------------------------
// Rolar dado (Mestre) — vai direto pro Log de Dados.
// ---------------------------------------------------------------------
export async function mestreRolarDado({ faces = 20, modificador = 0, quem = "Mestre", detalhe = "" }) {
    const bruto = rolarDado(faces);
    const resultado = bruto + Number(modificador || 0);
    await registrarRolagem({ quem, modificador, resultado, detalhe: detalhe || `d${faces}: ${bruto}${modificador ? (modificador >= 0 ? "+" : "") + modificador : ""}` });
    return { bruto, resultado };
}

// ---------------------------------------------------------------------
// Causar dano — resolve dano contra jogador ou NPC, já descontando a
// redução de armadura equipada (colete/placa com reducoesDano casando
// com o tipo de dano recebido — manual pg. 52-53). Retorna o resumo
// completo pro Mestre/automação montarem a mensagem do Log de Dados.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Causar dano — resolve dano contra jogador ou NPC, já descontando a
// redução de armadura equipada (manual pg. 52-53). Golpes Mirados
// (manual): a redução só conta os itens de Proteção cujo localProtegido
// bate com `localArmadura` (o local mirado do golpe — ver LOCAIS_MIRA
// em dados-manual.js). `localArmadura` null/omitido = comportamento
// antigo, sem filtrar por local (usado por ferramentas manuais do
// Mestre que não têm noção de golpe mirado). Retorna o resumo completo
// pro Mestre/automação montarem a mensagem do Log de Dados.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Sincroniza PV/PV máximo/estado de saúde (e o resto que depende deles —
// velocidade, modAgilidade) do(s) participante(s) do Gerenciador de
// Combate que correspondem a um alvo (ficha ou NPC), IMEDIATAMENTE após
// dano ou cura — sem esperar o próximo avanço de turno (avancarTurnoCombate
// já fazia essa sincronia, mas só pra TODOS os participantes de uma vez,
// na troca de turno; um jogador batendo num alvo no meio da rodada ficava
// sem refletir na tela dos outros até alguém passar de turno). Só mexe em
// algo se houver combate ativo E esse alvo estiver de fato entre os
// participantes — nas demais situações (dano fora de combate) não faz
// nada. Chamada por aplicarDano e curarAlvo logo depois de gravarem o
// pvAtual "de verdade" na ficha/NPC.
async function sincronizarParticipantesCombateDoAlvo(alvoTipo, alvoId) {
    const snapCombate = await get(ref(db, caminhoMesa("combateAtivo")));
    if (!snapCombate.exists()) return;
    const estado = snapCombate.val() || {};
    if (!estado.ativo || !estado.participantes) return;
    const pares = Object.entries(estado.participantes).filter(([, p]) => p && p.tipo === alvoTipo && p.refId === alvoId);
    if (!pares.length) return;

    const snapIgnorarSaude = await get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")));
    const snapGodmode = await get(ref(db, caminhoMesa("godmode")));
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    const atualizacoes = {};
    for (const [pid, participante] of pares) {
        const stats = await calcularStatsCombateParticipante(participante, ignorarPenalidadeSaude);
        atualizacoes[`participantes/${pid}/pv`] = stats.pv;
        atualizacoes[`participantes/${pid}/pvMax`] = stats.pvMax;
        atualizacoes[`participantes/${pid}/estadoSaude`] = stats.estadoSaude;
        atualizacoes[`participantes/${pid}/estadoSaudeLabel`] = stats.estadoSaudeLabel;
        atualizacoes[`participantes/${pid}/modAgilidade`] = stats.modAgilidade;
        atualizacoes[`participantes/${pid}/velocidade`] = stats.velocidade;
    }
    await update(ref(db, caminhoMesa("combateAtivo")), atualizacoes);
}

export async function aplicarDano(alvoTipo, alvoId, danoBruto, tipoDanoKey, localArmadura = null, ignorarArmaduraPontos = 0, calibreProjetil = null, localFerida = null) {
    const brutoNum = Number(danoBruto) || 0;
    const ignorarArmadura = Math.max(0, Number(ignorarArmaduraPontos) || 0);

    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoId}`)));
        if (!snap.exists()) throw new Error("Ficha do alvo não encontrada.");
        const raw = snap.val();
        const nomeAlvo = (raw.config && raw.config.nomeExibicao) || alvoId;
        // Quando pvAtual ainda não foi definido (ficha nova/em criação,
        // ainda sem dano registrado), o padrão tem que ser o PV MÁXIMO
        // calculado — nunca 0. Usar 0 aqui fazia qualquer dano aplicado
        // a um personagem ainda em criação "matar" ele na hora, mesmo
        // sem nunca ter perdido PV de verdade (a mesma convenção de
        // "sem dano registrado = PV cheio" já usada em toda parte,
        // ex: calcularEstadoSaude em regras.js).
        const dadosRaw = raw.dados || {};
        // Precisamos dos modificadores estruturados da ficha do alvo em
        // qualquer caso agora (não só quando pvAtual está indefinido):
        // o alvo "defesa" (Vantagem/Item/Especialização — ver
        // listaAlvosModificador em regras.js) é uma redução de dano
        // GENÉRICA (não filtrada por tipo de dano nem por local
        // mirado, ao contrário da armadura), então precisa entrar em
        // toda aplicação de dano.
        const fichaNormalizada = normalizarFicha(raw);
        const modificadoresAlvo = coletarModificadores(fichaNormalizada);
        const bonusDefesaGenerica = Math.max(0, somaModificadoresPara("defesa", modificadoresAlvo));
        let pvMaximoRaw = 0;
        if (dadosRaw.pvAtual === null || dadosRaw.pvAtual === undefined) {
            const derivadosRaw = calcularDerivados(fichaNormalizada.dados, modificadoresAlvo);
            const bonusExtraRaw = Number(dadosRaw.pvBonusExtra) || 0;
            const totalCalculadoRaw = Math.round(derivadosRaw.recursos.pv.total) + bonusExtraRaw;
            const overrideRaw = dadosRaw.pvMaximoOverride;
            pvMaximoRaw = (overrideRaw !== null && overrideRaw !== undefined && overrideRaw !== "") ? (Number(overrideRaw) || 0) : totalCalculadoRaw;
        }
        const pvAtual = (dadosRaw.pvAtual !== null && dadosRaw.pvAtual !== undefined) ? Number(dadosRaw.pvAtual) : pvMaximoRaw;
        // PV máximo "de verdade" (não só o fallback pvMaximoRaw calculado
        // acima só pro caso de pvAtual indefinido) — precisamos dele
        // sempre agora, pra decidir a CHANCE de ferida por dano (ver
        // chanceFeridaPorDano abaixo): usa a mesma fórmula centralizada
        // de calcularPvMaximo (regras.js), reaproveitando fichaNormalizada
        // que já foi montada acima.
        const pvMaximoFicha = calcularPvMaximo(fichaNormalizada);
        const inventario = raw.inventario || {};
        // Desvantagem Frágil (manual pg. 18): dobra o dano recebido de
        // qualquer tipo de ataque. Aplicada sobre o dano BRUTO do golpe
        // (mesmo ponto do pipeline em que o Acerto Crítico dobra o dano
        // em ficha.js, ANTES da redução de armadura), pra empilhar de
        // forma consistente com qualquer outro multiplicador de dano já
        // embutido em danoBruto (crítico, queima-roupa, etc.).
        const ehFragil = temDesvantagemFragil(raw.desvantagens);
        const brutoComFragil = ehFragil ? brutoNum * MULTIPLICADOR_DANO_FRAGIL : brutoNum;
        // Recuperação de PV em andamento (manual, "Saúde e PVs"): "Danos
        // recebidos quando em recuperação são aumentados em 50%".
        // Mesmo ponto do pipeline que Frágil (multiplica o bruto, ANTES
        // da redução de armadura) — os dois efeitos empilham em
        // sequência caso o personagem esteja Frágil E em recuperação ao
        // mesmo tempo.
        const emRecuperacao = !!(dadosRaw.recuperacaoPV && dadosRaw.recuperacaoPV.ativa);
        const brutoComRecuperacao = emRecuperacao ? brutoComFragil * MULTIPLICADOR_DANO_RECUPERACAO : brutoComFragil;
        let algumColeteFreouOTiro = false;
        const reducaoBruta = tipoDanoKey ? Object.values(inventario)
            .filter(it => it.categoria === "levando" && it.ativo !== false && Array.isArray(it.reducoesDano)
                && (localArmadura == null || it.localProtegido === localArmadura))
            .reduce((acc, it) => {
                const entrada = it.reducoesDano.find(r => r.tipo === tipoDanoKey);
                if (!entrada) return acc;
                const valorBase = Number(entrada.valor) || 0;
                // Redução do Dano por Colete x Calibre (manual pg. 53) —
                // só entra em jogo quando SABEMOS o calibre do tiro
                // (calibreProjetil informado) E esse item tem uma
                // classeProtecao cadastrada (colete de verdade, não
                // placa genérica/upgrade sem calibre associado). Sem
                // isso, mantém o comportamento de sempre (multiplicador
                // 1, redução cheia) — ver multiplicadorReducaoPorClasse
                // em regras.js.
                if (calibreProjetil && it.classeProtecao) {
                    const diferenca = diferencaClasseCalibreVsColete(calibreProjetil, it.classeProtecao);
                    const multiplicador = multiplicadorReducaoPorClasse(diferenca);
                    if (multiplicador > 0) algumColeteFreouOTiro = true;
                    return acc + Math.floor(valorBase * multiplicador);
                }
                return acc + valorBase;
            }, 0) : 0;
        // Força Bruta nível 2/4 (manual pg. 22): "golpes ignoram armadura
        // em pontos igual [ao dobro de] sua Força" — subtrai da redução
        // de armadura do alvo ANTES de aplicar no dano (nunca deixa a
        // redução negativa).
        const reducao = Math.max(0, reducaoBruta - ignorarArmadura) + bonusDefesaGenerica;
        const brutoComFragilArredondado = Math.round(brutoComRecuperacao);
        let danoFinal = Math.max(0, brutoComFragilArredondado - reducao);
        // Piso de dano mínimo contundente (manual pg. 53): só entra
        // quando sabemos o calibre do tiro E pelo menos um colete no
        // local acertado efetivamente freou o impacto (nem que seja em
        // parte — ver algumColeteFreouOTiro acima). Ignora a redução
        // (compara com o danoFinal já reduzido) e, se vencer, troca o
        // tipo de dano final pra contundente — devolvido em
        // tipoDanoFinalAjustado pra quem chamou usar no log e nas
        // regras que dependem de tipo de dano (ex.: contundente na
        // cabeça = aviso de Desmaio).
        let tipoDanoFinalAjustado = tipoDanoKey;
        if (calibreProjetil) {
            const resultadoPiso = aplicarPisoDanoContundenteColete({
                danoOriginal: brutoComFragilArredondado,
                danoAposReducao: danoFinal,
                coleteFreouAlgumaParte: algumColeteFreouOTiro
            });
            danoFinal = resultadoPiso.danoFinal;
            if (resultadoPiso.pisoAplicado) tipoDanoFinalAjustado = "contusao";
        }
        const novoPv = pvAtual - danoFinal;
        await update(ref(db, caminhoMesa(`fichas/${alvoId}/dados`)), { pvAtual: novoPv });
        await sincronizarParticipantesCombateDoAlvo("ficha", alvoId);
        // Coma (item 6 do plano de saúde/complicações): gatilho
        // automático quando o PV cai abaixo de 1/10 do total. Não cria
        // Ação Pendente de novo se a ficha já estiver em coma (evita
        // spam a cada novo golpe recebido enquanto ela seguir lá
        // embaixo) — o Mestre confirma/rejeita como qualquer outra
        // pendência (ver confirmarAcaoPendente "confirmar_coma" abaixo).
        const jaEmComa = !!(dadosRaw.coma && dadosRaw.coma.ativo);
        if (pvMaximoFicha > 0 && novoPv < pvMaximoFicha / 10 && !jaEmComa) {
            await criarAcaoPendente({
                tipo: "confirmar_coma",
                fichaId: alvoId,
                nomeJogador: nomeAlvo,
                detalhe: `${nomeAlvo} caiu pra ${novoPv}/${pvMaximoFicha} PV (menos de 1/10 do total) — risco de coma.`,
                payload: { fichaId: alvoId, origem: "pv_abaixo_de_um_decimo" }
            });
        }
        // Desmaio Genérico (item 4 do plano de saúde/complicações):
        // dano ÚNICO ≥ 1/5 do PV total, estando a ficha já "Machucado"
        // ou "Muito Machucado" DEPOIS de levar o golpe (ver
        // deveConfirmarDesmaio em regras.js). Vira Ação Pendente de
        // verdade — mesmo padrão de "iniciar_recuperacao_pv" — não uma
        // nota automática de log.
        const temToleranciaAlvo = temPericiaTreinada(fichaNormalizada.pericias, "Tolerância");
        if (deveConfirmarDesmaio(danoFinal, novoPv, pvMaximoFicha, temToleranciaAlvo)) {
            await criarAcaoPendente({
                tipo: "confirmar_desmaio",
                fichaId: alvoId,
                nomeJogador: nomeAlvo,
                detalhe: `${nomeAlvo} levou ${danoFinal} de dano num golpe só (≥ 1/5 do PV total) e está em ${novoPv}/${pvMaximoFicha} PV — teste de Constituição dif 18 contra desmaio.`,
                payload: { fichaId: alvoId, dano: danoFinal, pvAtual: novoPv, pvMaximo: pvMaximoFicha }
            });
        }
        // Amputação por Limiar de Dano (item 5 do plano de saúde/
        // complicações): dois limiares de dano ÚNICO (ver
        // limiarAmputacaoPorDano em regras.js) — não empilha estado
        // nenhum (diferente de coma/desmaio), é por golpe: cada hit que
        // bater o limiar vira uma nova Ação Pendente pro Mestre validar.
        // `localFerida` (plano-silhueta-saude.txt, Fase 6) — presente só
        // quando o golpe veio de um Golpe Mirado de verdade (ver os dois
        // pontos que chamam aplicarDano com esse 8º parâmetro); ausente
        // pra dano genérico (queda, arremesso, explosão etc., que não
        // têm um "local" pra apontar) — confirmarAcaoPendente só grava
        // ferida.amputado quando esse campo veio preenchido.
        const limiteAmputacao = limiarAmputacaoPorDano(danoFinal, pvMaximoFicha);
        if (limiteAmputacao) {
            const rotuloLimite = limiteAmputacao === "membro" ? "membro (≥ 1/5 do PV total)" : "dedo ou orelha (≥ 1/10 do PV total)";
            await criarAcaoPendente({
                tipo: "confirmar_amputacao",
                fichaId: alvoId,
                nomeJogador: nomeAlvo,
                detalhe: `${nomeAlvo} levou ${danoFinal} de dano num golpe só — bateu o limiar de amputação de ${rotuloLimite}.`,
                payload: { fichaId: alvoId, dano: danoFinal, limiteBatido: limiteAmputacao, local: localFerida || null }
            });
        }
        // danoBruto exibido já inclui o +50% de Frágil e/ou o +50% de
        // recuperação (quando aplicáveis), pra bater com a conta
        // "bruto - redução = final" mostrada no Log.
        return { nomeAlvo, danoBruto: brutoComFragilArredondado, fragil: ehFragil, emRecuperacao, reducao, danoFinal, novoPv, pvMaximo: pvMaximoFicha, tipoDanoFinalAjustado };
    }

    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoId}`)));
    if (!snap.exists()) throw new Error("NPC alvo não encontrado.");
    const npc = snap.val();
    const nomeAlvo = npc.nome || "NPC";
    // Mesma correção do ramo de ficha logo acima: sem pvAtual definido,
    // o padrão é o PV máximo do NPC (npc.pvs), não 0.
    const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : (Number(npc.pvs) || 0);
    // NPCs não têm armadura detalhada por parte do corpo — reducoesDano
    // deles continua valendo pra qualquer local mirado (simplificação;
    // só a ficha de jogador tem localProtegido por item). Pelo mesmo
    // motivo, a Redução do Dano por Colete x Calibre (manual pg. 53)
    // também não se aplica aqui — reducoesDano de NPC não tem
    // classeProtecao por entrada, então calibreProjetil é ignorado
    // nesse ramo (tipoDanoFinalAjustado sempre igual a tipoDanoKey).
    const reducoesNpc = (npc.reducoesDano && npc.reducoesDano.length)
        ? npc.reducoesDano
        : (npc.protecaoTipo ? [{ tipo: npc.protecaoTipo, valor: npc.protecaoValor || 0 }] : []);
    const reducaoBrutaNpc = tipoDanoKey
        ? reducoesNpc.reduce((acc, r) => acc + (r.tipo === tipoDanoKey ? (Number(r.valor) || 0) : 0), 0)
        : 0;
    // Vantagem "defesa" (redução de dano genérica, ver aplicarDano pro
    // ramo de ficha acima) também vale pra NPC — mesmo alvo, mesma regra.
    const bonusDefesaGenericaNpc = Math.max(0, somaModificadoresPara("defesa", coletarModificadores({ vantagens: npc.vantagens })));
    const reducao = Math.max(0, reducaoBrutaNpc - ignorarArmadura) + bonusDefesaGenericaNpc;
    const danoFinal = Math.max(0, brutoNum - reducao);
    const novoPv = pvAtual - danoFinal;
    await update(ref(db, caminhoMesa(`npcs/${alvoId}`)), { pvAtual: novoPv });
    await sincronizarParticipantesCombateDoAlvo("npc", alvoId);
    return { nomeAlvo, danoBruto: brutoNum, reducao, danoFinal, novoPv, tipoDanoFinalAjustado: tipoDanoKey };
}

// Cura imediata (Parte 5.6 — Bioquímico "Restaure N PVs"). Espelha
// aplicarDano acima (mesma resolução de alvoTipo "ficha"/"npc"), só
// que somando em vez de subtrair, e sem nenhuma das complicações de
// dano (armadura, Frágil, coma, desmaio, amputação não fazem sentido
// pra cura). Trava em pvMaximo — cura nunca deixa o alvo "acima do
// teto" (mesmo pvMaximo calculado por calcularPvMaximo pro caso de
// ficha; npc.pvs pro caso de NPC).
export async function curarAlvo(alvoTipo, alvoId, valorCura) {
    const curaNum = Math.max(0, Number(valorCura) || 0);

    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoId}`)));
        if (!snap.exists()) throw new Error("Ficha do alvo não encontrada.");
        const raw = snap.val();
        const nomeAlvo = (raw.config && raw.config.nomeExibicao) || alvoId;
        const dadosRaw = raw.dados || {};
        const fichaNormalizada = normalizarFicha(raw);
        const pvMaximoFicha = calcularPvMaximo(fichaNormalizada);
        // Mesmo fallback de "sem pvAtual definido = PV máximo" já usado
        // em aplicarDano, pra ficha ainda em criação/sem dano registrado.
        let pvMaximoRaw = 0;
        if (dadosRaw.pvAtual === null || dadosRaw.pvAtual === undefined) {
            const modificadoresAlvo = coletarModificadores(fichaNormalizada);
            const derivadosRaw = calcularDerivados(fichaNormalizada.dados, modificadoresAlvo);
            const bonusExtraRaw = Number(dadosRaw.pvBonusExtra) || 0;
            const totalCalculadoRaw = Math.round(derivadosRaw.recursos.pv.total) + bonusExtraRaw;
            const overrideRaw = dadosRaw.pvMaximoOverride;
            pvMaximoRaw = (overrideRaw !== null && overrideRaw !== undefined && overrideRaw !== "") ? (Number(overrideRaw) || 0) : totalCalculadoRaw;
        }
        const pvAtual = (dadosRaw.pvAtual !== null && dadosRaw.pvAtual !== undefined) ? Number(dadosRaw.pvAtual) : pvMaximoRaw;
        const novoPv = pvMaximoFicha > 0 ? Math.min(pvMaximoFicha, pvAtual + curaNum) : pvAtual + curaNum;
        await update(ref(db, caminhoMesa(`fichas/${alvoId}/dados`)), { pvAtual: novoPv });
        await sincronizarParticipantesCombateDoAlvo("ficha", alvoId);
        return { nomeAlvo, curaAplicada: novoPv - pvAtual, pvAtual: novoPv, pvMaximo: pvMaximoFicha };
    }

    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoId}`)));
    if (!snap.exists()) throw new Error("NPC alvo não encontrado.");
    const npc = snap.val();
    const nomeAlvo = npc.nome || "NPC";
    const pvMaximoNpc = Number(npc.pvs) || 0;
    const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMaximoNpc;
    const novoPv = pvMaximoNpc > 0 ? Math.min(pvMaximoNpc, pvAtual + curaNum) : pvAtual + curaNum;
    await update(ref(db, caminhoMesa(`npcs/${alvoId}`)), { pvAtual: novoPv });
    await sincronizarParticipantesCombateDoAlvo("npc", alvoId);
    return { nomeAlvo, curaAplicada: novoPv - pvAtual, pvAtual: novoPv, pvMaximo: pvMaximoNpc };
}

// Mantidas por compatibilidade com qualquer chamada antiga — agora só
// delegam pra aplicarDano() sem tipo de dano (ou seja, sem redução).
export async function causarDanoJogador(fichaId, valor) {
    return aplicarDano("ficha", fichaId, valor, null);
}

export async function causarDanoNpc(npcId, valor) {
    return aplicarDano("npc", npcId, valor, null);
}

// ---------------------------------------------------------------------
// Causar dano a um VEÍCULO (manual pg. 36-43, Fase 2 do plano — ver
// plano-veiculos-fase2.txt). Veículo ainda não é participante do
// Gerenciador de Combate (isso é Fase 9, fora de escopo), então este é
// o único jeito de aplicar dano nele por enquanto: endereçado por
// fichaId+veiculoId em vez de participanteId, disparado manualmente
// pelo Mestre (ver botão "Aplicar dano" no card do veículo, ficha.js).
// A conta em si (redução por Proteção, PV, quantos "quintos" de PV
// máximo foram cruzados, quais deteriorações aplicar) é toda pura em
// aplicarDanoVeiculo (regras.js) — esta função só lê o veículo atual do
// Firebase, chama a regra, e grava o resultado de volta.
// ---------------------------------------------------------------------
export async function causarDanoVeiculo(fichaId, veiculoId, danoBruto, atributoEscolhido) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}`)));
    if (!snap.exists()) throw new Error("Veículo não encontrado.");
    const veiculo = snap.val();
    const resultado = aplicarDanoVeiculo(veiculo, danoBruto, atributoEscolhido);
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}`)), {
        pvAtual: resultado.pvAtualDepois,
        deterioracoes: resultado.deterioracoesResultantes
    });
    return { ...resultado, nomeVeiculo: veiculo.nome || "Veículo" };
}

// ---------------------------------------------------------------------
// Status por turno (Tick System) — efeitos que ficam "grudados" num
// participante do Gerenciador de Combate e se resolvem sozinhos a cada
// troca de turno, com contagem regressiva própria. Guardados em
// combateAtivo/participantes/{id}/statusAtivos/{chave} — cada chave é
// um efeito independente (dá pra ter mais de um ativo ao mesmo tempo).
// Processados em processarStatusInicioTurno(), chamada de dentro de
// avancarTurnoCombate() logo abaixo.
// ---------------------------------------------------------------------

// Motor genérico de "status por turno" — grava qualquer efeito com
// contagem regressiva própria em
// combateAtivo/participantes/{id}/statusAtivos/{chave nova}. Cada
// chamador monta o objeto `dadosStatus` já no formato final (precisa
// ter pelo menos `tipo`, `label` e `turnosRestantes` — processarStatus
// InicioTurno abaixo é quem decide o que fazer com cada `tipo`).
// Extraído do antigo aplicarSangramento (que fazia isso inline, só pra
// sangramento) pra virar a base compartilhada de todos os efeitos de
// status por turno, incluindo os dos materiais químicos.
async function aplicarStatusPorTurno(participanteId, dadosStatus) {
    if (!participanteId) return null;
    const novaRef = push(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/statusAtivos`)));
    await set(novaRef, dadosStatus);
    return { id: novaRef.key, ...dadosStatus };
}

// Sangramento por Golpe Perfurante (manual): dura 2 ou 3 turnos
// conforme o local mirado, com dano fixo por turno igual a uma fração
// do dano causado pelo golpe que sangrou (1/4 em Torso/Membro/
// Extremidade, 1/3 na Cabeça — SEM rolar dado, o mesmo valor se repete
// em cada turno). Cada golpe que causa Sangramento entra como uma
// entrada NOVA e independente (não sobrescreve/renova a anterior) —
// vários golpes seguidos empilham vários sangramentos simultâneos,
// cada um com sua própria contagem e seu próprio dano fixo, todos
// tickando juntos a cada turno (ver processarStatusInicioTurno abaixo).
// Wrapper fino sobre aplicarStatusPorTurno — mesmo formato de retorno
// { danoPorTurno, turnos } que os chamadores já esperavam, agora com
// `statusId` a mais (Fase D do plano mestre-tratar-feridas): o id da
// entrada em statusAtivos, pra quem cria a ferida persistente
// correspondente (saude.js/criarFerida) poder vincular os dois depois
// — ver vincularFeridaAoStatusSangramento, logo abaixo — e assim a
// ferida sumir sozinha quando o status expirar (processarStatus
// InicioTurno).
export async function aplicarSangramento(participanteId, danoPorTurno, turnos, origem) {
    const resultado = await aplicarStatusPorTurno(participanteId, {
        tipo: "sangramento",
        label: "Sangramento",
        turnosRestantes: turnos,
        danoPorTurno,
        origem
    });
    if (!resultado) return;
    return { danoPorTurno, turnos, statusId: resultado.id };
}

// Fase D.2 (plano mestre-tratar-feridas): grava o id da ferida
// persistente ("sangramento", saude.js) dentro da própria entrada de
// statusAtivos que gerou essa ferida — é esse vínculo que permite a
// ferida sumir sozinha quando o status expira (ver
// processarStatusInicioTurno, branch "sangramento" abaixo). Chamado
// só quando os dois já existem (status criado por aplicarSangramento
// + ferida criada por criarFerida, saude.js) — se qualquer um faltar
// (ex.: alvo é NPC, sem sistema de feridas), o chamador nem invoca
// esta função.
export async function vincularFeridaAoStatusSangramento(participanteId, statusId, feridaId) {
    if (!participanteId || !statusId || !feridaId) return;
    await update(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/statusAtivos/${statusId}`)), { feridaId });
}

// Caminho inverso do vínculo acima: quando a ferida "sangramento" é
// tratada com SUCESSO na aba Saúde (Estancar Sangramento, ou Suturar
// Ferimento fechando ela direto — ver tratarFerida, saude.js), o
// sangramento para NA HORA — não faz sentido a ferida já estar
// "estancada"/"tratada" e o status de combate continuar tickando dano
// por turno até o timer zerar sozinho (essa era a "Decisão em aberto"
// do plano mestre-tratar-feridas-sangramento.txt, resolvida a favor de
// cancelar). Busca, em TODOS os participantes de combate (ficha pode
// não estar mais em combate, ou combate pode nem estar ativo — nesses
// casos não há nada pra cancelar e a função só retorna false sem
// erro), a entrada de statusAtivos tipo "sangramento" vinculada a essa
// feridaId e remove ela (não zera turnosRestantes — remove de vez, já
// que não sobra motivo pra manter o registro). A ferida em si já foi
// atualizada por quem chamou (tratarFerida) — esta função só mexe no
// status de combate.
export async function cancelarStatusSangramentoPorFerida(fichaId, feridaId) {
    if (!fichaId || !feridaId) return false;
    const snap = await get(ref(db, caminhoMesa("combateAtivo/participantes")));
    if (!snap.exists()) return false;
    const participantes = snap.val();
    let cancelado = false;
    for (const [participanteId, participante] of Object.entries(participantes)) {
        if (!participante || participante.tipo !== "ficha" || participante.refId !== fichaId) continue;
        const statusAtivos = participante.statusAtivos || {};
        for (const [chave, status] of Object.entries(statusAtivos)) {
            if (status && status.tipo === "sangramento" && status.feridaId === feridaId) {
                await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/statusAtivos/${chave}`)));
                cancelado = true;
            }
        }
    }
    return cancelado;
}

// Novo tipo "dano_continuo" (Parte 5.2 — Tóxico/Inflamável residual).
// Igual ao sangramento no formato (dano fixo por turno, mesma
// contagem regressiva), mas SEM teste de Constituição pra resistir —
// o manual não prevê chance de resistir à exposição química residual
// (diferente do Sangramento por golpe). tipoDanoKey segue pro dano
// aplicado a cada turno em processarStatusInicioTurno, igual
// aplicarDano já recebe em qualquer outro ponto do sistema.
export async function aplicarDanoContinuoQuimico(participanteId, danoPorTurno, turnos, origem, tipoDanoKey) {
    return aplicarStatusPorTurno(participanteId, {
        tipo: "dano_continuo",
        label: "Exposição química",
        turnosRestantes: turnos,
        danoPorTurno,
        origem,
        tipoDanoKey: tipoDanoKey || null
    });
}

// Novo tipo "penalidade_temporizada" (Parte 5.3 — Sedativo 1/3,
// Psicotrópico 1). Modificador negativo com prazo de validade em
// turnos, em um ou mais alvos do sistema de modificadores já existente
// (listaAlvosModificador, regras.js — ex.: "testes_fisicos",
// "testes_mentais", "testes_sociais"). O lado que SOMA esse valor nos
// testes efetivos fica em ficha.js (somaModificadoresPara), lendo
// combateAtivo/participantes/{id}/statusAtivos igual
// calcularModificadoresAbstinencia já lê ficha.desvantagens — aqui só
// grava a entrada.
export async function aplicarPenalidadeTemporizada(participanteId, alvos, valor, turnos, origem) {
    return aplicarStatusPorTurno(participanteId, {
        tipo: "penalidade_temporizada",
        label: origem,
        turnosRestantes: turnos,
        alvos: Array.isArray(alvos) ? alvos : [alvos],
        valor,
        origem
    });
}

// Novo tipo "desmaio_temporizado" (Parte 5.5 — Sedativo 2/3/4,
// "desmaia por N turnos"). Variante do Desacordado ORIGINAL
// (definirDesacordado, ainda usado sem mudança pros casos SEM duração
// fixa — Sedativo nível 3/5) só que com contagem regressiva própria:
// quando turnosRestantes chega em 0, processarStatusInicioTurno acorda
// o participante sozinho, sem precisar do Mestre clicar em nada.
export async function aplicarDesmaioTemporizado(participanteId, turnos, origem) {
    return aplicarStatusPorTurno(participanteId, {
        tipo: "desmaio_temporizado",
        label: "Desmaiado",
        turnosRestantes: turnos,
        origem
    });
}

// Novo tipo "perde_acao_temporizado" (Parte 5.1 do plano de automação
// dos materiais químicos — Psicotrópico nível 2, "falha → perde 1 ação
// por turno durante 2 turnos"). Mesma estrutura de contagem regressiva
// do desmaio temporizado (ver acima), mas em vez de travar o
// participante por completo, cada turno ATIVO dele (ou seja, quando
// chega a vez desse participante agir) consome 1 ação da economia
// normal de turno, em vez de bloquear tudo. O bloqueio em si acontece
// em avancarTurnoCombate, no ponto exato onde `acoes` já é decidido
// pra cada participante (ver bloqueiaAcaoNovoTurno logo abaixo) —
// aqui só grava a entrada de status, igual todo o resto do motor.
export async function aplicarPerdaAcaoTemporizada(participanteId, turnos, origem) {
    return aplicarStatusPorTurno(participanteId, {
        tipo: "perde_acao_temporizado",
        label: "Perda de ação (efeito psicotrópico)",
        turnosRestantes: turnos,
        origem
    });
}

// Novo tipo "teste_atrasado" (Parte 5.4 — Sedativo 2, gatilhos "após N
// turnos"). Não faz nada durante a contagem — ao chegar em
// turnosRestantes 0, processarStatusInicioTurno dispara sozinho um
// teste de resistência (1d20 + periciaResistencia, o valor JÁ
// CALCULADO do alvo, recebido aqui como parâmetro igual o resto do
// motor faz — mesmo padrão de testarSangramento recebendo
// constituicaoAlvo pronto) contra `dificuldade`. Falha empurra
// `consequenciaSeFalhar` como uma NOVA entrada de statusAtivos
// (encadeando aplicarStatusPorTurno de novo). ignoraResistencia (Parte
// 5.8 — Catalizador nível 5) pula a rolagem e trata como falha
// automática quando presente.
export async function aplicarTesteAtrasado(participanteId, turnosAteTeste, periciaResistencia, dificuldade, origem, consequenciaSeFalhar, ignoraResistencia = false) {
    return aplicarStatusPorTurno(participanteId, {
        tipo: "teste_atrasado",
        label: origem,
        turnosRestantes: turnosAteTeste,
        periciaResistencia,
        dificuldade,
        origem,
        consequenciaSeFalhar: consequenciaSeFalhar || null,
        ignoraResistencia: !!ignoraResistencia
    });
}

// Teste de Constituição contra Sangramento (manual): rolado uma vez por
// Golpe Mirado PERFURANTE que causou dano de verdade (golpe "Padrão",
// sem mirar, nunca sangra — manual: "sem efeitos extras") OU por
// qualquer tiro de arma de fogo perfurante (mirado ou não — manual pg.
// 57: "ao ser atingido por um projétil, role um teste de
// Constituição"), ANTES de decidir se aplicarSangramento entra em
// ação. dificuldade = 10 + nível da arma + agravante do local
// (regraLocal.difExtra — dificuldadeSangramento em regras.js; o manual
// não dá uma dificuldade separada pra pág. 57, então a mesma fórmula é
// reaproveitada pra ambos os casos). Sucesso (d20 + Constituição do
// alvo >= dificuldade) resiste — o ferimento não sangra, sem nenhum
// efeito mecânico.
//
// Falha entra como uma entrada nova de Sangramento, mas o CÁLCULO do
// dano/duração muda conforme a origem (ehProjetil):
// - Golpe Mirado corpo a corpo/arma branca (manual pg. 51): dano FIXO
//   = fração do dano original (regraLocal.fracaoDano), por
//   regraLocal.turnos turnos (2 ou 3, conforme o local).
// - Tiro de arma de fogo (manual pg. 57): "1d metade do dano recebido
//   [...] sempre arredondado pra baixo" — um ÚNICO dado é rolado (o
//   próprio tamanho do dado é metade do dano causado, ex.: 20 de dano
//   → 1d10) e o RESULTADO dessa rolagem vale como dano fixo pelos
//   próximos 3 turnos (não é rerolado a cada turno — mesmo padrão do
//   exemplo do manual: "rolou 1d10, resultado 7 [...] receberá por três
//   turnos 7 de dano").
export async function testarSangramento(participanteId, constituicaoAlvo, nivelArma, danoOriginalBruto, regraLocal, ehProjetil = false) {
    if (!participanteId || !regraLocal) return null;
    const dificuldade = dificuldadeSangramento(nivelArma, regraLocal.difExtra);
    const bruto = rolarD20();
    const modConstituicao = Number(constituicaoAlvo) || 0;
    const resultado = bruto + modConstituicao;
    const sucesso = resultado >= dificuldade;
    let sangramento = null;
    let detalheDano = "";
    if (!sucesso) {
        let danoPorTurno, turnos;
        if (ehProjetil) {
            const facesDado = Math.max(1, Math.floor((Number(danoOriginalBruto) || 0) / 2));
            danoPorTurno = rolarDado(facesDado);
            turnos = 3;
            detalheDano = ` (1d${facesDado}: ${danoPorTurno})`;
        } else {
            danoPorTurno = Math.max(0, Math.floor((Number(danoOriginalBruto) || 0) * regraLocal.fracaoDano));
            turnos = regraLocal.turnos;
        }
        sangramento = await aplicarSangramento(participanteId, danoPorTurno, turnos, ehProjetil ? "Tiro de arma de fogo" : "Golpe Mirado perfurante");
    }
    return {
        dificuldade, bruto, modConstituicao, resultado, sucesso, sangramento,
        detalhe: sucesso
            ? `Teste de Constituição vs. Sangramento (dif ${dificuldade}): d20 (${bruto}) ${modConstituicao >= 0 ? "+" : ""}${modConstituicao} = ${resultado} — RESISTIU, não sangrou.`
            : `Teste de Constituição vs. Sangramento (dif ${dificuldade}): d20 (${bruto}) ${modConstituicao >= 0 ? "+" : ""}${modConstituicao} = ${resultado} — FALHOU, começou a SANGRAR${detalheDano} (${sangramento.danoPorTurno} de dano fixo por turno, por ${sangramento.turnos} turnos).`
    };
}

// Teste de Constituição contra Sangramento PROFUNDO (item 7 do plano de
// saúde/complicações, Dilaceração — ver golpeDilacera/
// deveTestarSangramentoProfundo em regras.js): dificuldade FIXA 20
// (não usa a fórmula por nível de arma do Sangramento comum — manual
// não prevê agravante de local nem de arma aqui), dano fixo = metade
// do dano dilacerante que causou (arredondado pra baixo), por 3 turnos
// (mesma duração já usada pro Sangramento de tiro de arma de fogo — o
// manual não dá uma duração própria separada pra esse caso).
// Reaproveita aplicarSangramento (mesma infraestrutura de status por
// turno do Sangramento comum) — as duas entradas empilham normalmente
// se acontecerem juntas (ex.: tiro perfurante que também dilacerou).
export async function testarSangramentoProfundo(participanteId, constituicaoAlvo, danoDilacerante) {
    if (!participanteId) return null;
    const dificuldade = 20;
    const bruto = rolarD20();
    const modConstituicao = Number(constituicaoAlvo) || 0;
    const resultado = bruto + modConstituicao;
    const sucesso = resultado >= dificuldade;
    let sangramento = null;
    if (!sucesso) {
        const danoPorTurno = Math.max(0, Math.floor((Number(danoDilacerante) || 0) / 2));
        sangramento = await aplicarSangramento(participanteId, danoPorTurno, 3, "Dilaceração (Sangramento Profundo)");
    }
    return {
        dificuldade, bruto, modConstituicao, resultado, sucesso, sangramento,
        detalhe: sucesso
            ? `Teste de Constituição vs. Sangramento Profundo (dif ${dificuldade}): d20 (${bruto}) ${modConstituicao >= 0 ? "+" : ""}${modConstituicao} = ${resultado} — RESISTIU, não sangrou.`
            : `Teste de Constituição vs. Sangramento Profundo (dif ${dificuldade}): d20 (${bruto}) ${modConstituicao >= 0 ? "+" : ""}${modConstituicao} = ${resultado} — FALHOU, começou a SANGRAR PROFUNDAMENTE (${sangramento.danoPorTurno} de dano fixo por turno, por ${sangramento.turnos} turnos).`
    };
}

// Fases C e D (plano mestre-tratar-feridas-sangramento.txt): a partir
// de um resultado de testarSangramento OU testarSangramentoProfundo
// (mesmo formato de retorno nos dois — `sangramento` truthy quando
// falhou o teste e começou a sangrar), cria as feridas persistentes
// correspondentes e já deixa tudo vinculado:
// - Ferida "sangramento" (saude.js) — pra tratar com Estancar depois.
// - Ferida "corte" GARANTIDA no mesmo local, sem chance nenhuma (Fase
//   C — antes disso, só existia via chanceFeridaPorDano, então dava
//   pra sangrar sem nunca abrir corte).
// - Vínculo feridaId <-> statusId (Fase D) via
//   vincularFeridaAoStatusSangramento — é esse vínculo que permite a
//   ferida "sangramento" sumir sozinha (removerFerida) quando o status
//   por turno expira sozinho (ver processarStatusInicioTurno abaixo).
// Só roda quando `habilitado` for true (ficha de jogador, dano de
// verdade — NPC não entra no sistema de feridas ainda). Devolve true
// quando a ferida de corte foi garantida aqui, pra quem chama saber
// que não precisa (e não deve) deixar o bloco de "chance de ferida por
// dano" abrir uma segunda em cima do mesmo golpe.
export async function registrarFeridasDeSangramento(habilitado, participanteId, alvoRefId, localFerida, origem, resultadoSangramento) {
    if (!habilitado || !resultadoSangramento || !resultadoSangramento.sangramento) return false;
    const { danoPorTurno, turnos, statusId } = resultadoSangramento.sangramento;
    const feridaSangramento = await criarFerida(alvoRefId, {
        tipo: "sangramento", local: localFerida, origem, danoPorTurno, turnosRestantes: turnos
    });
    await criarFerida(alvoRefId, { tipo: "corte", local: localFerida, origem: `${origem} (sangramento)` });
    if (statusId) {
        await vincularFeridaAoStatusSangramento(participanteId, statusId, feridaSangramento.id);
    }
    return true;
}

// Resolve os status ativos de quem está prestes a agir (chamada com o
// PRÓXIMO turnoAtual, antes do recálculo de PV/Velocidade/estado de
// saúde de avancarTurnoCombate — assim o dano do tick já entra nesse
// mesmo recálculo). Cada entrada em statusAtivos é resolvida
// independente — se houver mais de um efeito de dano por turno
// empilhado (Sangramento e/ou Exposição Química), cada um causa seu
// próprio dano fixo no mesmo turno (e a soma total é logada à parte,
// pra ficar claro no Log de Dados). Retorna as notas de log (uma por
// efeito resolvido, + o total combinado se houver mais de um) pro
// chamador registrar.
//
// Generalizada (Parte 5 do plano de automação dos materiais químicos)
// pra cobrir, além do sangramento original:
// - "dano_continuo": mesmo dano fixo por turno do sangramento, só que
//   passando status.tipoDanoKey pra aplicarDano em vez de null (Parte
//   5.2) — reaproveita o MESMO bloco/contador do sangramento, sem
//   inventar um paralelo.
// - "penalidade_temporizada": não faz nada aqui além da contagem
//   regressiva genérica no rodapé do loop (quem lê o valor é
//   somaModificadoresPara, do lado da ficha) — Parte 5.3.
// - "desmaio_temporizado": idem, só com uma nota de log própria
//   ("acordou") na hora de expirar em vez da genérica "terminou" —
//   Parte 5.5.
// - "teste_atrasado": ao ZERAR a contagem, dispara ele mesmo um teste
//   de resistência (1d20 + periciaResistencia já calculada, contra
//   dificuldade) em vez de só expirar — falha empurra
//   consequenciaSeFalhar como uma NOVA entrada encadeada de
//   statusAtivos (Parte 5.4). ignoraResistencia pula a rolagem e trata
//   como falha automática (Parte 5.8, Catalizador nível 5).
async function processarStatusInicioTurno(participanteId, participante) {
    const statusAtivos = participante && participante.statusAtivos;
    if (!statusAtivos) return { statusFinal: null, notas: [] };

    const statusFinal = {};
    const notas = [];
    let totalDanoTurno = 0;
    let danosPorTurnoAtivos = 0;

    for (const [chave, status] of Object.entries(statusAtivos)) {
        if (!status || (Number(status.turnosRestantes) || 0) <= 0) continue;

        if (status.tipo === "sangramento" || status.tipo === "dano_continuo") {
            danosPorTurnoAtivos++;
            const dano = Number(status.danoPorTurno) || 0;
            const tipoDanoKey = status.tipo === "dano_continuo" ? (status.tipoDanoKey || null) : null;
            const resultado = await aplicarDano(participante.tipo, participante.refId, dano, tipoDanoKey);
            totalDanoTurno += dano;
            const verbo = status.tipo === "dano_continuo" ? "sofreu exposição química" : "sangrou";
            notas.push(`${resultado.nomeAlvo} ${verbo} (${status.turnosRestantes} turno(s) restante(s)): ${dano} de dano fixo. PV restante: ${resultado.novoPv}.`);
        }

        const restante = (Number(status.turnosRestantes) || 0) - 1;

        if (restante > 0) {
            // Ainda contando — penalidade_temporizada/desmaio_temporizado/
            // teste_atrasado não fazem nada além disso enquanto não
            // zerarem (o efeito deles é lido em outro lugar, ou só
            // dispara na hora de expirar, tratado abaixo).
            statusFinal[chave] = { ...status, turnosRestantes: restante };
            continue;
        }

        // Chegou em 0 — cada tipo expira do seu jeito.
        if (status.tipo === "teste_atrasado") {
            statusFinal[chave] = null; // a entrada de espera some, vira o teste
            const dificuldade = Number(status.dificuldade) || 0;
            const modResistencia = Number(status.periciaResistencia) || 0;
            const bruto = status.ignoraResistencia ? null : rolarD20();
            const resultado = status.ignoraResistencia ? null : bruto + modResistencia;
            const sucesso = status.ignoraResistencia ? false : resultado >= dificuldade;
            const nomeAlvo = participante.nome || participanteId;
            if (sucesso) {
                notas.push(`${nomeAlvo} — Teste de resistência vs. ${status.label || "efeito"} (dif ${dificuldade}): d20 (${bruto}) ${modResistencia >= 0 ? "+" : ""}${modResistencia} = ${resultado} — RESISTIU.`);
            } else {
                const detalheRolagem = status.ignoraResistencia
                    ? "resistência ignorada"
                    : `d20 (${bruto}) ${modResistencia >= 0 ? "+" : ""}${modResistencia} = ${resultado}`;
                notas.push(`${nomeAlvo} — Teste de resistência vs. ${status.label || "efeito"} (dif ${dificuldade}): ${detalheRolagem} — FALHOU.`);
                if (status.consequenciaSeFalhar) {
                    const novoStatus = await aplicarStatusPorTurno(participanteId, status.consequenciaSeFalhar);
                    if (novoStatus) {
                        const { id: novoId, ...dadosNovoStatus } = novoStatus;
                        statusFinal[novoId] = dadosNovoStatus;
                        notas.push(`${nomeAlvo}: ${dadosNovoStatus.label || dadosNovoStatus.tipo} começou.`);
                    }
                }
            }
        } else if (status.tipo === "sangramento") {
            // Fase D (plano mestre-tratar-feridas-sangramento): o
            // sangramento parou sozinho (contagem zerou) — se essa
            // entrada estava vinculada a uma ferida persistente
            // (feridaId, ver registrarFeridasDeSangramento/
            // vincularFeridaAoStatusSangramento), a ferida "sangramento"
            // some sozinha também. NPC não tem sistema de feridas
            // (participante.tipo !== "ficha"), então feridaId nunca
            // deveria existir nesse caso, mas confere mesmo assim.
            statusFinal[chave] = null; // expira — update() remove a chave
            if (status.feridaId && participante.tipo === "ficha") {
                await resolverFimSangramentoNatural(participante.refId, status.feridaId);
                notas.push(`${participante.nome || participanteId} parou de sangrar — a ferida de Sangramento foi encerrada (resta a ferida de Corte/Perfuração para suturar).`);
            } else {
                notas.push(`${participante.nome || participanteId}: Sangramento terminou.`);
            }
        } else if (status.tipo === "desmaio_temporizado") {
            statusFinal[chave] = null; // expira — update() remove a chave
            notas.push(`${participante.nome || participanteId} acordou.`);
        } else if (status.tipo === "perde_acao_temporizado") {
            statusFinal[chave] = null; // expira — update() remove a chave
            notas.push(`${participante.nome || participanteId} recuperou o controle total das próprias ações (efeito psicotrópico passou).`);
        } else {
            statusFinal[chave] = null; // expira — update() remove a chave
            notas.push(`${participante.nome || participanteId}: ${status.label || status.tipo} terminou.`);
        }
    }

    if (danosPorTurnoAtivos > 1) {
        notas.push(`${participante.nome || participanteId}: ${danosPorTurnoAtivos} efeitos de dano por turno empilhados causaram ${totalDanoTurno} de dano combinado neste turno.`);
    }

    return { statusFinal, notas };
}

// ---------------------------------------------------------------------
// NPCs — gerador rápido de ficha de combate.
// ---------------------------------------------------------------------
export function ouvirNpcs(callback) {
    return onValue(ref(db, caminhoMesa("npcs")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Retorna o id do NPC recém-criado (usado pelo Gerenciador de Combate
// pra já entrar direto na lista de participantes, sem passo extra).
export async function criarNpc({ nome, pvs, periciasResumo, itensEssenciais, atributos, atributosSecundarios, agilidade, constituicao, reducoesDano, categoria }) {
    const novaRef = push(ref(db, caminhoMesa("npcs")));
    await set(novaRef, {
        nome: nome || "NPC sem nome",
        categoria: categoria || "",
        pvs: Number(pvs) || 0,
        pvAtual: Number(pvs) || 0,
        periciasResumo: periciasResumo || "",
        itensEssenciais: itensEssenciais || "",
        atributos: atributos || "",
        atributosSecundarios: atributosSecundarios || "",
        // Campos numéricos usados pelo Gerenciador de Combate pra calcular
        // dificuldade defensiva (10 + Agilidade/Constituição) e redução de
        // dano automaticamente — separados dos campos de texto livre acima,
        // que continuam só pra referência do Mestre.
        agilidade: Number(agilidade) || 0,
        constituicao: Number(constituicao) || 0,
        // Array multi-tipo (mesmo modelo dos itens de proteção do
        // jogador): [{ tipo: "corte", valor: 2 }, { tipo: "perfurante", valor: 4 }, ...]
        reducoesDano: Array.isArray(reducoesDano) ? reducoesDano : [],
        criadoEm: Date.now()
    });
    return novaRef.key;
}

export async function excluirNpc(npcId) {
    await remove(ref(db, caminhoMesa(`npcs/${npcId}`)));
}

// ---------------------------------------------------------------------
// NPCs — Mini-Ficha Detalhada (Módulo 2). Sem pontos iniciais fixos e
// sem restrição de Função/Desvantagens: o Mestre digita os atributos
// primários livremente e o sistema calcula os secundários (ver
// npc-detalhado.js), com opção de sobrescrever qualquer um na mão.
// Reaproveita o mesmo nó `npcs/{id}` do gerador rápido — os dois
// convivem na mesma lista, diferenciados pelo campo `modoDetalhado`.
// ---------------------------------------------------------------------
export async function criarNpcDetalhado({ nome, npcDetalhado, reducoesDano, categoria, modelo }) {
    const secundarios = secundariosDoNpc(npcDetalhado);
    const novaRef = push(ref(db, caminhoMesa("npcs")));
    await set(novaRef, {
        nome: nome || "NPC sem nome",
        // Categoria em texto livre, opcional — só pra busca/filtro no
        // Painel de NPCs (plano-busca-categorias.txt, Fase A). "" =
        // "Sem categoria" na hora de listar/filtrar.
        categoria: categoria || "",
        // "Modelo" (plano-npc-modelo.txt): NPC marcado assim entra no
        // seletor "Preencher a partir de um modelo" do formulário de
        // criação — só serve pra pré-preencher um NPC NOVO (independente
        // desde a criação, nunca fica vinculado ao modelo original).
        modelo: !!modelo,
        pvs: secundarios.recursos.pv.valor,
        pvAtual: secundarios.recursos.pv.valor,
        periciasResumo: resumoPericiasNpc(npcDetalhado),
        itensEssenciais: "",
        atributos: resumoAtributosPrimariosNpc(npcDetalhado),
        atributosSecundarios: resumoSecundariosNpc(secundarios),
        agilidade: secundarios.secundarios.agilidade.valor,
        constituicao: Number(npcDetalhado.atributosPrimarios?.constituicao) || 0,
        // Array multi-tipo (mesmo modelo dos itens de proteção do
        // jogador): [{ tipo: "corte", valor: 2 }, { tipo: "perfurante", valor: 4 }, ...]
        reducoesDano: Array.isArray(reducoesDano) ? reducoesDano : [],
        criadoEm: Date.now(),
        modoDetalhado: true,
        vulgo: npcDetalhado.vulgo || "",
        idade: npcDetalhado.idade || "",
        funcaoNarrativa: npcDetalhado.funcaoNarrativa || "",
        // Nível do NPC (opcional, default 1) — só alimenta a sugestão de
        // faixa de PV na mini-ficha (ver faixaPvSugeridaNpc em
        // npc-detalhado.js); não trava nem recalcula nada sozinho aqui.
        nivel: Math.max(1, Number(npcDetalhado.nivel) || 1),
        atributosPrimarios: npcDetalhado.atributosPrimarios,
        secundariosOverride: npcDetalhado.secundariosOverride,
        periciasNpc: npcDetalhado.periciasNpc || {},
        // Ficha completa (Módulo 3) — ver normalizarNpcComoFicha em
        // normalizacao.js. Só existe pra NPC modoDetalhado.
        inventario: npcDetalhado.inventario || {},
        categoriasInventario: npcDetalhado.categoriasInventario || {},
        energiaAtual: npcDetalhado.energiaAtual ?? null
    });
    return novaRef.key;
}

export async function atualizarNpcDetalhado(npcId, { nome, npcDetalhado, reducoesDano, pvAtual, categoria, modelo }) {
    const secundarios = secundariosDoNpc(npcDetalhado);
    await update(ref(db, caminhoMesa(`npcs/${npcId}`)), {
        nome: nome || "NPC sem nome",
        categoria: categoria || "",
        modelo: !!modelo,
        pvs: secundarios.recursos.pv.valor,
        pvAtual: pvAtual !== undefined && pvAtual !== null ? Number(pvAtual) : secundarios.recursos.pv.valor,
        periciasResumo: resumoPericiasNpc(npcDetalhado),
        atributos: resumoAtributosPrimariosNpc(npcDetalhado),
        atributosSecundarios: resumoSecundariosNpc(secundarios),
        agilidade: secundarios.secundarios.agilidade.valor,
        constituicao: Number(npcDetalhado.atributosPrimarios?.constituicao) || 0,
        reducoesDano: Array.isArray(reducoesDano) ? reducoesDano : [],
        // Limpa os campos antigos (1 tipo só) assim que o NPC é salvo de
        // novo no modelo atual, pra não deixar dado fantasma que possa
        // confundir o fallback de compatibilidade em aplicarDano().
        protecaoTipo: null,
        protecaoValor: null,
        modoDetalhado: true,
        vulgo: npcDetalhado.vulgo || "",
        idade: npcDetalhado.idade || "",
        funcaoNarrativa: npcDetalhado.funcaoNarrativa || "",
        nivel: Math.max(1, Number(npcDetalhado.nivel) || 1),
        atributosPrimarios: npcDetalhado.atributosPrimarios,
        secundariosOverride: npcDetalhado.secundariosOverride,
        periciasNpc: npcDetalhado.periciasNpc || {}
    });
}

function secundariosDoNpc(npcDetalhado) {
    return calcularSecundariosNpc(npcDetalhado.atributosPrimarios, npcDetalhado.secundariosOverride);
}

function resumoPericiasNpc(npcDetalhado) {
    const pericias = Object.values(npcDetalhado.periciasNpc || {});
    if (!pericias.length) return "";
    return pericias.map(p => `${p.nome} ${p.nivel}`).join(", ");
}

function resumoAtributosPrimariosNpc(npcDetalhado) {
    const ap = npcDetalhado.atributosPrimarios || {};
    const rotulos = { forca: "For", constituicao: "Con", destreza: "Des", sabedoria: "Sab", inteligencia: "Int", raciocinio: "Rac", carisma: "Car", manipulacao: "Man" };
    return Object.entries(rotulos).map(([k, r]) => `${r} ${ap[k] || 0}`).join(", ");
}

function resumoSecundariosNpc(secundarios) {
    const partes = [
        ...Object.values(secundarios.secundarios).map(s => `${s.label} ${s.valor}`),
        ...Object.values(secundarios.recursos).map(r => `${r.label} ${r.valor}`)
    ];
    return partes.join(", ");
}

// ---------------------------------------------------------------------
// CENÁRIOS (ver plano-cenario.txt, Fase 1) — nó de mesa que representa
// um lugar/situação "ativa" que o Mestre monta: um título, quem tá
// nela (jogadores e/ou NPCs — mesmo formato de combateAtivo.
// participantes) e o que tem pra achar ali (itens soltos e veículos).
// Pode ter mais de um cenário ativo ao mesmo tempo (chaves irmãs dentro
// de "cenarios"); encerrar um cenário é simplesmente apagar o nó
// inteiro — o que não foi levado pelos jogadores fica pra trás.
//
// Formato de cada cenarios/{cenarioId}:
//   titulo:        string
//   criadoEm:      timestamp (Date.now())
//   participantes: { pid: { tipo: "ficha" | "npc", refId, nome } }
//   itens:         { itemId: { ...mesmo shape do item de inventário... } }  — sem dono
//   veiculos:      { veiculoId: {
//                       ...mesmo shape de veiculos (nome, tipo, atributos)...,
//                       trancado: true,
//                       semChave: true   // nunca ganha item "chave" (ver
//                                        // veiculoTemChaveDisponivel em
//                                        // regras.js) — destrancar,
//                                        // trancar e ligar sempre passam
//                                        // pelo teste de Destrave
//                                        // (Fase 5 do plano)
//                   } }
//
// Jogador só enxerga (aba Cenário, Fase 4) os cenários em que a própria
// ficha aparece em `participantes`; o Mestre enxerga e edita todos (via
// Gerenciador de Cenário, Fase 6). "Pegar item" passa pela fila de
// acoesPendentes (Fase 3), igual toda entrada/saída de item hoje.
// As funções de leitura/escrita desse nó (ouvirCenarios, criarCenario
// etc.) entram na Fase 2.
// ---------------------------------------------------------------------

export function ouvirCenarios(callback) {
    return onValue(ref(db, caminhoMesa("cenarios")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Retorna o id do cenário recém-criado (útil pro Gerenciador de Cenário
// já abrir direto nele depois de criar, sem passo extra — mesmo
// comportamento de criarNpc acima).
export async function criarCenario({ titulo }) {
    const novaRef = push(ref(db, caminhoMesa("cenarios")));
    await set(novaRef, {
        titulo: titulo || "Cenário sem título",
        criadoEm: Date.now(),
        participantes: {},
        itens: {},
        veiculos: {},
        dinheiro: {},
        explosivos: {}
    });
    return novaRef.key;
}

export async function renomearCenario(cenarioId, titulo) {
    await update(ref(db, caminhoMesa(`cenarios/${cenarioId}`)), { titulo: titulo || "Cenário sem título" });
}

// Encerrar cenário: apaga o nó inteiro. O que não foi levado pelos
// jogadores (itens, veículos) se perde junto — não tem "resgate"
// depois, de propósito (ver plano-cenario.txt, Fase 7).
export async function excluirCenario(cenarioId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}`)));
}

// ---- Participantes (mesmo formato de adicionarParticipanteCombate /
// removerParticipanteCombate, mais abaixo) ----
export async function adicionarParticipanteCenario(cenarioId, { tipo, refId, nome }) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/participantes`)));
    await set(novaRef, { tipo, refId, nome: nome || refId });
    return novaRef.key;
}

export async function removerParticipanteCenario(cenarioId, participanteId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}/participantes/${participanteId}`)));
}

// ---- Itens soltos no cenário (sem dono — ver "pegar_item_cenario" em
// criarAcaoPendente/confirmarAcaoPendente, Fase 3) ----
export async function adicionarItemCenario(cenarioId, itemData) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/itens`)));
    await set(novaRef, itemData);
    return novaRef.key;
}

export async function removerItemCenario(cenarioId, itemId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}/itens/${itemId}`)));
}

// ---- Saldos de dinheiro soltos no cenário (sem dono — mesma ideia dos
// itens soltos acima, só que em vez de "pegar tudo de uma vez" o
// jogador escolhe um valor específico, até o limite do saldo. Ver
// "pegar_dinheiro_cenario" em criarAcaoPendente/confirmarAcaoPendente) ----
export async function adicionarDinheiroCenario(cenarioId, { nome, valor }) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/dinheiro`)));
    await set(novaRef, { nome: nome || "Grana", valor: Number(valor) || 0 });
    return novaRef.key;
}

export async function removerDinheiroCenario(cenarioId, dinheiroId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}/dinheiro/${dinheiroId}`)));
}

// ---- Veículos do cenário — sempre trancado e semChave (ver Fase 5:
// "Arrombar" é o único jeito de destrancar/trancar/ligar, nunca ganham
// item "chave" de verdade) ----
export async function adicionarVeiculoCenario(cenarioId, veiculoData) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/veiculos`)));
    await set(novaRef, { ...veiculoData, trancado: true, semChave: true });
    return novaRef.key;
}

export async function removerVeiculoCenario(cenarioId, veiculoId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}/veiculos/${veiculoId}`)));
}

// Uso geral (editar atributos pelo modal do Mestre, ou alternar
// trancado:false depois de um "Arrombar" bem-sucedido — Fase 5).
export async function editarVeiculoCenario(cenarioId, veiculoId, dados) {
    await update(ref(db, caminhoMesa(`cenarios/${cenarioId}/veiculos/${veiculoId}`)), dados);
}

// ---- Veículo de JOGADOR presente num cenário (Fase 6 do plano — ver
// plano-veiculos-fase2.txt, seção "FASE 6"). Diferente de
// adicionarVeiculoCenario acima (cópia própria, sem dono, sempre
// trancada), aqui a fonte de verdade continua sendo
// fichas/{fichaId}/veiculos/{veiculoId} — a entrada em
// cenarios/{cenarioId}/veiculos é só um PONTEIRO { origem: "jogador",
// fichaId, veiculoId }, pra reparo/melhoria feitos por outro
// personagem refletirem no veículo de verdade, não numa cópia solta. ----
export async function aparecerVeiculoNoCenario(cenarioId, fichaId, veiculoId) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/veiculos`)));
    const atualizacoes = {};
    atualizacoes[caminhoMesa(`cenarios/${cenarioId}/veiculos/${novaRef.key}`)] = { origem: "jogador", fichaId, veiculoId };
    atualizacoes[caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}/cenarioId`)] = cenarioId;
    atualizacoes[caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}/cenarioEntryId`)] = novaRef.key;
    await update(ref(db), atualizacoes);
    return novaRef.key;
}

// Remove o veículo do cenário (some do cenário — NÃO apaga o veículo
// de verdade, que continua existindo na ficha do dono, só "guardado").
export async function removerVeiculoDoCenario(cenarioId, entryId, fichaId, veiculoId) {
    const atualizacoes = {};
    atualizacoes[caminhoMesa(`cenarios/${cenarioId}/veiculos/${entryId}`)] = null;
    atualizacoes[caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}/cenarioId`)] = null;
    atualizacoes[caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}/cenarioEntryId`)] = null;
    await update(ref(db), atualizacoes);
}

// Trancar/destrancar um veículo de JOGADOR direto pelo Mestre (Gerenciador
// de Cenário) — mesmo espírito de editarVeiculoCenario, só que escrevendo
// no veículo de verdade (fichas/{fichaId}/veiculos/{veiculoId}) em vez da
// cópia solta do cenário, já que aqui o veículo tem dono. Usado tanto
// pra resolver um "Arrombar" bem-sucedido (roubo — a chave física
// continua sendo do dono original, ver veiculoTemChaveDisponivel em
// regras.js, só a posse física/uso imediato muda) quanto pra o Mestre
// destrancar/trancar manualmente por narrativa.
// destravadoPorNome (Fase 6, item 4 do plano — "quem destrancou por
// último"): só faz sentido/é gravado quando `trancado` está virando
// false (um destrave) — registro de texto simples pra apoiar a
// narração do Mestre num roubo, sem relação com a chave física de
// verdade (que continua sempre com o dono original, ver
// veiculoTemChaveDisponivel em regras.js).
export async function definirTrancaVeiculoJogador(fichaId, veiculoId, trancado, destravadoPorNome) {
    const atualizacoes = { trancado };
    if (!trancado) atualizacoes.ultimoADestrancar = destravadoPorNome || "não registrado";
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/veiculos/${veiculoId}`)), atualizacoes);
}

// =====================================================================
// GERENCIADOR DE PERSEGUIÇÃO — Fase 7 do plano (ver
// plano-veiculos-fase2.txt, seção "FASE 7"), construído em sub-fases
// incrementais (mesmo espírito de plano-veiculos-fase6-NOTA.txt):
// 7a estrutura de dados + iniciar/encerrar, 7b teste de pontuação por
// volta, 7c rota de fuga, 7d (Manobra da Fase 4 como ação de volta +
// anúncio do vencedor ao fim das voltas necessárias) — todas já
// implementadas abaixo.
//
// Arquitetura: nó PRÓPRIO `perseguicaoAtiva`, singleton por mesa — MESMO
// padrão de combateAtivo (onValue em tempo real, participantes
// keyed por id), mas em nó separado de propósito: perseguição tem
// regras de turno bem diferentes de combate (não é ordem de
// iniciativa attack/defesa, é "todo mundo testa Dirigir Veículos por
// volta e acumula pontos" — ver plano-veiculos-fase2.txt).
//
// Formato de perseguicaoAtiva:
//   ativo:              bool
//   cenarioId:          string — de qual cenário essa perseguição saiu
//                        (o botão "Iniciar" só aparece com 2+ veículos
//                        presentes nele, ver montarDetalheCenario em
//                        ficha.js), só informativo aqui.
//   bairro:             chave de BAIRROS_PERSEGUICAO (dados-manual.js)
//   voltasNecessarias:  number — copiado do bairro no momento de
//                        iniciar (não muda se a tabela for editada
//                        depois, igual custo de item comprado)
//   voltaAtual:         number, começa em 1
//   participantes: {
//     {participanteId}: {
//       tipo: "ficha" | "npc", refId, nome,
//       veiculoId,              // qual veículo esse piloto usa
//       lado: "perseguido" | "perseguidor",
//       pontos: number,         // 0 ao entrar
//       agiuNestaVolta: bool    // já testou/tentou algo nesta volta
//     }
//   }
//   log: {}                     // {entryId}: {volta, participanteId,
//                                // resultado, pontos, texto} — Fase 7b
//                                // (tentativa de rota de fuga, Fase 7c,
//                                // grava tipo:"rota_fuga" + sucesso no
//                                // lugar de pontos)
//   rotasFuga: { perseguido: number, perseguidor: number } // Fase 7c —
//                                // contador de rotas ENCONTRADAS (só
//                                // sucesso soma), consumido por
//                                // vencedorPerseguicao (regras.js)
//   resultadoFinal: { vencedor, pontosPerseguido, pontosPerseguidor } |
//                                // undefined — Fase 7d: gravado por
//                                // aplicarAvancoOuFimDeVolta assim que
//                                // voltaAtual passaria de
//                                // voltasNecessarias. Presença deste
//                                // campo é o sinal (ficha.js/mestre.js)
//                                // de que a corrida acabou e só falta o
//                                // Mestre clicar "Encerrar" pra zerar o nó.
// =====================================================================

export function ouvirPerseguicaoAtiva(callback) {
    return onValue(ref(db, caminhoMesa("perseguicaoAtiva")), (snap) => {
        callback(snap.exists() ? snap.val() : { ativo: false, participantes: {} });
    });
}

// Inicia uma perseguição/corrida ligada a um cenário. `participantesEntrada`
// é um array de { tipo, refId, nome, veiculoId, lado } montado pelo
// Mestre no mini-formulário (ver montarFormularioIniciarPerseguicao em
// ficha.js) — cada um vira uma entrada em perseguicaoAtiva/participantes
// com pontos: 0. Precisa de pelo menos 1 perseguido e 1 perseguidor
// (a checagem de "2+ veículos no cenário" já foi feita na UI antes de
// mostrar o botão — aqui é só a validação mínima de novo, por segurança,
// já que nada impede chamar esta função fora da UI normal).
export async function iniciarPerseguicao(cenarioId, bairroKey, participantesEntrada) {
    if (!Array.isArray(participantesEntrada) || participantesEntrada.length < 2) {
        throw new Error("Selecione pelo menos 2 pilotos pra iniciar a perseguição.");
    }
    const temPerseguido = participantesEntrada.some(p => p.lado === "perseguido");
    const temPerseguidor = participantesEntrada.some(p => p.lado === "perseguidor");
    if (!temPerseguido || !temPerseguidor) {
        throw new Error("Precisa de pelo menos um perseguido e um perseguidor.");
    }

    const bairro = bairroPerseguicao(bairroKey);
    if (!bairro) throw new Error("Bairro inválido.");

    const participantes = {};
    participantesEntrada.forEach(p => {
        const novaRef = push(ref(db, caminhoMesa("perseguicaoAtiva/participantes")));
        participantes[novaRef.key] = {
            tipo: p.tipo, refId: p.refId, nome: p.nome || p.refId,
            veiculoId: p.veiculoId || null,
            lado: p.lado,
            pontos: 0,
            agiuNestaVolta: false
        };
    });

    await set(ref(db, caminhoMesa("perseguicaoAtiva")), {
        ativo: true,
        cenarioId,
        bairro: bairroKey,
        voltasNecessarias: bairro.voltas,
        voltaAtual: 1,
        participantes,
        log: {},
        // Contador de rotas de fuga ENCONTRADAS (sucesso no teste de
        // Velocidade), por lado — Fase 7c. Alimenta vencedorPerseguicao
        // (regras.js) direto no formato que ela já espera:
        // { perseguido: number, perseguidor: number }.
        rotasFuga: { perseguido: 0, perseguidor: 0 }
    });
}

// Tira um piloto da perseguição em andamento (ex.: capotou e saiu de
// cena) sem encerrar a perseguição inteira pros outros.
export async function removerParticipantePerseguicao(participanteId) {
    await remove(ref(db, caminhoMesa(`perseguicaoAtiva/participantes/${participanteId}`)));
}

// Encerra a perseguição (mesmo padrão de encerrarCombate — zera o nó
// inteiro, não guarda histórico depois de encerrado).
export async function encerrarPerseguicao() {
    await set(ref(db, caminhoMesa("perseguicaoAtiva")), { ativo: false, participantes: {} });
}

// ---- Fase 7d: avançar volta ou encerrar a corrida ----
//
// Chamada por registrarPontosPerseguicao e
// registrarTentativaRotaFugaPerseguicao depois de marcar
// `agiuNestaVolta` de quem acabou de agir (Testar Dirigir Veículos,
// Rota de Fuga, ou Manobra — Fase 4 integrada como ação de volta desde
// esta sub-fase). `participantesAtualizados` já reflete o efeito desta
// ação (pontos somados ou agiuNestaVolta marcado) — os dois chamadores
// montam essa cópia atualizada porque o snapshot lido no início da
// função ainda não tem a mudança que está sendo gravada agora.
// `rotasFugaAtualizado` idem, já refletindo incremento se houver.
//
// Se nem todo mundo já agiu nesta volta, não faz nada (a volta
// continua). Se todo mundo já agiu:
//   - ainda faltam voltas → avança voltaAtual e reseta agiuNestaVolta
//     de todo mundo pra rodada seguinte (mesmo comportamento das Fases
//     7b/7c antes desta sub-fase);
//   - a próxima volta passaria de voltasNecessarias → a corrida acabou:
//     calcula o vencedor (vencedorPerseguicao, regras.js) e grava em
//     perseguicaoAtiva/resultadoFinal + uma linha de log anunciando o
//     resultado. NÃO avança voltaAtual além do necessário nem zera o
//     nó sozinha — o Mestre confere o card e clica "Encerrar Perseguição"
//     (encerrarPerseguicao, já existente) quando quiser, igual ao fim
//     de combate.
function aplicarAvancoOuFimDeVolta(estado, participantesAtualizados, rotasFugaAtualizado, atualizacoes) {
    const todosAgiram = Object.values(participantesAtualizados).every(p => !!p.agiuNestaVolta);
    if (!todosAgiram) return;

    const proximaVolta = (Number(estado.voltaAtual) || 1) + 1;
    const voltasNecessarias = Number(estado.voltasNecessarias) || null;

    if (voltasNecessarias && proximaVolta > voltasNecessarias) {
        const resultado = vencedorPerseguicao({ participantes: participantesAtualizados }, rotasFugaAtualizado);
        atualizacoes[caminhoMesa("perseguicaoAtiva/resultadoFinal")] = resultado;

        const novaRefLog = push(ref(db, caminhoMesa("perseguicaoAtiva/log")));
        const rotuloVencedor = resultado.vencedor === "empate"
            ? "empate"
            : (resultado.vencedor === "perseguido" ? "o(s) perseguido(s)" : "o(s) perseguidor(es)");
        atualizacoes[caminhoMesa(`perseguicaoAtiva/log/${novaRefLog.key}`)] = {
            volta: estado.voltaAtual || 1,
            tipo: "resultado_final",
            texto: `Fim da corrida — venceu ${rotuloVencedor} (${resultado.pontosPerseguido} perseguido x ${resultado.pontosPerseguidor} perseguidor).`
        };
        return;
    }

    atualizacoes[caminhoMesa("perseguicaoAtiva/voltaAtual")] = proximaVolta;
    Object.keys(participantesAtualizados).forEach(pid => {
        atualizacoes[caminhoMesa(`perseguicaoAtiva/participantes/${pid}/agiuNestaVolta`)] = false;
    });
}

// ---- Fase 7b: teste de pontuação por volta ----
//
// Registra o resultado de "Testar Dirigir Veículos" (ou de uma Manobra
// rolada DENTRO de uma perseguição ativa — Fase 7d, ver
// resolverManobraVeiculo em ficha.js) de UM piloto na volta atual: soma
// `pontosGanhos` (já calculado por pontosPorResultadoTesteFuga,
// regras.js — quem chama decide, esta função só grava) em
// participantes/{id}/pontos, marca `agiuNestaVolta: true` pra ele, e
// grava uma linha de log. `origemTexto`, se informado (ex.: "Manobra:
// Drift"), substitui o texto padrão "Testar Dirigir Veículos" no log —
// só pra deixar claro de onde veio a pontuação. Delega em
// aplicarAvancoOuFimDeVolta a decisão de avançar a volta ou encerrar a
// corrida quando todo mundo já tiver agido.
export async function registrarPontosPerseguicao(participanteId, pontosGanhos, resultadoBruto, origemTexto = null) {
    const snap = await get(ref(db, caminhoMesa("perseguicaoAtiva")));
    if (!snap.exists() || !snap.val().ativo) throw new Error("Nenhuma perseguição ativa no momento.");
    const estado = snap.val();
    if (estado.resultadoFinal) throw new Error("Essa corrida já acabou — peça pro Mestre encerrar a perseguição antes de agir de novo.");
    const participantes = estado.participantes || {};
    if (!participantes[participanteId]) throw new Error("Você não está mais na perseguição.");

    const pontosAtuais = Number(participantes[participanteId].pontos) || 0;
    const atualizacoes = {};
    atualizacoes[caminhoMesa(`perseguicaoAtiva/participantes/${participanteId}/pontos`)] = pontosAtuais + (Number(pontosGanhos) || 0);
    atualizacoes[caminhoMesa(`perseguicaoAtiva/participantes/${participanteId}/agiuNestaVolta`)] = true;

    const novaRefLog = push(ref(db, caminhoMesa("perseguicaoAtiva/log")));
    atualizacoes[caminhoMesa(`perseguicaoAtiva/log/${novaRefLog.key}`)] = {
        volta: estado.voltaAtual || 1,
        participanteId,
        resultado: Number(resultadoBruto) || 0,
        pontos: Number(pontosGanhos) || 0,
        texto: `${participantes[participanteId].nome}${origemTexto ? ` (${origemTexto})` : ""}: resultado ${Number(resultadoBruto) || 0} → +${Number(pontosGanhos) || 0} ponto(s)`
    };

    // Cópia local já refletindo pontos + agiuNestaVolta desta ação —
    // participantes[pid] sempre existe aqui, já que a lista vem do
    // próprio snapshot lido acima.
    const participantesAtualizados = {};
    Object.entries(participantes).forEach(([pid, p]) => {
        participantesAtualizados[pid] = pid === participanteId
            ? { ...p, pontos: pontosAtuais + (Number(pontosGanhos) || 0), agiuNestaVolta: true }
            : p;
    });
    aplicarAvancoOuFimDeVolta(estado, participantesAtualizados, estado.rotasFuga || { perseguido: 0, perseguidor: 0 }, atualizacoes);

    await update(ref(db), atualizacoes);
}

// ---- Fase 7c: rota de fuga ----
//
// Registra o resultado de "Tentar Rota de Fuga" de UM piloto na volta
// atual: diferente de registrarPontosPerseguicao (Fase 7b), NÃO soma
// pontos — "abre mão da pontuação da volta" (plano-veiculos-fase2.txt,
// Fase 7) — só marca `agiuNestaVolta: true` (a tentativa consome a ação
// da volta do mesmo jeito) e, se `sucesso`, incrementa
// perseguicaoAtiva/rotasFuga/{lado} em 1 (contador que
// vencedorPerseguicao, regras.js, já sabe ler desde a Fase 7a — só
// faltava quem gravasse). Mesma lógica de avanço/fim de volta de
// registrarPontosPerseguicao, via aplicarAvancoOuFimDeVolta (Fase 7d).
export async function registrarTentativaRotaFugaPerseguicao(participanteId, sucesso, resultadoBruto) {
    const snap = await get(ref(db, caminhoMesa("perseguicaoAtiva")));
    if (!snap.exists() || !snap.val().ativo) throw new Error("Nenhuma perseguição ativa no momento.");
    const estado = snap.val();
    if (estado.resultadoFinal) throw new Error("Essa corrida já acabou — peça pro Mestre encerrar a perseguição antes de agir de novo.");
    const participantes = estado.participantes || {};
    const participante = participantes[participanteId];
    if (!participante) throw new Error("Você não está mais na perseguição.");

    const atualizacoes = {};
    atualizacoes[caminhoMesa(`perseguicaoAtiva/participantes/${participanteId}/agiuNestaVolta`)] = true;

    const rotasFugaAtualizado = { ...(estado.rotasFuga || { perseguido: 0, perseguidor: 0 }) };
    if (sucesso) {
        rotasFugaAtualizado[participante.lado] = (Number(rotasFugaAtualizado[participante.lado]) || 0) + 1;
        atualizacoes[caminhoMesa(`perseguicaoAtiva/rotasFuga/${participante.lado}`)] = rotasFugaAtualizado[participante.lado];
    }

    const novaRefLog = push(ref(db, caminhoMesa("perseguicaoAtiva/log")));
    atualizacoes[caminhoMesa(`perseguicaoAtiva/log/${novaRefLog.key}`)] = {
        volta: estado.voltaAtual || 1,
        participanteId,
        tipo: "rota_fuga",
        resultado: Number(resultadoBruto) || 0,
        sucesso: !!sucesso,
        texto: `${participante.nome}: tentou rota de fuga, resultado ${Number(resultadoBruto) || 0} → ${sucesso ? "✅ encontrou (abriu mão da pontuação da volta)" : "❌ não encontrou (abriu mão da pontuação da volta)"}`
    };

    const participantesAtualizados = {};
    Object.entries(participantes).forEach(([pid, p]) => {
        participantesAtualizados[pid] = pid === participanteId ? { ...p, agiuNestaVolta: true } : p;
    });
    aplicarAvancoOuFimDeVolta(estado, participantesAtualizados, rotasFugaAtualizado, atualizacoes);

    await update(ref(db), atualizacoes);
}

// Override manual do Mestre — avança a volta e reseta quem já agiu,
// mesmo que nem todo mundo tenha testado ainda (ex.: um jogador ausente
// da mesa naquela rodada e o Mestre não quer travar os outros).
export async function avancarVoltaManualPerseguicao() {
    const snap = await get(ref(db, caminhoMesa("perseguicaoAtiva")));
    if (!snap.exists() || !snap.val().ativo) return;
    const estado = snap.val();
    const atualizacoes = { [caminhoMesa("perseguicaoAtiva/voltaAtual")]: (Number(estado.voltaAtual) || 1) + 1 };
    Object.keys(estado.participantes || {}).forEach(pid => {
        atualizacoes[caminhoMesa(`perseguicaoAtiva/participantes/${pid}/agiuNestaVolta`)] = false;
    });
    await update(ref(db), atualizacoes);
}

// ---- Explosivos armados no cenário (ver plano-explosivos-cenario.txt,
// Fase 1). Diferente de itens/veículos, este nó NÃO passa pela fila de
// acoesPendentes ao ser criado — "Armar" (ficha.js, Fase 2) grava aqui
// direto e já remove o item do inventário na hora (decisão 4). O que
// passa pela fila são as pendências "está no raio?" geradas ao detonar
// (Fase 4), uma por participante do cenário.
//
// Formato de cada cenarios/{cenarioId}/explosivos/{explosivoId}:
//   nome:                  string (nome do item)
//   dano:                  number
//   raio:                  number
//   tipoDano:              "explosao" (chave de TIPOS_DANO, dados-manual.js
//                          — não confundir com a TAG do item "explosivo")
//   moduloDetonacaoNome:   string | null
//   moduloDetonacaoEfeito: string | null
//   armadoPorTipo:         "ficha" | "npc"
//   armadoPorId:           string
//   armadoPorNome:         string
//   status:                "armado" | "detonado"
//   criadoEm:              timestamp
export async function adicionarExplosivoCenario(cenarioId, dados) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/explosivos`)));
    await set(novaRef, { ...dados, status: "armado" });
    return novaRef.key;
}

// Remoção definitiva do cenário — sempre manual (decisão 6, botão
// "Remover" no Gerenciador), mesmo depois de detonado. Diferente de
// marcarExplosivoDetonado abaixo, que só muda o status e mantém visível.
export async function removerExplosivoCenario(cenarioId, explosivoId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}/explosivos/${explosivoId}`)));
}

export async function marcarExplosivoDetonado(cenarioId, explosivoId) {
    await update(ref(db, caminhoMesa(`cenarios/${cenarioId}/explosivos/${explosivoId}`)), { status: "detonado" });
}

// Detonar: gera uma pendência "está no raio?" (tipo "explosao_raio",
// ver montarPainelAcoesPendentes em ficha.js, Fase 4) por participante
// do cenário — jogadores E NPCs —, e só então marca o explosivo como
// "detonado". Não aplica dano nenhum sozinho: cada pendência, quando
// respondida "Sim", abre o painel "Causar Dano" já existente
// pré-preenchido (abrirAcaoMestre("dano", prefill), Fase 4) — quem
// aplica o dano de fato é sempre esse painel, igual qualquer outro dano.
export async function detonarExplosivoCenario(cenarioId, explosivoId) {
    const snap = await get(ref(db, caminhoMesa(`cenarios/${cenarioId}`)));
    if (!snap.exists()) throw new Error("Cenário não encontrado.");
    const cenario = snap.val();

    const explosivo = cenario.explosivos && cenario.explosivos[explosivoId];
    if (!explosivo) throw new Error("Explosivo não encontrado neste cenário.");
    if (explosivo.status === "detonado") throw new Error("Este explosivo já foi detonado.");

    const participantes = cenario.participantes || {};
    for (const [participanteId, participante] of Object.entries(participantes)) {
        await criarAcaoPendente({
            tipo: "explosao_raio",
            fichaId: null, // não é pedido de UM jogador — o próprio Mestre gera a checklist
            nomeJogador: "Mestre",
            detalhe: `${participante.nome} está no raio de explosão de "${explosivo.nome}" (dano ${explosivo.dano}, raio ${explosivo.raio}m)?`,
            payload: {
                cenarioId,
                explosivoId,
                participanteId, // chave do participante DENTRO do cenário (push key) — referência, não usada hoje pra resolver a pendência (isso usa participanteTipo/participanteRefId, ver montarPainelAcoesPendentes em ficha.js)
                participanteTipo: participante.tipo,
                participanteRefId: participante.refId,
                participanteNome: participante.nome,
                dano: explosivo.dano,
                tipoDano: explosivo.tipoDano,
                nomeExplosivo: explosivo.nome
            }
        });
    }

    await marcarExplosivoDetonado(cenarioId, explosivoId);
}

// ---- Químicos liberados no cenário (ver plano-quimicos-cenario.txt,
// Parte 4). Mesmo shape/funções de explosivos acima, só trocando
// "explosao"/"detonar" por "quimico"/"liberar": item com tag
// "produto_quimico" grava aqui direto ao ser usado (ficha.js) e já
// remove o item do inventário na hora — igual "Armar" de explosivo.
//
// Formato de cada cenarios/{cenarioId}/quimicos/{quimicoId}:
//   nome:              string (nome do item)
//   raio:              number
//   tipoEfeito:        string (informativo)
//   modificadores:     array (copiado de it.modificadores no momento do uso)
//   duracaoHoras:      number | null (extraído da descrição do item)
//   usadoPorTipo:      "ficha" | "npc"
//   usadoPorId:        string
//   usadoPorNome:      string
//   status:            "liberado_pendente" | "resolvido"
//   criadoEm:          timestamp
export async function adicionarQuimicoCenario(cenarioId, dados) {
    const novaRef = push(ref(db, caminhoMesa(`cenarios/${cenarioId}/quimicos`)));
    await set(novaRef, { ...dados, status: "liberado_pendente" });
    return novaRef.key;
}

// Remoção definitiva do cenário — sempre manual (mesma decisão de
// explosivos), mesmo depois de resolvido.
export async function removerQuimicoCenario(cenarioId, quimicoId) {
    await remove(ref(db, caminhoMesa(`cenarios/${cenarioId}/quimicos/${quimicoId}`)));
}

export async function marcarQuimicoResolvido(cenarioId, quimicoId) {
    await update(ref(db, caminhoMesa(`cenarios/${cenarioId}/quimicos/${quimicoId}`)), { status: "resolvido" });
}

// Liberar: gera uma pendência "estava na área?" (tipo "quimico_area") por
// participante do cenário — mesmo padrão de detonarExplosivoCenario. Não
// aplica efeito nenhum sozinho: cada pendência, respondida "Sim", abre o
// painel "Aplicar Efeito Químico" (ficha.js) já pré-preenchido.
export async function liberarQuimicoCenario(cenarioId, quimicoId) {
    const snap = await get(ref(db, caminhoMesa(`cenarios/${cenarioId}`)));
    if (!snap.exists()) throw new Error("Cenário não encontrado.");
    const cenario = snap.val();
    const quimico = cenario.quimicos && cenario.quimicos[quimicoId];
    if (!quimico) throw new Error("Químico não encontrado neste cenário.");
    if (quimico.status === "resolvido") throw new Error("Este químico já foi resolvido.");

    const participantes = cenario.participantes || {};
    for (const [participanteId, participante] of Object.entries(participantes)) {
        await criarAcaoPendente({
            tipo: "quimico_area",
            fichaId: null,
            nomeJogador: "Mestre",
            detalhe: `${participante.nome} estava na área de "${quimico.nome}" (raio ${quimico.raio}m)?`,
            payload: {
                cenarioId, quimicoId, participanteId,
                participanteTipo: participante.tipo,
                participanteRefId: participante.refId,
                participanteNome: participante.nome,
                nomeQuimico: quimico.nome,
                tipoEfeito: quimico.tipoEfeito,
                modificadores: quimico.modificadores,
                // Efeitos mecânicos do item (it.quimico.efeitos), pra
                // chegar até o handler da pendência (ficha.js) e dali
                // pré-preencher o painel "Aplicar Efeito Químico" — Parte
                // 8, item 5.2 do plano-automacao-materiais-quimicos-v3.
                efeitos: quimico.efeitos || [],
                duracaoHoras: quimico.duracaoHoras
            }
        });
    }
    await marcarQuimicoResolvido(cenarioId, quimicoId);
}

// Aplica o efeito temporário de um Produto Químico usado em área na
// ficha/NPC ALVO (ver plano-quimicos-cenario.txt, Parte 5) — MESMO shape
// que consumirDroga (ficha.js) já grava pra autoconsumo em
// `ficha.efeitosDrogas`, só que endereçado a um alvo qualquer em vez de
// "quem usou o item". calcularModificadoresDrogasAtivas (regras.js) já lê
// `efeitosDrogas` de QUALQUER ficha/npc que passar por ele — nenhuma
// mudança necessária lá. Chave normalizada por nome (mesmo padrão de
// consumirDroga: reusar o químico de novo no mesmo alvo sobrescreve o
// efeito anterior em vez de empilhar duas entradas).
export async function aplicarEfeitoQuimicoAlvo(alvoTipo, alvoId, dados) {
    const { nome, diaIndiceConsumido, horasExpira, modificadores } = dados;
    const chave = normalizarTexto(nome);
    const raizAlvo = alvoTipo === "npc" ? `npcs/${alvoId}` : `fichas/${alvoId}`;
    await set(ref(db, caminhoMesa(`${raizAlvo}/efeitosDrogas/${chave}`)), {
        nome, diaIndiceConsumido, horasExpira, modificadores
    });
}

// ---------------------------------------------------------------------
// Gerenciador de Combate — lista compartilhada de participantes ativos
// (jogadores e/ou NPCs), usada pra alimentar o seletor de alvo no botão
// "Usar" das armas na ficha do jogador.
// ---------------------------------------------------------------------
export function ouvirCombateAtivo(callback) {
    return onValue(ref(db, caminhoMesa("combateAtivo")), (snap) => {
        callback(snap.exists() ? snap.val() : { ativo: false, participantes: {} });
    });
}

// Se o combate ainda não teve a iniciativa rolada (Mestre só está
// montando a lista de participantes antes de clicar "Iniciar Combate"),
// mantém o comportamento de sempre: entra na lista pelada, sem
// iniciativa, e rola junto com todo mundo quando o Mestre iniciar.
//
// Mas se o combate JÁ está rolando (ordemTurnos existe e não está
// vazio) — ex: um jogador entra na cena no meio do tiroteio, ou o
// Mestre traz um NPC de reforço no meio da rodada — o recém-chegado
// precisa da própria rolagem de iniciativa (1d20 + Agilidade, mesma
// fórmula/stats de iniciarIniciativaCombate) pra já entrar na fila de
// turnos, em vez de ficar parado esperando o próximo combate pra agir.
export async function adicionarParticipanteCombate({ tipo, refId, nome }) {
    const snapAtual = await get(ref(db, caminhoMesa("combateAtivo")));
    const estadoAtual = snapAtual.exists() ? snapAtual.val() : {};
    const iniciativaJaRolada = !!(estadoAtual.ativo && Array.isArray(estadoAtual.ordemTurnos) && estadoAtual.ordemTurnos.length);

    await update(ref(db, caminhoMesa("combateAtivo")), { ativo: true });
    const novaRef = push(ref(db, caminhoMesa("combateAtivo/participantes")));
    const participanteId = novaRef.key;
    const base = { tipo, refId, nome: nome || refId };

    // Infecção (ver aplicarInfeccao/curarInfeccao acima) é uma flag
    // PERSISTENTE do personagem, não do participante de combate (que é
    // recriado a cada combate). Se o personagem já estiver infectado de
    // antes, o badge precisa aparecer assim que ele entra na luta, sem
    // precisar que o Mestre role o teste de novo.
    const caminhoInfeccaoPersistente = tipo === "ficha" ? `fichas/${refId}/dados/infeccao` : tipo === "npc" ? `npcs/${refId}/infeccao` : null;
    const infeccaoHerdada = caminhoInfeccaoPersistente ? (await get(ref(db, caminhoMesa(caminhoInfeccaoPersistente)))) : null;
    if (infeccaoHerdada && infeccaoHerdada.exists() && infeccaoHerdada.val() && infeccaoHerdada.val().ativo) {
        base.infeccao = infeccaoHerdada.val();
    }

    if (!iniciativaJaRolada) {
        await set(novaRef, base);
        return { id: participanteId, entrouComIniciativa: false };
    }

    // Mesma combinação Godmode + "ignorar penalidade de saúde" usada em
    // iniciarIniciativaCombate/avancarTurnoCombate — a rolagem tardia
    // tem que respeitar o mesmo Godmode que já vale pro resto do combate.
    const [snapGodmode, snapIgnorarSaude] = await Promise.all([
        get(ref(db, caminhoMesa("godmode"))),
        get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")))
    ]);
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    const stats = await calcularStatsCombateParticipante(base, ignorarPenalidadeSaude);
    const rolagemBruta = rolarD20();
    const acoesMax = calcularAcoesMax(stats.velocidade);
    // Bônus automático de Karatê Cobra Kai (manual pg. 22) continua
    // valendo pra quem entra depois. Os bônus condicionais de CQC
    // (nível 2/4 — dependem de uma escolha narrativa feita ANTES da
    // rolagem, ver participantesElegiveisCQCIniciativa) ficam de fora
    // dessa entrada tardia, já que ela não passa pela modal de
    // pré-iniciativa; o Mestre pode ajustar na mão se for o caso.
    const bonusCobraKai = bonusCobraKaiIniciativa(stats.nivelCobraKai);
    // Mesma regra da "iniciativa travada" de iniciarIniciativaCombate:
    // tirou 1 no d20? Perde esse primeiro turno (0 ações). Rerrola ao
    // encerrar o turno, dentro de avancarTurnoCombate.
    const perdeuPrimeiroTurno = rolagemBruta === 1;

    const participanteCompleto = {
        ...base,
        ...stats,
        rolagemBruta,
        iniciativa: rolagemBruta + stats.modAgilidade + bonusCobraKai,
        bonusCQCIniciativa: false,
        bonusCobraKaiIniciativa: bonusCobraKai,
        acoesMax,
        acoes: perdeuPrimeiroTurno ? 0 : acoesMax,
        iniciativaTravada: perdeuPrimeiroTurno,
        dispararAvancarDisponivel: false,
        dispararAvancarUsado: false,
        acoesExtraCQCMax: 0,
        acoesExtraCQC: 0,
        esquivasDisponiveis: 0,
        acoesGuardadas: 0
    };

    await set(novaRef, participanteCompleto);

    // Reordena a fila inteira com o recém-chegado incluído (mesmo
    // critério de ordenarPorIniciativa: maior iniciativa age primeiro,
    // empate decide pelo modAgilidade). `turnoAtual` é guardado pelo id,
    // não pelo índice, então quem já estava agindo não perde a vez só
    // porque a lista mudou de posição.
    const participantesAtualizados = { ...(estadoAtual.participantes || {}), [participanteId]: participanteCompleto };
    const novaOrdem = ordenarPorIniciativa(participantesAtualizados);
    await update(ref(db, caminhoMesa("combateAtivo")), { ordemTurnos: novaOrdem });

    return { id: participanteId, entrouComIniciativa: true, iniciativa: participanteCompleto.iniciativa };
}

export async function removerParticipanteCombate(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}`)));
}

export async function encerrarCombate() {
    await set(ref(db, caminhoMesa("combateAtivo")), { ativo: false, participantes: {} });
}

// ---------------------------------------------------------------------
// Iniciativa / ordem de turnos (manual: 1d20 + Agilidade decide a ordem;
// 1 ação por turno + 1 ação extra a cada 5 pontos de Velocidade Total).
//
// Reaproveita a MESMA lista de participantes do Gerenciador de Combate
// acima (combateAtivo/participantes) — não cria uma fila separada.
// Ao "Iniciar Combate", cada participante ganha: iniciativa (rolagem +
// Agilidade), velocidade total, PV atual/máximo e ações do turno. Esses
// campos ficam gravados dentro do próprio nó `combateAtivo`, junto com
// `rodada`, `ordemTurnos` (array de ids na ordem de agir) e `turnoAtual`.
// ---------------------------------------------------------------------

// Regra de ações extras: 1 ação base + 1 a cada 5 pontos de Velocidade
// Total (modificadores negativos não geram ações extras, mas também não
// derrubam abaixo da ação base).
export function calcularAcoesMax(velocidadeTotal) {
    const v = Math.max(Number(velocidadeTotal) || 0, 0);
    return 1 + Math.floor(v / 5);
}

// Busca Agilidade, Velocidade e PV (atual/máximo) de um participante já
// existente em combateAtivo/participantes — seja ele ficha de jogador ou
// NPC (detalhado ou "rápido"). Usa as MESMAS fórmulas de regras.js que o
// resto da ficha usa, já com modificadores estruturados aplicados.
// `ignorarPenalidadeSaude` (default false): já vem combinado — só é true
// quando o Godmode está ativo E o sub-toggle "ignorar penalidade de
// saúde" também está marcado (ver ouvirGodmode/ouvirIgnorarPenalidadeSaude
// acima e iniciarIniciativaCombate abaixo, que monta essa combinação).
// Quando true, a penalidade de Machucado/Muito Machucado é ignorada pra
// todo mundo no combate — jogadores e NPCs — igual ao que já acontece na
// ficha (ver ficha.js).
async function calcularStatsCombateParticipante(participante, ignorarPenalidadeSaude = false) {
    if (participante.tipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
        if (!snap.exists()) return statsCombatePadrao();
        const ficha = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(ficha);
        const derivados = calcularDerivados(ficha.dados, modificadoresPlanos);
        // Soma o bônus permanente de PV ganho em Level Up (dado de vida),
        // guardado em dados.pvBonusExtra — mesma regra usada em ficha.js
        // pra mostrar o PV máximo na ficha. Sem isso o Gerenciador de
        // Combate mostrava um PV máximo desatualizado pro jogador que já
        // tinha subido de nível. dados.pvMaximoOverride (ajustado em
        // Godmode direto na ficha) tem prioridade sobre o cálculo, se
        // estiver definido.
        const pvMaxCalculado = Math.round(derivados.recursos.pv.total) + (Number(ficha.dados.pvBonusExtra) || 0);
        const overridePv = ficha.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalculado;
        const pvAtual = (ficha.dados.pvAtual !== null && ficha.dados.pvAtual !== undefined)
            ? Number(ficha.dados.pvAtual) : pvMax;
        // Machucado/Muito Machucado (ver regras.js) também valem pra
        // Velocidade e Agilidade DENTRO do combate — ações extras por
        // turno (calcularAcoesMax) e iniciativa (1d20+Agilidade) usam os
        // valores já penalizados, igual a qualquer outro teste.
        const temTolerancia = temPericiaTreinada(ficha.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, ignorarPenalidadeSaude);
        const velocidadeAjustada = aplicarEstadoSaudeVelocidade(derivados.secundarios.velocidade, estadoSaude).total;
        // Karatê Cobra Kai (manual pg. 22): "a cada dois pontos na
        // perícia bônus +1 na iniciativa" — automático, sem checkbox
        // (ver bonusCobraKaiIniciativa em dados-manual.js), somado na
        // rolagem de iniciativa em iniciarIniciativaCombate abaixo.
        const nivelCobraKai = nivelDaPericia(ficha.pericias, "Karatê Cobra Kai");
        // Energia — mesma automação da Ficha (ver regras.js): Energia
        // Baixa/Crítica penaliza modAgilidade (teste físico) igual ao
        // estado de saúde; em 0 de Energia, o participante está morto.
        const energiaMax = Math.round(derivados.recursos.energia.total);
        const energiaAtual = (ficha.dados.energiaAtual !== null && ficha.dados.energiaAtual !== undefined)
            ? Number(ficha.dados.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, ignorarPenalidadeSaude);
        return {
            modAgilidade: Math.round(derivados.secundarios.agilidade.total) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica,
            velocidade: Math.round(velocidadeAjustada),
            pv: pvAtual,
            pvMax,
            estadoSaude: estadoSaude.estado,
            estadoSaudeLabel: estadoSaude.label,
            energia: energiaAtual,
            energiaMax,
            estadoEnergia: estadoEnergia.estado,
            estadoEnergiaLabel: estadoEnergia.label,
            nivelCobraKai
        };
    }

    // NPC
    const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
    if (!snap.exists()) return statsCombatePadrao();
    const npc = snap.val();

    if (npc.modoDetalhado) {
        const modificadoresVantagensNpc = coletarModificadores({ vantagens: npc.vantagens });
        const secundarios = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modificadoresVantagensNpc);
        const pvMax = secundarios.recursos.pv.valor;
        const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(npc.periciasNpc, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, ignorarPenalidadeSaude);
        const velocidadeAjustada = aplicarEstadoSaudeVelocidade({ total: secundarios.secundarios.velocidade.valor, ajustes: [] }, estadoSaude).total;
        const energiaMax = secundarios.recursos.energia.valor;
        const energiaAtual = (npc.energiaAtual !== null && npc.energiaAtual !== undefined) ? Number(npc.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, ignorarPenalidadeSaude);
        // Karatê Cobra Kai (manual pg. 22): mesmo bônus de iniciativa
        // da ficha de jogador, agora pro NPC detalhado (que tem
        // perícias próprias em npc.periciasNpc).
        const nivelCobraKai = nivelDaPericia(npc.periciasNpc, "Karatê Cobra Kai");
        return {
            modAgilidade: Math.round(secundarios.secundarios.agilidade.valor) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica,
            velocidade: Math.round(velocidadeAjustada),
            pv: pvAtual,
            pvMax,
            estadoSaude: estadoSaude.estado,
            estadoSaudeLabel: estadoSaude.label,
            energia: energiaAtual,
            energiaMax,
            estadoEnergia: estadoEnergia.estado,
            estadoEnergiaLabel: estadoEnergia.label,
            nivelCobraKai
        };
    }

    // NPC "rápido" (gerador simples) só guarda Agilidade solta, sem
    // Velocidade separada — usamos a própria Agilidade como Velocidade
    // Total pra fins de ações extras. Pra um cálculo fiel de Velocidade
    // ((Destreza+Constituição)/2), cadastre o NPC no modo detalhado. Sem
    // perícias cadastradas, não há como ter Tolerância treinada — limiar
    // de "Muito Machucado" fica sempre em 1/3 aqui.
    const pvMaxRapido = Number(npc.pvs) || 0;
    const pvAtualRapido = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMaxRapido;
    const estadoSaudeRapido = calcularEstadoSaude(pvAtualRapido, pvMaxRapido, false, ignorarPenalidadeSaude);
    const agilidadeBase = Number(npc.agilidade) || 0;
    const velocidadeAjustadaRapido = aplicarEstadoSaudeVelocidade({ total: agilidadeBase, ajustes: [] }, estadoSaudeRapido).total;
    // Energia — o gerador rápido não tem atributos primários separados,
    // só a Constituição solta; usamos a mesma fórmula do manual (6 +
    // Constituição) pro máximo. Sem campo pra editar a Energia atual
    // aqui, conta sempre como cheia (sem penalidade) até esse NPC ser
    // recadastrado no modo detalhado.
    const energiaMaxRapido = 6 + (Number(npc.constituicao) || 0);
    const energiaAtualRapido = (npc.energiaAtual !== null && npc.energiaAtual !== undefined) ? Number(npc.energiaAtual) : energiaMaxRapido;
    const estadoEnergiaRapido = calcularEstadoEnergia(energiaAtualRapido, energiaMaxRapido, ignorarPenalidadeSaude);
    return {
        modAgilidade: agilidadeBase + estadoSaudeRapido.penalidadeTestes + estadoEnergiaRapido.penalidadeFisica,
        velocidade: Math.round(velocidadeAjustadaRapido),
        pv: pvAtualRapido,
        pvMax: pvMaxRapido,
        estadoSaude: estadoSaudeRapido.estado,
        estadoSaudeLabel: estadoSaudeRapido.label,
        energia: energiaAtualRapido,
        energiaMax: energiaMaxRapido,
        estadoEnergia: estadoEnergiaRapido.estado,
        estadoEnergiaLabel: estadoEnergiaRapido.label
    };
}

function statsCombatePadrao() {
    return {
        modAgilidade: 0, velocidade: 0, pv: 0, pvMax: 0, estadoSaude: null, estadoSaudeLabel: null,
        energia: 0, energiaMax: 0, estadoEnergia: null, estadoEnergiaLabel: null
    };
}

// Ordena por iniciativa decrescente; empate é decidido pelo maior
// modificador de Agilidade (regra caseira de dificuldade defensiva
// do módulo de regras — combateAtivo é a única fonte de estado de
// combate deste sistema).
function ordenarPorIniciativa(participantes) {
    return Object.keys(participantes).sort((a, b) => {
        const A = participantes[a], B = participantes[b];
        if (B.iniciativa !== A.iniciativa) return B.iniciativa - A.iniciativa;
        return (B.modAgilidade ?? 0) - (A.modAgilidade ?? 0);
    });
}

// Inicia o combate: rola 1d20 + Agilidade pra cada participante já
// cadastrado em combateAtivo/participantes, calcula ações do turno e
// grava a ordem de iniciativa. Chamar DEPOIS de montar a lista de
// participantes pelo painel existente (adicionarParticipanteCombate).
// ---------------------------------------------------------------------
// CQC nível 2 (manual): "Avançar em direção a oponentes armados e
// derrubá-los tem modificador +1 em sua iniciativa [...]" — é
// condicional a uma escolha narrativa (nem todo personagem com CQC
// nível 2 está necessariamente fazendo esse avanço quando a iniciativa
// é rolada), então não dá pra aplicar automático feito o resto dos
// bônus de CQC. Em vez disso, ficha.js pergunta ao Mestre via checkbox
// ANTES de rolar (ver abrirModalBonusIniciativaCQC/iniciarIniciativaCombate
// mais abaixo). Esta função varre os participantes cadastrados no
// combate e devolve só quem TEM o nível pra oferecer a escolha —
// funciona pra ficha de jogador e NPC detalhado (NPC "rápido" não tem
// perícias cadastradas, então nunca aparece na lista).
//
// Mesma lista é reaproveitada em ficha.js pra oferecer o checkbox de
// CQC nível 4 ("Disparar e Avançar" — filtra pra nivel >= 4 na hora de
// montar a modal), já que os dois bônus são perguntados no mesmo passo
// pré-rolagem de iniciativa.
// ---------------------------------------------------------------------
export async function participantesElegiveisCQCIniciativa() {
    const snap = await get(ref(db, caminhoMesa("combateAtivo/participantes")));
    const participantesBase = snap.exists() ? snap.val() : {};
    const elegiveis = [];
    for (const [id, base] of Object.entries(participantesBase)) {
        let pericias = null;
        let nome = base.nome;
        if (base.tipo === "ficha") {
            const s = await get(ref(db, caminhoMesa(`fichas/${base.refId}`)));
            if (s.exists()) {
                const f = s.val();
                pericias = f.pericias || null;
                nome = (f.config && f.config.nomeExibicao) || nome;
            }
        } else {
            const s = await get(ref(db, caminhoMesa(`npcs/${base.refId}`)));
            if (s.exists()) {
                const n = s.val();
                if (n.modoDetalhado) pericias = n.pericias || null;
                nome = n.nome || nome;
            }
        }
        if (!pericias) continue;
        const entradaCQC = Object.values(pericias).find(p => p.nome === "CQC");
        const nivel = entradaCQC ? (Number(entradaCQC.nivel) || 0) : 0;
        if (nivel >= 2) elegiveis.push({ id, nome, nivel });
    }
    return elegiveis;
}

export async function iniciarIniciativaCombate(bonusIniciativaCQC = {}, dispararAvancarCQC = {}, acaoExtraCQC = {}) {
    const snap = await get(ref(db, caminhoMesa("combateAtivo/participantes")));
    const participantesBase = snap.exists() ? snap.val() : {};
    const ids = Object.keys(participantesBase);
    if (!ids.length) {
        throw new Error("Adicione ao menos um participante antes de iniciar o combate.");
    }

    // Lida uma única vez, antes do loop — com Godmode ativo E o
    // sub-toggle "ignorar penalidade de saúde" marcado, a penalidade de
    // Machucado/Muito Machucado sai zerada pra todos os participantes
    // (jogadores e NPCs) já no cálculo de iniciativa.
    const [snapGodmode, snapIgnorarSaude] = await Promise.all([
        get(ref(db, caminhoMesa("godmode"))),
        get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")))
    ]);
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    const participantesAtualizados = {};
    for (const id of ids) {
        const base = participantesBase[id];
        const stats = await calcularStatsCombateParticipante(base, ignorarPenalidadeSaude);
        const rolagemBruta = rolarD20();
        const acoesMax = calcularAcoesMax(stats.velocidade);
        // CQC nível 2: +1 na iniciativa, só pra quem o Mestre marcou no
        // checkbox de abrirModalBonusIniciativaCQC (ver comentário em
        // participantesElegiveisCQCIniciativa acima) — bonusCQCIniciativa
        // fica salvo no participante só pra exibir a origem do +1 na UI
        // (badge "🥋 +1 CQC" no Gerenciador de Combate).
        const bonusCQC = bonusIniciativaCQC[id] ? 1 : 0;
        // Karatê Cobra Kai (manual pg. 22): +1 na iniciativa a cada 2
        // pontos na perícia — automático (sem checkbox, diferente do
        // +1 de CQC nível 2 acima, que É condicional a uma escolha
        // narrativa). Ver bonusCobraKaiIniciativa em dados-manual.js e
        // nivelCobraKai calculado em calcularStatsCombateParticipante.
        const bonusCobraKai = bonusCobraKaiIniciativa(stats.nivelCobraKai);
        // CQC nível 4 ("Disparar e Avançar" — manual pg. 23): quem foi
        // marcado no checkbox de abrirModalBonusIniciativaCQC reserva já
        // AGORA 1 ação do próprio 1º turno (o manual: "utilizando uma
        // ação do seu primeiro turno") — fica marcado como já gasta no
        // contador de ações, e dispararAvancarDisponivel libera o botão
        // "Disparar e Avançar" em ficha.js (resolverDispararAvancar),
        // que resolve os 2 disparos fora da ordem de turno. Como
        // avancarTurnoCombate só RESTAURA `acoes` pro máximo cheio ao
        // virar rodada (nunca no meio dela), essa reserva persiste até
        // o próprio 1º turno de quem marcou chegar.
        const dispararAvancar = !!dispararAvancarCQC[id];
        // CQC nível 5 ("Agente Impossível" — manual: "recebe uma ação
        // extra em seu turno para rolagens de CQC"). Diferente do nível
        // 2/4, não é condicional a nenhuma escolha narrativa — é sempre
        // ativo pra quem tem o nível, então ficha.js já manda esse mapa
        // pronto (filtrando nivel >= 5 na mesma lista de elegiveis que
        // monta os outros dois mapas), sem checkbox de confirmação.
        // Guardado num contador SEPARADO de `acoes` (acoesExtraCQC),
        // porque só serve pra rolagens de CQC (ver checarConsumoDeAcao/
        // ehCQC em ficha.js) — resetado a cada rodada em
        // avancarTurnoCombate, igual `acoes`.
        const temAcaoExtraCQC = !!acaoExtraCQC[id];
        // Regra da "iniciativa travada": quem tira 1 no d20 da própria
        // rolagem de iniciativa perde o primeiro turno inteiro (0 ações,
        // não age). Ao encerrar esse turno (ver avancarTurnoCombate),
        // rerrola o d20 e reordena a fila com a nova iniciativa — se
        // tirar 1 de novo, perde o turno seguinte também, e assim por
        // diante.
        const perdeuPrimeiroTurno = rolagemBruta === 1;
        participantesAtualizados[id] = {
            ...base,
            ...stats,
            rolagemBruta,
            iniciativa: rolagemBruta + stats.modAgilidade + bonusCQC + bonusCobraKai,
            bonusCQCIniciativa: !!bonusCQC,
            bonusCobraKaiIniciativa: bonusCobraKai,
            acoesMax,
            acoes: perdeuPrimeiroTurno ? 0 : (dispararAvancar ? Math.max(0, acoesMax - 1) : acoesMax),
            iniciativaTravada: perdeuPrimeiroTurno,
            dispararAvancarDisponivel: dispararAvancar,
            dispararAvancarUsado: false,
            acoesExtraCQCMax: temAcaoExtraCQC ? 1 : 0,
            acoesExtraCQC: temAcaoExtraCQC ? 1 : 0,
            // Ações de Esquiva/Bloqueio guardadas (manual pg. ~48): só
            // ficam disponíveis DEPOIS que o personagem já teve seu
            // próprio turno na rodada. Por isso começa em 0 pra todo
            // mundo — se alguém agir antes de você na primeira rodada,
            // você ainda não tem ação carregada e não pode
            // esquivar/bloquear. É um CONTADOR (não mais um booleano):
            // normalmente vale 1 (a guarda automática de fim de turno),
            // mas pode acumular mais se o personagem usar a manobra
            // "Esquivar" no próprio turno (ver adicionarEsquivaExtra),
            // permitindo esquivar de mais de um golpe na mesma rodada.
            esquivasDisponiveis: 0,
            // Ações guardadas (ver avancarTurnoCombate/confirmarAcaoPendente,
            // tipo "guardar_acao_combate"): começa em 0 — só ganha
            // conteúdo quando o Mestre aprova guardar ação(ões) sobrando
            // do fim de um turno.
            acoesGuardadas: 0
        };
    }

    const ordemTurnos = ordenarPorIniciativa(participantesAtualizados);

    await update(ref(db, caminhoMesa("combateAtivo")), {
        ativo: true,
        rodada: 1,
        ordemTurnos,
        turnoAtual: ordemTurnos[0],
        participantes: participantesAtualizados
    });

    return { ordemTurnos, participantes: participantesAtualizados };
}

// Passa a vez pro próximo participante na ordem de iniciativa. A cada
// troca de turno (não só ao virar rodada), RECALCULA a Velocidade Total
// (e portanto o teto de ações) de todo mundo a partir do PV atual — e
// só ao voltar ao início da ordem restaura o contador de ações pro novo
// máximo cheio.
//
// Isso importa porque Machucado/Muito Machucado cortam Velocidade, e o
// PV de alguém pode mudar no meio da própria rodada (levou dano antes
// da vez dele agir) depois que "Iniciar Combate" já tinha calculado as
// ações máximas uma vez lá atrás. Sem recalcular a cada troca de turno,
// o Gerenciador de Combate continuava oferecendo ações de antes de o
// personagem ficar Machucado/Muito Machucado.
export async function avancarTurnoCombate() {
    const snap = await get(ref(db, caminhoMesa("combateAtivo")));
    const estado = snap.val();

    if (!estado?.ativo || !estado.ordemTurnos?.length) {
        throw new Error("Não há combate com iniciativa em andamento.");
    }

    const { ordemTurnos, turnoAtual, participantes, rodada } = estado;
    const indiceAtual = ordemTurnos.indexOf(turnoAtual);
    const proximoIndice = (indiceAtual + 1) % ordemTurnos.length;
    const novoTurno = ordemTurnos[proximoIndice];
    const virouRodada = proximoIndice === 0;

    const atualizacoes = { turnoAtual: novoTurno };

    // Quem estava agindo agora "guarda" mais uma ação de Esquiva/Bloqueio
    // pro próximo golpe que receber, até usá-la (ver usarEsquivaBloqueio).
    // É somado (não sobrescrito) porque o personagem pode já ter
    // acumulado esquivas extras usando a manobra "Esquivar" no próprio
    // turno (ver adicionarEsquivaExtra) — a guarda automática de fim de
    // turno não deve zerar esse estoque.
    if (participantes[turnoAtual]) {
        const esquivasAtuais = Number(participantes[turnoAtual].esquivasDisponiveis) || 0;
        atualizacoes[`participantes/${turnoAtual}/esquivasDisponiveis`] = esquivasAtuais + 1;
    }

    // Guardar ação: se quem está encerrando o turno ainda tem ação(ões)
    // do turno sobrando (não gastou tudo), isso vira uma pergunta pro
    // Mestre na fila de Ações Pendentes ("guardar_acao_combate" — ver
    // confirmarAcaoPendente abaixo) em vez de simplesmente perder as
    // ações. Se o Mestre aprovar, elas viram "ações guardadas"
    // (acoesGuardadas) que o personagem pode gastar depois, MESMO fora
    // do seu próprio turno — ver consumirAcaoCombate, que recorre a
    // acoesGuardadas quando `acoes` já está zerado, e
    // checarConsumoDeAcao em ficha.js, que libera a rolagem fora do
    // turno quando há acoesGuardadas disponíveis. Se o Mestre rejeitar,
    // nada muda — as ações que sobraram simplesmente se perdem, igual
    // já acontecia antes dessa funcionalidade existir.
    if (participantes[turnoAtual]) {
        const acoesSobrando = Number(participantes[turnoAtual].acoes) || 0;
        if (acoesSobrando > 0) {
            const nomeQuemEncerrou = participantes[turnoAtual].nome || turnoAtual;
            await criarAcaoPendente({
                tipo: "guardar_acao_combate",
                fichaId: turnoAtual,
                nomeJogador: nomeQuemEncerrou,
                detalhe: `${nomeQuemEncerrou} encerrou o turno com ${acoesSobrando} ação(ões) sobrando. Guardar para usar fora do turno?`,
                payload: { participanteId: turnoAtual, quantidade: acoesSobrando }
            });
        }
    }

    if (virouRodada) {
        atualizacoes.rodada = (rodada || 1) + 1;
    }

    // Tick System (Sangramento e outros efeitos por turno): processa os
    // status de quem está prestes a agir ANTES do recálculo de PV/
    // Velocidade/estado de saúde logo abaixo — assim o dano do tick já
    // entra nesse mesmo recálculo, e não só na próxima troca de turno.
    let notasStatus = [];
    // Psicotrópico nível 2 / Parte 5.1: se quem está prestes a agir
    // ENTROU neste turno com "perde_acao_temporizado" ainda ativo
    // (turnosRestantes > 0 antes do tick abaixo decrementar), o turno
    // que está começando agora consome 1 ação da economia normal —
    // checado com o status de ANTES do tick de propósito: mesmo no
    // turno em que o efeito acaba (turnosRestantes vira 0 agora), ele
    // ainda estava ativo quando este turno começou, então ainda vale
    // pra este turno (só não vale mais a partir do próximo).
    const bloqueiaAcaoNovoTurno = !!(participantes[novoTurno] && participantes[novoTurno].statusAtivos &&
        Object.values(participantes[novoTurno].statusAtivos).some(s => s && s.tipo === "perde_acao_temporizado" && (Number(s.turnosRestantes) || 0) > 0));
    if (participantes[novoTurno]) {
        const { statusFinal, notas } = await processarStatusInicioTurno(novoTurno, participantes[novoTurno]);
        if (statusFinal) {
            atualizacoes[`participantes/${novoTurno}/statusAtivos`] = statusFinal;
            // Já aplicado direto no nó da ficha/NPC por aplicarDano() lá
            // dentro — refletir aqui também pra não ler o PV velho da
            // rodada passada no loop de recálculo abaixo.
            participantes[novoTurno] = { ...participantes[novoTurno], statusAtivos: statusFinal };
        }
        notasStatus = notas;
    }

    // Regra da "iniciativa travada" (ver iniciarIniciativaCombate e
    // adicionarParticipanteCombate): quem tirou 1 no d20 da iniciativa
    // perdeu o turno que está terminando agora (ficou com 0 ações,
    // travado, sem poder agir). Ao encerrar esse turno — ou seja, agora,
    // na troca pra quem vem a seguir — rerrola o d20 dele. Se tirar 1 de
    // novo, o próximo turno dele TAMBÉM fica travado; senão, destrava
    // (some o iniciativaTravada) e a fila inteira é reordenada com a
    // nova iniciativa. `novoTurno` já foi decidido acima a partir da
    // ordem ATUAL da fila, então reordenar aqui não atropela quem é o
    // próximo a agir agora — só muda a partir de onde a fila continua
    // dali pra frente.
    let precisaReordenarFila = false;
    if (participantes[turnoAtual] && participantes[turnoAtual].iniciativaTravada) {
        const travado = participantes[turnoAtual];
        const novaRolagem = rolarD20();
        const bonusCQCAtual = travado.bonusCQCIniciativa ? 1 : 0;
        const bonusCobraKaiAtual = Number(travado.bonusCobraKaiIniciativa) || 0;
        const novaIniciativa = novaRolagem + (Number(travado.modAgilidade) || 0) + bonusCQCAtual + bonusCobraKaiAtual;
        const aindaTravado = novaRolagem === 1;
        atualizacoes[`participantes/${turnoAtual}/rolagemBruta`] = novaRolagem;
        atualizacoes[`participantes/${turnoAtual}/iniciativa`] = novaIniciativa;
        atualizacoes[`participantes/${turnoAtual}/iniciativaTravada`] = aindaTravado;
        // Atualiza a cópia local também, pra tanto o recálculo de ações
        // do loop abaixo (que usa Math.min contra o valor atual de
        // `acoes`) quanto o reordenamento da fila usarem o valor novo.
        participantes[turnoAtual] = { ...travado, rolagemBruta: novaRolagem, iniciativa: novaIniciativa, iniciativaTravada: aindaTravado, acoes: aindaTravado ? 0 : travado.acoesMax };
        precisaReordenarFila = true;
        notasStatus = [
            ...notasStatus,
            `${travado.nome} tinha perdido o turno (rolou 1 na iniciativa) e rerrolou ao encerrá-lo: novo resultado ${novaRolagem}, iniciativa ${novaIniciativa}.${aindaTravado ? " Tirou 1 de novo — perde o próximo turno também." : " Destravado, volta a agir normalmente no próximo turno."}`
        ];
    }

    // Mesma combinação Godmode + "ignorar penalidade de saúde" usada em
    // iniciarIniciativaCombate — recalcular tem que respeitar o mesmo
    // Godmode que já vale pro resto do combate.
    const [snapGodmode, snapIgnorarSaude] = await Promise.all([
        get(ref(db, caminhoMesa("godmode"))),
        get(ref(db, caminhoMesa("godmodeIgnorarPenalidadeSaude")))
    ]);
    const godmodeAtivo = snapGodmode.exists() ? !!snapGodmode.val() : false;
    const ignorarPenalidadeSaude = godmodeAtivo && (snapIgnorarSaude.exists() ? !!snapIgnorarSaude.val() : false);

    for (const id of ordemTurnos) {
        if (!participantes[id]) continue;
        const statsAtualizados = await calcularStatsCombateParticipante(participantes[id], ignorarPenalidadeSaude);
        const acoesMaxAtualizado = calcularAcoesMax(statsAtualizados.velocidade);
        atualizacoes[`participantes/${id}/modAgilidade`] = statsAtualizados.modAgilidade;
        atualizacoes[`participantes/${id}/velocidade`] = statsAtualizados.velocidade;
        atualizacoes[`participantes/${id}/pv`] = statsAtualizados.pv;
        atualizacoes[`participantes/${id}/pvMax`] = statsAtualizados.pvMax;
        atualizacoes[`participantes/${id}/estadoSaude`] = statsAtualizados.estadoSaude;
        atualizacoes[`participantes/${id}/estadoSaudeLabel`] = statsAtualizados.estadoSaudeLabel;
        atualizacoes[`participantes/${id}/energia`] = statsAtualizados.energia;
        atualizacoes[`participantes/${id}/energiaMax`] = statsAtualizados.energiaMax;
        atualizacoes[`participantes/${id}/estadoEnergia`] = statsAtualizados.estadoEnergia;
        atualizacoes[`participantes/${id}/estadoEnergiaLabel`] = statsAtualizados.estadoEnergiaLabel;
        atualizacoes[`participantes/${id}/acoesMax`] = acoesMaxAtualizado;
        // Rodada virando: reseta pro novo máximo cheio (comportamento de
        // sempre). Meio da rodada: só TRAVA o contador de ações restantes
        // no novo teto se ele tiver caído (ex: tinha 3/3 guardadas,
        // machucou e o novo máximo é 1 — trava em 1); nunca aumenta o
        // que já foi gasto de volta.
        atualizacoes[`participantes/${id}/acoes`] = virouRodada
            ? acoesMaxAtualizado
            : Math.min(Number(participantes[id].acoes) || 0, acoesMaxAtualizado);
        // CQC nível 5: mesma lógica de reset/trava do `acoes` normal,
        // só que baseada em acoesExtraCQCMax (0 pra quem não tem o
        // nível — nunca escreve nada além de 0 nesse caso).
        const acoesExtraCQCMax = Number(participantes[id].acoesExtraCQCMax) || 0;
        if (acoesExtraCQCMax > 0) {
            atualizacoes[`participantes/${id}/acoesExtraCQC`] = virouRodada
                ? acoesExtraCQCMax
                : Math.min(Number(participantes[id].acoesExtraCQC) || 0, acoesExtraCQCMax);
        }
    }

    // Aplica o desconto de 1 ação do "perde_acao_temporizado" (ver
    // bloqueiaAcaoNovoTurno acima) só DEPOIS do loop que acabou de
    // decidir `acoes` de todo mundo pra esta troca de turno — assim o
    // desconto vale independente de ter virado rodada ou não (mesma
    // lógica em qualquer um dos dois ramos do `acoes` calculados
    // acima). Nunca deixa negativo.
    if (bloqueiaAcaoNovoTurno && participantes[novoTurno]) {
        const chaveAcoesNovoTurno = `participantes/${novoTurno}/acoes`;
        const acoesCalculadas = Number(atualizacoes[chaveAcoesNovoTurno] ?? participantes[novoTurno].acoes) || 0;
        atualizacoes[chaveAcoesNovoTurno] = Math.max(0, acoesCalculadas - 1);
        notasStatus = [
            ...notasStatus,
            `${participantes[novoTurno].nome || novoTurno}: efeito psicotrópico ativo consome 1 ação deste turno.`
        ];
    }

    if (precisaReordenarFila) {
        atualizacoes.ordemTurnos = ordenarPorIniciativa(participantes);
    }

    await update(ref(db, caminhoMesa("combateAtivo")), atualizacoes);

    for (const nota of notasStatus) {
        await registrarRolagem({ quem: "Tick de status", modificador: 0, resultado: nota, detalhe: nota });
    }

    return { turnoAtual: novoTurno, nome: (participantes[novoTurno] && participantes[novoTurno].nome) || novoTurno, notasStatus };
}

// Consome 1 ação do turno do participante (chamar isso na hora de uma
// rolagem/ataque durante o combate ativo). Nunca deixa negativo.
export async function consumirAcaoCombate(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoes`));
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) : 0;

    if (atual > 0) {
        const novo = atual - 1;
        await set(caminho, novo);
        return novo;
    }

    // Sem ação do turno atual sobrando: tenta gastar de uma ação
    // guardada (ver "guardar_acao_combate" em avancarTurnoCombate/
    // confirmarAcaoPendente) — é isso que permite ao personagem agir
    // fora do seu próprio turno, desde que o Mestre já tenha aprovado
    // guardar a ação antes. Se também não houver ação guardada, não faz
    // nada (mesmo comportamento de antes: nunca fica negativo).
    const caminhoGuardadas = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoesGuardadas`));
    const snapGuardadas = await get(caminhoGuardadas);
    const guardadasAtual = snapGuardadas.exists() ? Number(snapGuardadas.val()) : 0;
    if (guardadasAtual > 0) {
        await set(caminhoGuardadas, guardadasAtual - 1);
    }
    return 0;
}

// Consome 1 ação EXTRA de CQC (nível 5, "Agente Impossível" — manual:
// "recebe uma ação extra em seu turno para rolagens de CQC"). Separada
// de consumirAcaoCombate porque essa ação só serve pra rolagens
// especificamente de CQC (ver checarConsumoDeAcao/ehCQC em ficha.js,
// que só recorre a este contador quando o normal já zerou) — nunca é
// somada ao `acoes` normal, senão viraria uma ação genérica igual
// qualquer outra. Nunca deixa negativo.
export async function consumirAcaoExtraCQC(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoesExtraCQC`));
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) : 0;
    const novo = Math.max(0, atual - 1);
    await set(caminho, novo);
    return novo;
}

// Marca que o "Disparar e Avançar" de CQC nível 4 (ver iniciarIniciativaCombate
// acima, que reserva a ação) já foi usado nesta rodada — chamado por
// resolverDispararAvancar em ficha.js depois de resolver os 2 disparos,
// só pra sumir com o botão (a ação em si já tinha sido descontada na
// hora de rolar a iniciativa, não aqui).
export async function marcarDispararAvancarUsado(participanteId) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/dispararAvancarUsado`)), true);
}

// Reseta o Recuo de UMA arma específica de UM personagem/NPC específico
// (combateAtivo/disparosPorFicha/{idDisparo}/{itemId}) — chamado assim
// que a ação de disparo é efetivamente gasta (consumida na hora ou
// validada depois pelo Mestre, ver confirmarAcaoPendente abaixo).
// Regra: dá pra puxar o gatilho até 3 vezes por ação (mais, com
// especializações que aumentem esse limite); o modificador de Recuo só
// vale pros disparos SUBSEQUENTES dentro da MESMA sequência de disparos
// de UMA ação — uma vez que a ação acaba (é gasta), a próxima sequência
// de disparos (próxima ação) começa do zero, sem penalidade.
export async function resetarRecuoArma(idDisparo, itemId) {
    if (!idDisparo || !itemId) return;
    await remove(ref(db, caminhoMesa(`combateAtivo/disparosPorFicha/${idDisparo}/${itemId}`)));
}

// Usa UMA das ações de Esquiva/Bloqueio guardadas do alvo pra anular (ou
// reduzir) um golpe recebido (manual: "no seu turno, você tem uma ação
// de bloqueio/esquiva que fica guardada para quando receber um golpe").
// Só funciona se houver ao menos 1 disponível no estoque (o alvo já
// teve seu turno nesta rodada, ou usou a manobra "Esquivar" no próprio
// turno pra guardar uma extra — ver adicionarEsquivaExtra). Cada golpe
// recebido consome no máximo 1 do estoque, nunca mais — mesmo tendo 2+
// esquivas guardadas, um único golpe só "gasta" uma; o resto fica
// guardado pro PRÓXIMO golpe que vier a acertar o personagem (isso já
// é garantido pela própria mecânica: responderReacaoPendente só chama
// esta função uma vez por golpe). Retorna true se conseguiu consumir
// (golpe anulado/reduzido) ou false se o alvo não tinha nenhuma
// esquiva guardada.
export async function usarEsquivaBloqueio(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/esquivasDisponiveis`));
    const snap = await get(caminho);
    const disponivel = snap.exists() ? Number(snap.val()) || 0 : 0;
    if (disponivel <= 0) return false;
    await set(caminho, disponivel - 1);
    return true;
}

// Concede uma esquiva extra guardada a um participante quando ele usa a
// manobra "Esquivar" no próprio turno (ver renderizarManobrasCombate em
// ficha.js), em vez de só contar com a guarda automática de fim de
// turno. Empilha em cima do que já estiver guardado — permite anular
// mais de um golpe recebido na mesma rodada (cada golpe ainda consome
// só 1, ver usarEsquivaBloqueio).
export async function adicionarEsquivaExtra(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/esquivasDisponiveis`));
    const snap = await get(caminho);
    const atual = snap.exists() ? Number(snap.val()) || 0 : 0;
    const novo = atual + 1;
    await set(caminho, novo);
    return novo;
}

// ---------------------------------------------------------------------
// Contra-ataque imediato do Aparar (manual: "pode atacar imediatamente
// com modificador -1"). Fica guardado por participante — quem aparou
// tem até seu próximo ataque (não precisa esperar o próprio turno) pra
// usá-lo; ficha.js consome isso sozinho no fluxo normal de "Usar" arma,
// aplicando o modificador e mirando automaticamente em quem atacou.
// ---------------------------------------------------------------------
export async function definirContraAtaquePendente(participanteId, dados) {
    await set(ref(db, caminhoMesa(`combateAtivo/contraAtaquePendente/${participanteId}`)), dados);
}

export async function consumirContraAtaquePendente(participanteId) {
    const caminho = ref(db, caminhoMesa(`combateAtivo/contraAtaquePendente/${participanteId}`));
    const snap = await get(caminho);
    if (!snap.exists()) return null;
    await remove(caminho);
    return snap.val();
}

// ---------------------------------------------------------------------
// Agarrar (manual: "impossibilita golpes de alcance médio e longo e
// reduz pela metade os danos da vítima"). Fica guardado no próprio
// participante agarrado — ficha.js consulta isso pra bloquear golpes de
// alcance médio/longo da vítima e pra cortar o dano dela pela metade
// enquanto durar. Sem mecânica de "quebrar o agarrão" definida no
// manual além disso, então é solto manualmente (Mestre ou a própria
// vítima) — ver soltarAgarrado.
// ---------------------------------------------------------------------
export async function definirAgarrado(participanteId, porPid, porNome) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/agarrado`)), { ativo: true, porPid, porNome });
}

export async function soltarAgarrado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/agarrado`)));
}

// ---------------------------------------------------------------------
// Derrubar (manual: "derruba; dificuldade pra ser acertado diminuída em
// -3 e tem de gastar uma ação para se levantar"). Fica guardado no
// próprio participante derrubado — resolverAtaque desconta -3 da
// dificuldade de quem tenta acertá-lo enquanto durar, e "Levantar" (ver
// consumirAcaoCombate em ficha.js) gasta 1 ação do turno da vítima pra
// remover o status. `porPid`/`porNome` só ficam registrados pra
// referência no Log/badge, igual Agarrar.
// ---------------------------------------------------------------------
export async function definirDerrubado(participanteId, porPid, porNome) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/derrubado`)), { ativo: true, porPid, porNome });
}

export async function levantarDerrubado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/derrubado`)));
}

// ---------------------------------------------------------------------
// Imobilizar (CQC nível 4, manual pg. 23: "Após derrubar pode imobilizar
// o alvo, impedindo completamente ataques e movimentação [...] Para o
// alvo se livrar, teste Destreza, dif igual ao valor do agente CQC no
// teste de derrubar"). Usamos o resultado do próprio teste de Imobilizar
// (não o de Derrubar de antes, que o manual não deixa claro se ainda
// está disponível pra referência) como essa dificuldade de escape —
// guardado em `dificuldadeEscape` na hora de imobilizar (ver
// resolverImobilizar em ficha.js). Igual a Agarrar/Derrubar: fica
// guardado no próprio participante, sem mecânica de "quebrar"
// automática além do teste de Destreza no próprio turno da vítima (ver
// tentarLibertarImobilizado em ficha.js). Diferente de Agarrar, o
// bloqueio é TOTAL — resolverAtaque nega QUALQUER golpe de quem estiver
// imobilizado, não só alcance médio/longo.
// ---------------------------------------------------------------------
export async function definirImobilizado(participanteId, porPid, porNome, dificuldadeEscape) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/imobilizado`)), { ativo: true, porPid, porNome, dificuldadeEscape });
}

export async function soltarImobilizado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/imobilizado`)));
}

// ---------------------------------------------------------------------
// Desacordado (Jiu Jitsu nível 3, manual pg. 22: "Ao vencer no teste
// disputado [de Imobilizar], a vítima é desacordada se for da vontade
// do usuário"). Diferente de Imobilizado, é inconsciência de verdade:
// bloqueia tudo igual (ver checagem em resolverAtaque, mesmo padrão de
// meuStatusImobilizado), mas o manual não dá à vítima nenhum teste pra
// se libertar sozinha — por isso não guarda `dificuldadeEscape` nem tem
// um "tentarLibertar" equivalente; só volta com soltarDesacordado, de
// dentro do Gerenciador de Combate do Mestre (botão "Acordar").
// ---------------------------------------------------------------------
export async function definirDesacordado(participanteId, porPid, porNome) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/desacordado`)), { ativo: true, porPid, porNome });
}

export async function soltarDesacordado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/desacordado`)));
}

// ---------------------------------------------------------------------
// Ossos quebrados (Jiu Jitsu níveis 4/5, manual pg. 22: "Com o alvo
// imobilizado, [...] reduz em um/dois pontos qualquer ação física e
// caso seja em um membro inferior, impossibilita correr. Caso ambas
// pernas sejam quebradas, apenas pode se arrastar, testando Tolerância,
// dificuldade 15"). O dano em si é aplicado direto via aplicarDano (ver
// resolverQuebrarOssosJiuJitsu em ficha.js) — isso aqui só guarda o
// status textual/contador pra exibir como badge (🦴) no Gerenciador de
// Combate; a penalidade de "-X em qualquer ação física" e o "só se
// arrasta" ficam com o Mestre aplicar manualmente (o sistema não tem
// uma trava genérica de penalidade por participante pra testes físicos
// de terceiros — só o dono da ficha calcula o próprio estado de saúde/
// energia), igual a outras notas só-narrativas do CQC nível 4.
// ---------------------------------------------------------------------
export async function definirOssosQuebrados(participanteId, { pontosPenalidade, membroInferior, porNome }) {
    const caminho = caminhoMesa(`combateAtivo/participantes/${participanteId}/ossosQuebrados`);
    const snap = await get(ref(db, caminho));
    const atual = snap.exists() ? snap.val() : { pernasQuebradas: 0 };
    const pernasQuebradas = Math.min(2, (Number(atual.pernasQuebradas) || 0) + (membroInferior ? 1 : 0));
    await set(ref(db, caminho), {
        ativo: true,
        pontosPenalidade: Math.max(Number(atual.pontosPenalidade) || 0, Number(pontosPenalidade) || 0),
        pernasQuebradas,
        arrastaSomente: pernasQuebradas >= 2,
        porNome
    });
}

export async function curarOssosQuebrados(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/ossosQuebrados`)));
}

// ---------------------------------------------------------------------
// Infecção — Complicações de ferimentos (manual, "Saúde e PVs" /
// "Complicações"; dificuldade em dificuldadeInfeccao, regras.js).
//
// Diferente do Sangramento (dano automático, por turno, com contagem
// regressiva — Tick System acima), a Infecção não causa dano sozinha: o
// manual diz que ela AUMENTA EM 50% o tempo de repouso necessário pra
// recuperação (ver calcularTempoRecuperacaoPV em regras.js, chamado na
// hora do pedido de Recuperação de PVs — ver ficha.js). Por isso a flag
// não pode viver só dentro de `combateAtivo/participantes/{id}` — esse
// nó inteiro é apagado quando o combate termina (ver encerrarCombate
// acima), e a infecção precisa continuar valendo bem depois do combate
// acabar, até o personagem receber tratamento médico de verdade.
// Por isso, além de marcar o participante (pro badge aparecer durante O
// combate em andamento), espelhamos a mesma flag no registro
// PERSISTENTE do personagem (`fichas/{id}/dados/infeccao` pra jogador,
// `npcs/{id}/infeccao` pra NPC) — é essa cópia persistente que
// calcularTempoRecuperacaoPV/renderizarRecuperacaoPV realmente leem.
//
// `garantida` (default false) marca o caso do manual em que NÃO se rola
// teste nenhum: falha em Remover Projétil com complicação deixa o
// projétil alojado e a infecção é automática.
// ---------------------------------------------------------------------
async function caminhoPersistenteDoParticipante(participanteId) {
    const snap = await get(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}`)));
    if (!snap.exists()) return null;
    const p = snap.val();
    if (p.tipo === "ficha") return `fichas/${p.refId}/dados/infeccao`;
    if (p.tipo === "npc") return `npcs/${p.refId}/infeccao`;
    return null;
}

export async function aplicarInfeccao(participanteId, origem, garantida = false) {
    if (!participanteId) return;
    const dadosInfeccao = { ativo: true, origem: origem || "", garantida: !!garantida };
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/infeccao`)), dadosInfeccao);
    const caminhoPersistente = await caminhoPersistenteDoParticipante(participanteId);
    if (caminhoPersistente) await set(ref(db, caminhoMesa(caminhoPersistente)), dadosInfeccao);
}

export async function curarInfeccao(participanteId) {
    const caminhoPersistente = await caminhoPersistenteDoParticipante(participanteId);
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/infeccao`)));
    if (caminhoPersistente) await remove(ref(db, caminhoMesa(caminhoPersistente)));
}

// Constituição efetiva (já com modificadores estruturados) de um
// participante já cadastrado em combateAtivo, buscada sob demanda —
// diferente do teste de Sangramento (que já roda dentro de
// resolverAtaque, com a ficha/NPC do alvo carregada na hora), o teste
// de Infecção pode ser disparado pelo Mestre a qualquer momento sobre
// qualquer participante, sem um ataque em andamento. Reaproveita
// calcularDificuldadeDefesaJogador com base 0 pra devolver só o valor
// de Constituição (atributo + modificadores), sem somar o "+10" de
// dificuldade defensiva. NPC "rápido" não tem atributos primários
// separados — usa a Constituição solta cadastrada nele, sem
// modificadores (mesma limitação já assumida em calcularStatsCombateParticipante).
export async function obterConstituicaoParticipante(participanteId) {
    const participanteSnap = await get(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}`)));
    if (!participanteSnap.exists()) return 0;
    const participante = participanteSnap.val();

    if (participante.tipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
        if (!snap.exists()) return 0;
        const ficha = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(ficha);
        return calcularDificuldadeDefesaJogador(ficha.dados, "constituicao", modificadoresPlanos, 0);
    }

    const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
    if (!snap.exists()) return 0;
    const npc = snap.val();
    if (npc.modoDetalhado) {
        const modificadoresVantagensNpc = coletarModificadores({ vantagens: npc.vantagens });
        return calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modificadoresVantagensNpc, 0);
    }
    return Number(npc.constituicao) || 0;
}

// Teste de Constituição vs. Infecção: d20 + Constituição do alvo vs.
// `dificuldade` (já calculada pelo chamador via dificuldadeInfeccao em
// regras.js — dificuldade base 18 fixa, ou 18-22 conforme gravidade,
// menos qualquer modificador de item/tratamento). Falha aplica a flag
// via aplicarInfeccao (nunca "garantida" aqui — esse teste É o que
// decide se infecciona; o caso garantido pula direto pra
// aplicarInfeccao, sem chamar esta função).
export async function testarInfeccao(participanteId, dificuldade, origem) {
    if (!participanteId) return null;
    const constituicaoAlvo = await obterConstituicaoParticipante(participanteId);
    const dif = Number(dificuldade) || DIFICULDADE_INFECCAO_MINIMA;
    const bruto = rolarD20();
    const resultado = bruto + constituicaoAlvo;
    const sucesso = resultado >= dif;
    if (!sucesso) {
        await aplicarInfeccao(participanteId, origem, false);
    }
    return {
        dificuldade: dif, bruto, modConstituicao: constituicaoAlvo, resultado, sucesso,
        detalhe: sucesso
            ? `Teste de Constituição vs. Infecção (dif ${dif}): d20 (${bruto}) ${constituicaoAlvo >= 0 ? "+" : ""}${constituicaoAlvo} = ${resultado} — RESISTIU, não infeccionou.`
            : `Teste de Constituição vs. Infecção (dif ${dif}): d20 (${bruto}) ${constituicaoAlvo >= 0 ? "+" : ""}${constituicaoAlvo} = ${resultado} — FALHOU, o ferimento INFECCIONOU (tempo de repouso necessário +50% até tratamento médico).`
    };
}

// ---------------------------------------------------------------------
// Delimitar alcance / Retomar alcance (manual): a vítima só pode usar
// golpes do alcance escolhido pelo atacante (exceto Médio, que sempre
// pode ser usado "de perto", a metade do dano — ver checagem em
// ficha.js). `pontuacao` é o resultado do teste de Delimitar alcance
// que valeu — é a dificuldade que Retomar alcance precisa bater pra
// remover a limitação (manual: "dificuldade igual à pontuação da
// delimitação de alcance colocada pelo adversário").
// ---------------------------------------------------------------------
export async function definirAlcanceLimitado(participanteId, dados) {
    await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/alcanceLimitado`)), { ativo: true, ...dados });
}

export async function soltarAlcanceLimitado(participanteId) {
    await remove(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/alcanceLimitado`)));
}

// ---------------------------------------------------------------------
// Reação pendente (Esquiva/Bloqueio) — quem escolhe é quem RECEBE o
// golpe, não quem ataca. Como os dois jogadores estão em telas/sessões
// diferentes, a escolha não pode ser um prompt() síncrono na tela de
// quem atacou (aquilo fazia o ATACANTE responder no lugar do alvo).
// Em vez disso: o ataque, ao acertar um alvo com esquivasDisponiveis > 0,
// grava aqui tudo que falta pra fechar o golpe (dano já calculado, sem
// aplicar ainda) — visível em tempo real pra todo mundo via
// ouvirCombateAtivo(). A UI do jogador-alvo (ou do Mestre, se o alvo
// for NPC) mostra um modal com as opções assim que detectar que
// `participanteId` bate com ele, e chama responderReacaoPendente().
// ---------------------------------------------------------------------
export async function abrirReacaoPendente(dados) {
    await set(ref(db, caminhoMesa("combateAtivo/reacaoPendente")), { ...dados, timestamp: Date.now() });
}

// escolha: "esquivar" | "bloquear" | "aparar" | "nenhuma".
// "esquivar" anula o golpe (dano 0). "bloquear" reduz o dano pela
// metade, exceto se o tipo de dano for perfurante (comum ou especial),
// que ignora bloqueio. "aparar" é a única que exige teste: `dadosExtra`
// já vem com o resultado da rolagem (feita no cliente de quem defende,
// que tem acesso aos próprios dados/perícias) — dificuldade = pontuação
// do atacante no teste de ataque (r.resultadoAtaque, manual). Sucesso
// anula o golpe (como Esquivar) E guarda um contra-ataque imediato
// (modificador -1) pro personagem que aparou, contra quem atacou (ver
// definirContraAtaquePendente/consumirContraAtaquePendente). Todas as
// três (exceto "nenhuma") consomem a ação de Esquiva/Bloqueio guardada.
// "nenhuma" (ou a ação já ter sido gasta antes de responder) deixa
// passar o golpe cheio e NÃO consome a ação guardada.
export async function responderReacaoPendente(escolha, dadosExtra = null) {
    const snap = await get(ref(db, caminhoMesa("combateAtivo/reacaoPendente")));
    if (!snap.exists()) return null;
    const r = snap.val();

    // Não dá pra esquivar/aparar de tiro (só de golpes corpo a corpo/
    // arma branca) — a UI já não oferece os botões "Esquivar"/"Aparar"
    // quando o golpe veio de arma de fogo (r.ehArmaFogo), mas
    // revalidamos aqui também pra não dar pra burlar chamando esta
    // função diretamente.
    if ((escolha === "esquivar" || escolha === "aparar") && r.ehArmaFogo) {
        escolha = "nenhuma";
    }
    // Manual: "não é possível aparar ataques de armas brancas estando
    // desarmado" — revalida no servidor (mesma regra já aplicada na UI,
    // que só oferece perícias desarmadas quando o golpe recebido não é
    // de arma branca).
    if (escolha === "aparar" && r.ataqueArmaBranca && dadosExtra && !PERICIAS_ARMA_BRANCA.includes(dadosExtra.periciaEscolhida)) {
        escolha = "nenhuma";
    }

    let consumiu = false;
    if (escolha === "esquivar" || escolha === "bloquear" || escolha === "aparar") {
        consumiu = await usarEsquivaBloqueio(r.participanteId);
    }

    let danoParaAplicar = r.danoTotal;
    let notaEscolha;
    let apararConseguiu = false;
    if (escolha === "esquivar" && consumiu && dadosExtra) {
        // Esquivar (manual): teste de Agilidade vs. dificuldade = a
        // pontuação do ataque sofrido (r.resultadoAtaque) — mesmo
        // padrão de "aparar" logo abaixo. dadosExtra já vem calculado
        // do lado do cliente (ver calcularModEsquivarParticipante em
        // ficha.js), com o bônus de Boxe (+2 desarmado/+1 arma branca)
        // já embutido no modDado quando aplicável.
        const { brutoDado, modDado, resultadoDado } = dadosExtra;
        const esquivouConseguiu = resultadoDado >= r.resultadoAtaque;
        const detalheDado = `d20 (${brutoDado}) ${modDado >= 0 ? "+" : ""}${modDado} = ${resultadoDado}`;
        if (esquivouConseguiu) {
            danoParaAplicar = 0;
            notaEscolha = `${r.nomeAlvo} ESQUIVOU (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — ANULOU o golpe.`;
        } else {
            notaEscolha = `${r.nomeAlvo} tentou ESQUIVAR (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — FALHOU. Ação guardada consumida mesmo assim.`;
        }
    } else if (escolha === "bloquear" && consumiu) {
        if (r.tipoDanoKey === "perfuracao_comum" || r.tipoDanoKey === "perfuracao_especial") {
            notaEscolha = `${r.nomeAlvo} tentou BLOQUEAR, mas dano perfurante não é reduzido por bloqueio. Ação guardada consumida mesmo assim.`;
        } else if (r.bloqueioForcaBruta && r.bloqueioForcaBruta.impossivel) {
            // Força Bruta nível 5 (manual pg. 22): "não é possível
            // bloquear golpes" — passa o dano cheio mesmo assim, a ação
            // guardada é consumida do mesmo jeito que uma tentativa
            // fracassada de bloquear dano perfurante logo acima.
            notaEscolha = `${r.nomeAlvo} tentou BLOQUEAR, mas esse golpe veio de Força Bruta nível 5 — impossível bloquear. Ação guardada consumida mesmo assim.`;
        } else if (r.bloqueioForcaBruta && r.bloqueioForcaBruta.fracaoDanoRestante) {
            // Força Bruta nível 4 (manual pg. 22): "bloquear seus golpes
            // diminui apenas em 1/4 o dano" — em vez da metade normal.
            danoParaAplicar = Math.floor(danoParaAplicar * r.bloqueioForcaBruta.fracaoDanoRestante);
            notaEscolha = `${r.nomeAlvo} usou a ação guardada pra BLOQUEAR, mas esse golpe veio de Força Bruta nível 4 — só reduziu 1/4 do dano.`;
        } else {
            danoParaAplicar = Math.floor(danoParaAplicar / 2);
            notaEscolha = `${r.nomeAlvo} usou a ação guardada pra BLOQUEAR e reduziu o dano pela metade.`;
        }
    } else if (escolha === "aparar" && consumiu && dadosExtra) {
        const { periciaEscolhida, brutoDado, modDado, resultadoDado } = dadosExtra;
        apararConseguiu = resultadoDado >= r.resultadoAtaque;
        const detalheDado = `d20 (${brutoDado}) ${modDado >= 0 ? "+" : ""}${modDado} = ${resultadoDado}`;
        if (apararConseguiu) {
            danoParaAplicar = 0;
            notaEscolha = `${r.nomeAlvo} APAROU com ${periciaEscolhida} (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — ANULOU o golpe e pode contra-atacar imediatamente (modificador -1).`;
            if (r.atacanteTipo && r.atacanteRefId && r.atacantePid) {
                await definirContraAtaquePendente(r.participanteId, {
                    contraAlvoPid: r.atacantePid,
                    contraAlvoTipo: r.atacanteTipo,
                    contraAlvoRefId: r.atacanteRefId,
                    contraAlvoNome: r.nomeAtacante,
                    modificador: -1
                });
            }
        } else {
            notaEscolha = `${r.nomeAlvo} tentou APARAR com ${periciaEscolhida} (${detalheDado}) vs. ${r.resultadoAtaque} do ataque — FALHOU. Ação guardada consumida mesmo assim.`;
        }
    } else {
        notaEscolha = `${r.nomeAlvo} não usou Esquiva/Bloqueio/Aparar e recebeu o golpe cheio.`;
    }

    // Carga química (dardo/lâmina envenenada — Parte 6.2 do plano de
    // automação dos materiais químicos): golpe "anulado" só quando
    // Esquivar ou Aparar tiveram sucesso (as únicas duas reações que
    // zeram danoParaAplicar) — Bloquear reduz o dano mas o golpe ainda
    // encosta no alvo, então a substância ainda é considerada aplicada.
    // Repassado no retorno pra quem chamou (ficha.js, responder() da
    // tela de Esquiva/Bloqueio) decidir se dispara it.quimico.efeitos.
    const golpeAnulado = danoParaAplicar === 0 && (escolha === "esquivar" || escolha === "aparar");

    // Golpes Mirados (manual): a redução de armadura do alvo só conta
    // itens de Proteção cujo localProtegido bate com o local mirado
    // (r.localArmaduraAtual — ver LOCAIS_MIRA em dados-manual.js/
    // resolverAtaque em ficha.js). Ausente (reação antiga, de antes
    // dessa mudança) cai em `null`, preservando o comportamento antigo
    // de não filtrar por local.
    // Local detalhado (plano-silhueta-saude.txt, Fase 1/Fase 6; golpes
    // mirados por lado depois disso): resolvido ANTES de aplicarDano,
    // mesmo motivo do ramo direto em ficha.js — repassado como 8º
    // parâmetro pra amputação (se este golpe bater o limiar) apontar
    // pro local certo, e reaproveitado embaixo sem chamar de novo.
    const localFerida = (r.localMiraKey && r.localMiraKey !== "padrao") ? sortearLocalDetalhado(r.localMiraKey) : "torso";
    const resultadoDano = await aplicarDano(r.alvoTipo, r.alvoRefId, danoParaAplicar, r.tipoDanoKey, r.localArmaduraAtual ?? null, r.ignorarArmaduraPontos ?? 0, null, localFerida);

    // Golpes Mirados (manual): Golpe Perfurante testa Sangramento, Golpe
    // Cortante aplica obrigatoriamente a regra de Amputação, e Golpe
    // Contundente na Cabeça agrava o teste de Desmaio — só quando o
    // golpe teve um local mirado de verdade (não "Padrão", que o manual
    // define como "sem efeitos extras") e causou dano de verdade. Tiro
    // de arma de fogo nunca passa por aqui (ver comentário abaixo), só
    // golpes corpo a corpo/arma branca que atravessaram a reação.
    //
    // Teste de Desmaio (regra padrão da mesa, não automatizado — o
    // sistema só anota o aviso pro Mestre resolver): pra ACORDAR de um
    // desmaio, quando não houver outra regra mais específica pro caso
    // (ex.: Desacordado do Jiu Jitsu nível 3, que o manual já diz que
    // NÃO tem teste pra se libertar sozinho — ver definirDesacordado
    // acima), o padrão é um teste de Constituição, dificuldade 15. O
    // agravante de +4 do golpe contundente na Cabeça soma em cima dessa
    // base (dificuldade 19 no total).
    let notaSangramento = "";
    let notaEfeitoLocal = "";
    // Feridas persistentes (ver plano-sistema-saude-ferimentos.txt) — só
    // pra fichas de JOGADOR nesta fase. Tiro nunca passa por este
    // caminho de reação (ver comentário acima), então só existe o
    // branch de sangramento corpo a corpo aqui (sem "projétil alojado",
    // que é exclusivo de tiro — ver o caminho direto em ficha.js).
    // Local detalhado (plano-silhueta-saude.txt, Fase 1 e Fase 6):
    // sortearLocalDetalhado já foi chamado ANTES de aplicarDano (ver
    // comentário lá em cima) — reaproveitado aqui via a mesma variável
    // `localFerida`, sem sortear de novo.
    const criaFeridaHabilitado = danoParaAplicar > 0 && r.alvoTipo === "ficha";
    // Fase C: true assim que o sangramento (comum OU profundo, mais
    // abaixo) já tiver garantido uma ferida de Corte/Perfuração neste
    // mesmo golpe — impede o bloco de "chance de ferida por dano" (mais
    // abaixo) de abrir uma segunda em cima da mesma pancada.
    let feridaCorteJaGarantida = false;
    if (danoParaAplicar > 0 && r.localMiraKey && r.localMiraKey !== "padrao") {
        if (ehDanoPerfurante(r.tipoDanoKey) && r.regraSangramentoLocal) {
            const resultadoSangramento = await testarSangramento(r.participanteId, r.constituicaoAlvo, r.nivelArma, danoParaAplicar, r.regraSangramentoLocal);
            if (resultadoSangramento) notaSangramento = ` ${resultadoSangramento.detalhe}`;
            if (await registrarFeridasDeSangramento(criaFeridaHabilitado, r.participanteId, r.alvoRefId, localFerida, `${r.nomeArma} (${r.nomeAtacante})`, resultadoSangramento)) {
                feridaCorteJaGarantida = true;
            }
        }
        if (ehDanoCortante(r.tipoDanoKey)) {
            notaEfeitoLocal += ` ⚠️ Golpe cortante mirado em ${r.localMiraLabel || "local específico"}: aplica-se a regra de Amputação (resolva com o Mestre).`;
        }
        if (ehDanoContundente(r.tipoDanoKey) && r.localMiraKey === "cabeca") {
            notaEfeitoLocal += ` ⚠️ Golpe contundente na Cabeça: +4 na dificuldade do teste de Desmaio do alvo — teste de Constituição, dificuldade ${dificuldadeDesmaio(4)} (base ${DIFICULDADE_BASE_DESMAIO} +4 da Cabeça), pra acordar (resolva com o Mestre).`;
        }
    }

    // Dilaceração (item 7 do plano de saúde/complicações) — ver
    // golpeDilacera/deveTestarSangramentoProfundo em regras.js. Roda em
    // cima do dano JÁ aplicado (danoParaAplicar), independente de
    // Golpe Mirado (dilaceração não depende de mira nenhuma).
    let notaDilaceracao = "";
    if (danoParaAplicar > 0) {
        const dilacerou = golpeDilacera({
            ehExplosao: r.tipoDanoKey === "explosao",
            danoFinal: danoParaAplicar,
            pvMaximo: resultadoDano.pvMaximo,
            dilacera: !!r.dilacera,
            dilaceraEmGolpeNormal: !!r.dilaceraEmGolpeNormal,
            criticoPositivo: !!r.criticoPositivo,
            ehArmaBranca: !!r.ataqueArmaBranca
        });
        if (dilacerou) {
            notaDilaceracao = " 🩸 DILACEROU!";
            if (deveTestarSangramentoProfundo(dilacerou, danoParaAplicar, resultadoDano.pvMaximo)) {
                const resultadoSangramentoProfundo = await testarSangramentoProfundo(r.participanteId, r.constituicaoAlvo, danoParaAplicar);
                if (resultadoSangramentoProfundo) notaDilaceracao += ` ${resultadoSangramentoProfundo.detalhe}`;
                // Fase C.3: Sangramento Profundo/Dilaceração antes não
                // criava ferida nenhuma (só o status de dano por turno)
                // — agora garante sangramento + corte igual ao
                // Sangramento comum acima, com o mesmo vínculo pra
                // sumir sozinho quando o status expirar (Fase D).
                if (await registrarFeridasDeSangramento(criaFeridaHabilitado, r.participanteId, r.alvoRefId, localFerida, `Dilaceração — ${r.nomeArma} (${r.nomeAtacante})`, resultadoSangramentoProfundo)) {
                    feridaCorteJaGarantida = true;
                }
            }
        }
    }

    // Ferida por dano acima de 1/10 do PV MÁXIMO — regra nova, roda em
    // TODO golpe que causou dano de verdade numa ficha de jogador,
    // mirado ou não (diferente do bloco de Golpe Mirado acima, que
    // continua exclusivo de golpe mirado por regra própria do manual).
    // Corte e Perfuração abrem ferida tipo "corte"; Contusão abre
    // ferida tipo "fratura". Chance base de 20% assim que o dano
    // ultrapassa 1/10 do PV máximo do alvo; a cada 1/10 ADICIONAL de
    // dano além desse mínimo, +20% de chance (limite 100%) — ver
    // chanceFeridaPorDano em regras.js. Fase C.2: quando o sangramento
    // deste mesmo golpe já garantiu uma ferida de Corte/Perfuração
    // (feridaCorteJaGarantida), esse bloco NEM rola a chance pro tipo
    // "corte" — só se aplica de novo se fosse "fratura" (contusão nunca
    // sangra por este caminho, então não tem conflito ali).
    if (criaFeridaHabilitado && (ehDanoPerfurante(r.tipoDanoKey) || ehDanoCortante(r.tipoDanoKey) || ehDanoContundente(r.tipoDanoKey))) {
        const tipoFerida = ehDanoContundente(r.tipoDanoKey) ? "fratura" : "corte";
        if (tipoFerida === "corte" && feridaCorteJaGarantida) {
            notaEfeitoLocal += ` 🩹 O sangramento deste golpe já garantiu uma ferida de Corte/Perfuração — sem chance adicional.`;
        } else {
            const chance = chanceFeridaPorDano(danoParaAplicar, resultadoDano.pvMaximo);
            if (chance > 0) {
                const rotuloFerida = tipoFerida === "fratura" ? "Fratura" : "Corte/Perfuração";
                const sucessoFerida = (Math.random() * 100) < chance;
                notaEfeitoLocal += sucessoFerida
                    ? ` 🩹 Chance de ferida por dano (${chance}%): ABRIU uma ferida de ${rotuloFerida}.`
                    : ` 🩹 Chance de ferida por dano (${chance}%): não abriu ferida dessa vez.`;
                if (sucessoFerida) {
                    await criarFerida(r.alvoRefId, { tipo: tipoFerida, local: localFerida, origem: `${r.nomeArma} (${r.nomeAtacante})` });
                }
            }
        }
    }

    // Nenhum tratamento de Sangramento/Amputação/Desmaio de tiro aqui:
    // disparo de arma de fogo não pode ser esquivado, aparado NEM
    // bloqueado (manual) — por isso resolverAtaque (ficha.js) nunca abre
    // esta reação pendente pra um tiro (r.ehArmaFogo nunca chega true
    // neste ponto). O teste de Sangramento de um tiro na Cabeça
    // acontece direto no caminho sem reação, logo depois de aplicarDano
    // — ver testarSangramento acima.

    // r.danoTotal já chega dobrado do Acerto Crítico (ver resolverAtaque
    // em ficha.js, que dobra ANTES de abrir a reação pendente) — aqui só
    // repetimos a nota textual pro Log e sinalizamos critico:"acerto"
    // pro destaque visual, sem mexer de novo no valor do dano.
    const efeitoTexto = r.efeitoTexto || "";
    const danoDadoTexto = r.danoDadoTexto || "";
    const notaCritico = r.notaCritico || "";
    const notaLocalMira = r.notaLocalMira || "";
    const detalheRolagemTexto = r.detalheRolagem ? `\n${r.detalheRolagem}` : "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${r.nomeAtacante} atacou ${r.nomeAlvo} com ${r.nomeArma}. ACERTO! vs. dificuldade ${r.dificuldade}.${notaLocalMira} ${notaEscolha} Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${r.tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado.${notaCritico} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaSangramento}${notaDilaceracao}${notaEfeitoLocal}${detalheRolagemTexto}`
        : `${r.nomeAtacante} atacou ${r.nomeAlvo} com ${r.nomeArma}. ACERTO! vs. dificuldade ${r.dificuldade}.${notaLocalMira} ${notaEscolha} Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${r.tipoDanoLabel}) aplicado.${notaCritico} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaSangramento}${notaDilaceracao}${notaEfeitoLocal}${detalheRolagemTexto}`;

    await registrarRolagem({ quem: r.nomeAtacante, modificador: r.modAtaque, resultado: resultadoDano.danoFinal, detalhe: detalheDano, critico: r.criticoPositivo ? "acerto" : null });
    await remove(ref(db, caminhoMesa("combateAtivo/reacaoPendente")));
    return { ...resultadoDano, detalhe: detalheDano, golpeAnulado };
}

// Recuperação de PVs (manual) — usado tanto por "Passar o dia" (1 dia)
// quanto pelo Timeskip (N dias): pra cada ficha com dados/recuperacaoPV
// ativa (autorizada antes pelo Mestre via Ação Pendente, ver
// confirmarAcaoPendente "iniciar_recuperacao_pv" abaixo), avança
// `quantidadeDias`, credita o PV proporcional recuperado e devolve um
// resumo por ficha (pra reportar ao Mestre quanto PV voltou e, se a
// recuperação terminou antes do fim do período, quantos dias sobraram).
async function processarRecuperacoesPV(fichasAtivas, quantidadeDias, diaIndiceAtual) {
    const recuperacoesPV = [];
    for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
        const rec = ficha.dados && ficha.dados.recuperacaoPV;
        const avanco = avancarRecuperacaoPV(rec, quantidadeDias);
        if (!avanco) continue;

        const pvMax = calcularPvMaximo(ficha, diaIndiceAtual);
        const pvAtualAntes = Number(ficha.dados.pvAtual ?? pvMax);
        const pvAtualDepois = Math.min(pvMax, pvAtualAntes + avanco.pvRecuperadosNestaLeva);

        await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), {
            pvAtual: pvAtualDepois,
            recuperacaoPV: {
                ...rec,
                diasDecorridos: avanco.novoDiasDecorridos,
                ativa: !avanco.completo
            }
        });

        recuperacoesPV.push({
            fichaId,
            nomeFicha: (ficha.config && ficha.config.nomeExibicao) || fichaId,
            pvRecuperados: avanco.pvRecuperadosNestaLeva,
            pvAtual: pvAtualDepois,
            pvMax,
            completo: avanco.completo,
            diasSobrando: avanco.diasSobrando
        });
    }
    return recuperacoesPV;
}

// ---------------------------------------------------------------------
// Fase 8 do plano de efeitos médicos (Torniquete Tático) — limitação
// registrada como "sem automação", só um LEMBRETE pro Mestre (nunca
// dano automático — dano permanente em membro é grave demais pra
// automatizar sem confirmação humana). Reaproveita o MESMO mecanismo
// dos popups de treinamento acima (fila num nó da mesa, ouvida em
// tempo real pelo Mestre) — chamada por passarODia/passarVariosDias
// abaixo, então a checagem só acontece nos saltos de Passar o
// Dia/Timeskip (que avançam em blocos de 24h — não existe um "avançar
// só X horas" nesta base). Granularidade grosseira, mas ainda cobre o
// caso real: o torniquete não passa despercebido além do próximo corte
// de dia.
// Diferente de popupTreinamento (que reconstrói a fila inteira a cada
// chamada, porque representa "todo treino ativo AGORA"), aqui cada
// aviso é INCREMENTAL — usa `update()` em vez de `set()` — porque um
// torniquete já avisado (`torniquete.avisado`) não entra de novo, então
// sobrescrever o nó inteiro apagaria avisos anteriores ainda não
// descartados pelo Mestre.
// ---------------------------------------------------------------------
async function sinalizarAvisosTorniquete(fichasAtivas, calendario) {
    const avisos = [];
    for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
        const torniquete = ficha.dados && ficha.dados.torniquete;
        if (!torniquete || torniquete.avisado) continue;
        const ativoDesde = Number(torniquete.ativoDesde);
        if (!Number.isFinite(ativoDesde)) continue;
        const horasAgora = horasTotaisCalendario(calendario.diaIndice, calendario.hora);
        if (horasAgora === null || horasAgora - ativoDesde < 1) continue;
        avisos.push({
            fichaId,
            nomeFicha: (ficha.config && ficha.config.nomeExibicao) || fichaId,
            itemNome: torniquete.itemNome || "Torniquete"
        });
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados/torniquete`)), { avisado: true });
    }
    if (avisos.length) {
        await update(ref(db, caminhoMesa("avisoTorniquete")), Object.fromEntries(avisos.map((a, i) => [`t${i}_${Date.now()}`, { ...a, timestamp: Date.now() }])));
    }
    return avisos;
}

export function ouvirAvisoTorniquete(callback) {
    return onValue(ref(db, caminhoMesa("avisoTorniquete")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

export async function descartarAvisoTorniquete(avisoId) {
    await remove(ref(db, caminhoMesa(`avisoTorniquete/${avisoId}`)));
}

// ---------------------------------------------------------------------
// Passar o Dia — avança o calendário, dispara aviso de Domingo, e
// dispara o popup de treinamento pra cada ficha com treino ativo.
// ---------------------------------------------------------------------
export async function passarODia(calendarioAtual, fichasAtivas) {
    const { calendario, virouDomingo } = await passarUmDia(calendarioAtual);

    if (virouDomingo) {
        await dispararAvisoCustoVida();
        // Ganho fixo semanal — creditado automaticamente (sem precisar de
        // confirmação do jogador, diferente do custo semanal, que continua
        // exigindo confirmação via aviso). Vai sempre pro saldo "limpo"
        // (Dinheiro limpo na conta).
        for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
            const ganhoFixo = Number(ficha.dados && ficha.dados.ganhoFixo) || 0;
            if (ganhoFixo > 0) {
                const atual = Number(ficha.saldos && ficha.saldos.limpo && ficha.saldos.limpo.valor) || 0;
                await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/limpo`)), { valor: atual + ganhoFixo });
            }
        }
    }

    // Sinaliza popup de treinamento pro Mestre, por ficha com treino
    // ativo. `dias: 1` porque "Passar o Dia" sempre avança 1 dia só (ver
    // passarVariosDias abaixo pro caso do Timeskip, que avança N).
    const popups = [];
    for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
        if (ficha.treinamento && ficha.treinamento.ativo) {
            popups.push({ fichaId, nomeFicha: (ficha.config && ficha.config.nomeExibicao) || fichaId, dias: 1 });
        }
    }
    if (popups.length) {
        await set(ref(db, caminhoMesa("popupTreinamento")), Object.fromEntries(popups.map((p, i) => [`p${i}_${Date.now()}`, { ...p, timestamp: Date.now() }])));
    }

    const avisosTorniquete = await sinalizarAvisosTorniquete(fichasAtivas, calendario);

    const recuperacoesPV = await processarRecuperacoesPV(fichasAtivas, 1, calendario.diaIndice);

    return { calendario, virouDomingo, popups, avisosTorniquete, recuperacoesPV };
}

// ---------------------------------------------------------------------
// Timeskip — avança N dias de uma vez (botão "Timeskip" no calendário
// do Mestre). Mesma ideia de passarODia acima, mas: (1) o calendário só
// é escrito uma vez no final, e (2) dispara UM aviso de custo de vida
// pra CADA Domingo atravessado no período (não um só), formando uma
// fila — cada ficha paga um de cada vez, e o próximo só aparece depois
// que o anterior for pago (ver avaliarAvisoCustoVida em ficha.js).
export async function passarVariosDias(calendarioAtual, fichasAtivas, quantidade) {
    const { calendario, domingos } = await avancarNDias(calendarioAtual, quantidade);

    if (domingos > 0) {
        await dispararAvisoCustoVida(domingos);
        // Ganho fixo semanal — creditado automaticamente uma vez por
        // Domingo atravessado (mesma regra de passarODia, só que
        // multiplicada pela quantidade de Domingos do período).
        for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
            const ganhoFixo = Number(ficha.dados && ficha.dados.ganhoFixo) || 0;
            if (ganhoFixo > 0) {
                const atual = Number(ficha.saldos && ficha.saldos.limpo && ficha.saldos.limpo.valor) || 0;
                await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/limpo`)), { valor: atual + ganhoFixo * domingos });
            }
        }
    }

    // Sinaliza popup de treinamento pro Mestre, por ficha com treino
    // ativo — igual passarODia, mas com `dias: quantidade`: ao confirmar
    // o popup, o treino avança os N dias inteiros do Timeskip de uma vez
    // (via confirmarAvancoTreinamento → avancarDiasTreinamento), com os
    // dias excedentes cascateando pra fila de espera em vez de se
    // perderem (ver treinamento.js).
    const popups = [];
    for (const [fichaId, ficha] of Object.entries(fichasAtivas)) {
        if (ficha.treinamento && ficha.treinamento.ativo) {
            popups.push({ fichaId, nomeFicha: (ficha.config && ficha.config.nomeExibicao) || fichaId, dias: quantidade });
        }
    }
    if (popups.length) {
        await set(ref(db, caminhoMesa("popupTreinamento")), Object.fromEntries(popups.map((p, i) => [`p${i}_${Date.now()}`, { ...p, timestamp: Date.now() }])));
    }

    const avisosTorniquete = await sinalizarAvisosTorniquete(fichasAtivas, calendario);

    // Recuperação de PVs (manual) — pra cada ficha com uma recuperação
    // já autorizada pelo Mestre e em andamento (dados/recuperacaoPV, ver
    // criarAcaoPendente "iniciar_recuperacao_pv" / confirmarAcaoPendente
    // abaixo), avança os `quantidade` dias do Timeskip dentro dela,
    // credita o PV proporcional recuperado nesta leva e — se a
    // recuperação terminar ANTES do fim do Timeskip — registra quantos
    // dias sobraram sem uso. O resumo (recuperacoesPV) volta pro Mestre
    // ver o que aconteceu com cada ficha durante esse período.
    const recuperacoesPV = await processarRecuperacoesPV(fichasAtivas, quantidade, calendario.diaIndice);

    return { calendario, domingos, popups, avisosTorniquete, recuperacoesPV };
}

export function ouvirPopupTreinamento(callback) {
    return onValue(ref(db, caminhoMesa("popupTreinamento")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

export async function confirmarAvancoTreinamento(fichaId, popupId, dias = 1) {
    const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}`)));
    if (!snap.exists()) return [];
    const ficha = snap.val();
    if (!ficha.treinamento) return [];
    const concluidos = avancarDiasTreinamento(ficha, dias);
    await update(ref(db, caminhoMesa(`fichas/${fichaId}`)), { treinamento: ficha.treinamento, dados: ficha.dados, pericias: ficha.pericias });
    if (popupId) await remove(ref(db, caminhoMesa(`popupTreinamento/${popupId}`)));
    return concluidos;
}

export async function descartarPopupTreinamento(popupId) {
    await remove(ref(db, caminhoMesa(`popupTreinamento/${popupId}`)));
}

// ---------------------------------------------------------------------
// Aplica o custo de vida semanal de uma ficha (chamado pelo jogador ou
// Mestre ao responder o aviso de Domingo), debitando do saldo escolhido
// (por id, ex: "limpo", "sujo", "bolso" ou um saldo customizado).
// ---------------------------------------------------------------------
// `pendenteId` identifica QUAL Domingo pendente da fila (ver
// avisoCustoVida/pendentes em calendario.js) está sendo pago agora.
// Marcamos ele como pago só nesta ficha (custoVidaPagos/{pendenteId}),
// já que cada jogador tem seu próprio ritmo de pagamento — se um
// Timeskip atravessou 2 Domingos, essa mesma função é chamada 2 vezes
// (uma por pendente), e o próximo aviso só reaparece pro jogador depois
// que este for confirmado (ver avaliarAvisoCustoVida em ficha.js).
export async function pagarCustoSemanal(fichaId, fichaAtual, saldoId, pendenteId) {
    const custoBase = custoSemanalPadraoDeVida(fichaAtual.dados.padraoDeVida);
    const extras = Object.values(fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    const total = custoBase + extras;
    const atualizacoesDados = { ultimoPagamentoCustoVida: Date.now() };
    if (pendenteId) atualizacoesDados[`custoVidaPagos/${pendenteId}`] = true;
    if (ehIdSaldoDeItem(saldoId)) {
        const itemId = idItemDoSaldo(saldoId);
        const campo = campoSaldoDoItem(saldoId);
        const item = (fichaAtual.inventario && fichaAtual.inventario[itemId]) || {};
        const atual = Number(item[campo]) || 0;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { [campo]: atual - total });
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), atualizacoesDados);
        return total;
    }
    const saldo = (fichaAtual.saldos && fichaAtual.saldos[saldoId]) || { valor: 0 };
    const atual = Number(saldo.valor) || 0;
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}`)), { valor: atual - total });
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), atualizacoesDados);
    return total;
}

// ---------------------------------------------------------------------
// Sistema de Aprovação do Mestre — nenhuma ação "destrutiva" do jogador
// (remover item, mudar categoria, gastar dinheiro, dar item pra outro
// jogador) acontece na hora. Ela entra numa fila compartilhada, o
// Mestre vê em tempo real e só executa de fato quando confirma.
// ---------------------------------------------------------------------
export function ouvirAcoesPendentes(callback) {
    return onValue(ref(db, caminhoMesa("acoesPendentes")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0)));
    });
}

// tipo: "remover_item" | "mover_item" | "guardar_item" | "gastar_dinheiro" | "mover_dinheiro" | "dar_item" | "pegar_item_cenario" | "melhorar_veiculo_terceiro" | "reparar_veiculo_terceiro" | "instalar_implante" | "remover_implante" | "solicitar_item" | "solicitar_dinheiro"
export async function criarAcaoPendente({ tipo, fichaId, nomeJogador, detalhe, payload }) {
    const novaRef = push(ref(db, caminhoMesa("acoesPendentes")));
    await set(novaRef, { tipo, fichaId, nomeJogador: nomeJogador || fichaId, detalhe: detalhe || "", payload: payload || {}, criadoEm: Date.now() });
    return novaRef.key;
}

export async function rejeitarAcaoPendente(acaoId) {
    await remove(ref(db, caminhoMesa(`acoesPendentes/${acaoId}`)));
}

// Reversão do coma (item 6 do plano de saúde/complicações) — SEMPRE
// manual, chamada só pelo Mestre em Godmode, pelos dois caminhos
// documentados no plano: tratamento em hospital (item 3) OU Cirurgia de
// Campo (item 8) bem-sucedidos numa ferida relevante. O sistema não
// reverte sozinho só porque um teste passou — os dois tratamentos só
// SINALIZAM (histórico/badge) que a condição foi atendida; quem desliga
// de fato é o Mestre, aqui. Ao desligar, marca `saiuDoComaPendente` —
// consumida na PRÓXIMA recuperação de PV iniciada (dobra diasNecessarios,
// ver confirmarAcaoPendente "iniciar_recuperacao_pv" acima).
export async function reverterComaGodmode(fichaId) {
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), {
        coma: null,
        saiuDoComaPendente: true
    });
}

// "Acordar" do Desmaio Genérico (item 4) — sempre manual, resolvido pela
// mesa (teste de Constituição narrado, não rolado pelo sistema). Só
// desliga o badge/aviso; não há efeito mecânico pra reverter.
export async function acordarDesmaioGodmode(fichaId) {
    await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { desmaiado: false });
}

// Executa de fato a ação pendente no banco e remove da fila. Só deve
// ser chamada pelo Mestre (a UI já restringe isso).
//
// Helpers pra debitar/creditar um saldo de uma ficha, aceitando tanto
// um saldo normal (fichas/{id}/saldos/{saldoId}) quanto a carteira
// digital de um item (fichas/{id}/inventario/{itemId}/saldoValor) —
// mesma dualidade de sempre, ver ehIdSaldoDeItem/idItemDoSaldo.
async function debitarSaldoFicha(fichaId, saldoId, valor) {
    if (ehIdSaldoDeItem(saldoId)) {
        const itemId = idItemDoSaldo(saldoId);
        const campo = campoSaldoDoItem(saldoId);
        const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}/${campo}`)));
        const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { [campo]: arredondarMoeda(atual - valor) });
    } else {
        const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}/valor`)));
        const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}`)), { valor: arredondarMoeda(atual - valor) });
    }
}

async function creditarSaldoFicha(fichaId, saldoId, valor) {
    if (ehIdSaldoDeItem(saldoId)) {
        const itemId = idItemDoSaldo(saldoId);
        const campo = campoSaldoDoItem(saldoId);
        const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}/${campo}`)));
        const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}`)), { [campo]: arredondarMoeda(atual + valor) });
    } else {
        const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}/valor`)));
        const atual = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}`)), { valor: arredondarMoeda(atual + valor) });
    }
}

export async function confirmarAcaoPendente(acao, extras = {}) {
    const { tipo, fichaId, payload } = acao;

    if (tipo === "remover_item") {
        // Se o item removido era um recipiente com coisas guardadas
        // dentro, solta os filhos (dentroDe = null) em vez de deixá-los
        // "presos" apontando pra um item que não existe mais.
        const snapFilhos = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
        if (snapFilhos.exists()) {
            const inventarioAtual = snapFilhos.val();
            const atualizacoesFilhos = {};
            Object.entries(inventarioAtual).forEach(([itId, it]) => {
                if (it && it.dentroDe === payload.itemId) atualizacoesFilhos[`${itId}/dentroDe`] = null;
            });
            if (Object.keys(atualizacoesFilhos).length) {
                await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)), atualizacoesFilhos);
            }
        }
        await remove(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));

    } else if (tipo === "mover_item") {
        // Busca o estado atual do item — necessário pra saber se ele
        // está dentroDe algo e pra montar o item hipotético pós-mudança
        // na validação abaixo (não dá pra confiar só no payload, que
        // pode estar desatualizado desde que o pedido foi criado).
        const snapItemAtualMover = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        const itemAtualMover = snapItemAtualMover.exists() ? snapItemAtualMover.val() : {};

        const dadosMover = { categoria: payload.categoriaNova };
        // Arma que sai de "Levando consigo" não pode continuar equipada
        // (ver itemPodeUsar/itemPodeEquipar em inventario.js).
        if (payload.categoriaNova !== "levando") dadosMover.equipada = false;
        // Item que muda de categoria não pode continuar "guardado"
        // dentro de um recipiente que ficou pra trás na categoria
        // antiga — mesma regra do fluxo direto do Mestre (ver
        // selectTransferir em ficha.js).
        if (itemAtualMover.dentroDe) {
            dadosMover.dentroDe = null;
            dadosMover.compartimentoId = null;
        }

        // Trava central de "item não fica solto" (ver
        // itemPodeSerLevadoSolto/resolverEntradaLevandoConsigo em
        // inventario.js, passo 12 do projeto-slots-porte.txt): só entra
        // em jogo ao MOVER PRA "levando" — sair de "levando" já é
        // sempre válido (não passa pela regra). Em vez de só travar
        // pedindo que o item JÁ esteja equipado (impossível pro
        // primeiro item — o botão de equipar só existe depois que o
        // item já está em "levando"), resolverEntradaLevandoConsigo
        // tenta automaticamente colocá-lo num lugar físico válido (na
        // mão, vestido, ou carregado nas costas), igual um "equipar"
        // faria, respeitando mãos livres/exclusividade de subtipoPorte.
        // Só cancela o pedido quando nem isso é possível.
        if (payload.categoriaNova === "levando") {
            const itemPosMudancaMover = { ...itemAtualMover, ...dadosMover };
            const snapInventarioMover = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
            const fichaParaChecagem = { inventario: snapInventarioMover.exists() ? snapInventarioMover.val() : {} };
            const resultadoEntrada = resolverEntradaLevandoConsigo(fichaParaChecagem, itemPosMudancaMover, payload.itemId);
            if (!resultadoEntrada.ok) {
                await rejeitarAcaoPendente(acao.id);
                throw new Error(`Pedido cancelado: "${payload.itemNome || "item"}" ${resultadoEntrada.motivo}`);
            }
            if (resultadoEntrada.equipar) dadosMover.equipada = true;
        }

        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)), dadosMover);

        // Se o item movido é um recipiente (mochila etc.), o que estava
        // guardado dentro dele vai junto — muda de categoria também,
        // mas continua guardado lá dentro (dentroDe não muda).
        if (ehContainer(itemAtualMover.tag)) {
            const snapInventario = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
            if (snapInventario.exists()) {
                const inventarioAtual = snapInventario.val();
                const atualizacoesFilhos = {};
                Object.entries(inventarioAtual).forEach(([itId, it]) => {
                    if (it && it.dentroDe === payload.itemId) atualizacoesFilhos[`${itId}/categoria`] = payload.categoriaNova;
                });
                if (Object.keys(atualizacoesFilhos).length) {
                    await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)), atualizacoesFilhos);
                }
            }
        }

    } else if (tipo === "guardar_item") {
        // Guarda (ou solta, se containerIdNovo vier vazio) um item dentro
        // de um recipiente — ver select-guardar-dentro em ficha.js.
        // Guardar move o item junto pra categoria do recipiente
        // (payload.categoriaNova já vem calculada de lá); soltar mantém
        // a categoria como está.
        //
        // Revalidação (Fase 6): o jogador já é barrado client-side se o
        // item obviamente não cabe (ver Fase 5), mas entre o pedido ser
        // enviado e o Mestre confirmar, a ficha pode ter mudado — outro
        // item pode ter sido guardado no mesmo recipiente nesse meio-
        // tempo, por exemplo. Por isso, ao GUARDAR (nunca ao soltar),
        // busca o estado mais atual do inventário e roda a mesma checagem
        // de tamanho/capacidade de novo antes de gravar; se não couber
        // mais, cancela a ação pendente (em vez de gravar um estado
        // inconsistente) e avisa o motivo pro Mestre decidir o que fazer.
        if (payload.containerIdNovo) {
            const snapInventario = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
            const inventarioAtual = snapInventario.exists() ? snapInventario.val() : {};
            const itemGuardando = inventarioAtual[payload.itemId] || {};
            const resultado = itemCabeNoContainer({ inventario: inventarioAtual }, payload.containerIdNovo, payload.compartimentoIdNovo, itemGuardando.volume, itemGuardando.tamanho, payload.itemId);
            if (!resultado.cabe) {
                const nomeContainer = inventarioAtual[payload.containerIdNovo]?.nome || payload.containerNomeNovo || "recipiente";
                const motivo = resultado.motivo === "tamanho"
                    ? `"${nomeContainer}" não aceita item desse tamanho.`
                    : resultado.motivo === "compartimento_invalido"
                        ? `Esse compartimento não existe mais em "${nomeContainer}".`
                        : `"${nomeContainer}" não tem mais espaço sobrando (capacidade de volume estourada).`;
                await rejeitarAcaoPendente(acao.id);
                throw new Error(`Pedido cancelado: ${motivo}`);
            }
        }
        const dadosGuardar = { dentroDe: payload.containerIdNovo || null, compartimentoId: payload.containerIdNovo ? (payload.compartimentoIdNovo || null) : null };
        if (payload.containerIdNovo && payload.categoriaNova) dadosGuardar.categoria = payload.categoriaNova;
        // Mesmo motivo do fluxo direto do Mestre em ficha.js: guardar
        // dentro de um recipiente precisa desligar "equipada", ou a flag
        // fica presa no item e volta a ocupar mão sozinha (contando pra
        // maosDisponiveis) se ele for tirado do recipiente depois sem
        // ser reequipado de propósito.
        if (payload.containerIdNovo) dadosGuardar.equipada = false;
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)), dadosGuardar);

    } else if (tipo === "gastar_dinheiro") {
        // Débito centralizado em debitarSaldoFicha (já arredonda o
        // resultado — ver arredondarMoeda em dados-manual.js — pra
        // nunca deixar resto de ponto flutuante acumulando de gasto em
        // gasto e virando dízima aparente no saldo).
        await debitarSaldoFicha(fichaId, payload.saldoId, Number(payload.valor || 0));

    } else if (tipo === "mover_dinheiro") {
        // Move um valor de um saldo pra outro da MESMA ficha — soma da
        // ficha não muda, só a distribuição entre saldos (ex.: tirar
        // dinheiro da carteira digital e guardar no cofre do
        // esconderijo). Mesma infra de debitarSaldoFicha/
        // creditarSaldoFicha usada em qualquer outro movimento de
        // dinheiro (já arredonda o resultado — ver arredondarMoeda,
        // dados-manual.js); cada lado pode ser um saldo normal
        // (fichaAtual.saldos) ou um dos saldos de item (notas/moedas de
        // eletrônico, ou dinheiro físico — ver
        // ehIdSaldoDeItem/idItemDoSaldo/campoSaldoDoItem).
        const valor = Number(payload.valor || 0);
        await debitarSaldoFicha(fichaId, payload.saldoOrigemId, valor);
        await creditarSaldoFicha(fichaId, payload.saldoDestinoId, valor);

    } else if (tipo === "dar_item") {
        const snapItem = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        if (snapItem.exists()) {
            const item = snapItem.val();
            const novaRefItem = push(ref(db, caminhoMesa(`fichas/${payload.fichaDestinoId}/inventario`)));
            // Trava central de "item não fica solto" (ver
            // itemPodeSerLevadoSolto/resolverEntradaLevandoConsigo em
            // inventario.js): equipada e dentroDe são estado físico
            // específico do DONO ANTERIOR (mão dele, container dele).
            // Herdar esses campos ao transferir deixaria o item
            // "equipado" sem o novo dono ter feito nada, ou com dentroDe
            // apontando pra um container que só existe no inventário de
            // origem (item preso a algo fantasma, mas passando na
            // checagem porque dentroDe é truthy). Em vez de deixar
            // "solto" (equipada:false sem dentroDe, um estado que a
            // regra de ouro do inventário não permite existir), o item
            // já chega pro novo dono num lugar físico válido — na mão,
            // se ele tiver uma livre — igual resolverEntradaLevandoConsigo
            // faz pro fluxo normal de mover_item acima. Sem mão livre,
            // cancela o pedido em vez de gravar um estado inválido.
            const itemPosTransferenciaDar = { ...item, categoria: "levando", dentroDe: null, compartimentoId: null, equipada: false };
            const snapInventarioDestinoDar = await get(ref(db, caminhoMesa(`fichas/${payload.fichaDestinoId}/inventario`)));
            const fichaDestinoParaChecagemDar = { inventario: snapInventarioDestinoDar.exists() ? snapInventarioDestinoDar.val() : {} };
            const resultadoEntradaDar = resolverEntradaLevandoConsigo(fichaDestinoParaChecagemDar, itemPosTransferenciaDar, null);
            if (!resultadoEntradaDar.ok) {
                await rejeitarAcaoPendente(acao.id);
                throw new Error(`Pedido cancelado: "${item.nome || "item"}" não pôde ser entregue — quem recebe ${resultadoEntradaDar.motivo}`);
            }
            await set(novaRefItem, { ...itemPosTransferenciaDar, equipada: resultadoEntradaDar.equipar });
            await remove(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        }

    } else if (tipo === "pegar_item_cenario") {
        // Pegar item solto de um cenário (ver plano-cenario.txt, Fase 3):
        // mesmo mecanismo do "dar_item" acima, só que a origem é
        // cenarios/{cenarioId}/itens em vez do inventário de outra
        // ficha. Revalida que o item ainda está lá (outro jogador pode
        // ter pego primeiro enquanto o pedido esperava aprovação) antes
        // de criar/remover — se já sumiu, cancela a pendência e avisa o
        // motivo, sem gravar nada quebrado.
        const snapItemCenario = await get(ref(db, caminhoMesa(`cenarios/${payload.cenarioId}/itens/${payload.itemId}`)));
        if (!snapItemCenario.exists()) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.itemNome || "item"}" não está mais no cenário (alguém já pegou antes).`);
        }
        const itemCenario = snapItemCenario.val();
        const novaRefItemCenario = push(ref(db, caminhoMesa(`fichas/${payload.fichaDestinoId}/inventario`)));
        // Mesma trava de "item não fica solto" do dar_item acima: em vez
        // de zerar equipada/dentroDe e deixar o item pairando sem lugar
        // físico nenhum, coloca ele na mão de quem pegou (se houver mão
        // livre) — o item do cenário nunca tem dentroDe/mão do
        // personagem que está pegando, então sempre passa por
        // resolverEntradaLevandoConsigo igual um item novo entrando em
        // "levando" pela primeira vez.
        const itemPosPegarCenario = { ...itemCenario, categoria: "levando", dentroDe: null, compartimentoId: null, equipada: false };
        const snapInventarioDestinoCenario = await get(ref(db, caminhoMesa(`fichas/${payload.fichaDestinoId}/inventario`)));
        const fichaDestinoParaChecagemCenario = { inventario: snapInventarioDestinoCenario.exists() ? snapInventarioDestinoCenario.val() : {} };
        const resultadoEntradaCenario = resolverEntradaLevandoConsigo(fichaDestinoParaChecagemCenario, itemPosPegarCenario, null);
        if (!resultadoEntradaCenario.ok) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${itemCenario.nome || payload.itemNome || "item"}" não pôde ser pego — ${resultadoEntradaCenario.motivo}`);
        }
        await set(novaRefItemCenario, { ...itemPosPegarCenario, equipada: resultadoEntradaCenario.equipar });
        await remove(ref(db, caminhoMesa(`cenarios/${payload.cenarioId}/itens/${payload.itemId}`)));

    } else if (tipo === "melhorar_veiculo_terceiro" || tipo === "reparar_veiculo_terceiro") {
        // Reparo/Melhoria de veículo do OUTRO jogador, feito por quem
        // está no mesmo cenário (Fase 6 do plano — ver
        // plano-veiculos-fase2.txt, seção "FASE 6"). Quem gastou os
        // materiais e rolou a perícia foi a ficha ATUANTE (acao.fichaId
        // — a "mão de obra"), já resolvido no client (ver
        // resolverMecanicoVeiculo/resolverMecanicoVeiculoTerceiro em
        // ficha.js) antes mesmo de criar esta pendência — só chega aqui
        // se o teste já teve SUCESSO. Falta só aplicar o efeito mecânico
        // no veículo do DONO (payload.fichaAlvoId/veiculoId), depois de
        // revalidar que ele ainda existe (o dono pode ter apagado o
        // veículo, ou ele pode ter saído do cenário, enquanto o pedido
        // esperava aprovação).
        const { fichaAlvoId, veiculoId: veiculoAlvoId, atributoKey } = payload;
        const snapVeiculoAlvo = await get(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/veiculos/${veiculoAlvoId}`)));
        if (!snapVeiculoAlvo.exists()) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.veiculoNome || "o veículo"}" não existe mais.`);
        }
        const veiculoAlvo = snapVeiculoAlvo.val();
        if (tipo === "melhorar_veiculo_terceiro") {
            const nivelAtualBase = Number((veiculoAlvo.atributos || {})[atributoKey]) || 0;
            const novoNivel = Math.min(5, nivelAtualBase + 1);
            await update(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/veiculos/${veiculoAlvoId}/atributos`)), { [atributoKey]: novoNivel });
        } else {
            const deterioracoesRestantes = zerarDeterioracoesDoAtributoVeiculo(veiculoAlvo.deterioracoes || [], atributoKey);
            await update(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/veiculos/${veiculoAlvoId}`)), {
                deterioracoes: deterioracoesRestantes,
                pvAtual: null
            });
        }

    } else if (tipo === "instalar_implante") {
        // Cirurgia de Implante/Prótese (Biomecânica) — Fase 5 do plano
        // (ver plano-implantes-biomecanica.txt). A rolagem já aconteceu
        // no client (Fase 4 — resolverInstalarImplante, ficha.js) e já
        // chega classificada em payload.classificacao ("sucesso" /
        // "falha_leve" = falha até 5 / "falha_grave" = falha 6+ /
        // "critica" = falha crítica da rolagem) — aqui só interpretamos
        // e aplicamos, sem re-rolar nada (mesmo espírito de
        // melhorar_veiculo_terceiro/reparar_veiculo_terceiro acima:
        // quem gastou/rolou foi acao.fichaId, o efeito cai em
        // payload.fichaAlvoId).
        const { fichaAlvoId, implanteId, nivel, classificacao } = payload;

        // Trava "nunca em si mesmo" (Fase 10.2, adiantada aqui porque é
        // a mesma checagem — segunda linha de defesa caso o payload
        // chegue adulterado, já que o select do modal, Fase 4.2, já
        // impede isso no caminho normal).
        if (fichaAlvoId === fichaId) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error("Pedido cancelado: instalador e paciente não podem ser a mesma ficha.");
        }

        // Revalida que o implante ainda existe no inventário do
        // paciente — ele pode ter sido removido/vendido/dado enquanto
        // o pedido esperava confirmação do Mestre.
        const snapImplante = await get(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/inventario/${implanteId}`)));
        if (!snapImplante.exists()) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.implanteNome || "o implante"}" não está mais no inventário do paciente.`);
        }
        const itemImplante = snapImplante.val();
        const historicoAtual = Array.isArray(itemImplante.implante?.historico) ? itemImplante.implante.historico : [];
        const linhaHistorico = { tipo: "instalar", resultado: classificacao, por: acao.nomeJogador || fichaId, em: Date.now() };

        if (classificacao === "sucesso") {
            await update(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/inventario/${implanteId}/implante`)), {
                instalado: true,
                historico: [...historicoAtual, linhaHistorico]
            });
        } else if (classificacao === "falha_leve") {
            // "Falha até 5" (manual do plano, Fase 5.4): tempo perdido,
            // sem efeito mecânico nenhum — só grava o histórico, o
            // resto é narrado pela mesa.
            await update(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/inventario/${implanteId}/implante`)), {
                historico: [...historicoAtual, linhaHistorico]
            });
        } else {
            // falha_grave (6+) ou critica (Fase 5.3): aplica dano ao
            // PACIENTE, proporcional ao nível do implante. O plano não
            // fixa a fórmula pra esta fase (só fixa 20×nível pra
            // Remover, Fase 8.3) — decisão tomada aqui: falha_grave
            // vale metade (10×nível), critica vale o mesmo teto de
            // Remover (20×nível) e ainda quebra o item. Sem redução de
            // armadura (dano interno de cirurgia malsucedida, não um
            // golpe externo) — aplicarDano(..., tipoDanoKey=null) já é
            // o padrão do sistema pra isso (ver causarDanoJogador/
            // causarDanoNpc acima).
            const nivelNum = Number(nivel) || 0;
            const dano = (classificacao === "critica" ? 20 : 10) * nivelNum;
            if (dano > 0) {
                await aplicarDano("ficha", fichaAlvoId, dano, null);
            }
            const atualizacoesImplante = { historico: [...historicoAtual, linhaHistorico] };
            // Item continua instalado:false (a cirurgia não terminou) —
            // crítica soma o sinal de "quebrado/inútil" (5.3), pra
            // Fase 9 (painel Implantes da aba Saúde) mostrar depois.
            if (classificacao === "critica") atualizacoesImplante.quebrado = true;
            await update(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/inventario/${implanteId}/implante`)), atualizacoesImplante);
        }

    } else if (tipo === "remover_implante") {
        // Cirurgia de Implante/Prótese (Biomecânica) — Fase 8 do plano
        // (ver plano-implantes-biomecanica.txt). A rolagem já aconteceu
        // no client (Fase 7 — resolverRemoverImplante, ficha.js) e já
        // chega classificada em payload.classificacao ("sucesso" /
        // "falha" / "critica" — só 3 níveis aqui, diferente de
        // instalar_implante acima, que usa 4; o plano não pede
        // falha_leve/falha_grave pra Remover) — aqui só interpretamos e
        // aplicamos, sem re-rolar nada.
        const { fichaAlvoId, implanteId, nivel, classificacao } = payload;

        // Mesma trava "nunca em si mesmo" de instalar_implante acima
        // (Fase 10.2, adiantada aqui pela mesma razão).
        if (fichaAlvoId === fichaId) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error("Pedido cancelado: instalador e paciente não podem ser a mesma ficha.");
        }

        const snapImplanteRemover = await get(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/inventario/${implanteId}`)));
        if (!snapImplanteRemover.exists()) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.implanteNome || "o implante"}" não está mais no inventário do paciente.`);
        }
        const itemImplanteRemover = snapImplanteRemover.val();
        // Revalida que o implante ainda está instalado — pode ter sido
        // removido por outra cirurgia enquanto este pedido esperava
        // confirmação (ex.: dois pedidos concorrentes pro mesmo item).
        if (!itemImplanteRemover.implante?.instalado) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.implanteNome || "o implante"}" já não está mais instalado.`);
        }
        const historicoAtualRemover = Array.isArray(itemImplanteRemover.implante?.historico) ? itemImplanteRemover.implante.historico : [];
        const linhaHistoricoRemover = { tipo: "remover", resultado: classificacao, por: acao.nomeJogador || fichaId, em: Date.now() };

        // >>> DECISÃO DE DESIGN (Fase 8.2 deixava em aberto): em vez de
        // apagar o item do inventário, a remoção volta o implante pro
        // estado instalado:false — a prótese continua existindo como
        // objeto físico (pode ser vendida, dada, ou reinstalada depois
        // em outra cirurgia). Os contadores de adaptação/rejeição
        // (Fase 6) são zerados junto, já que passam a valer só enquanto
        // o implante está de fato instalado em alguém.
        const atualizacoesImplanteRemover = {
            historico: [...historicoAtualRemover, linhaHistoricoRemover]
        };

        if (classificacao === "sucesso") {
            atualizacoesImplanteRemover.instalado = false;
            atualizacoesImplanteRemover.testesAdaptacaoFeitos = 0;
            atualizacoesImplanteRemover.rejeicaoParcial = 0;
        } else {
            // Falha ou crítica (Fase 8.3): "remove + dano" — o plano diz
            // que MESMO falhando a cirurgia, o implante sai (extração
            // malfeita), só muda o dano e se o item quebra ou não.
            // 20×nível é o mesmo teto já fixado por instalar_implante
            // pra crítica (ver decisão registrada acima, Fase 5).
            atualizacoesImplanteRemover.instalado = false;
            atualizacoesImplanteRemover.testesAdaptacaoFeitos = 0;
            atualizacoesImplanteRemover.rejeicaoParcial = 0;
            const nivelNum = Number(nivel) || 0;
            const dano = 20 * nivelNum;
            if (dano > 0) {
                await aplicarDano("ficha", fichaAlvoId, dano, null);
            }
            if (classificacao === "critica") atualizacoesImplanteRemover.quebrado = true;
        }

        await update(ref(db, caminhoMesa(`fichas/${fichaAlvoId}/inventario/${implanteId}/implante`)), atualizacoesImplanteRemover);

    } else if (tipo === "pegar_dinheiro_cenario") {
        // Pegar um valor específico de um saldo solto no cenário: o
        // jogador escolhe quanto quer (validado no client contra o
        // valor do saldo no momento do clique), mas revalida de novo
        // aqui — o saldo pode ter mudado (outro jogador já tirou uma
        // parte) enquanto o pedido esperava aprovação do Mestre. Se o
        // valor pedido não cabe mais, cancela a pendência sem gravar
        // nada quebrado.
        //
        // O DESTINO não vem mais fixo em "limpo": o Mestre escolhe, na
        // hora de confirmar, em qual saldo da ficha o valor cai (ver
        // caixinha de seleção em montarPainelAcoesPendentes, ficha.js).
        // extras.saldoDestinoId aceita tanto um saldo normal quanto a
        // carteira digital de um item (mesmo esquema de
        // ehIdSaldoDeItem/idItemDoSaldo usado em "mover_dinheiro" acima).
        const snapDinheiroCenario = await get(ref(db, caminhoMesa(`cenarios/${payload.cenarioId}/dinheiro/${payload.dinheiroId}`)));
        if (!snapDinheiroCenario.exists()) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.dinheiroNome || "saldo"}" não está mais no cenário.`);
        }
        const dinheiroCenario = snapDinheiroCenario.val();
        const valorAtualCenario = Number(dinheiroCenario.valor) || 0;
        const valorPedido = Number(payload.valor) || 0;
        if (valorPedido <= 0 || valorPedido > valorAtualCenario) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: só sobrou ${valorAtualCenario} em "${dinheiroCenario.nome || "saldo"}" — menos do que os ${valorPedido} pedidos.`);
        }
        const saldoDestinoId = extras.saldoDestinoId;
        if (!saldoDestinoId) {
            throw new Error("Escolha em qual saldo do jogador o dinheiro vai cair antes de confirmar.");
        }
        await update(ref(db, caminhoMesa(`cenarios/${payload.cenarioId}/dinheiro/${payload.dinheiroId}`)), { valor: arredondarMoeda(valorAtualCenario - valorPedido) });
        await creditarSaldoFicha(payload.fichaDestinoId, saldoDestinoId, valorPedido);

    } else if (tipo === "transformar_dinheiro_item") {
        // Transforma um valor de um saldo num item físico de dinheiro no
        // inventário da própria ficha (ver botão "Transformar em item"
        // na aba Finanças, ficha.js). Revalida o saldo de origem — pode
        // ter mudado desde o pedido (outro gasto/movimentação aprovado
        // antes deste, por exemplo).
        const saldoId = payload.saldoId;
        const valor = Number(payload.valor) || 0;
        if (valor <= 0) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error("Pedido cancelado: valor inválido.");
        }
        let saldoAtualOrigem;
        if (ehIdSaldoDeItem(saldoId)) {
            const itemId = idItemDoSaldo(saldoId);
            const campo = campoSaldoDoItem(saldoId);
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${itemId}/${campo}`)));
            saldoAtualOrigem = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        } else {
            const snap = await get(ref(db, caminhoMesa(`fichas/${fichaId}/saldos/${saldoId}/valor`)));
            saldoAtualOrigem = snap.exists() && snap.val() !== null ? Number(snap.val()) : 0;
        }
        if (valor > saldoAtualOrigem) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: o saldo já não tem mais ${valor} disponível (sobrou ${saldoAtualOrigem}).`);
        }
        await debitarSaldoFicha(fichaId, saldoId, valor);
        const novoItemRef = push(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
        await set(novoItemRef, {
            nome: "Dinheiro", descricao: "Grana física — pode ser dada a outro personagem ou devolvida a um saldo depois.",
            modificadores: [], ativo: true,
            tag: "dinheiro", nivelTag: null, peso: 0.05, pesoUnitario: null, volume: 0, volumeUnitario: null,
            tamanho: "pequeno", capacidadeVolume: null, tamanhoMaximoAceito: null, quantidade: null,
            categoria: "levando", dentroDe: null, periciaUso: null,
            ehSaldo: true, saldoValor: arredondarMoeda(valor),
            classeProtecao: null, calibre: null, reducoesDano: [], localProtegido: null, arma: null,
            carregador: null, projetil: null, equipavel: false, equipada: false,
            materialTipo: null, materialQualidade: null, materialQuantidade: null
        });

    } else if (tipo === "depositar_dinheiro_item") {
        // Devolve (todo ou parte) o valor de um item de dinheiro físico
        // (ver "transformar_dinheiro_item" acima) pra um saldo normal —
        // o Mestre escolhe QUAL saldo na hora de confirmar (mesma
        // caixinha de seleção do "pegar_dinheiro_cenario", ver
        // montarPainelAcoesPendentes em ficha.js). Revalida que o item
        // ainda existe e ainda tem o valor pedido (pode ter sido gasto,
        // dado a outro personagem ou parcialmente depositado antes
        // desta confirmação).
        const snapItem = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        if (!snapItem.exists()) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.itemNome || "item"}" não está mais no inventário.`);
        }
        const item = snapItem.val();
        const valorAtualItem = Number(item.saldoValor) || 0;
        const valorPedido = Number(payload.valor) || 0;
        if (valorPedido <= 0 || valorPedido > valorAtualItem) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.itemNome || "item"}" só tem ${valorAtualItem} — menos do que os ${valorPedido} pedidos.`);
        }
        const saldoDestinoId = extras.saldoDestinoId;
        if (!saldoDestinoId) {
            throw new Error("Escolha em qual saldo do jogador o dinheiro vai cair antes de confirmar.");
        }
        if (valorPedido === valorAtualItem) {
            await remove(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)));
        } else {
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/inventario/${payload.itemId}`)), { saldoValor: arredondarMoeda(valorAtualItem - valorPedido) });
        }
        await creditarSaldoFicha(fichaId, saldoDestinoId, valorPedido);

    } else if (tipo === "gastar_acao_combate") {
        // Toda rolagem em combate com iniciativa ativo pede aprovação do
        // Mestre antes de gastar a ação do turno (o dado já foi rolado e
        // registrado no Log na hora — só o CONSUMO da ação espera o
        // Mestre confirmar). Rejeitar a pendência simplesmente não gasta
        // a ação, sem desfazer a rolagem já registrada.
        // CQC nível 5: se a rolagem usou a ação extra (payload.extraCQC,
        // ver checarConsumoDeAcao em ficha.js), o gasto vai pro contador
        // separado acoesExtraCQC, não pro `acoes` normal.
        if (payload.extraCQC && payload.participanteId) {
            await consumirAcaoExtraCQC(payload.participanteId);
        } else if (payload.participanteId) {
            await consumirAcaoCombate(payload.participanteId);
        }
        // Se essa ação validada era um disparo de arma de fogo, a ação
        // acaba de ser efetivamente gasta — reseta o Recuo dessa arma
        // (ver resetarRecuoArma acima) pra que o PRÓXIMO disparo (já
        // numa ação nova) comece sem penalidade acumulada.
        if (payload.ehArmaFogo && payload.idDisparo && payload.itemIdDisparo) {
            await resetarRecuoArma(payload.idDisparo, payload.itemIdDisparo);
        }

    } else if (tipo === "validar_determinacao") {
        // Trava a Determinação daquele índice pro jogador (ver
        // renderizarDeterminacoes/liberarDeterminacao em abas/determinacoes.js — só o
        // Mestre volta a liberá-la, clicando em "Liberar" na própria
        // aba de Determinações da ficha).
        //
        // Regrava o array inteiro (em vez de update() só no índice) de
        // propósito: um update() com uma chave numérica isolada criaria
        // um objeto tipo {"3": true} caso ainda não exista nenhuma
        // posição anterior gravada, e o Realtime Database só devolve
        // isso como array de verdade (pro Array.isArray funcionar do
        // lado de ficha.js) quando as chaves são sequenciais a partir do
        // 0 — por isso lemos o estado atual, preenchemos os buracos com
        // `false` e escrevemos o array completo de volta.
        const idx = Number(payload.indice);
        const snapValidadas = await get(ref(db, caminhoMesa(`fichas/${fichaId}/determinacoesValidadas`)));
        const validadas = [];
        if (snapValidadas.exists()) {
            const v = snapValidadas.val();
            if (Array.isArray(v)) v.forEach((val, i) => { validadas[i] = !!val; });
            else Object.entries(v).forEach(([k, val]) => { validadas[Number(k)] = !!val; });
        }
        for (let i = 0; i <= idx; i++) if (validadas[i] === undefined) validadas[i] = false;
        validadas[idx] = true;
        await set(ref(db, caminhoMesa(`fichas/${fichaId}/determinacoesValidadas`)), validadas);

    } else if (tipo === "iniciar_recuperacao_pv") {
        // Autorização do Mestre pro pedido de recuperação de PV do
        // jogador (ver calcularTempoRecuperacaoPV em regras.js e o botão
        // "Solicitar recuperação de PVs" em ficha.js). A partir daqui a
        // recuperação fica "ativa" e passa a avançar sozinha a cada
        // Timeskip (ver passarVariosDias acima), até completar.
        //
        // payload.diasNecessarios chega SEM dobro por saída de coma
        // (item 6), sem fatores de item nem sem os descontos de
        // tratamento especializado/hospital — só com o +50% de infecção
        // já embutido, igual sempre foi. Coma e fatores de item são
        // reaplicados AQUI, em cima do que estiver valendo NESTE momento
        // (podem ter mudado desde o pedido) — mesmo comportamento de
        // sempre. Tratamento especializado/em hospital, por outro lado,
        // vêm do PAYLOAD (payload.tratamentoEspecializado/emHospital):
        // são a escolha do JOGADOR no momento do pedido (feita junto do
        // modo "Tratamento médico" — ver renderizarRecuperacaoPV em
        // ficha.js), não mais uma flag persistente da ficha, então não
        // tem "valendo agora" pra reconferir — é só o que veio marcado.
        // Ordem: dobra por coma primeiro, fatores de item da Fase 7 do
        // plano de efeitos médicos depois (multiplicados entre si — ver
        // aplicarFatoresRecuperacaoItens em regras.js), desconto de
        // tratamento especializado e depois em hospital por último (por
        // cima do valor já reduzido pelos itens, um -1/10 por vez) — coma
        // e fatores de item continuam sendo consumidos (zerados) depois
        // de usados, não empilham entre recuperações.
        const snapFichaDados = await get(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)));
        const dadosFicha = snapFichaDados.exists() ? snapFichaDados.val() : {};
        const tratamentoEspecializadoNoPedido = !!payload.tratamentoEspecializado;
        const emHospitalNoPedido = !!payload.emHospital;
        const saiuDoComaAtivo = !!dadosFicha.saiuDoComaPendente;
        const fatoresRecuperacaoItens = dadosFicha.fatoresRecuperacaoItens || null;
        const diasBase = Number(payload.diasNecessarios) || 0;
        const diasComComa = saiuDoComaAtivo ? diasBase * 2 : diasBase;
        const diasComFatoresItens = aplicarFatoresRecuperacaoItens(diasComComa, fatoresRecuperacaoItens);
        let diasFinal = diasComFatoresItens;
        if (tratamentoEspecializadoNoPedido) diasFinal = aplicarReducaoTratamentoHospital(diasFinal, true);
        if (emHospitalNoPedido) diasFinal = aplicarReducaoTratamentoHospital(diasFinal, true);
        await set(ref(db, caminhoMesa(`fichas/${fichaId}/dados/recuperacaoPV`)), {
            ativa: true,
            pvPerdidosInicial: Number(payload.pvPerdidos) || 0,
            diasNecessarios: diasFinal,
            diasDecorridos: 0,
            infectadoNoPedido: !!payload.infectado,
            modoNoPedido: payload.modo === "tratamento" ? "tratamento" : "padrao_vida",
            tratamentoEspecializadoNoPedido,
            emHospitalNoPedido,
            fatoresRecuperacaoItensNoPedido: fatoresRecuperacaoItens && Object.keys(fatoresRecuperacaoItens).length ? fatoresRecuperacaoItens : null,
            veioDoComaEm: saiuDoComaAtivo ? Date.now() : null,
            iniciadoEm: Date.now()
        });
        const limpezaFlags = {};
        if (saiuDoComaAtivo) limpezaFlags.saiuDoComaPendente = false;
        if (fatoresRecuperacaoItens && Object.keys(fatoresRecuperacaoItens).length) limpezaFlags.fatoresRecuperacaoItens = null;
        if (Object.keys(limpezaFlags).length) {
            await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), limpezaFlags);
        }

    } else if (tipo === "confirmar_coma") {
        // Confirmação do Mestre pra ENTRAR em coma (item 6 do plano de
        // saúde/complicações) — disparado pelo gatilho automático de PV
        // < 1/10 do total (aplicarDano acima) ou pela complicação da
        // Cirurgia de Campo (item 8, ver saude.js). A SAÍDA é sempre
        // manual (reverterComaGodmode abaixo, chamada só pelo Mestre em
        // Godmode).
        await set(ref(db, caminhoMesa(`fichas/${fichaId}/dados/coma`)), {
            ativo: true,
            entrouEm: Date.now()
        });

    } else if (tipo === "confirmar_desmaio") {
        // Confirmação do Mestre pro Desmaio Genérico (item 4 do plano
        // de saúde/complicações) — só um badge/aviso visual na ficha
        // (ver renderizarDesmaioBadge em ficha.js), sem travar nenhuma
        // ação automaticamente. "Acordar" é sempre manual, resolvido
        // pela mesa (botão do Mestre — ver acordarDesmaioGodmode
        // abaixo), nunca um teste rolado pelo sistema.
        await update(ref(db, caminhoMesa(`fichas/${fichaId}/dados`)), { desmaiado: true });

    } else if (tipo === "confirmar_amputacao") {
        // Confirmação do Mestre pra Amputação por Limiar de Dano (item
        // 5 do plano de saúde/complicações) — sempre registra no Log de
        // Dados que a amputação foi validada pela mesa (texto livre,
        // qual membro/penalidade exata continua sendo decisão narrativa
        // fora do sistema).
        // Fase 6 (plano-silhueta-saude.txt): quando o golpe que bateu o
        // limiar veio de um Golpe Mirado de verdade, payload.local traz
        // o mesmo local sorteado (Fase 1) pra ferida daquele golpe — a
        // ferida MAIS RECENTE registrada nesse local (fichas/{id}/feridas)
        // é, por construção, a que este mesmo golpe acabou de criar
        // (Corte/Perfuração ou Sangramento+Corte vinculados sempre
        // gravam a ferida "física" por último — ver registrarFeridasDeSangramento
        // em mestre.js), então marcá-la com `amputado:true` é o que faz
        // a silhueta (Fase 4) trocar o ícone pra ✂️. Sem local no
        // payload (dano genérico — queda, arremesso, explosão etc., que
        // não têm golpe mirado) só o log é gravado, como já era antes
        // desta fase.
        {
            const rotuloLimite = payload.limiteBatido === "membro" ? "membro" : "dedo ou orelha";
            let notaFerida = "";
            if (payload.local) {
                const snapFeridas = await get(ref(db, caminhoMesa(`fichas/${fichaId}/feridas`)));
                if (snapFeridas.exists()) {
                    const feridasDoLocal = Object.entries(snapFeridas.val())
                        .filter(([, f]) => f && f.local === payload.local)
                        .sort(([, a], [, b]) => (b.criadaEm || 0) - (a.criadaEm || 0));
                    if (feridasDoLocal.length) {
                        const [feridaIdMaisRecente] = feridasDoLocal[0];
                        await update(ref(db, caminhoMesa(`fichas/${fichaId}/feridas/${feridaIdMaisRecente}`)), { amputado: true });
                        notaFerida = " Ferida marcada como amputada na silhueta.";
                    }
                }
            }
            await registrarRolagem({
                quem: "Mestre",
                modificador: 0,
                resultado: "Amputação validada",
                detalhe: `Amputação (${rotuloLimite}) validada pelo Mestre — ${Number(payload.dano) || 0} de dano num golpe só.${notaFerida}`
            });
        }

    } else if (tipo === "guardar_acao_combate") {
        // Confirma o pedido criado em avancarTurnoCombate: converte as
        // ações do turno que sobraram em "ações guardadas"
        // (acoesGuardadas), somando ao que já estiver guardado (dá pra
        // acumular de rodada em rodada se o Mestre for aprovando).
        // Zera `acoes` porque elas já viraram guardadas — sem isso o
        // contador normal do turno passado ficaria contando pra sempre
        // além do que a rodada atual permite.
        const participanteId = payload.participanteId;
        const quantidade = Number(payload.quantidade) || 0;
        if (participanteId && quantidade > 0) {
            const caminhoGuardadas = ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoesGuardadas`));
            const snapGuardadas = await get(caminhoGuardadas);
            const guardadasAtual = snapGuardadas.exists() ? Number(snapGuardadas.val()) : 0;
            await set(caminhoGuardadas, guardadasAtual + quantidade);
            await set(ref(db, caminhoMesa(`combateAtivo/participantes/${participanteId}/acoes`)), 0);
        }

    } else if (tipo === "solicitar_item") {
        // "Solicitar item" (ver botão na aba Inventário, abas/inventario.js):
        // o jogador escolhe um item já cadastrado no Banco Global (ou que
        // ele mesmo acabou de cadastrar lá, pra poder pedir) e o Mestre só
        // aprova/rejeita — quem cria de fato o registro no inventário da
        // ficha é aqui, na confirmação. Revalida que o item ainda existe no
        // banco (pode ter sido excluído da Biblioteca enquanto o pedido
        // esperava aprovação) antes de copiar o molde.
        const itemBanco = await buscarItemBancoPorId(payload.itemGlobalId);
        if (!itemBanco) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error(`Pedido cancelado: "${payload.itemNome || "item"}" não existe mais no Banco Global.`);
        }
        const categoriaDestino = payload.categoriaDestino || "levando";
        const itemPronto = autopreencherItemDoBanco(itemBanco, categoriaDestino);
        // Mesma trava de "item não fica solto" usada em dar_item/mover_item/
        // pegar_item_cenario acima: só entra em jogo quando o destino é
        // "levando" — o item nasce sem dentroDe/mão nenhuma, então sempre
        // passa por resolverEntradaLevandoConsigo igual um item novo
        // entrando em "levando" pela primeira vez.
        if (categoriaDestino === "levando") {
            const snapInventarioSolicitar = await get(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
            const fichaParaChecagemSolicitar = { inventario: snapInventarioSolicitar.exists() ? snapInventarioSolicitar.val() : {} };
            const resultadoEntradaSolicitar = resolverEntradaLevandoConsigo(fichaParaChecagemSolicitar, itemPronto, null);
            if (!resultadoEntradaSolicitar.ok) {
                await rejeitarAcaoPendente(acao.id);
                throw new Error(`Pedido cancelado: "${itemPronto.nome || "item"}" não pôde ser entregue — ${resultadoEntradaSolicitar.motivo}`);
            }
            itemPronto.equipada = resultadoEntradaSolicitar.equipar;
        }
        const novoItemRefSolicitado = push(ref(db, caminhoMesa(`fichas/${fichaId}/inventario`)));
        await set(novoItemRefSolicitado, itemPronto);

    } else if (tipo === "solicitar_dinheiro") {
        // "Solicitar dinheiro" (ver botão na aba Finanças, abas/financas.js):
        // o jogador já escolhe, no momento do pedido, pra qual dos PRÓPRIOS
        // saldos o valor deve cair — o Mestre só aprova ou não o valor
        // pedido (diferente de pegar_dinheiro_cenario/depositar_dinheiro_item
        // acima, onde a origem é ambígua e por isso o Mestre escolhe o
        // destino na hora de confirmar).
        const valorSolicitado = Number(payload.valor) || 0;
        if (valorSolicitado <= 0) {
            await rejeitarAcaoPendente(acao.id);
            throw new Error("Pedido cancelado: valor inválido.");
        }
        await creditarSaldoFicha(fichaId, payload.saldoId, valorSolicitado);
    }

    await remove(ref(db, caminhoMesa(`acoesPendentes/${acao.id}`)));
}
