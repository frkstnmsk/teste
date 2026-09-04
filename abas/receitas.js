// abas/receitas.js
// ---------------------------------------------------------------------
// Aba Receitas — uma seção por perícia de criação de item, com a lista
// de receitas conhecidas (vindas do Banco Global de Receitas), o modal
// de escolher materiais antes de rolar, a resolução do teste de
// criação, e o modal de cadastrar/editar receita no Banco Global.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 13). Além das 4 funções listadas no plano (renderizarReceitas,
// abrirModalCriarReceita, resolverCriacaoReceita,
// abrirModalEscolherMateriais), vieram junto os helpers privados só
// usados por elas (formatarIngredientes, indiceQualidade,
// tierMinimoExigidoPeloNivel, materialQualificaParaNivel,
// materiaisDisponiveisNoInventario, materiaisAgregadosPorQualidade,
// planejarConsumoMaterial) e a constante PERICIAS_QUE_EXIGEM_ITEM_VINCULADO.
//
// NOTA — bug pré-existente preservado sem alteração: dentro de
// resolverCriacaoReceita, no desconto parcial de material numa falha
// (fracaoPerdida > 0), o código original referencia uma variável solta
// `fichaAtual` em vez de `estado.fichaAtual` — isso já quebrava (ReferenceError)
// no ficha.js original nesse caminho específico. Mantido idêntico aqui
// pra não mudar comportamento; sinalizado no plano/relatório do Passo 13
// pra decisão futura de correção.
// ---------------------------------------------------------------------

import { db } from "../firebase-config.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { estado } from "../estado.js";
import {
    el, toast, escapeHtml, caminhoBase, abrirAba, modificadoresAtuais,
    penalidadeTestesAtual, penalidadeEnergiaParaPericia, limiteRolagemCriacaoParaPericia,
    receitaLivreDoSlot, receitasModuloDetonacaoDisponiveis, concederReceitaConhecida,
    removerReceitaConhecida, receitasExtrasDaPericia, checarConsumoDeAcao, lerDeltaOcasionais,
    gerarIdLocal, nomeDeFicha, categoriasDistintas, abrirModalNovo, resolverTesteAprenderReceita,
    htmlCheckboxesOcasionais,
} from "../ficha.js?v=20260830-npcnivelpv";
import {
    rolarD20, modificadoresOcasionaisDaPericia, calcularTotalPericia,
} from "../regras.js";
import {
    PERICIAS_CRIACAO_ITEM, qualidadesDoMaterial, MATERIAIS_CRIACAO,
    atendeRequisitoCriarReceita, rotuloTag,
} from "../dados-manual.js";
import { criarAcaoPendente } from "../mestre.js?v=20260830-npcnivelpv";
import { registrarRolagem } from "../calendario.js";
import { salvarReceitaNoBanco, atualizarReceitaBanco } from "../receitas-globais.js";
import { buscarItemBancoPorId, autopreencherItemDoBanco } from "../itens-globais.js";

// ---------------------------------------------------------------------
// RECEITAS — uma seção pra cada perícia de criação de item (Ferramenta
// de Criação geral ou química, ver PERICIAS_CRIACAO_ITEM em
// dados-manual.js) que estiver cadastrada na ficha, com a lista de
// receitas daquela perícia — vindas do Banco Global de Receitas
// (receitas-globais.js), compartilhado entre TODAS as mesas, igual o
// Banco Global de Itens. O botão "+ Criar receita" no fim da aba
// funciona tanto pro jogador quanto pro Mestre (ver abrirModalCriarReceita).
// ---------------------------------------------------------------------
// Formata a lista estruturada de ingredientes (r.ingredientes, cada um
// { material, quantidade }) num texto tipo "2x Metal leve, 1x Propelente".
// Fichas antigas podem ter só o campo legado `materiais` (texto livre,
// de antes dessa lista existir) — nesse caso mostra o texto legado.
export function formatarIngredientes(r) {
    if (Array.isArray(r?.ingredientes) && r.ingredientes.length) {
        return r.ingredientes.map(ing => `${ing.quantidade}x ${ing.material}${ing.qualidade ? ` (${ing.qualidade})` : ""}`).join(", ");
    }
    if (r?.materiais) return r.materiais;
    return null;
}

// Índice do tier de qualidade escolhido dentro da lista de qualidades
// daquele material (0 = a mais baixa). -1 se o material não tem
// variação de qualidade, ou se a qualidade não foi informada.
function indiceQualidade(materialNome, qualidade) {
    const qualidades = qualidadesDoMaterial(materialNome);
    if (!qualidades || !qualidade) return -1;
    return qualidades.indexOf(qualidade);
}

// Nível do item → tier mínimo de qualidade de material exigido pelo
// manual: nível 1-2 pede a qualidade mais baixa, 3-4 pede a do meio, 5
// só com a mais alta (ver seção "Criar e modificar itens").
function tierMinimoExigidoPeloNivel(nivelItem) {
    if (nivelItem >= 5) return 2;
    if (nivelItem >= 3) return 1;
    return 0;
}

// Trava dura do manual: materialABAIXO do tier mínimo do nível não pode
// ser usado NESSA receita, ponto (não é só "sem bônus" — é inutilizável).
// Baixa só cria nível 1-2, Média cria 2-4, só Alta cria nível 5. Material
// sem variação de qualidade (Material bélico, Material especial) não tem
// esse conceito de tier — sempre qualifica. Item de material antigo sem
// qualidade marcada (herdado de antes desse campo existir) é tratado como
// a qualidade mais baixa (tier 0) só pra essa checagem — não ganha bônus
// (ver indiceQualidade), mas também não fica travado sem explicação.
function materialQualificaParaNivel(materialNome, qualidade, tierMinimo) {
    const qualidades = qualidadesDoMaterial(materialNome);
    if (!qualidades) return true;
    const idx = qualidade ? qualidades.indexOf(qualidade) : 0;
    return idx >= tierMinimo;
}

// Itens do inventário do personagem que servem como este ingrediente:
// tag "material" e mesmo tipo (materialTipo) — ou, pra itens antigos
// cadastrados antes desse campo existir, mesmo nome do material.
function materiaisDisponiveisNoInventario(materialNome) {
    const alvo = materialNome.trim().toLowerCase();
    return Object.entries(estado.fichaAtual.inventario || {})
        .filter(([, it]) => it.tag === "material" && (it.materialTipo === materialNome || (!it.materialTipo && (it.nome || "").trim().toLowerCase() === alvo)))
        .map(([id, it]) => ({ id, ...it }));
}

// Agrupa os itens de material do inventário por qualidade, somando a
// quantidade em estoque de cada tier (materialQuantidade — itens antigos
// sem esse campo contam como 1 unidade cada, pra não quebrar fichas de
// antes dessa mudança). Cada grupo guarda as entradas de onde descontar
// (id + quantidade), em ordem — é o que abrirModalEscolherMateriais usa
// pra consumir estoque de verdade ao confirmar a criação. Ordenado da
// qualidade mais alta pra mais baixa (material sem variação de qualidade
// vira um grupo único, "qualidade: null").
export function materiaisAgregadosPorQualidade(materialNome) {
    const entradas = materiaisDisponiveisNoInventario(materialNome);
    const grupos = new Map();
    entradas.forEach(it => {
        const qtd = Math.max(0, Number(it.materialQuantidade ?? 1) || 0);
        if (qtd <= 0) return;
        const chave = it.materialQualidade || "";
        if (!grupos.has(chave)) grupos.set(chave, { qualidade: it.materialQualidade || null, disponivel: 0, entradas: [] });
        const grupo = grupos.get(chave);
        grupo.disponivel += qtd;
        grupo.entradas.push({ id: it.id, quantidade: qtd });
    });
    const qualidades = qualidadesDoMaterial(materialNome);
    return Array.from(grupos.values()).sort((a, b) => {
        const ia = qualidades && a.qualidade ? qualidades.indexOf(a.qualidade) : -1;
        const ib = qualidades && b.qualidade ? qualidades.indexOf(b.qualidade) : -1;
        return ib - ia;
    });
}

// Desconta `quantidadeNecessaria` unidades de material a partir dos
// grupos (na ordem em que vierem — normalmente com o grupo escolhido
// pelo jogador primeiro, depois os demais como "troco" se faltar).
// Retorna as atualizações de inventário a aplicar (id -> materialQuantidade
// restante, ou null pra apagar o item quando a quantidade zera) e quanto
// sobrou sem descontar (0 se conseguiu cobrir tudo).
export function planejarConsumoMaterial(grupos, quantidadeNecessaria) {
    let faltando = quantidadeNecessaria;
    const atualizacoes = {};
    for (const grupo of grupos) {
        if (faltando <= 0) break;
        for (const entrada of grupo.entradas) {
            if (faltando <= 0) break;
            const usar = Math.min(entrada.quantidade, faltando);
            const restante = entrada.quantidade - usar;
            atualizacoes[entrada.id] = restante > 0 ? restante : null;
            faltando -= usar;
        }
    }
    return { atualizacoes, faltando };
}

