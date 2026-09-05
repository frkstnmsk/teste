// abas/darknet.js
// ---------------------------------------------------------------------
// Aba Dark Net — grade de sites (Dm, Void, P2K, RabbitHole, P2C,
// Creators, DarkArt, BlackPrint), credenciais por site, avaliações/
// pontuação/status conforme o site, contatos do Dm, itens à venda
// (Creators/BlackPrint/P2C) e o fator de preço de mesa sobre o CN$ do
// sorteio por dificuldade.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 19). O nome histórico da função principal era
// renderizarDarknetENotas (fazia Dark Net + Notas juntos); a parte de
// Notas já tinha saído no Passo 10 (abas/notas.js) — o que sobrou aqui
// é só Dark Net, mas o nome da função foi mantido como estava (só
// chama renderizarNotas() por fora agora) pra não mudar comportamento
// nem precisar tocar no ponto de chamada em ficha.js.
//
// Vieram junto TODOS os helpers privados desta aba (nenhum é chamado de
// fora): montarGradeDarknetSeNecessario, renderizarCredenciaisDarknet,
// renderizarAvaliacoesDarknet, renderizarContatosDm,
// renderizarItensVendaDarknet + as funções de ação que elas ligam
// (criar/adicionar/remover credencial e item, alternar card, rolar,
// atualizar pontuação/status/stats) + as constantes de dados
// (DARKNET_SITES e as listas derivadas por categoria de mecânica) + o
// estado de módulo (darknetGridMontada, darknetSitesAbertos,
// credenciaisDarknetAbertas) + os 4 listeners de input delegados no
// `document` (edição de status/contato/stats/item de venda).
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import { el, toast, idAtivo, agendarSalvamento, gerarIdLocal, rolarERegistrar, nomeDeFicha } from "../ficha.js?v=20260830-npcnivelpv";
import { renderizarDeterminacoes } from "./determinacoes.js";
import { renderizarNotas } from "./notas.js";
import { modificadorDarknet, sortearItemPorResultado } from "../regras.js";
import { registrarRolagem } from "../calendario.js";
import { ouvirFatorPrecoDarknet, definirFatorPrecoDarknet } from "../mestre.js?v=20260830-npcnivelpv";

// Sites da Dark Net previstos no manual — "The Corridor" fica de fora
// de propósito (não representado nesta ficha).
const DARKNET_SITES = [
    { id: "dm", nome: "Dm", placeholder: "www.dm.dn/..." },
    { id: "void", nome: "Void", placeholder: "www.void.dn/..." },
    { id: "p2k", nome: "P2K" },
    { id: "rabbithole", nome: "RabbitHole" },
    { id: "p2c", nome: "P2C" },
    { id: "creators", nome: "Creators" },
    { id: "darkart", nome: "DarkArt" },
    { id: "blackprint", nome: "BlackPrint" }
];
const CAMPOS_DARKNET_NOTAS = DARKNET_SITES.map(s => s.id);
// Sites com fórmula de modificador definida (ver plano-darknet-credenciais.txt,
// Parte 2/regras.js:modificadorDarknet) — decide o que o card de cada
// credencial mostra/edita: P2K usa pontuação numérica; Creators/
// RabbitHole/BlackPrint usam avaliações em estrelas escritas pelo
// Mestre; P2C usa "status" — número lançado só pelo Mestre, que vira o
// bônus da rolagem 1 pra 1. Os demais sites (Dm, Void, DarkArt) não têm
// fórmula — card fica simples, sem badge de modificador nem botão de
// rolar.
const DARKNET_SITES_PONTUACAO = ["p2k"];
const DARKNET_SITES_AVALIACAO = ["creators", "rabbithole", "blackprint"];
// "Status" da credencial em P2C — mesmo espírito de avaliações
// (DARKNET_SITES_AVALIACAO), mas um número solto em vez de lista de
// estrelas, e só o Mestre pode lançar/editar (ver criarCampoStatusDarknet
// — jogador só lê, input fica desabilitado).
const DARKNET_SITES_STATUS = ["p2c"];
// Sites sem fórmula de modificador, mas com corpo expandido próprio
// (plano-darknet-passo9.txt, Parte 2) — Dm mostra contatos salvos, Void
// mostra stats de seguidores/posts/seguindo. Nenhum dos dois tem badge
// de modificador nem botão de rolar, só o corpo expandido.
const DARKNET_SITES_CONTATOS = ["dm"];
const DARKNET_SITES_STATS = ["void"];
// Creators, BlackPrint e P2C usam avaliações/status pro modificador
// (DARKNET_SITES_AVALIACAO/_STATUS acima não mudam) e ganham,
// adicionalmente, cadastro de itens à venda + sorteio por dificuldade.
const DARKNET_SITES_ITENS = ["creators", "blackprint", "p2c"];

// ---------------------------------------------------------------------
// DARK NET / NOTAS
// ---------------------------------------------------------------------
export function renderizarDarknetENotas() {
    montarGradeDarknetSeNecessario();
    CAMPOS_DARKNET_NOTAS.forEach(campo => {
        const input = document.querySelector(`[data-field="${campo}"]`);
        if (input && document.activeElement !== input) input.value = estado.fichaAtual.dados[campo] || "";
    });
    renderizarCredenciaisDarknet();
    renderizarDeterminacoes();
    renderizarNotas();
}

// Monta a grade de caixas da Dark Net uma única vez (uma caixa por site
// do manual, exceto "The Corridor") — o campo de link/acesso de cada
// site segue o mesmo padrão data-field de sempre; a lista de
// credenciais de cada caixa é preenchida/atualizada por
// renderizarCredenciaisDarknet(). Também popula o <select> do botão
// único "Adicionar credenciais" do topo da aba.
let darknetGridMontada = false;
// Sites com a caixa expandida no momento — só jogador/Mestre local, não
// salvo no Firebase (cada um abre o que quiser sem afetar o outro,
// mesmo padrão de credenciaisDarknetAbertas). Array porque a ORDEM
// importa: os abertos ficam empilhados na ordem em que foram abertos,
// sempre acima do grupo dos minimizados — sem limite de quantos podem
// estar abertos ao mesmo tempo.
const darknetSitesAbertos = [];
function montarGradeDarknetSeNecessario() {
    const grid = document.getElementById("darknet-grid");
    if (!grid || darknetGridMontada) return;

    grid.innerHTML = "";

    // Dois "poços" dentro da grade: os sites expandidos (empilhados,
    // ocupam a largura toda, essa área cresce pra baixo e rola com a
    // página) e os minimizados (só o nome, lado a lado, sem ocupar
    // espaço). Mover a caixa de um poço pro outro ao expandir/minimizar
    // preserva o elemento (e os listeners/estado dos campos dentro).
    const abertos = document.createElement("div");
    abertos.className = "darknet-abertos";
    abertos.id = "darknet-abertos";
    grid.appendChild(abertos);

    const minimizados = document.createElement("div");
    minimizados.className = "darknet-minimizados";
    minimizados.id = "darknet-minimizados";
    grid.appendChild(minimizados);

    DARKNET_SITES.forEach(site => {
        const box = document.createElement("div");
        box.className = "darknet-site darknet-site--minimizado";
        box.dataset.site = site.id;

        const header = document.createElement("button");
        header.type = "button";
        header.className = "darknet-site-header";
        header.textContent = site.nome;
        header.addEventListener("click", () => alternarSiteDarknet(site.id));
        box.appendChild(header);

        const listaLabel = document.createElement("div");
        listaLabel.className = "hint-inline";
        listaLabel.textContent = "Credenciais";
        box.appendChild(listaLabel);

        const lista = document.createElement("div");
        lista.className = "darknet-credenciais-lista";
        lista.dataset.siteCredenciais = site.id;
        box.appendChild(lista);

        const campo = document.createElement("div");
        campo.className = "campo";
        const label = document.createElement("label");
        label.setAttribute("for", `f-${site.id}`);
        label.textContent = "Link / acesso";
        const input = document.createElement("input");
        input.type = "text";
        input.id = `f-${site.id}`;
        input.dataset.field = site.id;
        if (site.placeholder) input.placeholder = site.placeholder;
        campo.appendChild(label);
        campo.appendChild(input);
        box.appendChild(campo);

        minimizados.appendChild(box);
    });
    darknetGridMontada = true;

    const select = document.getElementById("darknet-credencial-site-select");
    if (select) {
        select.innerHTML = DARKNET_SITES.map(s => `<option value="${s.id}">${s.nome}</option>`).join("");
    }
}

