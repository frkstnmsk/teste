// =====================================================================
// CHUVA DE NEON — Treinamento / Estudo
// =====================================================================
// O jogador escolhe simultaneamente: 1 perícia física, 1 perícia mental,
// 1 atributo físico e 1 atributo mental pra treinar. Cada característica
// tem seu próprio contador de progresso em dias. O Mestre avança esse
// progresso manualmente (com confirmação, via popup) ao clicar "Passar
// o Dia" (1 dia) ou "Timeskip" (N dias) no calendário.
//
// FILA DE TREINAMENTO/ESTUDO: além da característica ATIVA de cada tipo
// (periciaFisica/periciaMental/atributoFisico/atributoMental), o jogador
// pode enfileirar mais características do mesmo tipo (fila*, um array de
// nomes). Antes, um Timeskip grande só confirmava +1 dia no treino ativo
// e jogava fora o resto — ex.: perícia nível 1 leva 8 dias, mas um
// Timeskip de 30 dias perdia os outros 22. Agora avancarDiasTreinamento
// consome os N dias inteiros do Timeskip de uma vez e, quando um treino
// termina antes de acabar o período, os dias que sobram cascateiam pro
// próximo item da fila daquele tipo (puxarProximoDaFila), podendo
// inclusive concluir vários treinos em sequência num único Timeskip.

import {
    ATRIBUTOS_FISICOS_TREINO, ATRIBUTOS_MENTAIS_TREINO,
    tempoTreinoAtributo, tempoTreinoPericia
} from "./regras.js";
import { listaPericiasPorCategoria, atendeRequisitoPericia } from "./dados-manual.js";
import { ATRIBUTOS_PRIMARIOS, limiteTreinoAtributo } from "./regras.js";

const TIPOS = ["periciaFisica", "periciaMental", "atributoFisico", "atributoMental"];
const TIPOS_FISICOS = ["periciaFisica", "atributoFisico"];

export function estadoInicialTreinamento() {
    return {
        ativo: false,
        periciaFisica: null, periciaMental: null, atributoFisico: null, atributoMental: null,
        filaPericiaFisica: [], filaPericiaMental: [], filaAtributoFisico: [], filaAtributoMental: []
    };
}

function chaveFila(tipo) {
    return "fila" + tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

// Lista (read-only) da fila de espera de um tipo — usada pela UI pra
// exibir "o que vem a seguir" embaixo do treino ativo.
export function filaTreino(fichaAtual, tipo) {
    return (fichaAtual.treinamento && fichaAtual.treinamento[chaveFila(tipo)]) || [];
}

// Repouso = recuperação de PV em andamento (fichas/{id}/dados/
// recuperacaoPV.ativa — ver renderizarRecuperacaoPV em ficha.js). O
// corpo machucado, de repouso, não treina força/reflexo/perícia física
// nesse período — só perícia e atributo MENTAIS continuam progredindo.
export function estaDeRepouso(fichaAtual) {
    return !!(fichaAtual.dados && fichaAtual.dados.recuperacaoPV && fichaAtual.dados.recuperacaoPV.ativa);
}

export function labelAtributo(key) {
    const a = ATRIBUTOS_PRIMARIOS.find(a => a.key === key);
    return a ? a.label : key;
}

export function opcoesAtributoFisico() {
    return ATRIBUTOS_PRIMARIOS.filter(a => ATRIBUTOS_FISICOS_TREINO.includes(a.key));
}

export function opcoesAtributoMental() {
    return ATRIBUTOS_PRIMARIOS.filter(a => ATRIBUTOS_MENTAIS_TREINO.includes(a.key));
}

export function opcoesPericiaFisica() {
    return listaPericiasPorCategoria("fisica");
}

// Perícias mentais e sociais contam pra "perícia mental" de treino? O
// manual só fala em "perícias mentais" — usamos a categoria Mental.
export function opcoesPericiaMental() {
    return listaPericiasPorCategoria("mental");
}

// Inicia de fato o treino de uma característica (o slot ATIVO daquele
// tipo precisa estar livre), calculando o total de dias necessário a
// partir do NOVO nível (nível atual + 1). Retorna false (e não inicia
// nada) se a característica já está no limite máximo, ou se falta
// requisito de acesso pra uma perícia nova.
function iniciarTreinoDireto(fichaAtual, tipo, chave) {
    const treino = fichaAtual.treinamento;
    if (tipo === "periciaFisica" || tipo === "periciaMental") {
        const pericia = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === chave);
        const nivelAtual = pericia ? pericia[1].nivel : 0;
        if (nivelAtual >= 5) return false;
        // Requisito de acesso (ex.: Força Bruta — manual pg. 22): não deixa
        // nem começar a treinar uma perícia nova que o personagem ainda
        // não tem direito de adquirir.
        if (nivelAtual === 0) {
            const requisito = atendeRequisitoPericia(chave, fichaAtual.dados, fichaAtual.pericias);
            if (!requisito.ok) return false;
        }
        const novoNivel = nivelAtual + 1;
        treino[tipo] = { nome: chave, nivelAtual, novoNivel, progressoDias: 0, totalDias: tempoTreinoPericia(novoNivel) };
    } else if (tipo === "atributoFisico" || tipo === "atributoMental") {
        const nivelAtual = Number(fichaAtual.dados[chave]) || 0;
        const limite = limiteTreinoAtributo(fichaAtual, chave);
        if (nivelAtual >= limite) return false;
        const novoNivel = nivelAtual + 1;
        treino[tipo] = { nome: chave, nivelAtual, novoNivel, progressoDias: 0, totalDias: tempoTreinoAtributo(novoNivel) };
    } else {
        return false;
    }
    return true;
}

