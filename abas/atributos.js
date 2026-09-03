// abas/atributos.js
// ---------------------------------------------------------------------
// Barras vitais (PV/Energia) do topo + aba Atributos: atributos
// primários, recursos (PV/Energia) e secundários calculados, o
// carrossel de status ativos ao lado das barras, e o painel de
// recuperação de PV.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 11). Além das 6 funções listadas no plano
// (renderizarAtributos, renderizarBarrasVitaisTopo,
// renderizarStatusTopoAtual, configurarStatusTopoCarrossel,
// renderizarRecuperacaoPV, configurarRecuperacaoPV), vieram junto
// coletarStatusAtivosTopo/atualizarStatusTopoCarrossel e o estado
// privado do carrossel (statusTopoLista/statusTopoIndice) — são
// helpers só usados por essa engrenagem do carrossel de status, então
// precisam morar no mesmo arquivo pra continuar funcionando.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import {
    el, toast, idAtivo, textoDetalhamento, podeEditarPericiaAtributo, maximoComOverride,
    meuParticipanteIdCombate, npcParticipanteIdCombate,
} from "../ficha.js";
import {
    renderizarEstadoSaude, renderizarEstadoEnergia, renderizarComaBadge, renderizarDesmaioBadge,
} from "./saude.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
    modificadoresQueAfetam, calcularDerivados, temPericiaTreinada,
    calcularEstadoSaude, calcularEstadoEnergia, aplicarEstadoSaudeVelocidade,
    horasTotaisCalendario, calcularAbstinenciaVicio, feridaEstaFechada,
    calcularTempoRecuperacaoPV, aplicarReducaoTratamentoHospital, aplicarFatoresRecuperacaoItens,
} from "../regras.js";
import { PADROES_DE_VIDA, limiteRecuperacaoSemTratamento, criarAcaoPendente } from "../mestre.js?v=20260830-npcnivelpv";