// Modal de "Criar": antes de rolar, escolhe (opcionalmente) qual tier de
// qualidade usar pra cada ingrediente da receita — o desconto do
// inventário é automático e cobre a quantidade exigida puxando de outros
// tiers QUALIFICADOS como troco se o escolhido não tiver o suficiente
// sozinho. O botão "🎲 Rolar" fica travado se não houver material com
// qualidade suficiente (ver materialQualificaParaNivel — nível 1-2 só
// aceita Baixa+, 3-4 só Média+, 5 só Alta) pra algum ingrediente, MESMO
// que haja estoque de qualidade inferior sobrando (esse estoque não
// serve pra essa receita e não conta). Qualidade ACIMA do mínimo exigido
// reduz -1 na dificuldade da receita por tipo de material usado acima do
// mínimo (regra do manual) — aplicado direto na dificuldade dentro de
// resolverCriacaoReceita, não no modificador do teste (ver lá o motivo).
export function abrirModalEscolherMateriais(receita, periciaNome, modificadorBase) {
    let modal = document.getElementById("modal-escolher-materiais");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-materiais";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const ingredientes = Array.isArray(receita.ingredientes) ? receita.ingredientes : [];
    const nivelItem = Number(receita.nivel) || 1;
    const tierMinimo = tierMinimoExigidoPeloNivel(nivelItem);
    // Ocasião Especial da perícia usada na criação (ver
    // htmlCheckboxesOcasionais/lerDeltaOcasionais acima) — mesma checagem
    // de qualquer outra rolagem de perícia.
    const ocasionaisReceita = modificadoresOcasionaisDaPericia(estado.fichaAtual, periciaNome);

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Criar — ${escapeHtml(receita.nome || "item")}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        ${!ingredientes.length
            ? `<p class="hint">Essa receita não tem materiais cadastrados — pode rolar direto.</p>`
            : `<p class="hint">Materiais são descontados automaticamente do inventário ao confirmar. Material abaixo da qualidade mínima do nível ${nivelItem} não pode ser usado nesta receita; qualidade ACIMA do mínimo reduz -1 na dificuldade por tipo de material usado.</p>
               <div id="materiais-escolha-lista"></div>`
        }
        <div id="materiais-ocasionais-lista">${htmlCheckboxesOcasionais(ocasionaisReceita, periciaNome)}</div>
        <div class="modal-btns">
            <button type="button" class="btn-ghost" id="btn-ir-inventario">Ir pro Inventário</button>
            <button type="button" class="btn-lime" id="btn-confirmar-materiais">🎲 Rolar</button>
        </div>
    `;

    const lista = modal.querySelector("#materiais-escolha-lista");
    const btnConfirmar = modal.querySelector("#btn-confirmar-materiais");

    // Reavalia se dá pra rolar: precisa ter, pra CADA ingrediente, estoque
    // de qualidade QUALIFICADA (>= mínimo do nível) suficiente pra cobrir
    // a quantidade exigida — estoque de qualidade inferior não conta.
    function atualizarEstadoBotao() {
        if (!lista) { btnConfirmar.disabled = false; btnConfirmar.title = ""; return; }
        const linhas = [...lista.querySelectorAll(".material-escolha-linha")];
        const faltando = linhas.filter(linha => linha.dataset.suficiente === "0");
        btnConfirmar.disabled = faltando.length > 0;
        btnConfirmar.title = faltando.length
            ? `Falta material: ${faltando.map(l => l.dataset.material).join(", ")}`
            : "";
    }

    ingredientes.forEach((ing, idx) => {
        const qualidades = qualidadesDoMaterial(ing.material);
        const grupos = materiaisAgregadosPorQualidade(ing.material);
        const gruposQualificados = grupos.filter(g => materialQualificaParaNivel(ing.material, g.qualidade, tierMinimo));
        const gruposInsuficientes = grupos.filter(g => !gruposQualificados.includes(g));
        const totalQualificado = gruposQualificados.reduce((acc, g) => acc + g.disponivel, 0);
        const totalInsuficiente = gruposInsuficientes.reduce((acc, g) => acc + g.disponivel, 0);
        const suficiente = totalQualificado >= ing.quantidade;

        const linha = document.createElement("div");
        linha.className = "receita-ingrediente-linha material-escolha-linha";
        linha.dataset.idx = idx;
        linha.dataset.material = ing.material;
        linha.dataset.suficiente = suficiente ? "1" : "0";

        const avisoQualidadeBaixa = totalInsuficiente > 0
            ? `<span class="entity-sub" style="color:var(--neon-red);">+ ${totalInsuficiente}x de qualidade abaixo do mínimo — não servem pra nível ${nivelItem}</span>`
            : "";
        const statusEstoque = suficiente
            ? `<span class="entity-sub">Em estoque (qualidade suficiente): ${totalQualificado}x</span>`
            : `<span class="entity-sub" style="color:var(--neon-red);">Faltam materiais — em estoque com qualidade suficiente: ${totalQualificado}x, precisa de ${ing.quantidade}x</span>`;

        const cabecalho = document.createElement("div");
        cabecalho.className = "entity-main";
        cabecalho.innerHTML = `
            <span class="entity-nome">${ing.quantidade}x ${escapeHtml(ing.material)}</span>
            ${qualidades ? `<span class="entity-sub">Mínimo pro nível ${nivelItem}: ${qualidades[tierMinimo]}</span>` : ""}
            ${statusEstoque}
            ${avisoQualidadeBaixa}
        `;
        linha.appendChild(cabecalho);

        // Só mostra o select de tier se houver mais de um tier QUALIFICADO
        // com estoque (material abaixo do mínimo nem aparece aqui — não
        // dá pra escolher usar algo que a receita não aceita).
        if (gruposQualificados.length > 1) {
            const selectQualidade = document.createElement("select");
            selectQualidade.className = "material-escolha-tier";
            gruposQualificados.forEach(g => {
                const opt = document.createElement("option");
                opt.value = g.qualidade || "";
                opt.innerText = `${g.qualidade || "Sem qualidade marcada"} — ${g.disponivel}x disponível`;
                selectQualidade.appendChild(opt);
            });
            linha.appendChild(selectQualidade);
        }

        lista.appendChild(linha);
    });

    atualizarEstadoBotao();

    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-ir-inventario").addEventListener("click", () => {
        modal.remove();
        abrirAba("inventario", "principal");
    });

    btnConfirmar.addEventListener("click", async () => {
        if (btnConfirmar.disabled) return;
        // Não desconta nada do inventário ainda — só decide QUAL estoque
        // (tier + entradas) cobriria cada ingrediente. O desconto de
        // verdade só acontece depois de rolar, em resolverCriacaoReceita,
        // porque a QUANTIDADE gasta de cada material depende do desfecho
        // do teste (sucesso gasta tudo, falha só uma fração, falha
        // crítica gasta tudo — ver regras do manual em resolverCriacaoReceita).
        let bonusQualidade = 0;
        const escolhas = [];

        if (lista) lista.querySelectorAll(".material-escolha-linha").forEach(linha => {
            const material = linha.dataset.material;
            const ing = ingredientes.find(i => i.material === material);
            if (!ing) return;
            const grupos = materiaisAgregadosPorQualidade(material)
                .filter(g => materialQualificaParaNivel(material, g.qualidade, tierMinimo));
            if (!grupos.length) return;

            const selectTier = linha.querySelector(".material-escolha-tier");
            const qualidadeEscolhida = selectTier ? (selectTier.value || null) : (grupos[0].qualidade || null);

            // Puxa primeiro do tier escolhido; se não tiver o suficiente
            // sozinho, completa com os demais tiers QUALIFICADOS como
            // troco (nunca com material abaixo do mínimo — esse já foi
            // filtrado acima e não entra nem como troco).
            const grupoEscolhido = grupos.find(g => (g.qualidade || null) === qualidadeEscolhida);
            const gruposOrdenados = grupoEscolhido
                ? [grupoEscolhido, ...grupos.filter(g => g !== grupoEscolhido)]
                : grupos;

            const idx = indiceQualidade(material, qualidadeEscolhida);
            if (idx > tierMinimo) bonusQualidade += 1;
            escolhas.push({ material, qualidade: qualidadeEscolhida, quantidade: ing.quantidade, gruposOrdenados });
        });

        // O bônus de qualidade NÃO entra no modificador do teste — ele
        // reduz a DIFICULDADE diretamente (ver resolverCriacaoReceita),
        // exatamente como o manual descreve ("-1 na dificuldade por tipo
        // de material de nível maior usado"). Isso importa porque o
        // modificador do teste de perícia tem um teto (+10) que essa
        // redução não deve competir com nem ficar sujeita.
        const deltaOcasionalReceita = lerDeltaOcasionais(modal.querySelector("#materiais-ocasionais-lista"), ocasionaisReceita);
        modal.remove();
        await resolverCriacaoReceita(receita, escolhas, bonusQualidade, modificadorBase + deltaOcasionalReceita);
    });
}

// Rola o teste de criação da receita e resolve sucesso/falha comparando
// o resultado (d20 + modificador) com a dificuldade cadastrada na
// receita, aplicando as regras do manual:
//   - Sucesso (resultado >= dificuldade): gasta todo o material
//     escolhido e gera o item — direto no inventário, se a receita
//     estiver vinculada a um item do Banco Global (itemGlobalId); senão
//     cria um item básico com o nome da receita.
//   - Falha (resultado < dificuldade, sem ser falha crítica): a cada 3
//     pontos abaixo da dificuldade, perde 1/3 dos materiais escolhidos
//     (arredondando pra cima, então uma falha registra pelo menos 1
//     unidade perdida por ingrediente assim que cruzar o primeiro
//     limiar de 3 pontos) — até no máximo perder tudo (3/3). O que não
//     é perdido continua no inventário, intacto.
//   - Falha Crítica (d20 natural 1, ou resultado final <= 1): perde
//     todo o material escolhido, sem gerar item.
//   - Receita sem dificuldade cadastrada: não dá pra resolver
//     sucesso/falha automaticamente — só registra a rolagem normal e
//     gasta o material integralmente (comportamento antigo), deixando
//     a resolução a critério do Mestre.
export async function resolverCriacaoReceita(receita, escolhas, bonusQualidade, modificadorFinal) {
    const consumo = checarConsumoDeAcao(false, false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const bruto = rolarD20();
    const resultado = bruto + Number(modificadorFinal || 0);
    // Acerto/Falha Crítica olham só pro d20 puro + modificador de
    // perícia — a redução de dificuldade por qualidade NÃO participa
    // disso (ela mexe na dificuldade, não no resultado do teste).
    const criticoPositivo = resultado >= 20;
    const criticoNegativo = bruto === 1 || resultado <= 1;
    const temDificuldade = receita.dificuldade || receita.dificuldade === 0;
    const dificuldadeBase = temDificuldade ? Number(receita.dificuldade) : null;
    // "-1 na dificuldade por tipo de material de nível maior usado" —
    // aplicado aqui em vez de somar no teste, pra não competir com o
    // teto de +10 do modificador de perícia. Não deixa a dificuldade
    // ajustada ficar negativa (sem efeito prático usar mais bônus do
    // que a própria dificuldade já cadastrada).
    const dificuldade = dificuldadeBase !== null ? Math.max(0, dificuldadeBase - bonusQualidade) : null;

    // fracaoPerdida: proporção do material escolhido que é de fato
    // descontada do inventário (0 a 1). Sem dificuldade cadastrada,
    // mantém o comportamento antigo (gasta tudo, sem julgar desfecho).
    let desfecho = "sem-dificuldade";
    let fracaoPerdida = 1;
    if (dificuldade !== null) {
        if (criticoNegativo) {
            desfecho = "falha-critica";
            fracaoPerdida = 1;
        } else if (resultado >= dificuldade) {
            desfecho = "sucesso";
            fracaoPerdida = 1;
        } else {
            desfecho = "falha";
            const deficit = dificuldade - resultado;
            const tercosPerdidos = Math.min(3, Math.floor(deficit / 3));
            fracaoPerdida = tercosPerdidos / 3;
        }
    }

    // Aplica o desconto de material proporcional ao desfecho — só agora
    // que já sabemos quanto de fato se perde de cada ingrediente.
    const usadosTexto = [];
    const atualizacoesInventario = {};
    escolhas.forEach(({ material, qualidade, quantidade, gruposOrdenados }) => {
        // Arredonda pra perto (não pra cima): "1/3 de 4" é ~1,33, então
        // perde 1, não 2 — mas garante ao menos 1 unidade perdida
        // sempre que fracaoPerdida > 0, pra uma falha nunca sair de
        // graça mesmo com ingrediente de quantidade baixa.
        const quantidadeGasta = fracaoPerdida <= 0
            ? 0
            : Math.min(quantidade, Math.max(1, Math.round(quantidade * fracaoPerdida)));
        if (fracaoPerdida > 0 && fracaoPerdida < 1) {
            usadosTexto.push(`${quantidadeGasta}/${quantidade}x ${material}${qualidade ? ` (${qualidade})` : ""}`);
        } else {
            usadosTexto.push(`${quantidade}x ${material}${qualidade ? ` (${qualidade})` : ""}`);
        }
        if (quantidadeGasta <= 0) return;
        const { atualizacoes } = planejarConsumoMaterial(gruposOrdenados, quantidadeGasta);
        Object.entries(atualizacoes).forEach(([id, valor]) => {
            atualizacoesInventario[id] = valor === null ? null : { ...estado.fichaAtual.inventario[id], materialQuantidade: valor };
        });
    });

    if (Object.keys(atualizacoesInventario).length) {
        const payload = {};
        Object.entries(atualizacoesInventario).forEach(([id, valor]) => {
            estado.fichaAtual.inventario[id] = valor;
            if (valor === null) delete estado.fichaAtual.inventario[id];
            payload[id] = valor;
        });
        await update(ref(db, `${caminhoBase()}/inventario`), payload);
    }

    // Sucesso: gera o item de verdade no inventário — reaproveita o
    // molde do Banco Global se a receita estiver vinculada
    // (itemGlobalId); senão cria um item básico só com nome/descrição.
    let itemCriadoNome = null;
    if (desfecho === "sucesso") {
        if (!estado.fichaAtual.inventario) estado.fichaAtual.inventario = {};
        let registroItem = null;
        if (receita.itemGlobalId) {
            try {
                const itemBanco = await buscarItemBancoPorId(receita.itemGlobalId);
                if (itemBanco) {
                    registroItem = autopreencherItemDoBanco(itemBanco, "levando");
                    // Item novo (criado agora, via receita) com modificador
                    // estruturado nasce DESLIGADO, igual a qualquer outro item
                    // novo — exceto droga, que não usa esse botão.
                    if (registroItem.ativo === undefined) {
                        registroItem.ativo = (registroItem.modificadores && registroItem.modificadores.length && registroItem.tag !== "droga") ? false : true;
                    }
                }
            } catch (e) {
                // Se o Banco falhar por qualquer motivo, cai pro item
                // básico abaixo em vez de travar a criação.
            }
        }
        if (!registroItem) {
            registroItem = {
                nome: receita.nome || "Item criado",
                descricao: receita.descricao || `Criado via receita${receita.dificuldade || receita.dificuldade === 0 ? ` (dif. ${receita.dificuldade})` : ""}.`,
                modificadores: [],
                ativo: true,
                tag: null,
                nivelTag: null,
                peso: 0,
                categoria: "levando",
                periciaUso: null,
                classeProtecao: null,
                calibre: null,
                reducoesDano: [],
                localProtegido: null,
                arma: null,
                carregador: null,
                projetil: null,
                materialTipo: null,
                materialQualidade: null,
                materialQuantidade: null
            };
        }
        const idNovoItem = gerarIdLocal();
        estado.fichaAtual.inventario[idNovoItem] = registroItem;
        await update(ref(db, `${caminhoBase()}/inventario/${idNovoItem}`), registroItem);
        itemCriadoNome = registroItem.nome;
    }

    const notaCritico = criticoNegativo
        ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre."
        : (criticoPositivo ? " ⚡ ACERTO CRÍTICO!" : "");

    const notaDesfecho = desfecho === "sucesso"
        ? ` ✅ Sucesso — "${itemCriadoNome}" criado e adicionado ao inventário.`
        : desfecho === "falha-critica"
            ? " 🔥 Falha Crítica — todo o material foi perdido."
            : desfecho === "falha"
                ? (fracaoPerdida > 0 ? ` ❌ Falha — perdeu ${Math.round(fracaoPerdida * 100)}% dos materiais usados.` : " ❌ Falha — nenhum material perdido.")
                : " (receita sem dificuldade cadastrada — resolução manual pelo Mestre.)";

    const listaTexto = usadosTexto.length ? ` — materiais: ${usadosTexto.join(", ")}` : "";
    const notaDificuldade = dificuldade !== null
        ? (bonusQualidade
            ? ` (dif. ${dificuldadeBase} -${bonusQualidade} por qualidade = ${dificuldade})`
            : ` (dif. ${dificuldade})`)
        : "";
    const rotulo = `Criar: ${receita.nome || "item"}${notaDificuldade}`;
    const quem = estado.isMestre ? `Mestre (${estado.modoNpc ? (estado.fichaAtual?.config?.nomeExibicao || estado.npcAtualId) : (nomeDeFicha(estado.fichaAtualId) || "—")})` : (estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador");

    await registrarRolagem({
        quem, modificador: modificadorFinal, resultado,
        detalhe: `${rotulo}: d20 (${bruto}) ${modificadorFinal >= 0 ? "+" : ""}${modificadorFinal}${notaCritico}${notaDesfecho}${listaTexto}`,
        critico: criticoNegativo ? "falha" : (criticoPositivo ? "acerto" : null)
    });

    const tipoToast = desfecho === "sucesso" ? "critico-acerto" : (desfecho === "falha-critica" || criticoNegativo ? "critico-falha" : "ok");
    toast(`${rotulo}: ${resultado} (d20: ${bruto} ${modificadorFinal >= 0 ? "+" : ""}${modificadorFinal})${notaDesfecho}`, tipoToast);

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: quem,
            detalhe: `${quem} rolou "${rotulo}" (resultado ${resultado}) e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }
}