// Expande/minimiza a caixa de um site — sem limite de quantos podem
// ficar abertos; os abertos ficam sempre empilhados acima dos
// minimizados, na ordem em que foram clicados (ver reordenarSitesDarknet).
function alternarSiteDarknet(siteId) {
    const idx = darknetSitesAbertos.indexOf(siteId);
    if (idx !== -1) {
        darknetSitesAbertos.splice(idx, 1);
    } else {
        darknetSitesAbertos.push(siteId);
    }
    reordenarSitesDarknet();
}

function expandirSiteDarknet(siteId) {
    if (darknetSitesAbertos.includes(siteId)) return;
    darknetSitesAbertos.push(siteId);
    reordenarSitesDarknet();
}

// Move cada caixa de site pro poço certo (aberto/minimizado) e aplica
// as classes que controlam o CSS — chamada sempre que o conjunto de
// sites abertos muda.
function reordenarSitesDarknet() {
    const abertos = document.getElementById("darknet-abertos");
    const minimizados = document.getElementById("darknet-minimizados");
    if (!abertos || !minimizados) return;

    DARKNET_SITES.forEach(site => {
        const box = document.querySelector(`.darknet-site[data-site="${site.id}"]`);
        if (!box) return;
        const estaAberto = darknetSitesAbertos.includes(site.id);
        box.classList.toggle("darknet-site--minimizado", !estaAberto);
        box.classList.toggle("darknet-site--expandido", estaAberto);
        const header = box.querySelector(".darknet-site-header");
        if (header) header.setAttribute("aria-expanded", estaAberto ? "true" : "false");
    });

    // Reinsere na ordem de abertura (o mais recente por último) dentro
    // do poço de abertos, e na ordem do manual dentro do de minimizados.
    darknetSitesAbertos.forEach(siteId => {
        const box = document.querySelector(`.darknet-site[data-site="${siteId}"]`);
        if (box) abertos.appendChild(box);
    });
    DARKNET_SITES.forEach(site => {
        if (darknetSitesAbertos.includes(site.id)) return;
        const box = document.querySelector(`.darknet-site[data-site="${site.id}"]`);
        if (box) minimizados.appendChild(box);
    });
}

// Credenciais da Dark Net: cada site guarda uma lista de CARDS — objetos
// { id, nome, pontuacao, avaliacoes[] } (ver plano-darknet-credenciais.txt
// e normalizarDarknetCredenciais em normalizacao.js, que já garante essa
// forma pra qualquer ficha, antiga ou nova, ao carregar). Fica em
// estado.fichaAtual.darknetCredenciais = { [siteId]: [...] }, salvo inteiro a
// cada alteração (mesmo padrão de estado.fichaAtual.determinacoes).
function credenciaisDoSite(siteId) {
    if (!estado.fichaAtual.darknetCredenciais) estado.fichaAtual.darknetCredenciais = {};
    if (!Array.isArray(estado.fichaAtual.darknetCredenciais[siteId])) estado.fichaAtual.darknetCredenciais[siteId] = [];
    return estado.fichaAtual.darknetCredenciais[siteId];
}

// Conjunto (em memória, não salvo no Firebase — cada jogador/Mestre abre
// o que quiser sem afetar o outro) de cards expandidos, guardando
// `${siteId}:${credencialId}`. Mesmo padrão de
// estado.containersInventarioAbertos (inventário) — ver criarLiItem.
const credenciaisDarknetAbertas = new Set();

const darknetCredenciaisContagemRenderizada = {};
function renderizarCredenciaisDarknet() {
    DARKNET_SITES.forEach(site => {
        const lista = document.querySelector(`[data-site-credenciais="${site.id}"]`);
        if (!lista) return;
        const valores = credenciaisDoSite(site.id);

        if (darknetCredenciaisContagemRenderizada[site.id] !== valores.length) {
            lista.innerHTML = "";
            if (valores.length === 0) {
                const vazio = document.createElement("div");
                vazio.className = "darknet-credenciais-vazio hint-inline";
                vazio.textContent = "Nenhuma credencial cadastrada.";
                lista.appendChild(vazio);
            } else {
                valores.forEach(credencial => lista.appendChild(criarCardCredencialDarknet(site, credencial)));
            }
            darknetCredenciaisContagemRenderizada[site.id] = valores.length;
        } else {
            // Contagem não mudou — atualiza os cards existentes no lugar
            // (nome se não estiver focado, badge de modificador e resumo
            // do corpo expandido, que dependem de pontuação/avaliações
            // que podem ter mudado sem alterar a quantidade de cards).
            valores.forEach(credencial => atualizarCardCredencialDarknet(site, credencial));
        }
    });
}