// ---------------------------------------------------------------------
// ATRIBUTOS
// ---------------------------------------------------------------------
export function renderizarAtributos(modificadoresPlanos) {
    const d = estado.fichaAtual.dados;
    const podeEditar = podeEditarPericiaAtributo();

    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const input = document.querySelector(`[data-attr-primario="${attr.key}"]`);
        if (!input) return;
        if (document.activeElement !== input) input.value = d[attr.key] ?? 0;
        input.disabled = !podeEditar;
        input.closest(".attr-card").classList.toggle("locked", !podeEditar);
        // Limite normal de 7 (manual pg. 21) — mas o godmode do Mestre pode
        // ultrapassar isso, porque existem formas legítimas dentro do jogo
        // de passar de 7 num atributo (ex.: Esteroide e outros itens/efeitos
        // do manual). Sem essa liberação, nem digitando manualmente dava pra
        // registrar o valor porque o <input type="number" max="7"> travava.
        if (estado.isMestre && estado.godmodeAtivo) {
            input.removeAttribute("max");
        } else {
            input.max = "7";
        }
        // Tooltip: atributo primário é editável diretamente (o número no
        // campo já É a base), mas alguns efeitos (vantagens, itens etc.)
        // podem mirar `atributo:X` e só entram em jogo em cálculos
        // específicos (ex: dificuldade de defesa) — o hover deixa isso
        // visível mesmo sem mudar o valor exibido no campo.
        const baseAttr = Number(d[attr.key]) || 0;
        const ajustesAttr = modificadoresQueAfetam(`atributo:${attr.key}`, modificadoresPlanos);
        const totalAttr = baseAttr + ajustesAttr.reduce((acc, m) => acc + m.valor, 0);
        input.closest(".attr-card").title = textoDetalhamento(attr.label, baseAttr, "Base (valor cadastrado)", ajustesAttr, totalAttr);
    });

    // Recursos (PV, Energia) — máximo calculado, atual editável por qualquer um.
    // Máximo normalmente travado (só span), mas em Godmode vira um input
    // editável (ver maximoComOverride) — sem isso não tinha NENHUMA forma
    // de ajustar o PV máximo de um jogador na mão, mesmo com Godmode ligado.
    const derivados = calcularDerivados(d, modificadoresPlanos);
    const godmodeRecursos = estado.isMestre && estado.godmodeAtivo;
    let pvMaximoTotal = 0;
    let energiaMaximoTotal = 0;
    RECURSOS.forEach(rec => {
        const maxLabel = document.querySelector(`[data-recurso-max="${rec.key}"]`);
        const maxInput = document.querySelector(`[data-recurso-max-input="${rec.key}"]`);
        const atualInput = document.querySelector(`[data-recurso-atual="${rec.key}"]`);
        // PV ganho no Level Up (dado de vida) é um bônus PERMANENTE somado
        // por cima da fórmula (constituição/nível) — guardado em
        // dados.pvBonusExtra, incrementado em executarPassoDadoVida
        // (levelup.js). Sem isso o ganho só existia enquanto o PV atual
        // não descia abaixo do máximo antigo.
        const bonusExtra = rec.key === "pv" ? (Number(d.pvBonusExtra) || 0) : 0;
        const infoRecurso = derivados.recursos[rec.key];
        const totalCalculado = Math.round(infoRecurso.total) + bonusExtra;
        const total = maximoComOverride(rec.key, d, totalCalculado);
        if (rec.key === "pv") pvMaximoTotal = total;
        if (rec.key === "energia") energiaMaximoTotal = total;
        // Tooltip do máximo: fórmula base + modificadores estruturados +
        // bônus de dado de vida (Level Up) + override manual (Godmode),
        // cada um só aparecendo se realmente existir.
        const ajustesRecurso = [...infoRecurso.ajustes];
        if (bonusExtra) ajustesRecurso.push({ valor: bonusExtra, origem: "Dado de vida (Level Up)" });
        const override = d[rec.key + "MaximoOverride"];
        const temOverride = override !== null && override !== undefined && override !== "";
        if (temOverride) ajustesRecurso.push({ valor: total - (Math.round(infoRecurso.base) + ajustesRecurso.reduce((a, m) => a + m.valor, 0)), origem: "Override manual do Mestre (Godmode)" });
        const cardRecurso = document.querySelector(`[data-recurso="${rec.key}"]`);
        if (cardRecurso) cardRecurso.title = textoDetalhamento(rec.label, infoRecurso.base, "Base (fórmula do manual)", ajustesRecurso, total);
        if (maxLabel) {
            maxLabel.innerText = total;
            maxLabel.style.display = godmodeRecursos ? "none" : "";
        }
        if (maxInput) {
            maxInput.style.display = godmodeRecursos ? "" : "none";
            if (godmodeRecursos && document.activeElement !== maxInput) maxInput.value = total;
        }
        if (atualInput) {
            const valorSalvo = d[rec.key + "Atual"];
            if (document.activeElement !== atualInput) {
                atualInput.value = (valorSalvo === null || valorSalvo === undefined) ? total : valorSalvo;
            }
            atualInput.dataset.recursoKey = rec.key;
        }
    });

    // Estado de saúde (Machucado / Muito Machucado — ver regras.js) a
    // partir do PV atual x PV máximo já com bônus de Level Up. A perícia
    // Tolerância, quando treinada, empurra o limiar de "Muito Machucado"
    // de 1/3 pra 1/4 do PV máximo. O efeito em Velocidade entra direto
    // no total do secundário (aplicarEstadoSaudeVelocidade); o efeito
    // em testes (-2/-4) é lido depois por penalidadeTestesAtual() em
    // toda rolagem de perícia. A penalidade só é totalmente desligada —
    // pra qualquer ficha, jogador ou Mestre — com o Godmode ativo E o
    // sub-toggle "ignorar penalidade de saúde" também marcado (ver
    // configurarGodmode); Godmode sozinho não mexe mais nisso.
    const temTolerancia = temPericiaTreinada(estado.fichaAtual.pericias, "Tolerância");
    // Ignora a penalidade de Machucado/Muito Machucado (Fase 6.2 do
    // plano de efeitos de equipamentos médicos —
    // plano-efeitos-equipamentos-medicos.txt): o Godmode sozinho (via
    // sub-toggle "ignorar penalidade de saúde") OU um item com o efeito
    // `efeito_temporario_ignora_penalidade_saude` ainda dentro do prazo
    // gravado em `d.ignorarPenalidadeSaudeAte` (mesmo relógio contínuo
    // em horas usado pelos efeitos temporários de droga/item — ver
    // horasTotaisCalendario/calcularModificadoresDrogasAtivas em
    // regras.js). Cada fonte é independente da outra.
    const horasAgoraSaude = (estado.calendarioAtual && estado.calendarioAtual.diaIndice !== undefined && estado.calendarioAtual.diaIndice !== null)
        ? horasTotaisCalendario(estado.calendarioAtual.diaIndice, estado.calendarioAtual.hora)
        : null;
    const itemIgnoraPenalidadeSaude = !!(d.ignorarPenalidadeSaudeAte && horasAgoraSaude !== null && horasAgoraSaude < d.ignorarPenalidadeSaudeAte);
    const ignorarPenalidadeSaude = (estado.godmodeAtivo && estado.ignorarPenalidadeSaudeAtivo) || itemIgnoraPenalidadeSaude;
    const estadoSaude = calcularEstadoSaude(d.pvAtual, pvMaximoTotal, temTolerancia, ignorarPenalidadeSaude);
    derivados.secundarios.velocidade = aplicarEstadoSaudeVelocidade(derivados.secundarios.velocidade, estadoSaude);
    renderizarEstadoSaude(estadoSaude);

    // Estado de Energia (Energia Baixa / Energia Crítica / Morte — ver
    // regras.js) a partir da Energia atual x Energia máxima. Mesma
    // filosofia do estado de saúde: o efeito em testes (físicos/mentais)
    // é lido depois por penalidadeEnergiaParaPericia() em toda rolagem
    // de perícia. Reaproveita o mesmo toggle de Godmode que já ignora a
    // penalidade de saúde — "ignorar penalidade" no Godmode passa a
    // valer pros dois recursos vitais de uma vez.
    const estadoEnergia = calcularEstadoEnergia(d.energiaAtual, energiaMaximoTotal, ignorarPenalidadeSaude);
    renderizarEstadoEnergia(estadoEnergia);

    renderizarBarrasVitaisTopo(d.pvAtual, pvMaximoTotal, estadoSaude, d.energiaAtual, energiaMaximoTotal, estadoEnergia);
    renderizarComaBadge(d);
    renderizarDesmaioBadge(d);
    estado.ultimoContextoRecuperacaoPV = { d, pvMaximoTotal };
    renderizarRecuperacaoPV(d, pvMaximoTotal);

    // Secundários calculados
    ATRIBUTOS_SECUNDARIOS.forEach(attr => {
        const span = document.querySelector(`[data-attr-secundario-valor="${attr.key}"]`);
        if (span) span.innerText = Math.round(derivados.secundarios[attr.key].total * 10) / 10;
        const cardSecundario = document.querySelector(`[data-attr-secundario="${attr.key}"]`);
        if (cardSecundario) {
            const infoSec = derivados.secundarios[attr.key];
            cardSecundario.title = textoDetalhamento(attr.label, infoSec.base, "Base (fórmula do manual)", infoSec.ajustes, infoSec.total);
        }
    });

    window._ultimosDerivados = derivados; // usado pelo detalhamento ao clicar
    window._ultimosModificadores = modificadoresPlanos;
    window._estadoSaudeAtual = estadoSaude; // usado por penalidadeTestesAtual() nas rolagens
    window._estadoEnergiaAtual = estadoEnergia; // usado por penalidadeEnergiaParaPericia() nas rolagens
}