const TAMANHO_MAX_FILA = 10;

// Inicia o treino de uma característica — se o slot ATIVO desse tipo já
// estiver ocupado, entra na fila de espera em vez de substituir o treino
// em andamento (é assim que se monta uma "fileira de treinamento e
// estudo" pra não desperdiçar dias em Timeskips grandes). Retorna false
// se não deu pra iniciar nem enfileirar (limite máximo, requisito não
// cumprido, ou fila cheia).
export function iniciarTreinoCaracteristica(fichaAtual, tipo, chave) {
    // Repouso: corpo machucado não treina físico. Bloqueia tanto iniciar
    // quanto enfileirar perícia física/atributo físico — só libera de
    // novo quando a recuperação de PV terminar.
    if (TIPOS_FISICOS.includes(tipo) && estaDeRepouso(fichaAtual)) return false;

    const treino = fichaAtual.treinamento;
    let ok;
    if (!treino[tipo]) {
        ok = iniciarTreinoDireto(fichaAtual, tipo, chave);
    } else {
        const chaveF = chaveFila(tipo);
        const fila = treino[chaveF] || [];
        if (fila.length >= TAMANHO_MAX_FILA) { ok = false; }
        else {
            fila.push(chave);
            treino[chaveF] = fila;
            ok = true;
        }
    }
    treino.ativo = temAlgumTreinoAtivo(treino);
    return ok;
}

// Remove um item específico da fila de espera (pelo índice) — não mexe
// no treino ativo.
export function removerDaFilaTreino(fichaAtual, tipo, indice) {
    const treino = fichaAtual.treinamento;
    const chaveF = chaveFila(tipo);
    const fila = treino[chaveF] || [];
    if (indice < 0 || indice >= fila.length) return false;
    fila.splice(indice, 1);
    treino[chaveF] = fila;
    treino.ativo = temAlgumTreinoAtivo(treino);
    return true;
}

// Cancela o treino ATIVO de um tipo. Se houver algo na fila de espera
// daquele tipo, o próximo item assume o slot ativo automaticamente (o
// progresso do treino cancelado é perdido, mas a fila continua rodando)
// — exceto se for físico e a ficha estiver de repouso, caso em que o
// slot fica vazio até o repouso acabar (ver estaDeRepouso).
export function cancelarTreinoCaracteristica(fichaAtual, tipo) {
    fichaAtual.treinamento[tipo] = null;
    if (!(TIPOS_FISICOS.includes(tipo) && estaDeRepouso(fichaAtual))) {
        puxarProximoDaFila(fichaAtual, tipo);
    }
    fichaAtual.treinamento.ativo = temAlgumTreinoAtivo(fichaAtual.treinamento);
}

// Puxa o próximo nome da fila de espera pro slot ativo desse tipo,
// pulando (e descartando) qualquer item que não dê mais pra iniciar
// (ex.: já bateu o nível máximo enquanto esperava na fila). Retorna
// true se algum treino ativo foi iniciado, false se a fila esvaziou sem
// conseguir iniciar nada.
function puxarProximoDaFila(fichaAtual, tipo) {
    const treino = fichaAtual.treinamento;
    const chaveF = chaveFila(tipo);
    const fila = treino[chaveF] || [];
    while (fila.length) {
        const proximo = fila.shift();
        if (iniciarTreinoDireto(fichaAtual, tipo, proximo)) {
            treino[chaveF] = fila;
            return true;
        }
        // Não deu pra iniciar (limite atingido ou requisito não cumprido
        // nesse meio-tempo) — descarta e tenta o próximo da fila.
    }
    treino[chaveF] = fila;
    return false;
}