// Card fechado: nome/nick editável direto + badge de modificador (só
// pra sites com fórmula — ver DARKNET_SITES_PONTUACAO/_AVALIACAO) +
// botão de expandir (mostra um resumo somente-leitura do cálculo do
// modificador — edição de pontuação/avaliação vem numa próxima etapa)
// + botão de rolar (1d20 + modificador, só sites com fórmula) + botão
// de remover.
function criarCardCredencialDarknet(site, credencial) {
    const card = document.createElement("div");
    card.className = "darknet-credencial-card";
    card.dataset.darknetCard = `${site.id}:${credencial.id}`;

    const temFormula = DARKNET_SITES_PONTUACAO.includes(site.id) || DARKNET_SITES_AVALIACAO.includes(site.id) || DARKNET_SITES_STATUS.includes(site.id);
    // Corpo expandido também existe pra sites sem fórmula que têm
    // informação própria (Dm: contatos; Void: stats) e pros que ganham
    // itens à venda (Creators/BlackPrint) — só não têm badge/botão de
    // rolar vindos de temFormula (Dm/Void), ver plano-darknet-passo9.txt.
    const temCorpo = temFormula
        || DARKNET_SITES_CONTATOS.includes(site.id)
        || DARKNET_SITES_STATS.includes(site.id)
        || DARKNET_SITES_ITENS.includes(site.id);

    const header = document.createElement("div");
    header.className = "darknet-credencial-card-header";

    const input = document.createElement("input");
    input.type = "text";
    input.dataset.darknetCredencialNome = site.id;
    input.dataset.darknetCredencialId = credencial.id;
    input.placeholder = "nick/usuário...";
    input.value = credencial.nome || "";
    header.appendChild(input);

    if (temFormula) {
        const badge = document.createElement("span");
        badge.className = "mod-pill darknet-credencial-badge-mod";
        badge.dataset.darknetBadge = `${site.id}:${credencial.id}`;
        header.appendChild(badge);
    }

    const btnExpandir = document.createElement("button");
    btnExpandir.type = "button";
    btnExpandir.className = "btn-ghost darknet-credencial-btn";
    btnExpandir.title = "Expandir";
    btnExpandir.textContent = "▼";
    btnExpandir.addEventListener("click", () => alternarCardCredencialDarknet(site, credencial, card));
    header.appendChild(btnExpandir);

    if (temFormula) {
        const btnRolar = document.createElement("button");
        btnRolar.type = "button";
        btnRolar.className = "btn-ghost darknet-credencial-btn";
        btnRolar.title = "Rolar d20 + modificador";
        btnRolar.textContent = "🎲";
        btnRolar.addEventListener("click", () => rolarDarknet(site, credencial));
        header.appendChild(btnRolar);
    }

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn-ghost darknet-credencial-remover darknet-credencial-btn";
    remover.title = "Remover credencial";
    remover.textContent = "✕";
    remover.addEventListener("click", () => removerCredencialDarknet(site.id, credencial.id));
    header.appendChild(remover);

    card.appendChild(header);

    if (temCorpo) {
        const corpo = document.createElement("div");
        corpo.className = "darknet-credencial-corpo";
        corpo.dataset.darknetCorpo = `${site.id}:${credencial.id}`;
        if (credenciaisDarknetAbertas.has(`${site.id}:${credencial.id}`)) corpo.classList.add("aberto");

        if (temFormula) {
            const resumo = document.createElement("div");
            resumo.className = "darknet-credencial-resumo";
            resumo.dataset.darknetResumo = `${site.id}:${credencial.id}`;
            resumo.textContent = resumoModificadorDarknet(site.id, credencial);
            corpo.appendChild(resumo);
        }

        if (DARKNET_SITES_PONTUACAO.includes(site.id)) {
            corpo.appendChild(criarCampoPontuacaoDarknet(site, credencial));
        }

        if (DARKNET_SITES_AVALIACAO.includes(site.id)) {
            const lista = document.createElement("div");
            lista.className = "darknet-avaliacoes-lista";
            lista.dataset.darknetAvaliacoesLista = `${site.id}:${credencial.id}`;
            renderizarAvaliacoesDarknet(site, credencial, lista);
            corpo.appendChild(lista);
        }

        if (DARKNET_SITES_STATUS.includes(site.id)) {
            corpo.appendChild(criarCampoStatusDarknet(site, credencial));
        }

        if (DARKNET_SITES_CONTATOS.includes(site.id)) {
            criarListaContatosDm(site, credencial, corpo);
        }

        if (DARKNET_SITES_STATS.includes(site.id)) {
            criarPainelStatsVoid(site, credencial, corpo);
        }

        if (DARKNET_SITES_ITENS.includes(site.id)) {
            const listaItens = document.createElement("div");
            listaItens.className = "darknet-itens-lista";
            listaItens.dataset.darknetItensLista = `${site.id}:${credencial.id}`;
            renderizarItensVendaDarknet(site, credencial, listaItens);
            corpo.appendChild(listaItens);
        }

        card.appendChild(corpo);
    }

    atualizarBadgeCredencialDarknet(site, credencial, header.querySelector("[data-darknet-badge]"));
    return card;
}

// Atualiza SÓ o que pode ter mudado sem alterar a contagem de cards
// (nome se não estiver focado, badge e resumo) — evita recriar o DOM
// inteiro (perderia o foco de quem tá digitando).
function atualizarCardCredencialDarknet(site, credencial) {
    const input = document.querySelector(`input[data-darknet-credencial-nome="${site.id}"][data-darknet-credencial-id="${credencial.id}"]`);
    if (input && document.activeElement !== input) input.value = credencial.nome || "";

    const badge = document.querySelector(`[data-darknet-badge="${site.id}:${credencial.id}"]`);
    atualizarBadgeCredencialDarknet(site, credencial, badge);

    const resumo = document.querySelector(`[data-darknet-resumo="${site.id}:${credencial.id}"]`);
    if (resumo) resumo.textContent = resumoModificadorDarknet(site.id, credencial);

    if (DARKNET_SITES_PONTUACAO.includes(site.id)) {
        const inputPontuacao = document.querySelector(`input[data-darknet-credencial-pontuacao="${site.id}"][data-darknet-credencial-id="${credencial.id}"]`);
        if (inputPontuacao && document.activeElement !== inputPontuacao) {
            inputPontuacao.value = Number(credencial.pontuacao) || 0;
        }
    }

    if (DARKNET_SITES_AVALIACAO.includes(site.id)) {
        const lista = document.querySelector(`[data-darknet-avaliacoes-lista="${site.id}:${credencial.id}"]`);
        if (lista) renderizarAvaliacoesDarknet(site, credencial, lista);
    }

    if (DARKNET_SITES_STATUS.includes(site.id)) {
        const inputStatus = document.querySelector(`input[data-darknet-credencial-status="${site.id}"][data-darknet-credencial-id="${credencial.id}"]`);
        if (inputStatus && document.activeElement !== inputStatus) {
            inputStatus.value = Number(credencial.status) || 0;
        }
    }

    if (DARKNET_SITES_CONTATOS.includes(site.id)) {
        const listaContatos = document.querySelector(`[data-darknet-contatos-lista="${site.id}:${credencial.id}"]`);
        if (listaContatos) renderizarContatosDm(site, credencial, listaContatos);
    }

    if (DARKNET_SITES_STATS.includes(site.id)) {
        ["seguidores", "posts", "seguindo"].forEach(campo => {
            const inputStat = document.querySelector(`input[data-darknet-stat="${campo}"][data-darknet-stat-site="${site.id}"][data-darknet-credencial-id="${credencial.id}"]`);
            if (inputStat && document.activeElement !== inputStat) {
                inputStat.value = Number(credencial.stats?.[campo]) || 0;
            }
        });
    }

    if (DARKNET_SITES_ITENS.includes(site.id)) {
        const listaItens = document.querySelector(`[data-darknet-itens-lista="${site.id}:${credencial.id}"]`);
        if (listaItens) renderizarItensVendaDarknet(site, credencial, listaItens);
    }
}