// Barrinhas de PV/Energia no topo da ficha (sempre visíveis, sem precisar
// rolar até "Recursos vitais"). A cor NÃO é um percentual solto — segue
// exatamente os mesmos estados de calcularEstadoSaude/calcularEstadoEnergia
// (regras.js) que já definem Machucado/Muito Machucado e Energia
// Baixa/Crítica em qualquer outro lugar da ficha: saudável = verde,
// Machucado/Energia Baixa = amarela, Muito Machucado/Energia
// Crítica/Morte = vermelha. Isso já embute o efeito da perícia
// Tolerância, que empurra o limiar de Muito Machucado de 1/3 pra 1/4 do
// PV máximo (ver LIMIAR_MUITO_MACHUCADO_COM_TOLERANCIA) — como o estado
// já vem calculado assim de fora, a barra automaticamente segue junto.
export function renderizarBarrasVitaisTopo(pvAtual, pvMax, estadoSaude, energiaAtual, energiaMax, estadoEnergia) {
    const corPorEstado = estado => {
        if (!estado) return null;
        if (estado === "machucado" || estado === "energia_baixa") return "vital-cor-media";
        if (estado === "muito_machucado" || estado === "energia_critica" || estado === "morte") return "vital-cor-critica";
        return null;
    };
    const aplicarBarra = (fillEl, numeroEl, atualBruto, max, classeCor) => {
        if (!fillEl || !numeroEl) return;
        const atual = (atualBruto === null || atualBruto === undefined) ? max : Number(atualBruto);
        const maxSeguro = Number(max) || 0;
        const pct = maxSeguro > 0 ? Math.max(0, Math.min(100, (atual / maxSeguro) * 100)) : 0;
        fillEl.style.width = `${pct}%`;
        fillEl.classList.remove("vital-cor-media", "vital-cor-critica");
        if (classeCor) fillEl.classList.add(classeCor);
        numeroEl.innerText = `${Math.round(atual)}/${Math.round(maxSeguro)}`;
    };
    aplicarBarra(el.vitalPvFill, el.vitalPvNumero, pvAtual, pvMax, corPorEstado(estadoSaude && estadoSaude.estado));
    aplicarBarra(el.vitalEnergiaFill, el.vitalEnergiaNumero, energiaAtual, energiaMax, corPorEstado(estadoEnergia && estadoEnergia.estado));

    // Destaque de "muito ferido": a ficha inteira ganha uma borda vermelha
    // pulsando bem devagar quando o estado é grave (Muito Machucado ou
    // Energia Crítica) — mesma leitura das barras acima, só que dá pra
    // notar mesmo sem estar olhando pro topo. Morte já tem seu próprio
    // overlay cobrindo a tela, então não precisa duplicar o alerta aqui.
    const estadoGrave = (estadoSaude && estadoSaude.estado === "muito_machucado")
        || (estadoEnergia && estadoEnergia.estado === "energia_critica");
    if (el.app) el.app.classList.toggle("ficha-muito-ferido", !!estadoGrave);

    atualizarStatusTopoCarrossel();
}

