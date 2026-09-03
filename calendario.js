// =====================================================================
// CHUVA DE NEON — Calendário e Log de Dados (estado global da mesa)
// =====================================================================
// Diferente da ficha (que é por jogador), o calendário e o log de dados
// vivem na raiz do banco (`calendario`, `logDados`), compartilhados por
// todos que estão olhando a tela — Mestre e jogadores.

import { db } from "./firebase-config.js";
import { ref, set, get, update, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const CLIMAS = ["Limpo", "Nublado", "Chuva ácida", "Garoa de neon", "Smog", "Tempestade elétrica", "Calor sufocante"];

export function diasSemana() { return DIAS_SEMANA; }
export function climas() { return CLIMAS; }

export async function garantirCalendarioInicial(isMestre) {
    try {
        const snap = await get(ref(db, caminhoMesa("calendario")));
        if (!snap.exists() && isMestre) {
            // Data de partida fixa da campanha: Sexta-feira, 29/10/2077.
            await set(ref(db, caminhoMesa("calendario")), {
                dataLabel: "29/10/2077",
                diaSemana: "Sexta",
                hora: "08:00",
                temperatura: 24,
                clima: CLIMAS[0],
                diaIndice: 0
            });
        }
    } catch (e) {
        // Jogadores podem não ter permissão de leitura do calendário ainda
        // (se as regras do banco não cobrirem esse nó). Falha silenciosa é ok.
        console.warn("Calendário: sem permissão ou nó inexistente.", e.message);
    }
}

export function ouvirCalendario(callback) {
    return onValue(ref(db, caminhoMesa("calendario")), (snap) => {
        callback(snap.exists() ? snap.val() : null);
    });
}

export async function salvarCalendario(novoCalendario) {
    await set(ref(db, caminhoMesa("calendario")), novoCalendario);
}

// Avança 1 dia. Retorna { calendario, viroudomingo }.
export async function passarUmDia(calendarioAtual) {
    const { calendario, domingos } = calcularAvancoDias(calendarioAtual, 1);
    await salvarCalendario(calendario);
    return { calendario, virouDomingo: domingos > 0 };
}

// Calcula (sem salvar no banco) o resultado de avançar N dias a partir
// de um estado de calendário. Usado tanto pelo Timeskip (que precisa
// pré-visualizar o resultado antes do Mestre confirmar) quanto por
// passarUmDia/avancarNDias, que só chamam isso com quantidade=1 ou N e
// gravam o resultado final numa única escrita.
export function calcularAvancoDias(calendarioAtual, quantidade) {
    let cal = { ...calendarioAtual };
    let domingos = 0;
    const n = Math.max(0, Math.trunc(quantidade) || 0);
    for (let i = 0; i < n; i++) {
        const idxAtual = DIAS_SEMANA.indexOf(cal.diaSemana);
        const novoIdx = (idxAtual + 1) % 7;
        cal = {
            ...cal,
            diaSemana: DIAS_SEMANA[novoIdx],
            diaIndice: (cal.diaIndice || 0) + 1,
            dataLabel: avancarDataLabel(cal.dataLabel)
        };
        if (novoIdx === 0) domingos++;
    }
    return { calendario: cal, domingos };
}

// Timeskip do Mestre: avança N dias de uma vez só (uma única escrita no
// banco no final, em vez de N escritas de passarUmDia em sequência).
// Retorna quantos Domingos foram atravessados nesse intervalo, pra quem
// chamar (mestre.js) disparar um aviso de custo de vida pra cada um.
export async function avancarNDias(calendarioAtual, quantidade) {
    const { calendario, domingos } = calcularAvancoDias(calendarioAtual, quantidade);
    await salvarCalendario(calendario);
    return { calendario, domingos };
}

// Avança 1 dia numa data no formato "DD/MM/AAAA", lidando com virada de
// mês e de ano (considerando anos bissextos). Se o formato vier
// inesperado/vazio, devolve a string original sem quebrar o calendário.
function avancarDataLabel(dataLabel) {
    if (!dataLabel || typeof dataLabel !== "string") return dataLabel;
    const partes = dataLabel.split("/");
    if (partes.length !== 3) return dataLabel;

    let [dia, mes, ano] = partes.map(n => parseInt(n, 10));
    if (Number.isNaN(dia) || Number.isNaN(mes) || Number.isNaN(ano)) return dataLabel;

    const diasNoMes = new Date(ano, mes, 0).getDate(); // dia 0 do próximo mês = último dia deste mês
    dia += 1;
    if (dia > diasNoMes) {
        dia = 1;
        mes += 1;
        if (mes > 12) {
            mes = 1;
            ano += 1;
        }
    }

    const pad = n => String(n).padStart(2, "0");
    return `${pad(dia)}/${pad(mes)}/${ano}`;
}

// ---------------------------------------------------------------------
// Log de dados — visível por todos, fixo no canto inferior direito.
// Guardamos só as últimas N entradas pra não inchar o banco.
// ---------------------------------------------------------------------
const LIMITE_LOG = 30;

// `critico`: "acerto" | "falha" | null — sinalização visual de Acerto
// Crítico (d20 natural 20 ou resultado final >= 20) ou Falha Crítica
// (d20 natural 1, "Fogo Amigo/Desastre") pro Log de Dados destacar a
// rolagem, ver formatarDetalheRolagemAtaque/resolverAtaque em ficha.js.
export async function registrarRolagem({ quem, modificador, resultado, detalhe, critico }) {
    await push(ref(db, caminhoMesa("logDados")), {
        quem, modificador: modificador ?? 0, resultado, detalhe: detalhe || "", critico: critico || null, timestamp: Date.now()
    });
}

export function ouvirLogDados(callback) {
    const q = query(ref(db, caminhoMesa("logDados")), limitToLast(LIMITE_LOG));
    return onValue(q, (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        const lista = Object.entries(valores)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.timestamp - a.timestamp);
        callback(lista);
    });
}