export function renderizarReceitas() {
    if (!el.receitasLista) return;
    const entradasCriacao = Object.values(estado.fichaAtual.pericias || {})
        .filter(p => PERICIAS_CRIACAO_ITEM.includes(p.nome));
    const modificadoresPlanos = modificadoresAtuais();

    const corpoHtml = !entradasCriacao.length
        ? `<p class="entity-list-empty" style="cursor:default;">Nenhuma perícia de criação de item (Mecânica Automotiva, Armeiro, Ofícios Utilitários, Explosivos, Eletrônica ou Química) cadastrada nesta ficha ainda.</p>`
        : entradasCriacao.map(p => {
            const nivelPericia = Number(p.nivel) || 0;
            const calcPericia = calcularTotalPericia(p, estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(p.nome), limiteRolagemCriacaoParaPericia(p.nome));

            // Um "slot" por nível de 1 até o nível atual da perícia — cada
            // um comporta exatamente 1 receita gratuita (origem "livre").
            const slotsHtml = [];
            for (let nivel = 1; nivel <= nivelPericia; nivel++) {
                const livre = receitaLivreDoSlot(p.nome, nivel);
                if (livre) {
                    const r = estado.receitasGlobaisCache.find(g => g.id === livre.receitaGlobalId);
                    const detalhes = r ? [
                        (r.dificuldade || r.dificuldade === 0) ? `Dificuldade ${r.dificuldade}` : null,
                        (r.dificuldadeArmar || r.dificuldadeArmar === 0) ? `Dificuldade de armar ${r.dificuldadeArmar}` : null,
                        r.tempoCriacao ? `Tempo: ${escapeHtml(r.tempoCriacao)}` : null,
                        formatarIngredientes(r) ? `Materiais: ${escapeHtml(formatarIngredientes(r))}` : null,
                        (r.custo || r.custo === 0) ? `Custo: CN$ ${r.custo}` : null
                    ].filter(Boolean).join(" · ") : null;
                    slotsHtml.push(`
                        <li class="receita-slot receita-slot-preenchido" style="cursor:default;">
                            <div class="entity-main">
                                <span class="entity-nome">Nível ${nivel} · ${escapeHtml(r ? (r.nome || "(receita sem nome)") : "(receita removida do Banco Global)")}</span>
                                ${detalhes ? `<span class="entity-sub">${detalhes}</span>` : ""}
                                ${r?.descricao ? `<span class="entity-sub">${escapeHtml(r.descricao)}</span>` : ""}
                            </div>
                            <div class="entity-badges">
                                ${r ? `<button type="button" class="btn-rolar btn-blue receita-criar" data-receita-id="${r.id}" data-pericia="${escapeHtml(p.nome)}" data-modificador="${calcPericia.total}" title="Rolar ${p.nome} (${calcPericia.total >= 0 ? "+" : ""}${calcPericia.total}) pra criar">🎲 Criar</button>` : ""}
                                ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
                            </div>
                            <span class="hint-inline">Gratuita — travada${estado.isMestre ? "" : " (só o Mestre pode trocar)"}</span>
                            ${estado.isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${livre.id}">Remover</button>` : ""}
                        </li>
                    `);
                } else {
                    const opcoes = estado.receitasGlobaisCache.filter(r => r.periciaVinculada === p.nome && (Number(r.nivel) || 1) === nivel);
                    if (opcoes.length) {
                        slotsHtml.push(`
                            <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}">
                                <label>Nível ${nivel} — escolha sua receita gratuita</label>
                                <select class="receita-slot-select">
                                    ${opcoes.map(r => `<option value="${r.id}">${escapeHtml(r.nome || "(sem nome)")}</option>`).join("")}
                                </select>
                                <button type="button" class="btn-lime receita-slot-confirmar">Adquirir</button>
                            </li>
                        `);
                    } else {
                        slotsHtml.push(`
                            <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}">
                                <p class="hint">Nenhuma receita de nível ${nivel} cadastrada ainda no Banco Global pra ${escapeHtml(p.nome)}.</p>
                                <button type="button" class="btn-ghost receita-slot-criar">+ Criar receita nível ${nivel}</button>
                            </li>
                        `);
                    }
                }
            }

            // Módulos de detonação (manual pg. 81): SÓ pra Explosivos — um
            // slot grátis A MAIS por nível, em paralelo ao slot normal de
            // bomba acima, só que a receita vem de Ofícios Utilitários ou
            // Eletrônica (quem cria módulo de verdade — ver
            // receitasModuloDetonacaoDisponiveis). tipoSlot="modulo"
            // mantém os dois slots (bomba e módulo) do mesmo nível
            // independentes um do outro.
            const moduloSlotsHtml = [];
            if (p.nome === "Explosivos") {
                for (let nivel = 1; nivel <= nivelPericia; nivel++) {
                    const livre = receitaLivreDoSlot(p.nome, nivel, "modulo");
                    if (livre) {
                        const r = estado.receitasGlobaisCache.find(g => g.id === livre.receitaGlobalId);
                        const item = r?.itemGlobalId ? estado.itensGlobaisCache.find(it => it.id === r.itemGlobalId) : null;
                        moduloSlotsHtml.push(`
                            <li class="receita-slot receita-slot-preenchido" style="cursor:default;">
                                <div class="entity-main">
                                    <span class="entity-nome">Nível ${nivel} · ${escapeHtml(r ? (r.nome || "(receita sem nome)") : "(receita removida do Banco Global)")}</span>
                                    ${item?.descricao ? `<span class="entity-sub">${escapeHtml(item.descricao)}</span>` : (r?.descricao ? `<span class="entity-sub">${escapeHtml(r.descricao)}</span>` : "")}
                                </div>
                                <div class="entity-badges">
                                    ${r ? `<button type="button" class="btn-rolar btn-blue receita-criar" data-receita-id="${r.id}" data-pericia="${escapeHtml(r.periciaVinculada)}" data-modificador="${calcularTotalPericia(Object.values(estado.fichaAtual.pericias || {}).find(pp => pp.nome === r.periciaVinculada) || { nome: r.periciaVinculada, nivel: 0 }, estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(r.periciaVinculada), limiteRolagemCriacaoParaPericia(r.periciaVinculada)).total}" title="Rolar ${escapeHtml(r.periciaVinculada)} pra criar">🎲 Criar</button>` : ""}
                                    ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
                                </div>
                                <span class="hint-inline">Módulo de detonação — gratuita — travada${estado.isMestre ? "" : " (só o Mestre pode trocar)"}</span>
                                ${estado.isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${livre.id}">Remover</button>` : ""}
                            </li>
                        `);
                    } else {
                        const opcoes = receitasModuloDetonacaoDisponiveis(nivel);
                        if (opcoes.length) {
                            moduloSlotsHtml.push(`
                                <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}" data-tipo-slot="modulo">
                                    <label>Nível ${nivel} — escolha seu módulo de detonação gratuito</label>
                                    <select class="receita-slot-select">
                                        ${opcoes.map(r => `<option value="${r.id}">${escapeHtml(r.nome || "(sem nome)")} (${escapeHtml(r.periciaVinculada)})</option>`).join("")}
                                    </select>
                                    <button type="button" class="btn-lime receita-slot-confirmar">Adquirir</button>
                                </li>
                            `);
                        } else {
                            moduloSlotsHtml.push(`
                                <li class="receita-slot receita-slot-vazio" data-pericia="${escapeHtml(p.nome)}" data-nivel="${nivel}" data-tipo-slot="modulo">
                                    <p class="hint">Nenhuma receita de módulo de detonação de nível ${nivel} cadastrada ainda no Banco Global (Ofícios Utilitários/Eletrônica, item com tag "Módulo de Detonação").</p>
                                </li>
                            `);
                        }
                    }
                }
            }

            // Se o nível da perícia CAIU depois de uma receita gratuita já
            // ter sido concedida num nível mais alto (ex: penalidade,
            // ajuste do Mestre), essa receita não é apagada — só some da
            // lista de slots ativos (o for acima só vai até nivelPericia).
            // Mostra ela aqui, marcada como "guardada", pra não parecer que
            // sumiu: se a perícia voltar a esse nível, ela reaparece no
            // slot normalmente (mesmo registro, mesmo id).
            const guardadas = Object.entries(estado.fichaAtual.receitasConhecidas || {})
                .filter(([, c]) => c.periciaVinculada === p.nome && c.origem === "livre" && Number(c.nivel) > nivelPericia)
                .map(([id, c]) => ({ id, ...c }))
                .sort((a, b) => a.nivel - b.nivel);
            const guardadasHtml = guardadas.length
                ? `<div class="hint-inline" style="margin-top:10px;">Guardadas (nível acima do atual da perícia — voltam a ficar disponíveis se a perícia subir de novo)</div>
                   <ul class="entity-list">${guardadas.map(x => {
                       const r = estado.receitasGlobaisCache.find(g => g.id === x.receitaGlobalId);
                       return `
                        <li class="entidade-desativada" style="cursor:default;">
                            <div class="entity-main">
                                <span class="entity-nome">Nível ${x.nivel} · ${escapeHtml(r ? (r.nome || "(sem nome)") : "(receita removida do Banco Global)")}${x.tipoSlot === "modulo" ? " (módulo de detonação)" : ""}</span>
                            </div>
                            ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
                            ${estado.isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${x.id}">Remover</button>` : ""}
                        </li>`;
                   }).join("")}</ul>`
                : "";

            const extras = receitasExtrasDaPericia(p.nome);
            const extrasHtml = extras.length
                ? `<div class="hint-inline" style="margin-top:10px;">Receitas adquiridas em jogo (adicionadas pelo Mestre ou aprendidas com Engenharia)</div>
                   <ul class="entity-list">${extras.map(x => {
                       const r = estado.receitasGlobaisCache.find(g => g.id === x.receitaGlobalId);
                       const podeCriar = r && Number(x.nivel) <= nivelPericia;
                       return `
                        <li style="cursor:default;">
                            <div class="entity-main">
                                <span class="entity-nome">Nível ${x.nivel} · ${escapeHtml(r ? (r.nome || "(sem nome)") : "(receita removida do Banco Global)")}</span>
                                ${r?.descricao ? `<span class="entity-sub">${escapeHtml(r.descricao)}</span>` : ""}
                                ${!podeCriar && r ? `<span class="entity-sub">Perícia ainda não chegou no nível ${x.nivel} pra criar isso.</span>` : ""}
                            </div>
                            <div class="entity-badges">
                                ${podeCriar ? `<button type="button" class="btn-rolar btn-blue receita-criar" data-receita-id="${r.id}" data-pericia="${escapeHtml(p.nome)}" data-modificador="${calcPericia.total}" title="Rolar ${p.nome} (${calcPericia.total >= 0 ? "+" : ""}${calcPericia.total}) pra criar">🎲 Criar</button>` : ""}
                                ${r ? `<button type="button" class="btn-ghost receita-editar" data-receita-editar-id="${r.id}" title="Editar essa receita no Banco Global">Editar</button>` : ""}
                            </div>
                            <span class="hint-inline">${x.origem === "engenharia" ? `aprendida com Engenharia por ${escapeHtml(x.adicionadoPorNome || "—")}` : `adicionada por ${escapeHtml(x.adicionadoPorNome || "—")}`}</span>
                            ${estado.isMestre ? `<button type="button" class="btn-red receita-remover" data-id="${x.id}">Remover</button>` : ""}
                        </li>`;
                   }).join("")}</ul>`
                : "";

            // Mestre pode adicionar qualquer receita já cadastrada no Banco
            // Global a este personagem específico, fora dos slots gratuitos
            // (representa algo adquirido/ensinado durante a sessão).
            const todasDaPericia = estado.receitasGlobaisCache.filter(r => r.periciaVinculada === p.nome);
            const formExtraMestre = estado.isMestre && todasDaPericia.length
                ? `
                    <li class="receita-slot receita-extra-form" data-pericia="${escapeHtml(p.nome)}">
                        <label>Adicionar receita extra a este personagem (Mestre)</label>
                        <select class="receita-extra-select">
                            ${todasDaPericia.map(r => `<option value="${r.id}" data-nivel="${Number(r.nivel) || 1}">Nível ${Number(r.nivel) || 1} — ${escapeHtml(r.nome || "(sem nome)")}</option>`).join("")}
                        </select>
                        <button type="button" class="btn-ghost receita-extra-confirmar">+ Adicionar ao personagem</button>
                    </li>
                `
                : "";

            const moduloSlotsSecao = moduloSlotsHtml.length
                ? `<div class="hint-inline" style="margin-top:10px;">Módulos de detonação (um grátis por ponto em Explosivos — manual pg. 81)</div><ul class="entity-list">${moduloSlotsHtml.join("")}</ul>`
                : "";

            return `
                <div class="section-header">${escapeHtml(p.nome)} <span class="hint-inline">nível ${nivelPericia}</span></div>
                ${nivelPericia < 1 ? `<p class="hint">Perícia ainda em nível 0 — nenhuma receita gratuita disponível.</p>` : `<ul class="entity-list">${slotsHtml.join("")}${formExtraMestre}</ul>`}
                ${moduloSlotsSecao}
                ${extrasHtml}
                ${guardadasHtml}
            `;
        }).join("");

    el.receitasLista.innerHTML = `${corpoHtml}<button type="button" class="btn-lime" id="btn-add-receita" style="margin-top:12px;">+ Cadastrar nova receita no Banco Global</button>`;
    document.getElementById("btn-add-receita")?.addEventListener("click", () => abrirModalCriarReceita());

    // Escolher a receita gratuita de um slot vazio (dentre as já
    // cadastradas no Banco Global pra aquele nível/perícia — ou, se
    // data-tipo-slot="modulo", dentre as receitas de módulo de
    // detonação daquele nível, que são de OUTRA perícia — ver
    // receitasModuloDetonacaoDisponiveis).
    el.receitasLista.querySelectorAll(".receita-slot-confirmar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const li = btn.closest(".receita-slot");
            const periciaNome = li.dataset.pericia;
            const nivel = Number(li.dataset.nivel);
            const tipoSlot = li.dataset.tipoSlot === "modulo" ? "modulo" : "bomba";
            const select = li.querySelector(".receita-slot-select");
            if (!select || !select.value) return;
            await concederReceitaConhecida(periciaNome, nivel, select.value, "livre", tipoSlot);
        });
    });

    // Nenhuma receita cadastrada ainda nesse nível: cria uma nova no
    // Banco Global já pré-preenchida com perícia/nível, e ao salvar ela
    // já vira automaticamente a receita gratuita desse slot.
    el.receitasLista.querySelectorAll(".receita-slot-criar").forEach(btn => {
        btn.addEventListener("click", () => {
            const li = btn.closest(".receita-slot");
            abrirModalCriarReceita(null, {
                periciaVinculada: li.dataset.pericia,
                nivel: Number(li.dataset.nivel),
                origem: "livre"
            });
        });
    });

    // Mestre: adicionar receita extra (fora do slot gratuito) a este personagem.
    el.receitasLista.querySelectorAll(".receita-extra-confirmar").forEach(btn => {
        btn.addEventListener("click", async () => {
            const li = btn.closest(".receita-slot");
            const periciaNome = li.dataset.pericia;
            const select = li.querySelector(".receita-extra-select");
            if (!select || !select.value) return;
            const nivel = Number(select.selectedOptions[0]?.dataset.nivel) || 1;
            await concederReceitaConhecida(periciaNome, nivel, select.value, "mestre");
        });
    });

    // Mestre: remover uma receita conhecida (gratuita ou extra).
    el.receitasLista.querySelectorAll(".receita-remover").forEach(btn => {
        btn.addEventListener("click", () => removerReceitaConhecida(btn.dataset.id));
    });

    // Editar a receita já conhecida direto no Banco Global (mesma modal
    // usada pra criar — ver abrirModalCriarReceita — e disponível tanto
    // pro jogador quanto pro Mestre, já que o Banco Global é
    // compartilhado entre todo mundo, igual o de itens). Como a edição
    // é no registro global, ela afeta qualquer outra ficha/mesa que use
    // essa mesma receita.
    el.receitasLista.querySelectorAll(".receita-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const receita = estado.receitasGlobaisCache.find(g => g.id === btn.dataset.receitaEditarId);
            if (!receita) { toast("Receita não encontrada no Banco Global.", "erro"); return; }
            abrirModalCriarReceita(receita);
        });
    });

    // Criar o item da receita: primeiro escolhe quais materiais do
    // inventário vai usar (a qualidade deles influencia a rolagem — ver
    // abrirModalEscolherMateriais), depois rola a perícia vinculada e
    // registra no Log de Dados.
    el.receitasLista.querySelectorAll(".receita-criar").forEach(btn => {
        btn.addEventListener("click", () => {
            const receita = estado.receitasGlobaisCache.find(g => g.id === btn.dataset.receitaId);
            if (!receita) { toast("Receita não encontrada no Banco Global.", "erro"); return; }
            abrirModalEscolherMateriais(receita, btn.dataset.pericia, Number(btn.dataset.modificador) || 0);
        });
    });
}