// ---------------------------------------------------------------------
// Carrossel de status ativos no topo (ao lado das barras de PV/Energia).
// Junta TODO status que esteja acometendo quem está sendo controlado
// nesta tela agora (a própria ficha, ou o NPC que o Mestre estiver
// atuando como — mesmo critério de meuStatusAgarrado/meuStatusImobilizado/
// meuStatusDesacordado acima): estado de saúde (Machucado/Muito
// Machucado), estado de Energia, Abstinência de vício, Infecção, e — se
// estiver em combate — Derrubado, Agarrado, Imobilizado, Inconsciente
// (Desacordado), Ossos quebrados, Alcance limitado e Sangramento (Tick
// System). Cada item vira uma entrada { icone, texto, titulo }; o
// carrossel troca de entrada a cada 1s (ver configurarStatusTopoCarrossel
// mais abaixo). Quando não há nenhum status ativo, a caixinha some.
// ---------------------------------------------------------------------
function coletarStatusAtivosTopo() {
    const lista = [];
    if (!estado.fichaAtual) return lista;

    // Estado de saúde (Machucado / Muito Machucado) — já calculado em
    // renderizarAtributos() e guardado em window._estadoSaudeAtual.
    const estadoSaude = window._estadoSaudeAtual;
    if (estadoSaude && estadoSaude.estado && estadoSaude.estado !== "morte") {
        const efeito = estadoSaude.metadeVelocidade ? "Velocidade pela metade" : `Velocidade ${estadoSaude.penalidadeVelocidade}`;
        lista.push({
            icone: estadoSaude.estado === "muito_machucado" ? "🤕" : "🩹",
            texto: estadoSaude.label,
            titulo: `${estadoSaude.label} — ${efeito} · ${estadoSaude.penalidadeTestes} em todos os testes`
        });
    }

    // Estado de Energia (Energia Baixa / Energia Crítica).
    const estadoEnergia = window._estadoEnergiaAtual;
    if (estadoEnergia && estadoEnergia.estado && estadoEnergia.estado !== "morte") {
        lista.push({
            icone: "🔋",
            texto: estadoEnergia.label,
            titulo: estadoEnergia.estado === "energia_critica"
                ? "-3 em testes físicos, -2 em testes mentais"
                : "-2 em testes físicos"
        });
    }

    // Abstinência (Desvantagem "Vício" com substância, ver
    // calcularAbstinenciaVicio em regras.js) — uma entrada por vício em
    // abstinência (dá pra ter mais de um vício cadastrado ao mesmo tempo).
    const diaAtual = estado.calendarioAtual ? estado.calendarioAtual.diaIndice : null;
    if (diaAtual !== null && diaAtual !== undefined) {
        const desvantagens = estado.fichaAtual.desvantagens || {};
        Object.values(desvantagens).forEach(v => {
            if (!v || !v.substancia) return;
            const { semanas, malusTestes, malusPV } = calcularAbstinenciaVicio(v, diaAtual);
            if (semanas <= 0) return;
            lista.push({
                icone: "💉",
                texto: `Abstinência: ${v.substancia}`,
                titulo: `${semanas}ª semana em abstinência — ${malusTestes} em todos os testes${malusPV ? `, ${malusPV} PV máximo` : ""}`
            });
        });
    }

    // Infecção persistente (Complicações de ferimentos, manual) — flag
    // gravada em estado.fichaAtual.dados.infeccao (ver aplicarInfeccao/mestre.js).
    if (estado.fichaAtual.dados && estado.fichaAtual.dados.infeccao && estado.fichaAtual.dados.infeccao.ativo) {
        lista.push({ icone: "🦠", texto: "Infectado", titulo: "Tempo de repouso necessário +50% até tratamento médico" });
    }

    // Status só existentes durante combate (ver estado.combateAtivoCache) —
    // lidos do mesmo participante usado por meuStatusAgarrado/
    // meuStatusImobilizado/meuStatusDesacordado acima.
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const participante = meuPid && estado.combateAtivoCache.participantes ? estado.combateAtivoCache.participantes[meuPid] : null;
    if (participante) {
        if (participante.derrubado && participante.derrubado.ativo) {
            lista.push({ icone: "🔻", texto: "Derrubado", titulo: `Derrubado por ${participante.derrubado.porNome || "?"} — dificuldade pra ser acertado cai -3` });
        }
        if (participante.desacordado && participante.desacordado.ativo) {
            lista.push({ icone: "💤", texto: "Inconsciente", titulo: "Desacordado — não age nem se defende; só o Mestre pode acordá-lo" });
        }
        if (participante.imobilizado && participante.imobilizado.ativo) {
            lista.push({ icone: "🔒", texto: "Imobilizado", titulo: `Imobilizado por ${participante.imobilizado.porNome || "?"} — não consegue atacar nem se mover` });
        }
        if (participante.agarrado && participante.agarrado.ativo) {
            lista.push({ icone: "🔗", texto: "Agarrado", titulo: `Agarrado por ${participante.agarrado.porNome || "?"} — golpes de alcance médio/longo bloqueados` });
        }
        if (participante.ossosQuebrados && participante.ossosQuebrados.ativo) {
            lista.push({ icone: "🦴", texto: "Ossos quebrados", titulo: `Reduz ${participante.ossosQuebrados.pontosPenalidade} ponto(s) qualquer ação física` });
        }
        if (participante.alcanceLimitado && participante.alcanceLimitado.ativo) {
            lista.push({ icone: "📏", texto: `Alcance limitado: ${participante.alcanceLimitado.valor}`, titulo: `Alcance limitado por ${participante.alcanceLimitado.porNome || "?"}` });
        }
        if (participante.statusAtivos) {
            Object.values(participante.statusAtivos)
                .filter(s => s && (Number(s.turnosRestantes) || 0) > 0)
                .forEach(s => {
                    lista.push({
                        icone: "🩸",
                        texto: `${s.label || "Sangrando"} (${s.turnosRestantes})`,
                        titulo: `${s.origem || ""} — ${s.danoPorTurno ?? `1d${s.faces || 1}`} de dano fixo por turno`
                    });
                });
        }
    }

    return lista;
}