// ---------------------------------------------------------------------
// Aviso de custo de vida — disparado quando o dia avança pra Domingo.
// É uma FILA de pendentes (um por Domingo atravessado), não mais uma
// flag única: um Timeskip do Mestre pode atravessar vários Domingos de
// uma vez (ex.: 15 dias = 2 Domingos), e cada um deles deve gerar um
// pagamento separado por ficha — "aparece uma vez o pagar gastos e após
// pagar, aparece novamente" — em vez de um único aviso que, pago uma
// vez, quitaria os dois Domingos de graça.
//
// Cada pendente vira uma chave única (`d<timestamp>_<indice>`) sob
// `avisoCustoVida/pendentes`, visível pra todos na mesa. Quem controla
// se UMA ficha específica já pagou UM pendente específico é a própria
// ficha, em `fichas/{id}/dados/custoVidaPagos/{pendenteId}` (ver
// pagarCustoSemanal em mestre.js) — assim cada jogador tem sua própria
// fila de pagamentos pendentes, mesmo que todos vejam os mesmos avisos.
export async function dispararAvisoCustoVida(quantidade = 1) {
    const n = Math.max(1, Math.trunc(quantidade) || 1);
    const base = Date.now();
    const atualizacoes = {};
    for (let i = 0; i < n; i++) {
        atualizacoes[`d${base}_${i}`] = base + i;
    }
    await update(ref(db, caminhoMesa("avisoCustoVida/pendentes")), atualizacoes);
}

// Retorna um objeto { [pendenteId]: timestampDoDomingo }, ou {} se não
// houver nenhum pendente disparado ainda.
export function ouvirAvisoCustoVida(callback) {
    return onValue(ref(db, caminhoMesa("avisoCustoVida/pendentes")), (snap) => {
        callback(snap.exists() ? snap.val() : {});
    });
}