function atualizarBadgeCredencialDarknet(site, credencial, badgeEl) {
    if (!badgeEl) return;
    const mod = modificadorDarknet(site.id, credencial);
    badgeEl.textContent = `🎲 ${mod >= 0 ? "+" : ""}${mod}`;
    badgeEl.classList.toggle("positivo", mod > 0);
    badgeEl.classList.remove("negativo");
}

// Texto explicando o cálculo por trás do modificador atual — mesmo
// texto tanto no resumo expandido quanto reaproveitável se precisar em
// outro lugar (ex. tooltip futuro).
function resumoModificadorDarknet(siteId, credencial) {
    const mod = modificadorDarknet(siteId, credencial);
    if (siteId === "p2k") {
        const pontuacao = Number(credencial.pontuacao) || 0;
        return `Pontuação: ${pontuacao} → ${mod >= 0 ? "+" : ""}${mod} na rolagem (a cada 15 pontos)`;
    }
    if (DARKNET_SITES_AVALIACAO.includes(siteId)) {
        const avaliacoes = Array.isArray(credencial.avaliacoes) ? credencial.avaliacoes : [];
        const positivas = avaliacoes.filter(a => (Number(a?.estrelas) || 0) >= 4).length;
        const negativas = avaliacoes.filter(a => {
            const e = Number(a?.estrelas) || 0;
            return e >= 1 && e <= 3;
        }).length;
        return `${avaliacoes.length} avaliação(ões): ${positivas} positiva(s), ${negativas} negativa(s) → ${mod >= 0 ? "+" : ""}${mod} na rolagem`;
    }
    if (siteId === "p2c") {
        const status = Number(credencial.status) || 0;
        return `Status: ${status} → ${mod >= 0 ? "+" : ""}${mod} na rolagem (lançado só pelo Mestre)`;
    }
    return "";
}

// Input numérico editável de status (só site "p2c" — ver
// DARKNET_SITES_STATUS). Ao contrário da pontuação de P2K (editável
// por jogador e Mestre), esse aqui é lançamento exclusivo do Mestre —
// jogador só lê (input desabilitado, mesmo padrão do input de saldo em
// renderizarSaldos).
function criarCampoStatusDarknet(site, credencial) {
    const linha = document.createElement("label");
    linha.className = "darknet-credencial-pontuacao-linha";

    const texto = document.createElement("span");
    texto.textContent = "Status:";
    linha.appendChild(texto);

    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.className = "darknet-credencial-pontuacao-input";
    input.dataset.darknetCredencialStatus = site.id;
    input.dataset.darknetCredencialId = credencial.id;
    input.value = Number(credencial.status) || 0;
    input.disabled = !estado.isMestre;
    if (!estado.isMestre) input.title = "Só o Mestre pode alterar o status.";
    linha.appendChild(input);

    return linha;
}

// Input numérico editável de pontuação (só site "p2k" — ver
// DARKNET_SITES_PONTUACAO). Editável tanto pelo jogador dono da ficha
// quanto pelo Mestre, já que ainda não há automação que calcule isso
// sozinha (mesmo padrão de outros contadores soltos da ficha).
function criarCampoPontuacaoDarknet(site, credencial) {
    const linha = document.createElement("label");
    linha.className = "darknet-credencial-pontuacao-linha";

    const texto = document.createElement("span");
    texto.textContent = "Pontuação:";
    linha.appendChild(texto);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.className = "darknet-credencial-pontuacao-input";
    input.dataset.darknetCredencialPontuacao = site.id;
    input.dataset.darknetCredencialId = credencial.id;
    input.value = Number(credencial.pontuacao) || 0;
    linha.appendChild(input);

    return linha;
}

// Lista de avaliações já registradas (somente-leitura pro jogador; o
// Mestre também vê um botão "✕" em cada uma pra corrigir lançamento
// errado) + formulário de nova avaliação, só visível/habilitado pro
// Mestre (mesmo padrão de outras travas estado.isMestre já existentes no
// arquivo — jogador só lê, não lança avaliação).
function renderizarAvaliacoesDarknet(site, credencial, container) {
    container.innerHTML = "";
    const avaliacoes = Array.isArray(credencial.avaliacoes) ? credencial.avaliacoes : [];

    if (avaliacoes.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "darknet-avaliacoes-vazio hint-inline";
        vazio.textContent = "Nenhuma avaliação registrada ainda.";
        container.appendChild(vazio);
    } else {
        avaliacoes.forEach(av => container.appendChild(criarItemAvaliacaoDarknet(site, credencial, av)));
    }

    if (estado.isMestre) {
        container.appendChild(criarFormAvaliacaoDarknet(site, credencial));
    }
}

function criarItemAvaliacaoDarknet(site, credencial, avaliacao) {
    const item = document.createElement("div");
    item.className = "darknet-avaliacao-item";

    const linha = document.createElement("div");
    linha.className = "darknet-avaliacao-linha";

    const estrelas = document.createElement("div");
    estrelas.className = "darknet-avaliacao-estrelas";
    const n = Math.min(5, Math.max(1, Number(avaliacao?.estrelas) || 1));
    estrelas.textContent = "★".repeat(n) + "☆".repeat(5 - n);
    estrelas.classList.toggle("positiva", n >= 4);
    estrelas.classList.toggle("negativa", n < 4);
    linha.appendChild(estrelas);

    if (estado.isMestre) {
        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "btn-ghost darknet-avaliacao-remover";
        remover.title = "Remover avaliação";
        remover.textContent = "✕";
        remover.addEventListener("click", () => removerAvaliacaoDarknet(site.id, credencial.id, avaliacao.id));
        linha.appendChild(remover);
    }

    item.appendChild(linha);

    if (avaliacao?.texto) {
        const texto = document.createElement("div");
        texto.className = "darknet-avaliacao-texto";
        texto.textContent = avaliacao.texto;
        item.appendChild(texto);
    }

    const rodape = document.createElement("div");
    rodape.className = "darknet-avaliacao-rodape hint-inline";
    const dataFormatada = avaliacao?.data ? new Date(avaliacao.data).toLocaleDateString("pt-BR") : "—";
    rodape.textContent = `${avaliacao?.autor || "Mestre"} · ${dataFormatada}`;
    item.appendChild(rodape);

    return item;
}