let statusTopoLista = [];
let statusTopoIndice = 0;

// Recalcula a lista de status ativos (chamado sempre que os dados da
// ficha OU o estado de combate mudam) e mantém o índice atual do
// carrossel dentro dos limites da nova lista.
export function atualizarStatusTopoCarrossel() {
    if (!el.vitalStatusCarrossel) return;
    statusTopoLista = coletarStatusAtivosTopo();
    if (statusTopoIndice >= statusTopoLista.length) statusTopoIndice = 0;
    renderizarStatusTopoAtual();
}

// Só troca o que é exibido na caixinha pro item atual da lista já
// calculada — chamado a cada 1s pelo setInterval de
// configurarStatusTopoCarrossel, sem precisar recalcular tudo de novo.
export function renderizarStatusTopoAtual() {
    if (!el.vitalStatusCarrossel) return;
    if (!statusTopoLista.length) {
        el.vitalStatusCarrossel.style.display = "none";
        return;
    }
    const atual = statusTopoLista[statusTopoIndice] || statusTopoLista[0];
    el.vitalStatusCarrossel.style.display = "flex";
    el.vitalStatusCarrossel.title = atual.titulo || atual.texto;
    el.vitalStatusIcone.innerText = atual.icone;
    el.vitalStatusTexto.innerText = atual.texto;
}

// Liga o carrossel: a cada 1s avança pro próximo status ativo da lista
// (recalculada em atualizarStatusTopoCarrossel, chamada sempre que os
// dados da ficha ou o combate mudam). Um único setInterval, criado uma
// vez só na inicialização da página.
export function configurarStatusTopoCarrossel() {
    if (!el.vitalStatusCarrossel) return;
    setInterval(() => {
        if (!statusTopoLista.length) return;
        statusTopoIndice = (statusTopoIndice + 1) % statusTopoLista.length;
        renderizarStatusTopoAtual();
    }, 1000);
}