// Modal própria (fora do sistema genérico modal-item, que já é
// complexo demais pra emprestar campos de receita sem confundir tudo)
// pra cadastrar uma nova receita no Banco Global — usável tanto pelo
// jogador (de dentro da ficha) quanto pelo Mestre (de dentro de
// qualquer ficha ou da "Biblioteca de Receitas" no Painel do Mestre,
// ver montarPainelBibliotecaReceitas). "O item a ser criado" é
// representado pelo nome + (opcional) vínculo com um item já existente
// no Banco Global de Itens, via autocompletar — se não achar nada,
// segue como texto livre mesmo (a receita não depende de o item já
// estar cadastrado lá).
// opcoesSlot (opcional): { periciaVinculada, nivel, origem } — quando a
// modal é aberta a partir de um slot vazio na aba Receitas (nenhuma
// receita daquele nível cadastrada ainda no Banco Global), pra já
// pré-preencher e travar perícia/nível, e, ao salvar, conceder
// automaticamente essa receita recém-criada ao personagem que estava
// com o slot aberto (ver concederReceitaConhecida).
// Perícias de criação cujo resultado PRECISA sair funcional (a receita
// tem que estar vinculada a um item de verdade do Banco Global de
// Itens) — senão o item nasce só decorativo (tag null, sem dano,
// bônus, efeito, cura, trava aberta, nada), o que trava o jogador na
// hora de tentar usar. Fora dessa lista (Mecânica Automotiva,
// Biomecânica) o item básico sem vínculo ainda é uma opção legítima
// hoje, então o vínculo continua opcional — mas se algum dia isso virar
// problema também, é só adicionar aqui.
const PERICIAS_QUE_EXIGEM_ITEM_VINCULADO = ["Armeiro", "Explosivos", "Eletrônica", "Ofícios Utilitários", "Química"];