// Formulário "Nova avaliação" — só criado quando estado.isMestre (o jogador
// nem vê o formulário, não é só desabilitado). Select 1-5 estrelas +
// textarea + botão de lançar, que chama adicionarAvaliacaoDarknet e
// limpa os campos em seguida.
function criarFormAvaliacaoDarknet(site, credencial) {
    const form = document.createElement("div");
    form.className = "darknet-form-avaliacao";

    const linhaEstrelas = document.createElement("div");
    linhaEstrelas.className = "darknet-form-avaliacao-linha";

    const labelEstrelas = document.createElement("span");
    labelEstrelas.textContent = "Nova avaliação:";
    linhaEstrelas.appendChild(labelEstrelas);

    const select = document.createElement("select");
    [5, 4, 3, 2, 1].forEach(n => {
        const opt = document.createElement("option");
        opt.value = String(n);
        opt.textContent = "★".repeat(n) + "☆".repeat(5 - n);
        select.appendChild(opt);
    });
    linhaEstrelas.appendChild(select);
    form.appendChild(linhaEstrelas);

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Comentário do Mestre sobre o trabalho...";
    textarea.rows = 2;
    form.appendChild(textarea);

    const btnLancar = document.createElement("button");
    btnLancar.type = "button";
    btnLancar.className = "btn-ghost";
    btnLancar.textContent = "Lançar avaliação";
    btnLancar.addEventListener("click", () => {
        adicionarAvaliacaoDarknet(site.id, credencial.id, Number(select.value), textarea.value.trim());
        textarea.value = "";
        select.value = "5";
    });
    form.appendChild(btnLancar);

    return form;
}

// Só o Mestre lança avaliação — autor = nome de quem tá logado como
// Mestre (estado.sessao.nome), data = ISO string (formatada na exibição via
// toLocaleDateString). Mesmo padrão "set no array inteiro" usado no
// resto de darknetCredenciais.
function adicionarAvaliacaoDarknet(siteId, credencialId, estrelas, texto) {
    if (!estado.isMestre || !estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial) return;
    if (!Array.isArray(credencial.avaliacoes)) credencial.avaliacoes = [];

    credencial.avaliacoes.push({
        id: gerarIdLocal(),
        estrelas: Math.min(5, Math.max(1, Math.floor(Number(estrelas) || 1))),
        texto: texto || "",
        autor: estado.sessao.nome || "Mestre",
        data: new Date().toISOString()
    });

    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    renderizarCredenciaisDarknet();
}

// Idem, só Mestre — corrige avaliação lançada errada.
function removerAvaliacaoDarknet(siteId, credencialId, avaliacaoId) {
    if (!estado.isMestre || !estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial || !Array.isArray(credencial.avaliacoes)) return;
    const idx = credencial.avaliacoes.findIndex(a => a.id === avaliacaoId);
    if (idx === -1) return;
    credencial.avaliacoes.splice(idx, 1);

    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    renderizarCredenciaisDarknet();
}

// Corpo expandido do site Dm (plano-darknet-passo9.txt, Parte 3): lista
// de contatos salvos (número + nome, ambos editáveis por qualquer um com
// acesso à ficha — mesmo padrão do nome da credencial em si, sem trava de
// estado.isMestre, já que não é um "lançamento" do Mestre como as avaliações) +
// formulário pra adicionar um contato novo + botão de remover por linha.
function criarListaContatosDm(site, credencial, container) {
    const lista = document.createElement("div");
    lista.className = "darknet-contatos-lista";
    lista.dataset.darknetContatosLista = `${site.id}:${credencial.id}`;
    renderizarContatosDm(site, credencial, lista);
    container.appendChild(lista);
}

function renderizarContatosDm(site, credencial, container) {
    container.innerHTML = "";
    const contatos = Array.isArray(credencial.contatos) ? credencial.contatos : [];

    if (contatos.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "darknet-contatos-vazio hint-inline";
        vazio.textContent = "Nenhum contato salvo ainda.";
        container.appendChild(vazio);
    } else {
        contatos.forEach(contato => container.appendChild(criarItemContatoDm(site, credencial, contato)));
    }

    container.appendChild(criarFormNovoContatoDm(site, credencial));
}

function criarItemContatoDm(site, credencial, contato) {
    const item = document.createElement("div");
    item.className = "darknet-contato-item";

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.className = "darknet-contato-nome";
    inputNome.placeholder = "Nome do contato";
    inputNome.value = contato.nome || "";
    inputNome.dataset.darknetContatoCampo = "nome";
    inputNome.dataset.darknetContatoSite = site.id;
    inputNome.dataset.darknetCredencialId = credencial.id;
    inputNome.dataset.darknetContatoId = contato.id;
    item.appendChild(inputNome);

    const inputNumero = document.createElement("input");
    inputNumero.type = "text";
    inputNumero.className = "darknet-contato-numero";
    inputNumero.placeholder = "Número";
    inputNumero.value = contato.numero || "";
    inputNumero.dataset.darknetContatoCampo = "numero";
    inputNumero.dataset.darknetContatoSite = site.id;
    inputNumero.dataset.darknetCredencialId = credencial.id;
    inputNumero.dataset.darknetContatoId = contato.id;
    item.appendChild(inputNumero);

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn-ghost darknet-contato-remover";
    remover.title = "Remover contato";
    remover.textContent = "✕";
    remover.addEventListener("click", () => removerContatoDm(site.id, credencial.id, contato.id));
    item.appendChild(remover);

    return item;
}

function criarFormNovoContatoDm(site, credencial) {
    const form = document.createElement("div");
    form.className = "darknet-form-contato";

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.placeholder = "Nome do contato...";
    form.appendChild(inputNome);

    const inputNumero = document.createElement("input");
    inputNumero.type = "text";
    inputNumero.placeholder = "Número...";
    form.appendChild(inputNumero);

    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn-ghost";
    btnAdd.textContent = "Adicionar contato";
    btnAdd.addEventListener("click", () => {
        adicionarContatoDm(site.id, credencial.id, inputNumero.value.trim(), inputNome.value.trim());
        inputNumero.value = "";
        inputNome.value = "";
        inputNumero.focus();
    });
    form.appendChild(btnAdd);

    return form;
}

// Ignora clique em "Adicionar contato" com os dois campos vazios — evita
// lançar uma linha totalmente em branco por engano.
function adicionarContatoDm(siteId, credencialId, numero, nome) {
    if (!estado.fichaAtual || !idAtivo()) return;
    if (!numero && !nome) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial) return;
    if (!Array.isArray(credencial.contatos)) credencial.contatos = [];
    credencial.contatos.push({ id: gerarIdLocal(), numero, nome });

    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    const container = document.querySelector(`[data-darknet-contatos-lista="${siteId}:${credencialId}"]`);
    const site = DARKNET_SITES.find(s => s.id === siteId);
    if (container && site) renderizarContatosDm(site, credencial, container);
}

function removerContatoDm(siteId, credencialId, contatoId) {
    if (!estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial || !Array.isArray(credencial.contatos)) return;
    const idx = credencial.contatos.findIndex(c => c.id === contatoId);
    if (idx === -1) return;
    credencial.contatos.splice(idx, 1);

    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    const container = document.querySelector(`[data-darknet-contatos-lista="${siteId}:${credencialId}"]`);
    const site = DARKNET_SITES.find(s => s.id === siteId);
    if (container && site) renderizarContatosDm(site, credencial, container);
}