// ---------------------------------------------------------------------
// Recuperação de PVs (manual) — painel logo abaixo dos badges de
// Machucado/Muito Machucado, em "Recursos vitais". Três estados:
//   1. Sem PV perdido: painel escondido (nada pra recuperar).
//   2. PV perdido, sem recuperação ativa: mostra o tempo estimado (ver
//      calcularTempoRecuperacaoPV em regras.js) e o botão de pedir ao
//      Mestre — o pedido em si vira uma Ação Pendente (ver
//      configurarRecuperacaoPV abaixo), só concretizado quando o Mestre
//      aprovar.
//   3. Recuperação já autorizada e em andamento: mostra o progresso
//      (dias decorridos / necessários) e some com o botão, já que só o
//      Mestre autoriza (não dá pra pedir de novo por cima).
//
// Dentro do estado 2, o jogador escolhe um MODO antes de pedir (radio
// "recuperacao-pv-modo", lido direto do DOM aqui — não é persistido,
// é só uma escolha momentânea de UI que entra no payload do pedido):
//   - "padrao_vida" (default): igual ao comportamento de sempre —
//     recuperação capada em limiteRecuperacaoSemTratamento(padraoDeVida),
//     sem nenhum dos dois bônus abaixo.
//   - "tratamento": SEM teto (recupera pvPerdidos inteiro). Duas
//     checkboxes aparecem ("Tratamento especializado" / "Em hospital"),
//     cada uma dando -1/10 no tempo (aplicarReducaoTratamentoHospital
//     chamado 1x por checkbox marcada — cumulativo, até -2/10 com as
//     duas). Continua exigindo Mestre aprovar a Ação Pendente; nenhum
//     custo/local é cobrado pelo app.
// ---------------------------------------------------------------------
export function renderizarRecuperacaoPV(d, pvMaximoTotal) {
    if (!el.recuperacaoPvPainel) return;
    const rec = d.recuperacaoPV;

    if (rec && rec.ativa) {
        estado.pvRecuperacaoContexto = null;
        if (el.recuperacaoPvModo) el.recuperacaoPvModo.style.display = "none";
        if (el.recuperacaoPvCheckboxes) el.recuperacaoPvCheckboxes.style.display = "none";
        const diasNecessarios = Number(rec.diasNecessarios) || 0;
        const diasDecorridos = Math.min(diasNecessarios, Number(rec.diasDecorridos) || 0);
        const diasFaltando = Math.max(0, diasNecessarios - diasDecorridos);
        const notaInfeccao = rec.infectadoNoPedido ? " (+50% pela infecção ativa no momento do pedido)" : "";
        const notaEspecializado = rec.tratamentoEspecializadoNoPedido ? " (-1/10 pelo tratamento especializado)" : "";
        const notaHospital = rec.emHospitalNoPedido ? " (-1/10 pelo tratamento em hospital)" : "";
        const notaComa = rec.veioDoComaEm ? " (dobro pela saída de coma recente)" : "";
        const fatoresNoPedido = rec.fatoresRecuperacaoItensNoPedido ? Object.values(rec.fatoresRecuperacaoItensNoPedido) : [];
        const notaFatoresItens = fatoresNoPedido.length
            ? ` (${fatoresNoPedido.map(f => `${f.origem || "item"} ×${f.fator}`).join(", ")})`
            : "";
        el.recuperacaoPvPainel.style.display = "";
        el.recuperacaoPvStatus.innerText = `Recuperando PVs: ${diasDecorridos}/${diasNecessarios} dia(s)${notaInfeccao}${notaFatoresItens}${notaEspecializado}${notaHospital}${notaComa} (faltam ${diasFaltando}). Avança sozinho a cada Timeskip do Mestre.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "none";
        return;
    }

    const atual = (d.pvAtual === null || d.pvAtual === undefined) ? pvMaximoTotal : Number(d.pvAtual);
    const pvPerdidos = Math.max(0, Math.round(pvMaximoTotal - atual));

    if (pvPerdidos <= 0 || pvMaximoTotal <= 0) {
        estado.pvRecuperacaoContexto = null;
        el.recuperacaoPvPainel.style.display = "none";
        if (el.recuperacaoPvModo) el.recuperacaoPvModo.style.display = "none";
        if (el.recuperacaoPvCheckboxes) el.recuperacaoPvCheckboxes.style.display = "none";
        return;
    }

    // Etapa 6 do plano de saúde: recuperação de PV fica bloqueada
    // enquanto existir ferida (fichas/{id}/feridas) em qualquer estado
    // diferente de "tratada" — reaproveita estado.feridasCache, já mantido em
    // sincronia com a ficha atualmente aberta por configurarSaude
    // (ouvirFeridas em saude.js). Em estado.modoNpc estado.feridasCache fica sempre
    // vazio (NPCs ficam de fora do sistema de feridas nesta fase), então
    // nunca bloqueia. Vale pros dois modos (Padrão de Vida e Tratamento).
    const feridaAberta = estado.feridasCache.find(f => !feridaEstaFechada(f));
    if (feridaAberta) {
        estado.pvRecuperacaoContexto = null;
        el.recuperacaoPvPainel.style.display = "";
        if (el.recuperacaoPvModo) el.recuperacaoPvModo.style.display = "none";
        if (el.recuperacaoPvCheckboxes) el.recuperacaoPvCheckboxes.style.display = "none";
        el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s) de ${pvMaximoTotal}. Trate os ferimentos antes de pedir recuperação de PV.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "none";
        return;
    }

    if (el.recuperacaoPvModo) el.recuperacaoPvModo.style.display = "";
    const modo = (el.recuperacaoPvModoTratamento && el.recuperacaoPvModoTratamento.checked) ? "tratamento" : "padrao_vida";
    if (el.recuperacaoPvCheckboxes) el.recuperacaoPvCheckboxes.style.display = (modo === "tratamento") ? "" : "none";

    // Infecção (manual, "Complicações de ferimentos"): aumenta em 50% o
    // tempo de repouso necessário. A flag é persistente na própria ficha
    // (fichas/{id}/dados/infeccao — ver aplicarInfeccao/curarInfeccao em
    // mestre.js), não só durante o combate em que foi aplicada. Vale pros
    // dois modos.
    const infectado = !!(d.infeccao && d.infeccao.ativo);
    // Item 6 do plano (Coma): saída de coma dobra o tempo da PRÓXIMA
    // recuperação de PV (flag em dados.saiuDoComaPendente, setada só
    // manualmente pelo Mestre em Godmode — ver reverterComaGodmode em
    // mestre.js). Vale pros dois modos.
    const saiuDoComa = !!d.saiuDoComaPendente;
    // Fase 7 do plano de efeitos de equipamentos médicos: fatores de
    // tempo de recuperação gravados por item usado num tratamento de
    // ferida bem-sucedido (dados.fatoresRecuperacaoItens). Vale pros
    // dois modos.
    const temFatoresRecuperacaoItens = !!(d.fatoresRecuperacaoItens && Object.keys(d.fatoresRecuperacaoItens).length);
    const notaFatoresItens = temFatoresRecuperacaoItens
        ? ` — ${Object.values(d.fatoresRecuperacaoItens).map(f => `${f.origem || "item"} ×${f.fator}`).join(", ")}`
        : "";
    const notaInfeccao = infectado ? " — infecção ativa: +50% no tempo de recuperação" : "";
    const notaComa = saiuDoComa ? " — saiu do coma recentemente: dobro no tempo de recuperação" : "";

    if (modo === "tratamento") {
        // Modo "Tratamento médico": sem teto do Padrão de Vida — recupera
        // o pvPerdidos inteiro. As duas checkboxes (lidas direto do DOM,
        // igual ao modo) só entram como desconto de tempo, não mexem no
        // teto (que já caiu por causa do modo escolhido).
        const tratamentoEspecializado = !!(el.recuperacaoPvEspecializado && el.recuperacaoPvEspecializado.checked);
        const emHospital = !!(el.recuperacaoPvHospital && el.recuperacaoPvHospital.checked);
        const pvRecuperavel = pvPerdidos;
        const pvSemRecuperar = 0;
        const diasBase = calcularTempoRecuperacaoPV(pvRecuperavel, pvMaximoTotal, infectado);
        const diasComComa = saiuDoComa ? diasBase * 2 : diasBase;
        const diasComFatoresItens = aplicarFatoresRecuperacaoItens(diasComComa, d.fatoresRecuperacaoItens);
        let diasNecessarios = diasComFatoresItens;
        if (tratamentoEspecializado) diasNecessarios = aplicarReducaoTratamentoHospital(diasNecessarios, true);
        if (emHospital) diasNecessarios = aplicarReducaoTratamentoHospital(diasNecessarios, true);

        estado.pvRecuperacaoContexto = {
            modo, pvPerdidos, pvRecuperavel, pvSemRecuperar, pvMaximoTotal,
            diasNecessarios, diasBase, infectado, saiuDoComa,
            tratamentoEspecializado, emHospital
        };
        el.recuperacaoPvPainel.style.display = "";
        const notaEspecializado = tratamentoEspecializado ? " — tratamento especializado: -1/10 no tempo de recuperação" : "";
        const notaHospital = emHospital ? " — em hospital: -1/10 no tempo de recuperação" : "";
        el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s). Com tratamento médico, recupera os ${pvRecuperavel} PV (sem o teto do Padrão de Vida) em ${diasNecessarios} dia(s)${notaInfeccao}${notaFatoresItens}${notaEspecializado}${notaHospital}${notaComa}.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "";
        return;
    }

    // Modo "Padrão de Vida" (manual, pg. 106-107): sem tratamento
    // médico, a recuperação "natural" só cobre até um certo teto de PV,
    // conforme o Padrão de Vida do personagem (ver
    // limiteRecuperacaoSemTratamento em mestre.js). A fórmula de tempo
    // (perdidos/total × 30) continua igual — só muda o que entra como
    // "perdidos": em vez do total de PV perdido, usamos o quanto desse
    // total o Padrão de Vida cobre. O restante (pvSemRecuperar) fica de
    // fora do pedido — não é recuperado por esse caminho, só trocando pro
    // modo "Tratamento médico" acima.
    const limite = limiteRecuperacaoSemTratamento(d.padraoDeVida);
    const pvRecuperavel = Math.min(pvPerdidos, limite);
    const pvSemRecuperar = pvPerdidos - pvRecuperavel;
    const diasBase = calcularTempoRecuperacaoPV(pvRecuperavel, pvMaximoTotal, infectado);
    const diasComComa = saiuDoComa ? diasBase * 2 : diasBase;
    const diasNecessarios = aplicarFatoresRecuperacaoItens(diasComComa, d.fatoresRecuperacaoItens);

    estado.pvRecuperacaoContexto = {
        modo, pvPerdidos, pvRecuperavel, pvSemRecuperar, pvMaximoTotal,
        diasNecessarios, diasBase, infectado, saiuDoComa,
        tratamentoEspecializado: false, emHospital: false
    };
    el.recuperacaoPvPainel.style.display = "";

    if (pvRecuperavel <= 0) {
        // Padrão de Vida atual não cobre nada sem tratamento médico
        // (ex.: Miserável, limite 0) — só resta trocar pro modo
        // "Tratamento médico" acima.
        el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s) de ${pvMaximoTotal}. Seu Padrão de Vida atual não cobre recuperação sem tratamento médico — troque pro modo "Tratamento médico" acima ou procure um médico.`;
        if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "none";
        return;
    }

    const padrao = PADROES_DE_VIDA.find(p => p.key === d.padraoDeVida);
    const labelPadrao = padrao ? padrao.label : "seu Padrão de Vida";
    const notaSemRecuperar = pvSemRecuperar > 0
        ? ` ${pvSemRecuperar} PV vão ficar sem recuperar por esse caminho — troque pro modo "Tratamento médico" acima pra cobrir o resto.`
        : "";
    el.recuperacaoPvStatus.innerText = `${pvPerdidos} PV perdido(s). Seu Padrão de Vida (${labelPadrao}) cobre até ${limite} sem tratamento médico — vai recuperar ${pvRecuperavel} em ${diasNecessarios} dia(s)${notaInfeccao}${notaFatoresItens}${notaComa}.${notaSemRecuperar}`;
    if (el.btnSolicitarRecuperacaoPv) el.btnSolicitarRecuperacaoPv.style.display = "";
}