function temAlgumTreinoAtivo(treino) {
    return !!(
        treino.periciaFisica || treino.periciaMental || treino.atributoFisico || treino.atributoMental ||
        (treino.filaPericiaFisica && treino.filaPericiaFisica.length) ||
        (treino.filaPericiaMental && treino.filaPericiaMental.length) ||
        (treino.filaAtributoFisico && treino.filaAtributoFisico.length) ||
        (treino.filaAtributoMental && treino.filaAtributoMental.length)
    );
}

// Chamado pelo Mestre (após confirmar no popup) — avança `dias` dias em
// TODAS as características em treino dessa ficha (1 dia pra "Passar o
// Dia", ou os N dias inteiros do Timeskip de uma vez). Quando um treino
// bate o total de dias, aplica o aumento e — se ainda sobrar dias desse
// período — puxa o próximo item da fila daquele tipo e continua
// consumindo os dias restantes nele, podendo concluir vários treinos em
// sequência num Timeskip grande em vez de perder os dias excedentes.
//
// Repouso (estaDeRepouso): perícia física e atributo físico ficam
// PAUSADOS (nem o ativo avança, nem a fila é consumida) enquanto a
// recuperação de PV estiver em andamento — o progresso já feito não se
// perde, só não anda mais até o repouso terminar. Perícia e atributo
// mentais continuam normalmente.
export function avancarDiasTreinamento(fichaAtual, dias) {
    const treino = fichaAtual.treinamento;
    const concluidos = [];
    const repouso = estaDeRepouso(fichaAtual);

    for (const tipo of TIPOS) {
        if (repouso && TIPOS_FISICOS.includes(tipo)) continue; // pausado durante o repouso
        let diasRestantes = Math.max(0, Math.trunc(dias) || 0);
        while (diasRestantes > 0) {
            if (!treino[tipo]) {
                if (!puxarProximoDaFila(fichaAtual, tipo)) break; // nada ativo nem na fila pra esse tipo
                continue;
            }
            const t = treino[tipo];
            const faltam = t.totalDias - t.progressoDias;
            const usados = Math.min(faltam, diasRestantes);
            t.progressoDias += usados;
            diasRestantes -= usados;
            if (t.progressoDias >= t.totalDias) {
                aplicarAumentoCaracteristica(fichaAtual, tipo, t);
                concluidos.push({ tipo, nome: t.nome, novoNivel: t.novoNivel });
                treino[tipo] = null;
            }
        }
    }
    treino.ativo = temAlgumTreinoAtivo(treino);
    return concluidos;
}

function gerarIdLocalTreino() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function aplicarAumentoCaracteristica(fichaAtual, tipo, t) {
    if (tipo === "periciaFisica" || tipo === "periciaMental") {
        const entrada = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === t.nome);
        if (entrada) {
            const [, pericia] = entrada;
            pericia.nivel = Math.min(5, t.novoNivel); // respeita limite geral 0-5
        } else {
            // BUG (corrigido): perícia NOVA (treino começou do nível 0,
            // ver iniciarTreinoCaracteristica) nunca existiu em
            // fichaAtual.pericias — só existe entrada pra perícias que
            // o personagem já possuía. Sem este else, o treino concluía
            // (mensagem "Treinamento concluído" aparecia normalmente),
            // mas a perícia simplesmente não era adicionada à ficha.
            // Mesmo formato/id usado ao adicionar perícia manualmente
            // (ver criacao.js e o "+" da tela de criação em ficha.js).
            const id = gerarIdLocalTreino();
            fichaAtual.pericias[id] = {
                nome: t.nome,
                nivel: Math.min(5, t.novoNivel),
                descricao: "",
                modificadores: [],
                especializacoes: [],
                legado: false
            };
        }
    } else {
        const atual = Number(fichaAtual.dados[t.nome]) || 0;
        const limite = limiteTreinoAtributo(fichaAtual, t.nome);
        fichaAtual.dados[t.nome] = Math.max(atual, Math.min(limite, t.novoNivel)); // respeita limite humano (7, ou 8 com Esteroide — ver limiteTreinoAtributo)
    }
}