// Corpo expandido do site Void (plano-darknet-passo9.txt, Parte 3): 3
// contadores numéricos lado a lado, sem badge de modificador e sem botão
// de rolar (Void não tem fórmula, ver DARKNET_SITES_AVALIACAO/_PONTUACAO).
function criarPainelStatsVoid(site, credencial, container) {
    const grid = document.createElement("div");
    grid.className = "darknet-stats-grid";
    grid.dataset.darknetStatsGrid = `${site.id}:${credencial.id}`;

    [
        { chave: "seguidores", rotulo: "Seguidores" },
        { chave: "posts", rotulo: "Posts" },
        { chave: "seguindo", rotulo: "Seguindo" }
    ].forEach(({ chave, rotulo }) => {
        const campo = document.createElement("label");
        campo.className = "darknet-stat-campo";

        const texto = document.createElement("span");
        texto.textContent = rotulo;
        campo.appendChild(texto);

        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "1";
        input.dataset.darknetStat = chave;
        input.dataset.darknetStatSite = site.id;
        input.dataset.darknetCredencialId = credencial.id;
        input.value = Number(credencial.stats?.[chave]) || 0;
        campo.appendChild(input);

        grid.appendChild(campo);
    });

    container.appendChild(grid);
}

function atualizarStatVoid(siteId, credencialId, campo, novoValor) {
    if (!estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial) return;
    if (!credencial.stats || typeof credencial.stats !== "object") {
        credencial.stats = { seguidores: 0, posts: 0, seguindo: 0 };
    }
    credencial.stats[campo] = Math.max(0, Math.floor(Number(novoValor) || 0));
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
}

// Corpo expandido de Creators/BlackPrint/P2C (plano-darknet-passo9.txt,
// Parte 3 e 5): lista de itens à venda cadastrados (nome + valor em
// CN$ — só em P2C também vem com um tipo de preço: único ou assinatura,
// ver TIPOS_PRECO_ITEM_DARKNET), editável por qualquer um com acesso à
// ficha (mesmo espírito sem trava de estado.isMestre dos contatos do Dm —
// cadastrar item não é um "lançamento" do Mestre) + form pra adicionar
// item novo + remover por item. Fica dentro do mesmo corpo expandido do
// card, ao lado do bloco de avaliações/status já existente
// (renderizarAvaliacoesDarknet/criarCampoStatusDarknet).
const TIPOS_PRECO_ITEM_DARKNET = [
    { valor: "unico", rotulo: "Preço único" },
    { valor: "assinatura", rotulo: "Assinatura" }
];
function renderizarItensVendaDarknet(site, credencial, container) {
    container.innerHTML = "";
    const itens = Array.isArray(credencial.itens) ? credencial.itens : [];

    const titulo = document.createElement("div");
    titulo.className = "darknet-itens-titulo hint-inline";
    titulo.textContent = "Itens à venda:";
    container.appendChild(titulo);

    if (itens.length === 0) {
        const vazio = document.createElement("div");
        vazio.className = "darknet-itens-vazio hint-inline";
        vazio.textContent = "Nenhum item cadastrado ainda.";
        container.appendChild(vazio);
    } else {
        itens.forEach(item => container.appendChild(criarItemVendaDarknet(site, credencial, item)));
    }

    container.appendChild(criarFormNovoItemVenda(site, credencial));
}

function criarItemVendaDarknet(site, credencial, item) {
    const linha = document.createElement("div");
    linha.className = "darknet-item-venda";

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.className = "darknet-item-venda-nome";
    inputNome.placeholder = "Nome do item";
    inputNome.value = item.nome || "";
    inputNome.dataset.darknetItemCampo = "nome";
    inputNome.dataset.darknetItemSite = site.id;
    inputNome.dataset.darknetCredencialId = credencial.id;
    inputNome.dataset.darknetItemId = item.id;
    linha.appendChild(inputNome);

    const inputValor = document.createElement("input");
    inputValor.type = "number";
    inputValor.min = "0";
    inputValor.step = "1";
    inputValor.className = "darknet-item-venda-valor";
    inputValor.placeholder = "CN$";
    inputValor.value = Number(item.valor) || 0;
    inputValor.dataset.darknetItemCampo = "valor";
    inputValor.dataset.darknetItemSite = site.id;
    inputValor.dataset.darknetCredencialId = credencial.id;
    inputValor.dataset.darknetItemId = item.id;
    linha.appendChild(inputValor);

    const selectTipo = document.createElement("select");
    selectTipo.className = "darknet-item-venda-tipo";
    selectTipo.dataset.darknetItemCampo = "tipo";
    selectTipo.dataset.darknetItemSite = site.id;
    selectTipo.dataset.darknetCredencialId = credencial.id;
    selectTipo.dataset.darknetItemId = item.id;
    selectTipo.innerHTML = TIPOS_PRECO_ITEM_DARKNET.map(t => `<option value="${t.valor}">${t.rotulo}</option>`).join("");
    selectTipo.value = item.tipo === "assinatura" ? "assinatura" : "unico";
    // Único/Assinatura é coisa de P2C (mercado de serviços/dados) — os
    // demais sites com itens à venda (Creators, BlackPrint) vendem
    // objeto físico, não têm esse conceito de cobrança recorrente.
    if (site.id === "p2c") linha.appendChild(selectTipo);

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn-ghost darknet-item-venda-remover";
    remover.title = "Remover item";
    remover.textContent = "✕";
    remover.addEventListener("click", () => removerItemVendaDarknet(site.id, credencial.id, item.id));
    linha.appendChild(remover);

    return linha;
}

function criarFormNovoItemVenda(site, credencial) {
    const form = document.createElement("div");
    form.className = "darknet-form-item-venda";

    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.placeholder = "Nome do item...";
    form.appendChild(inputNome);

    const inputValor = document.createElement("input");
    inputValor.type = "number";
    inputValor.min = "0";
    inputValor.step = "1";
    inputValor.placeholder = "CN$";
    form.appendChild(inputValor);

    const selectTipo = document.createElement("select");
    selectTipo.innerHTML = TIPOS_PRECO_ITEM_DARKNET.map(t => `<option value="${t.valor}">${t.rotulo}</option>`).join("");
    if (site.id === "p2c") form.appendChild(selectTipo);

    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn-ghost";
    btnAdd.textContent = "Adicionar item";
    btnAdd.addEventListener("click", () => {
        adicionarItemVendaDarknet(site.id, credencial.id, inputNome.value.trim(), inputValor.value, selectTipo.value);
        inputNome.value = "";
        inputValor.value = "";
        selectTipo.value = "unico";
        inputNome.focus();
    });
    form.appendChild(btnAdd);

    return form;
}