// Botão "Solicitar recuperação de PVs ao Mestre" — cria uma Ação
// Pendente (mesma fila de remover_item/gastar_dinheiro/etc, ver
// mestre.js) com o tempo já calculado (incluindo o +50% de infecção, se
// for o caso); só quando o Mestre confirmar essa pendência é que
// dados/recuperacaoPV vira ativa de fato (ver confirmarAcaoPendente,
// tipo "iniciar_recuperacao_pv").
export function configurarRecuperacaoPV() {
    // Trocar de modo (Padrão de Vida / Tratamento médico) ou marcar/
    // desmarcar uma das checkboxes precisa recalcular o painel na hora
    // (novo teto, novo tempo) — reaproveita o último contexto de dados
    // guardado em estado.ultimoContextoRecuperacaoPV (ver renderizarSaude ~17700).
    const reRenderizar = () => {
        if (estado.ultimoContextoRecuperacaoPV) {
            renderizarRecuperacaoPV(estado.ultimoContextoRecuperacaoPV.d, estado.ultimoContextoRecuperacaoPV.pvMaximoTotal);
        }
    };
    if (el.recuperacaoPvModoPadrao) el.recuperacaoPvModoPadrao.addEventListener("change", reRenderizar);
    if (el.recuperacaoPvModoTratamento) el.recuperacaoPvModoTratamento.addEventListener("change", reRenderizar);
    if (el.recuperacaoPvEspecializado) el.recuperacaoPvEspecializado.addEventListener("change", reRenderizar);
    if (el.recuperacaoPvHospital) el.recuperacaoPvHospital.addEventListener("change", reRenderizar);

    if (!el.btnSolicitarRecuperacaoPv) return;
    el.btnSolicitarRecuperacaoPv.addEventListener("click", async () => {
        if (!estado.fichaAtual || !idAtivo() || !estado.pvRecuperacaoContexto) return;
        const {
            modo, pvRecuperavel, pvSemRecuperar, diasNecessarios, diasBase, infectado,
            tratamentoEspecializado, emHospital, saiuDoComa
        } = estado.pvRecuperacaoContexto;
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        const notaInfeccao = infectado ? " (já inclui +50% por infecção ativa)" : "";
        const notaEspecializado = tratamentoEspecializado ? " (inclui -1/10 por tratamento especializado)" : "";
        const notaHospital = emHospital ? " (inclui -1/10 por tratamento em hospital)" : "";
        const notaComa = saiuDoComa ? " (inclui dobro por saída de coma, se ainda valer na hora da aprovação)" : "";
        const notaFatoresItens = (estado.fichaAtual?.dados?.fatoresRecuperacaoItens && Object.keys(estado.fichaAtual.dados.fatoresRecuperacaoItens).length)
            ? " (inclui os fatores de itens médicos usados nos tratamentos, se ainda valerem na hora da aprovação)"
            : "";
        const notaModo = modo === "tratamento"
            ? " — pedido via TRATAMENTO MÉDICO (sem o teto do Padrão de Vida)"
            : "";
        const notaSemRecuperar = pvSemRecuperar > 0
            ? ` (${pvSemRecuperar} PV fora do pedido — acima do que o Padrão de Vida cobre sem tratamento médico; peça de novo depois no modo "Tratamento médico" pra cobrir o resto)`
            : "";
        try {
            await criarAcaoPendente({
                tipo: "iniciar_recuperacao_pv",
                fichaId: estado.fichaAtualId,
                nomeJogador,
                detalhe: `${nomeJogador} pede pra iniciar a recuperação de ${pvRecuperavel} PV perdido(s)${notaModo} — tempo estimado: ${diasNecessarios} dia(s)${notaInfeccao}${notaFatoresItens}${notaEspecializado}${notaHospital}${notaComa}.${notaSemRecuperar}`,
                payload: {
                    pvPerdidos: pvRecuperavel, diasNecessarios: diasBase, infectado,
                    modo, tratamentoEspecializado: !!tratamentoEspecializado, emHospital: !!emHospital
                }
            });
            toast("Pedido de recuperação de PVs enviado ao Mestre.");
        } catch (err) {
            console.error(err);
            toast("Falha ao enviar o pedido de recuperação de PVs.", "erro");
        }
    });
}