export function abrirModalCriarReceita(receitaExistente, opcoesSlot, valoresIniciais, contextoEngenharia) {
    let modal = document.getElementById("modal-criar-receita");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-criar-receita";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    // valoresIniciais tem prioridade — é o rascunho recém-vindo do
    // fluxo "+ Criar item no Banco Global" (ver retomarReceitaAoFecharModal
    // dentro de fecharModal), com tudo que já tinha sido digitado antes
    // de ir criar o item, mais o itemGlobalId recém-vinculado.
    const r = { ...(receitaExistente || {}), ...(valoresIniciais || {}) };
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${receitaExistente ? "Editar receita" : "Nova receita"} — Banco Global</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <div class="modal-field">
            <label for="receita-nome">Nome do item a ser criado</label>
            <input type="text" id="receita-nome" value="${escapeHtml(r.nome || "")}" autocomplete="off">
            <div id="receita-item-opcoes" class="searchable-options" style="display:none;"></div>
            <span class="hint-inline" id="receita-item-vinculo-hint"></span>
            <button type="button" class="btn-ghost" id="btn-receita-criar-item" style="margin-top:6px;">+ Criar item no Banco Global</button>
        </div>
        <div class="modal-field">
            <label for="receita-pericia">Perícia de criação vinculada</label>
            <select id="receita-pericia"></select>
        </div>
        <div class="modal-field">
            <label for="receita-nivel">Nível do item (nível mínimo da perícia pra criar)</label>
            <select id="receita-nivel"></select>
            <p class="hint" id="receita-hint-requisito-engenharia"></p>
        </div>
        <div class="modal-field">
            <label for="receita-dificuldade">Dificuldade (opcional)</label>
            <input type="number" id="receita-dificuldade" min="0" step="1" value="${r.dificuldade ?? ""}">
        </div>
        <div class="modal-field">
            <label for="receita-dificuldade-armar">Dificuldade de armar (opcional — manual: só Explosivos tem teste separado de criar e armar, pg. 81)</label>
            <input type="number" id="receita-dificuldade-armar" min="0" step="1" value="${r.dificuldadeArmar ?? ""}">
        </div>
        <div class="modal-field">
            <label for="receita-tempo">Tempo de criação (opcional)</label>
            <input type="text" id="receita-tempo" placeholder="ex.: 2 horas, 1 dia..." value="${escapeHtml(r.tempoCriacao || "")}">
        </div>
        <div class="modal-field">
            <label>Materiais necessários (ingredientes)</label>
            <span class="hint-inline">Só materiais válidos do Manual — escolha o tipo e a quantidade.</span>
            <div id="receita-ingredientes-lista"></div>
            <button type="button" class="btn-ghost" id="btn-add-ingrediente" style="margin-top:6px;">+ Adicionar material</button>
        </div>
        <div class="modal-field">
            <label for="receita-custo">Custo em CN$ (opcional)</label>
            <input type="number" id="receita-custo" min="0" step="1" value="${r.custo ?? ""}">
        </div>
        <div class="modal-field">
            <label for="receita-categoria">Categoria (opcional)</label>
            <input type="text" id="receita-categoria" list="receita-categoria-datalist" placeholder="Ex.: Armas improvisadas, Químicos..." value="${escapeHtml(r.categoria || "")}">
            <datalist id="receita-categoria-datalist"></datalist>
            <p class="hint">Usada pra filtrar a Biblioteca de Receitas depois.</p>
        </div>
        <div class="modal-field">
            <label for="receita-descricao">Descrição / efeito (opcional)</label>
            <textarea id="receita-descricao" rows="3">${escapeHtml(r.descricao || "")}</textarea>
        </div>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-receita">${receitaExistente ? "Salvar alterações" : "Criar receita"}</button>
        </div>
    `;

    const selectPericia = modal.querySelector("#receita-pericia");
    PERICIAS_CRIACAO_ITEM.forEach(nome => {
        const opt = document.createElement("option");
        opt.value = nome;
        opt.innerText = nome;
        selectPericia.appendChild(opt);
    });
    selectPericia.value = opcoesSlot?.periciaVinculada
        ? opcoesSlot.periciaVinculada
        : (PERICIAS_CRIACAO_ITEM.includes(r.periciaVinculada) ? r.periciaVinculada : PERICIAS_CRIACAO_ITEM[0]);
    selectPericia.disabled = !!opcoesSlot?.periciaVinculada;

    // Nível do item = nível mínimo que a perícia de criação precisa ter
    // pra essa receita poder ser usada (perícia vai de 0 a 5, mas nível
    // 0 não cria nada — por isso a receita começa em 1). É esse campo
    // que permite a aba "Receitas" da ficha organizar/filtrar as
    // receitas de cada perícia por nível (ver renderizarReceitas).
    const selectNivel = modal.querySelector("#receita-nivel");
    for (let n = 1; n <= 5; n++) {
        const opt = document.createElement("option");
        opt.value = String(n);
        opt.innerText = `Nível ${n}`;
        selectNivel.appendChild(opt);
    }
    selectNivel.value = String(opcoesSlot?.nivel || (r.nivel && r.nivel >= 1 && r.nivel <= 5 ? r.nivel : 1));
    selectNivel.disabled = !!opcoesSlot?.nivel;

    // Sugestão (datalist) de categoria já usada noutras receitas —
    // mesmo padrão do modal de item/NPC (plano-busca-categorias.txt,
    // Fase A).
    const datalistCategoriaReceita = modal.querySelector("#receita-categoria-datalist");
    categoriasDistintas(estado.receitasGlobaisCache).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        datalistCategoriaReceita.appendChild(opt);
    });

    // Autocompletar pelo nome, contra o Banco Global de Itens já
    // carregado (estado.itensGlobaisCache) — mesmo padrão usado no modal de
    // item (configurarAutocompleteItemBanco), simplificado pra só
    // guardar o vínculo (itemGlobalId), sem preencher outros campos.
    let itemGlobalIdVinculado = r.itemGlobalId || null;
    const inputNome = modal.querySelector("#receita-nome");
    const opcoesDiv = modal.querySelector("#receita-item-opcoes");
    const vinculoHint = modal.querySelector("#receita-item-vinculo-hint");

    // Deixa claro, ANTES de tentar salvar, quando a receita vai gerar
    // um item sem função nenhuma (sem vínculo, numa perícia que precisa
    // de dano/efeito real — ver PERICIAS_QUE_EXIGEM_ITEM_VINCULADO).
    function atualizarAvisoVinculo() {
        const exige = PERICIAS_QUE_EXIGEM_ITEM_VINCULADO.includes(selectPericia.value);
        if (itemGlobalIdVinculado) {
            vinculoHint.innerText = "✅ Vinculada a um item do Banco Global de Itens — o item criado sai pronto pra usar (com dano/efeito reais).";
            vinculoHint.classList.remove("hint-alerta");
        } else if (exige) {
            vinculoHint.innerText = `⚠️ ${selectPericia.value} precisa de um item vinculado — sem isso, o item criado sai só decorativo (sem tag, sem bônus, sem efeito nenhum — não funciona de verdade). Digite o nome pra buscar um item já cadastrado no Banco Global; se ele ainda não existir, cadastre-o primeiro (ex.: pelo botão "+ Adicionar item" com a opção "Salvar no Banco Global" marcada) e volte aqui pra vincular.`;
            vinculoHint.classList.add("hint-alerta");
        } else {
            vinculoHint.innerText = "Digite pra buscar um item já cadastrado no Banco Global de Itens (opcional).";
            vinculoHint.classList.remove("hint-alerta");
        }
    }

    inputNome.addEventListener("input", () => {
        itemGlobalIdVinculado = null;
        atualizarAvisoVinculo();
        const texto = inputNome.value.trim().toLowerCase();
        if (!texto) { opcoesDiv.style.display = "none"; return; }
        const encontrados = estado.itensGlobaisCache.filter(it => (it.nome || "").toLowerCase().includes(texto)).slice(0, 8);
        if (!encontrados.length) { opcoesDiv.style.display = "none"; return; }
        opcoesDiv.innerHTML = "";
        encontrados.forEach(it => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${it.nome} — ${rotuloTag(it.tag)}`;
            div.addEventListener("click", () => {
                inputNome.value = it.nome;
                itemGlobalIdVinculado = it.id;
                atualizarAvisoVinculo();
                opcoesDiv.style.display = "none";
            });
            opcoesDiv.appendChild(div);
        });
        opcoesDiv.style.display = "block";
    });
    selectPericia.addEventListener("change", atualizarAvisoVinculo);
    atualizarAvisoVinculo();

    // Aviso ao vivo do requisito de Engenharia (ver atendeRequisitoCriarReceita,
    // dados-manual.js) — só faz sentido pra receita NOVA com uma ficha
    // de personagem de verdade no contexto (mesmas condições checadas
    // de novo, pra valer, no clique de "Criar receita" mais abaixo).
    const hintRequisito = modal.querySelector("#receita-hint-requisito-engenharia");
    function atualizarAvisoRequisitoEngenharia() {
        if (!hintRequisito) return;
        if (receitaExistente || !estado.fichaAtual || estado.isMestre || opcoesSlot?.origem === "livre") { hintRequisito.innerText = ""; return; }
        const requisito = atendeRequisitoCriarReceita(estado.fichaAtual.pericias, Number(selectNivel.value) || 1, selectPericia.value);
        hintRequisito.innerText = requisito.ok ? "" : `⚠️ ${requisito.motivo}`;
        hintRequisito.classList.toggle("hint-alerta", !requisito.ok);
    }
    selectNivel.addEventListener("change", atualizarAvisoRequisitoEngenharia);
    selectPericia.addEventListener("change", atualizarAvisoRequisitoEngenharia);
    atualizarAvisoRequisitoEngenharia();

    // Ingredientes: cada linha é { material, quantidade }, com o material
    // restrito à lista fechada MATERIAIS_CRIACAO (seção "Materiais" do
    // Manual) — nada de texto livre, pra manter a receita sempre
    // referenciando um tipo de material que existe de verdade no jogo.
    const listaIngredientes = modal.querySelector("#receita-ingredientes-lista");
    const nomesMateriais = MATERIAIS_CRIACAO.map(m => m.nome);
    function adicionarLinhaIngrediente(materialSelecionado, qualidadeSelecionada, quantidade) {
        const linha = document.createElement("div");
        linha.className = "receita-ingrediente-linha";
        const selectMaterial = document.createElement("select");
        nomesMateriais.forEach(nome => {
            const opt = document.createElement("option");
            opt.value = nome;
            opt.innerText = nome;
            selectMaterial.appendChild(opt);
        });
        selectMaterial.value = nomesMateriais.includes(materialSelecionado) ? materialSelecionado : nomesMateriais[0];

        // Qualidade só aparece pros materiais que realmente têm essa
        // variação no manual (a maioria — Material bélico e Materiais
        // especiais não têm tiers de qualidade, então ficam sem esse
        // select), e usa os nomes exatos daquele material (a maioria é
        // Baixa/Média/Boa, mas alguns variam — ver qualidadesDoMaterial).
        const selectQualidade = document.createElement("select");
        function atualizarOpcoesQualidade() {
            selectQualidade.innerHTML = "";
            const qualidades = qualidadesDoMaterial(selectMaterial.value);
            if (qualidades) {
                qualidades.forEach(q => {
                    const opt = document.createElement("option");
                    opt.value = q;
                    opt.innerText = q;
                    selectQualidade.appendChild(opt);
                });
                selectQualidade.value = qualidades.includes(qualidadeSelecionada) ? qualidadeSelecionada : qualidades[0];
                selectQualidade.style.display = "";
            } else {
                selectQualidade.style.display = "none";
            }
        }
        atualizarOpcoesQualidade();
        selectMaterial.addEventListener("change", atualizarOpcoesQualidade);

        const inputQtd = document.createElement("input");
        inputQtd.type = "number";
        inputQtd.min = "1";
        inputQtd.step = "1";
        inputQtd.value = quantidade || 1;
        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "btn-red";
        btnRemover.innerText = "×";
        btnRemover.title = "Remover este material";
        btnRemover.addEventListener("click", () => linha.remove());
        linha.append(selectMaterial, selectQualidade, inputQtd, btnRemover);
        listaIngredientes.appendChild(linha);
    }
    if (Array.isArray(r.ingredientes) && r.ingredientes.length) {
        r.ingredientes.forEach(ing => adicionarLinhaIngrediente(ing.material, ing.qualidade, ing.quantidade));
    } else {
        adicionarLinhaIngrediente();
    }
    modal.querySelector("#btn-add-ingrediente").addEventListener("click", () => adicionarLinhaIngrediente());

    // "+ Criar item no Banco Global" — pra quando o item de verdade
    // ainda não existe no Banco (ver aviso de PERICIAS_QUE_EXIGEM_ITEM_
    // VINCULADO acima): sai pro modal de item de verdade (Biblioteca de
    // Itens, se Mestre; item de ficha com "Salvar no Banco Global" já
    // marcado, se jogador — só o Mestre mexe direto na Biblioteca) já
    // com o nome preenchido, e guarda tudo que já tinha sido digitado
    // aqui pra restaurar sozinho ao voltar (ver estado.receitaAguardandoVinculo
    // e fecharModal).
    modal.querySelector("#btn-receita-criar-item").addEventListener("click", () => {
        const nomeRascunho = inputNome.value.trim();
        if (!nomeRascunho) { toast("Dê um nome ao item antes de criar — ele preenche o nome do item novo no Banco Global.", "erro"); return; }
        estado.receitaAguardandoVinculo = {
            receitaExistente,
            opcoesSlot,
            rascunho: {
                nome: nomeRascunho,
                periciaVinculada: selectPericia.value,
                nivel: Number(selectNivel.value) || 1,
                dificuldade: modal.querySelector("#receita-dificuldade").value !== "" ? Number(modal.querySelector("#receita-dificuldade").value) || 0 : null,
                dificuldadeArmar: modal.querySelector("#receita-dificuldade-armar").value !== "" ? Number(modal.querySelector("#receita-dificuldade-armar").value) || 0 : null,
                tempoCriacao: modal.querySelector("#receita-tempo").value.trim(),
                ingredientes: Array.from(listaIngredientes.querySelectorAll(".receita-ingrediente-linha")).map(linha => {
                    const selects = linha.querySelectorAll("select");
                    const materialNome = selects[0].value;
                    return {
                        material: materialNome,
                        qualidade: qualidadesDoMaterial(materialNome) ? selects[1].value : null,
                        quantidade: Number(linha.querySelector("input").value) || 1
                    };
                }),
                custo: modal.querySelector("#receita-custo").value !== "" ? Number(modal.querySelector("#receita-custo").value) || 0 : null,
                categoria: modal.querySelector("#receita-categoria").value.trim(),
                descricao: modal.querySelector("#receita-descricao").value.trim(),
                itemGlobalId: itemGlobalIdVinculado
            }
        };
        modal.remove();
        if (estado.isMestre) {
            abrirModalNovo("itensGlobais");
        } else {
            abrirModalNovo("inventario");
            // Ver declaração de estado.criarItemApenasNoBanco: setado DEPOIS de
            // abrirModalNovo porque ele reseta a flag pra false no início
            // (proteção padrão contra vazar pra próxima abertura do
            // modal) — aqui é exatamente o fluxo que precisa dela true.
            estado.criarItemApenasNoBanco = true;
        }
        // Pré-preenche depois que o modal de item já montou os campos
        // (abrirModalNovo/prepararModalParaLista rodam de forma síncrona
        // — este setTimeout(0) só garante que roda DEPOIS disso).
        setTimeout(() => {
            if (el.modalNome) el.modalNome.value = nomeRascunho;
            if (!estado.isMestre && el.modalCampoSalvarBanco && el.modalCampoSalvarBanco.style.display !== "none") {
                el.modalSalvarBanco.checked = true;
                // Travado marcado: neste fluxo o ponto INTEIRO é ir pro
                // Banco Global (catálogo) — desmarcar não faria sentido
                // (o item não teria pra onde ir).
                el.modalSalvarBanco.disabled = true;
                if (el.modalCampoSalvarBanco) {
                    let avisoSoBanco = el.modalCampoSalvarBanco.querySelector(".hint-item-so-banco");
                    if (!avisoSoBanco) {
                        avisoSoBanco = document.createElement("p");
                        avisoSoBanco.className = "hint hint-item-so-banco";
                        el.modalCampoSalvarBanco.appendChild(avisoSoBanco);
                    }
                    avisoSoBanco.innerText = "Este item é só o protótipo da receita, pro Banco Global (catálogo) — não entra no seu inventário.";
                }
            }
        }, 0);
    });


    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-receita").addEventListener("click", async () => {
        const nome = inputNome.value.trim();
        if (!nome) { toast("Dê um nome ao item a ser criado.", "erro"); return; }
        if (!itemGlobalIdVinculado && PERICIAS_QUE_EXIGEM_ITEM_VINCULADO.includes(selectPericia.value)) {
            toast(`Vincule essa receita a um item real do Banco Global antes de salvar — sem isso, o item criado por ela não vai ter tag, bônus nem efeito nenhum. Cadastre o item primeiro (pelo "+ Adicionar item" com "Salvar no Banco Global" marcado) e depois vincule pelo nome aqui.`, "erro");
            return;
        }
        // Requisito de Engenharia (só pra AUTORAR receita nova — editar
        // uma já existente é só corrigir texto, não re-desenhar o
        // esquema do zero; e só quando há uma ficha de personagem de
        // verdade no contexto E é o próprio jogador fazendo isso —
        // Mestre NUNCA é travado por essa exigência, nem precisa de
        // Godmode ligado: ele pode adicionar à ficha do jogador uma
        // receita comprada pronta (ex.: no Dark Net/BlackPrint) mesmo
        // que a Engenharia ou a perícia vinculada do personagem ainda
        // não cheguem no nível exigido pra "desenhar o esquema" do
        // zero — ver pedido do usuário 2026-08-19).
        //
        // Slot GRÁTIS (opcoesSlot?.origem === "livre", ver
        // receitasConhecidas/renderizarReceitas): 1 receita de graça por
        // nível, do 1 até o nível atual da perícia vinculada — não exige
        // Engenharia nenhuma, só a própria perícia vinculada no nível da
        // receita (já garantido pela UI só oferecer o slot até
        // nivelPericia, mas revalida aqui também). Engenharia só entra
        // quando o jogador quer uma receita ADICIONAL além da gratuita
        // desse nível (fluxo sem opcoesSlot, vindo do botão "Rolar
        // Engenharia" → "Criar receita").
        if (!receitaExistente && estado.fichaAtual && !estado.isMestre) {
            if (opcoesSlot?.origem === "livre") {
                const nivelPericiaVinculadaSlot = Number(Object.values(estado.fichaAtual.pericias || {}).find(p => p.nome === selectPericia.value)?.nivel) || 0;
                if (nivelPericiaVinculadaSlot < (Number(selectNivel.value) || 1)) {
                    toast(`Sua ${selectPericia.value} ainda não chegou no nível ${selectNivel.value} pra ter essa receita gratuita.`, "erro");
                    return;
                }
            } else {
                const requisito = atendeRequisitoCriarReceita(estado.fichaAtual.pericias, Number(selectNivel.value) || 1, selectPericia.value);
                if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
            }
        }
        const nomeCriador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || (estado.isMestre ? "Mestre" : "Jogador");
        const receita = {
            nome,
            periciaVinculada: selectPericia.value,
            nivel: Number(selectNivel.value) || 1,
            dificuldade: modal.querySelector("#receita-dificuldade").value !== "" ? Number(modal.querySelector("#receita-dificuldade").value) || 0 : null,
            dificuldadeArmar: modal.querySelector("#receita-dificuldade-armar").value !== "" ? Number(modal.querySelector("#receita-dificuldade-armar").value) || 0 : null,
            tempoCriacao: modal.querySelector("#receita-tempo").value.trim(),
            ingredientes: Array.from(listaIngredientes.querySelectorAll(".receita-ingrediente-linha")).map(linha => {
                const selects = linha.querySelectorAll("select");
                const materialNome = selects[0].value;
                return {
                    material: materialNome,
                    qualidade: qualidadesDoMaterial(materialNome) ? selects[1].value : null,
                    quantidade: Number(linha.querySelector("input").value) || 1
                };
            }),
            custo: modal.querySelector("#receita-custo").value !== "" ? Number(modal.querySelector("#receita-custo").value) || 0 : null,
            categoria: modal.querySelector("#receita-categoria").value.trim(),
            descricao: modal.querySelector("#receita-descricao").value.trim(),
            itemGlobalId: itemGlobalIdVinculado,
            criadoPorNome: nomeCriador,
            criadoPorTipo: estado.isMestre ? "mestre" : "jogador"
        };
        try {
            if (receitaExistente) {
                await atualizarReceitaBanco(receitaExistente.id, receita);
                toast(`Receita "${nome}" atualizada no Banco Global.`);
            } else {
                const novoId = await salvarReceitaNoBanco(receita);
                toast(`Receita "${nome}" criada no Banco Global.`);
                if (opcoesSlot?.periciaVinculada && estado.fichaAtual) {
                    await concederReceitaConhecida(receita.periciaVinculada, receita.nivel, novoId, opcoesSlot.origem || "livre");
                } else if (contextoEngenharia && estado.fichaAtual) {
                    // Autorar não garante aprender: ainda precisa passar no
                    // teste de Engenharia (dif. 10 + 2×nível do item) pra
                    // essa receita entrar nas Receitas do personagem — ver
                    // resolverTesteAprenderReceita, mesma trava aplicada
                    // pra quando escolhe uma receita já existente.
                    modal.remove();
                    await resolverTesteAprenderReceita({ ...receita, id: novoId }, contextoEngenharia.modificadorEngenharia);
                    return;
                }
            }
            modal.remove();
        } catch (err) {
            console.error(err);
            toast("Falha ao salvar a receita.", "erro");
        }
    });

    document.body.appendChild(modal);
}