// Ignora clique com nome vazio — evita item sem identificação nenhuma
// (valor 0 é aceitável, ex. item de graça/promoção). tipo: "unico"
// (preço pago uma vez) ou "assinatura" (cobrança recorrente) — só
// existe de fato pra P2C (ver criarItemVendaDarknet/criarFormNovoItemVenda,
// o select nem aparece pros outros sites); em Creators/BlackPrint o
// campo é sempre gravado como "unico".
function adicionarItemVendaDarknet(siteId, credencialId, nome, valor, tipo) {
    if (!estado.fichaAtual || !idAtivo()) return;
    if (!nome) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial) return;
    if (!Array.isArray(credencial.itens)) credencial.itens = [];
    credencial.itens.push({
        id: gerarIdLocal(), nome, valor: Math.max(0, Number(valor) || 0),
        tipo: (siteId === "p2c" && tipo === "assinatura") ? "assinatura" : "unico"
    });

    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    const container = document.querySelector(`[data-darknet-itens-lista="${siteId}:${credencialId}"]`);
    const site = DARKNET_SITES.find(s => s.id === siteId);
    if (container && site) renderizarItensVendaDarknet(site, credencial, container);
}

function removerItemVendaDarknet(siteId, credencialId, itemId) {
    if (!estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial || !Array.isArray(credencial.itens)) return;
    const idx = credencial.itens.findIndex(it => it.id === itemId);
    if (idx === -1) return;
    credencial.itens.splice(idx, 1);

    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    const container = document.querySelector(`[data-darknet-itens-lista="${siteId}:${credencialId}"]`);
    const site = DARKNET_SITES.find(s => s.id === siteId);
    if (container && site) renderizarItensVendaDarknet(site, credencial, container);
}

function alternarCardCredencialDarknet(site, credencial, card) {
    const chave = `${site.id}:${credencial.id}`;
    const corpo = card.querySelector(`[data-darknet-corpo="${chave}"]`);
    if (!corpo) return;
    const abrir = !credenciaisDarknetAbertas.has(chave);
    if (abrir) {
        credenciaisDarknetAbertas.add(chave);
        corpo.classList.add("aberto");
    } else {
        credenciaisDarknetAbertas.delete(chave);
        corpo.classList.remove("aberto");
    }
}

// Rola 1d20 + modificador da credencial e registra no Log de Dados —
// reaproveita 100% o rolarERegistrar já existente (mesmo Log/toast de
// qualquer outra rolagem da ficha). Em Creators/BlackPrint (ver
// DARKNET_SITES_ITENS), a rolagem passa a ter dificuldade base 15 e, em
// caso de sucesso, sorteia um item cadastrado com base no resultado
// (plano-darknet-passo9.txt, Parte 5) — os demais sites continuam sem
// dificuldade, só o número mesmo.
async function rolarDarknet(site, credencial) {
    // O botão de rolar é criado só uma vez, em criarCardCredencialDarknet,
    // com a "credencial" que existia naquele momento — mas o Firebase
    // troca estado.fichaAtual inteiro a cada sincronização (ver
    // ficha.js:normalizarFicha), então esse objeto capturado no clique vai
    // ficando pra trás sempre que a pontuação/avaliação/status muda sem
    // mudar a QUANTIDADE de credenciais do site (que é o único caso em
    // que o card é recriado do zero — ver renderizarCredenciaisDarknet).
    // O card seguia mostrando o modificador certo (badge/resumo são
    // atualizados à parte, com dado fresco), mas a rolagem em si usava o
    // valor antigo — por isso o dado saía com +0 mesmo com +1 aparecendo
    // na tela. Busca a credencial atual pelo id antes de calcular/rolar,
    // mesmo padrão já usado em removerItemVendaDarknet/adicionarItemVendaDarknet.
    const credencialAtual = credenciaisDoSite(site.id).find(c => c.id === credencial.id) || credencial;
    const mod = modificadorDarknet(site.id, credencialAtual);
    const nomeCred = credencialAtual.nome ? ` — ${credencialAtual.nome}` : "";
    const nomeAlvo = `${site.nome}${nomeCred}`;

    if (!DARKNET_SITES_ITENS.includes(site.id)) {
        await rolarERegistrar(nomeAlvo, mod, false, null);
        return;
    }

    const resultadoRolagem = await rolarERegistrar(nomeAlvo, mod, false, 15);
    if (!resultadoRolagem) return; // ação bloqueada (ex.: fora do turno em combate)
    if (!resultadoRolagem.sucesso) return; // falhou na dificuldade base, sem sorteio

    const itens = Array.isArray(credencialAtual.itens) ? credencialAtual.itens : [];
    if (itens.length === 0) {
        toast(`${nomeAlvo}: sucesso, mas nenhum item cadastrado pra sortear.`, "erro");
        return;
    }

    const valorMin = Math.min(...itens.map(it => Number(it.valor) || 0));
    const item = sortearItemPorResultado(itens, resultadoRolagem.resultado, valorMin, estado.fatorPrecoDarknetAtivo);

    if (!item) {
        toast(`${nomeAlvo}: sucesso, mas nenhum item disponível nesse resultado.`, "erro");
        return;
    }

    const rotuloTipo = item.tipo === "assinatura" ? "assinatura" : "pagamento único";
    toast(`Item sorteado: ${item.nome} (CN$ ${Number(item.valor) || 0} — ${rotuloTipo})`, "ok");
    await registrarRolagem({
        quem: estado.isMestre ? `Mestre (${estado.modoNpc ? (estado.fichaAtual?.config?.nomeExibicao || estado.npcAtualId) : (nomeDeFicha(estado.fichaAtualId) || "—")})` : (estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador"),
        modificador: 0,
        resultado: resultadoRolagem.resultado,
        detalhe: `${nomeAlvo}: item sorteado — ${item.nome} (CN$ ${Number(item.valor) || 0} — ${rotuloTipo})`,
        critico: null
    });
}

function adicionarCredencialDarknet(siteId) {
    if (!estado.fichaAtual || !idAtivo()) return;
    credenciaisDoSite(siteId).push({
        id: gerarIdLocal(), nome: "", pontuacao: 0, status: 0, avaliacoes: [],
        contatos: [], stats: { seguidores: 0, posts: 0, seguindo: 0 }, itens: []
    });
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    expandirSiteDarknet(siteId);
    renderizarCredenciaisDarknet();
    setTimeout(() => {
        const campos = document.querySelectorAll(`input[data-darknet-credencial-nome="${siteId}"]`);
        const ultimo = campos[campos.length - 1];
        if (ultimo) ultimo.focus();
    }, 0);
}

function removerCredencialDarknet(siteId, credencialId) {
    if (!estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const idx = lista.findIndex(c => c.id === credencialId);
    if (idx === -1) return;
    lista.splice(idx, 1);
    credenciaisDarknetAbertas.delete(`${siteId}:${credencialId}`);
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
    renderizarCredenciaisDarknet();
}

document.getElementById("btn-add-credencial-darknet")?.addEventListener("click", () => {
    const select = document.getElementById("darknet-credencial-site-select");
    if (!select || !select.value) return;
    adicionarCredencialDarknet(select.value);
});

// Grava o nome/nick de cada credencial (mesmo padrão "set no array
// inteiro" usado pelas caixas de Determinação). Recalcula o card na
// hora (badge/resumo não dependem do nome, mas mantém tudo consistente
// e reaproveita a mesma função de atualização).
document.addEventListener("input", (e) => {
    const siteCred = e.target.dataset && e.target.dataset.darknetCredencialNome;
    const credId = e.target.dataset && e.target.dataset.darknetCredencialId;
    if (siteCred === undefined || credId === undefined || !idAtivo()) return;
    const lista = credenciaisDoSite(siteCred);
    const credencial = lista.find(c => c.id === credId);
    if (!credencial) return;
    credencial.nome = e.target.value;
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
});

// Grava a pontuação (só site "p2k") — sempre inteiro >= 0. Atualiza o
// badge e o resumo na hora (sem recriar o card, pra não perder o foco
// de quem tá digitando).
function atualizarPontuacaoDarknet(siteId, credencialId, novoValor) {
    if (!estado.fichaAtual || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial) return;
    credencial.pontuacao = Math.max(0, Math.floor(Number(novoValor) || 0));
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);

    const site = DARKNET_SITES.find(s => s.id === siteId);
    if (site) {
        const badge = document.querySelector(`[data-darknet-badge="${siteId}:${credencialId}"]`);
        atualizarBadgeCredencialDarknet(site, credencial, badge);
        const resumo = document.querySelector(`[data-darknet-resumo="${siteId}:${credencialId}"]`);
        if (resumo) resumo.textContent = resumoModificadorDarknet(siteId, credencial);
    }
}

document.addEventListener("input", (e) => {
    const siteId = e.target.dataset && e.target.dataset.darknetCredencialPontuacao;
    const credId = e.target.dataset && e.target.dataset.darknetCredencialId;
    if (siteId === undefined || credId === undefined) return;
    atualizarPontuacaoDarknet(siteId, credId, e.target.value);
});

// Grava o status (só site "p2c") — lançamento exclusivo do Mestre (o
// input já vem desabilitado pro jogador em criarCampoStatusDarknet,
// mas a checagem estado.isMestre aqui também trava a escrita, caso alguém
// force o campo via devtools).
function atualizarStatusDarknet(siteId, credencialId, novoValor) {
    if (!estado.fichaAtual || !idAtivo() || !estado.isMestre) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credencialId);
    if (!credencial) return;
    credencial.status = Math.floor(Number(novoValor) || 0);
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);

    const site = DARKNET_SITES.find(s => s.id === siteId);
    if (site) {
        const badge = document.querySelector(`[data-darknet-badge="${siteId}:${credencialId}"]`);
        atualizarBadgeCredencialDarknet(site, credencial, badge);
        const resumo = document.querySelector(`[data-darknet-resumo="${siteId}:${credencialId}"]`);
        if (resumo) resumo.textContent = resumoModificadorDarknet(siteId, credencial);
    }
}

