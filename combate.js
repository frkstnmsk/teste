// ============================================================
// combate.js — Gerenciador de Combate | Chuva de Neon
// ============================================================
// Depende de:
//   - firebase-config.js  -> exporta { db } (Realtime Database)
//   - utils/sync existentes -> pausarSync(), retornarSync()
//   - sistema de feedback   -> toast(mensagem, tipo)
//   - dados-manual.js       -> (opcional) rolarDado(), se já existir
//
// // ADAPTAR: ajuste os caminhos de import abaixo para bater
// // exatamente com o que já existe no seu projeto.
// ============================================================

import { db } from './firebase-config.js';
import {
  ref,
  get,
  update,
  onValue,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js';

// // ADAPTAR: troque pelos imports reais do seu projeto, se os
// // nomes/caminhos forem diferentes destes:
import { pausarSync, retornarSync, toast } from './ficha.js';

const CAMINHO_COMBATE = 'combates/ativo';

// ------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------

function rolarD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function calcularAcoesMax(velocidadeTotal) {
  const v = Math.max(velocidadeTotal, 0); // modificadores negativos não geram ações extras
  return 1 + Math.floor(v / 5);
}

async function lerFicha(idFicha) {
  const snap = await get(ref(db, `fichas/${idFicha}`));
  return snap.exists() ? snap.val() : null;
}

function ordenarPorIniciativa(participantes) {
  // Maior resultado age primeiro; empate = maior modificador de Agilidade decide;
  // empate total = mantém ordem (regra de re-rolagem manual fica a cargo do Mestre).
  return Object.entries(participantes)
    .sort(([, a], [, b]) => {
      if (b.iniciativa !== a.iniciativa) return b.iniciativa - a.iniciativa;
      return (b.modAgilidade ?? 0) - (a.modAgilidade ?? 0);
    })
    .map(([id]) => id);
}

// ============================================================
// FUNÇÕES DO MESTRE
// ============================================================

/**
 * Inicia o combate: rola Agilidade (1d20 + Agilidade) para todos os
 * personagens informados, calcula ações por turno e grava o estado
 * inicial no Firebase.
 * @param {string[]} idsFichas - IDs das fichas na fila de combate.
 */
export async function iniciarCombate(idsFichas) {
  if (!idsFichas || idsFichas.length === 0) {
    toast('Adicione ao menos um personagem à fila de combate.', 'erro');
    return;
  }

  pausarSync(); // evita corrida de dados enquanto montamos o estado
  try {
    const participantes = {};

    for (const id of idsFichas) {
      const ficha = await lerFicha(id);
      if (!ficha) continue;

      const agilidade = ficha.atributos?.agilidade ?? 0;
      const velocidadeTotal = ficha.atributos?.velocidade ?? 0;
      const rolagem = rolarD20();
      const iniciativa = rolagem + agilidade;

      participantes[id] = {
        nome: ficha.nome ?? 'Sem nome',
        iniciativa,
        modAgilidade: agilidade,
        rolagemBruta: rolagem,
        pv: ficha.pv?.atual ?? ficha.pvAtual ?? 0,
        pvMax: ficha.pv?.max ?? ficha.pvMax ?? 0,
        velocidade: velocidadeTotal,
        acoesMax: calcularAcoesMax(velocidadeTotal),
        acoes: calcularAcoesMax(velocidadeTotal)
      };
    }

    const ordemTurnos = ordenarPorIniciativa(participantes);

    if (ordemTurnos.length === 0) {
      toast('Nenhuma ficha válida encontrada para iniciar o combate.', 'erro');
      return;
    }

    await update(ref(db, CAMINHO_COMBATE), {
      ativo: true,
      rodada: 1,
      ordemTurnos,
      turnoAtual: ordemTurnos[0],
      participantes
    });

    toast('Combate iniciado! Iniciativa rolada para todos.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao iniciar combate:', erro);
    toast('Falha ao iniciar o combate. Veja o console.', 'erro');
  } finally {
    retornarSync();
  }
}

/**
 * Avança para o próximo personagem na ordem de iniciativa.
 * Ao completar a volta na ordem, inicia uma nova rodada e
 * restaura as ações de todos os participantes.
 */
export async function avancarTurno() {
  pausarSync();
  try {
    const snap = await get(ref(db, CAMINHO_COMBATE));
    const estado = snap.val();

    if (!estado?.ativo || !estado.ordemTurnos?.length) {
      toast('Não há combate ativo para avançar.', 'erro');
      return;
    }

    const { ordemTurnos, turnoAtual, participantes, rodada } = estado;
    const indiceAtual = ordemTurnos.indexOf(turnoAtual);
    const proximoIndice = (indiceAtual + 1) % ordemTurnos.length;
    const novoTurno = ordemTurnos[proximoIndice];

    const atualizacoes = { turnoAtual: novoTurno };

    // Voltou ao início da ordem = nova rodada: restaura ações de todos.
    if (proximoIndice === 0) {
      atualizacoes.rodada = (rodada ?? 1) + 1;
      for (const id of ordemTurnos) {
        if (participantes[id]) {
          atualizacoes[`participantes/${id}/acoes`] = participantes[id].acoesMax;
        }
      }
    }

    await update(ref(db, CAMINHO_COMBATE), atualizacoes);

    const nomeProximo = participantes[novoTurno]?.nome ?? novoTurno;
    toast(`Turno de ${nomeProximo}.`, 'info');
  } catch (erro) {
    console.error('Erro ao avançar turno:', erro);
    toast('Falha ao avançar o turno. Veja o console.', 'erro');
  } finally {
    retornarSync();
  }
}

/**
 * Encerra o combate e limpa o estado no Firebase.
 */
export async function encerrarCombate() {
  pausarSync();
  try {
    await update(ref(db, CAMINHO_COMBATE), {
      ativo: false,
      rodada: 0,
      ordemTurnos: [],
      turnoAtual: null,
      participantes: {}
    });
    toast('Combate encerrado.', 'sucesso');
  } catch (erro) {
    console.error('Erro ao encerrar combate:', erro);
    toast('Falha ao encerrar o combate. Veja o console.', 'erro');
  } finally {
    retornarSync();
  }
}

/**
 * Consome 1 ação do personagem informado (chamar isso de dentro da
 * função de rolagem existente na ficha, quando em combate).
 * Usa transaction para evitar corrida se dois cliques acontecerem quase juntos.
 */
export async function consumirAcao(idFicha) {
  const caminhoAcoes = ref(db, `${CAMINHO_COMBATE}/participantes/${idFicha}/acoes`);
  const resultado = await runTransaction(caminhoAcoes, (acoesAtuais) => {
    if (acoesAtuais === null) return acoesAtuais;
    return Math.max(0, acoesAtuais - 1);
  });
  return resultado.snapshot.val();
}

// ============================================================
// FUNÇÕES DOS JOGADORES
// ============================================================

let _handlerCombateAtivo = null;

/**
 * Começa a escutar o estado do combate e mantém a UI do jogador
 * sincronizada (alerta no topo + trava de ações fora do turno).
 * @param {string} meuFichaId - ID da ficha do jogador conectado.
 */
export function ouvirCombateAtivo(meuFichaId) {
  const caminho = ref(db, CAMINHO_COMBATE);

  _handlerCombateAtivo = onValue(caminho, (snap) => {
    const dados = snap.val();
    renderizarAlertaCombate(dados, meuFichaId);
    travarAcoesForaDoTurno(dados, meuFichaId);
    atualizarPainelSeAberto(dados, meuFichaId);
  });
}

/**
 * Mostra/esconde a caixa fixa "VOCÊ ESTÁ EM COMBATE!" no topo da tela.
 */
export function renderizarAlertaCombate(dados, meuFichaId) {
  let alerta = document.getElementById('alerta-combate');
  const estouNoCombate = dados?.ativo && dados.participantes?.[meuFichaId];

  if (!estouNoCombate) {
    if (alerta) alerta.remove();
    return;
  }

  if (!alerta) {
    alerta = document.createElement('button');
    alerta.id = 'alerta-combate';
    alerta.type = 'button';
    alerta.className = 'btn-red combate-alerta-fixo';
    alerta.textContent = 'VOCÊ ESTÁ EM COMBATE!';
    alerta.addEventListener('click', () => abrirPainelCombateJogador(meuFichaId));
    document.body.appendChild(alerta);
  }

  // realce visual de "é seu turno agora"
  const meuTurno = dados.turnoAtual === meuFichaId;
  alerta.classList.toggle('combate-meu-turno', meuTurno);
  alerta.textContent = meuTurno
    ? 'SEU TURNO AGORA!'
    : 'VOCÊ ESTÁ EM COMBATE!';
}

/**
 * Bloqueia rolagens/ações da ficha quando não é o turno do jogador.
 * // ADAPTAR: troque o seletor '.ficha-acoes' pelo container real
 * // que envolve os botões de rolagem/ação na sua ficha.html.
 */
export function travarAcoesForaDoTurno(dados, meuFichaId) {
  const emCombate = !!dados?.ativo;
  const meuTurno = dados?.turnoAtual === meuFichaId;
  const bloquear = emCombate && !meuTurno;

  document.body.classList.toggle('combate-bloqueio-ativo', bloquear);

  // // ADAPTAR: ajuste este seletor para os botões reais de rolagem/ação.
  const botoesAcao = document.querySelectorAll(
    '.ficha-acoes button, .btn-rolagem, [data-rolagem], [data-acao]'
  );

  botoesAcao.forEach((btn) => {
    if (btn.id === 'alerta-combate') return; // nunca trava o próprio alerta
    btn.disabled = bloquear;
    btn.classList.toggle('combate-desabilitado', bloquear);
  });
}

// ------------------------------------------------------------
// Painel do Jogador (modal com a ordem de iniciativa)
// ------------------------------------------------------------

let _painelAberto = false;

function abrirPainelCombateJogador(meuFichaId) {
  _painelAberto = true;
  get(ref(db, CAMINHO_COMBATE)).then((snap) => {
    montarPainelCombateJogador(snap.val(), meuFichaId);
  });
}

function atualizarPainelSeAberto(dados, meuFichaId) {
  if (_painelAberto) montarPainelCombateJogador(dados, meuFichaId);
}

function montarPainelCombateJogador(dados, meuFichaId) {
  let modal = document.getElementById('modal-combate-jogador');

  if (!dados?.ativo) {
    if (modal) modal.remove();
    _painelAberto = false;
    return;
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-combate-jogador';
    modal.className = 'panel combate-painel-jogador';
    document.body.appendChild(modal);
  }

  const { ordemTurnos = [], participantes = {}, turnoAtual, rodada } = dados;

  const linhas = ordemTurnos
    .map((id) => {
      const p = participantes[id];
      if (!p) return '';
      const ativo = id === turnoAtual;
      const voceMarcador = id === meuFichaId ? ' (você)' : '';
      return `
        <div class="combate-linha ${ativo ? 'combate-linha-ativa' : ''}">
          <span class="combate-nome">${p.nome}${voceMarcador}</span>
          <span class="combate-iniciativa">Iniciativa ${p.iniciativa}</span>
          <span class="combate-pv">${p.pv}/${p.pvMax} PV</span>
          <span class="combate-acoes">${p.acoes}/${p.acoesMax} ações</span>
        </div>`;
    })
    .join('');

  modal.innerHTML = `
    <div class="combate-painel-topo">
      <span class="eyebrow">Rodada ${rodada ?? 1}</span>
      <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
    </div>
    <h2>Gerenciador de Combate do Jogador</h2>
    <div class="combate-lista">${linhas}</div>
  `;

  modal.querySelector('.combate-fechar').addEventListener('click', () => {
    modal.remove();
    _painelAberto = false;
  });
}

// ------------------------------------------------------------
// Cleanup (chamar ao trocar de página / logout)
// ------------------------------------------------------------

export function pararEscutaCombate() {
  if (_handlerCombateAtivo) {
    // onValue retorna a própria função de unsubscribe no SDK v9
    _handlerCombateAtivo();
    _handlerCombateAtivo = null;
  }
}