document.addEventListener("input", (e) => {
    const siteId = e.target.dataset && e.target.dataset.darknetCredencialStatus;
    const credId = e.target.dataset && e.target.dataset.darknetCredencialId;
    if (siteId === undefined || credId === undefined) return;
    atualizarStatusDarknet(siteId, credId, e.target.value);
});

// Edição de contato existente do Dm (número/nome) — mesmo padrão "set
// direto no objeto do array" das outras caixas de texto da ficha.
document.addEventListener("input", (e) => {
    const campo = e.target.dataset && e.target.dataset.darknetContatoCampo;
    const siteId = e.target.dataset && e.target.dataset.darknetContatoSite;
    const credId = e.target.dataset && e.target.dataset.darknetCredencialId;
    const contatoId = e.target.dataset && e.target.dataset.darknetContatoId;
    if (!campo || siteId === undefined || credId === undefined || contatoId === undefined || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credId);
    if (!credencial || !Array.isArray(credencial.contatos)) return;
    const contato = credencial.contatos.find(c => c.id === contatoId);
    if (!contato) return;
    contato[campo] = e.target.value;
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
});

// Edição dos contadores do Void (seguidores/posts/seguindo).
document.addEventListener("input", (e) => {
    const campo = e.target.dataset && e.target.dataset.darknetStat;
    const siteId = e.target.dataset && e.target.dataset.darknetStatSite;
    const credId = e.target.dataset && e.target.dataset.darknetCredencialId;
    if (!campo || siteId === undefined || credId === undefined) return;
    atualizarStatVoid(siteId, credId, campo, e.target.value);
});

// Edição de item de venda já cadastrado (nome/valor) — Creators/BlackPrint.
document.addEventListener("input", (e) => {
    const campo = e.target.dataset && e.target.dataset.darknetItemCampo;
    const siteId = e.target.dataset && e.target.dataset.darknetItemSite;
    const credId = e.target.dataset && e.target.dataset.darknetCredencialId;
    const itemId = e.target.dataset && e.target.dataset.darknetItemId;
    if (!campo || siteId === undefined || credId === undefined || itemId === undefined || !idAtivo()) return;
    const lista = credenciaisDoSite(siteId);
    const credencial = lista.find(c => c.id === credId);
    if (!credencial || !Array.isArray(credencial.itens)) return;
    const item = credencial.itens.find(it => it.id === itemId);
    if (!item) return;
    if (campo === "valor") item.valor = Math.max(0, Number(e.target.value) || 0);
    else if (campo === "tipo") item.tipo = e.target.value === "assinatura" ? "assinatura" : "unico";
    else item[campo] = e.target.value;
    agendarSalvamento("darknetCredenciais", estado.fichaAtual.darknetCredenciais);
});

// =====================================================================
// FATOR DE PREÇO DA DARK NET — CN$ por ponto de dificuldade usado no
// sorteio de itens de Creators/BlackPrint (ver dificuldadeItemDarknet em
// regras.js). Mesmo padrão de configurarFatorPrecoMateriaisVeiculo (agora
// em abas/veiculos.js): listener em tempo real + gravação só no blur/Enter.
// =====================================================================

export function configurarFatorPrecoDarknet() {
    ouvirFatorPrecoDarknet((fator) => {
        estado.fatorPrecoDarknetAtivo = fator;
        if (estado.isMestre && el.inputFatorPrecoDarknet && document.activeElement !== el.inputFatorPrecoDarknet) {
            el.inputFatorPrecoDarknet.value = fator;
        }
    });

    if (el.inputFatorPrecoDarknet) {
        const salvar = async (e) => {
            const valor = Number(e.target.value);
            await definirFatorPrecoDarknet(Number.isFinite(valor) ? valor : 0);
        };
        el.inputFatorPrecoDarknet.addEventListener("blur", salvar);
        el.inputFatorPrecoDarknet.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
        });
    }
}
