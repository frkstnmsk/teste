// =====================================================================
// CHUVA DE NEON — Normalização / migração de ficha
// =====================================================================
// Toda ficha que vem do Firebase passa por aqui antes de ser usada.
// Fichas antigas (criadas antes dos módulos novos) ganham os campos
// que faltam com valores padrão, sem perder nada que já existia.
// Perícias antigas com nome livre (fora da lista fechada do manual)
// são migradas: o nome é preservado, mas passam a contar como perícia
// "livre legada" — não aparecem mais pra criação de novas, mas o
// registro existente continua editável/visível.

import { buscarPericiaPorNome, ATRIBUTOS_VEICULO, TIPOS_VEICULO, ehContainer, buscarAcessorioVeiculo } from "./dados-manual.js";
import { deltaModificadoresOverrideNpc } from "./npc-detalhado.js";

// Saldos fixos padrão de toda ficha nova. `fixo: true` marca os que não
// podem ser renomeados/excluídos pelo jogador — só os customizados
// (criados via "Criar novo saldo") têm fixo: false.
const SALDOS_FIXOS_PADRAO = {
    sujo: { nome: "Dinheiro sujo em casa", valor: 0, fixo: true },
    limpo: { nome: "Dinheiro limpo na conta", valor: 0, fixo: true },
    bolso: { nome: "No bolso", valor: 0, fixo: true }
};

export function normalizarFicha(raw) {
    const dados = raw.dados || {};
    const ficha = {
        config: raw.config || {},
        dados: {
            nome: dados.nome ?? "", vulgo: dados.vulgo ?? "", idade: dados.idade ?? "",
            nacionalidade: dados.nacionalidade ?? "", funcao: dados.funcao ?? "",
            maldade: dados.maldade ?? 0, remorso: dados.remorso ?? 0, status: dados.status ?? 0,
            dm: dados.dm ?? "", void: dados.void ?? "", p2k: dados.p2k ?? "",
            rabbithole: dados.rabbithole ?? "", p2c: dados.p2c ?? "", creators: dados.creators ?? "",
            darkart: dados.darkart ?? "", blackprint: dados.blackprint ?? "",
            nivel: dados.nivel ?? 1, xp: dados.xp ?? 0,
            forca: dados.forca ?? 0, constituicao: dados.constituicao ?? 0, destreza: dados.destreza ?? 0,
            sabedoria: dados.sabedoria ?? 0, inteligencia: dados.inteligencia ?? 0,
            raciocinio: dados.raciocinio ?? 0, carisma: dados.carisma ?? 0, manipulacao: dados.manipulacao ?? 0,
            pvAtual: dados.pvAtual ?? null, energiaAtual: dados.energiaAtual ?? null,
            mortoDeVez: dados.mortoDeVez ?? false,
            pvBonusExtra: dados.pvBonusExtra ?? 0,
            padraoDeVida: dados.padraoDeVida ?? "",
            ganhoFixo: dados.ganhoFixo ?? 0,
            ultimoPagamentoCustoVida: dados.ultimoPagamentoCustoVida ?? 0,
            // Mapa { pendenteId: true } dos avisos de custo de vida (fila
            // de Domingos — ver calendario.js) que ESTA ficha já pagou.
            // Substitui a antiga comparação por timestamp único, que não
            // dava pra saber quantos Domingos em aberto ainda faltavam
            // pagar depois de um Timeskip com mais de um Domingo.
            custoVidaPagos: dados.custoVidaPagos || {},
            criacaoConcluida: dados.criacaoConcluida ?? false,
            // Estes quatro campos ficavam de fora da lista e eram apagados
            // da ficha em memória a cada sincronização em tempo real (e,
            // se alguém clicasse em "Salvar" nesse meio-tempo, apagados do
            // banco também) — quebrando o multiplicador de infecção na
            // Recuperação de PVs e os overrides manuais de PV/Energia
            // máximo do Godmode. Ver renderizarRecuperacaoPV/maximoComOverride
            // em ficha.js.
            recuperacaoPV: dados.recuperacaoPV || null,
            infeccao: dados.infeccao || null,
            // Item 6 do plano (Coma): coma.ativo = flag de entrada
            // (confirmarAcaoPendente "confirmar_coma", mestre.js) e
            // saiuDoComaPendente = flag de saída consumida na PRÓXIMA
            // recuperação de PV (dobra diasNecessarios — ver
            // reverterComaGodmode e confirmarAcaoPendente
            // "iniciar_recuperacao_pv" em mestre.js).
            coma: dados.coma || null,
            saiuDoComaPendente: dados.saiuDoComaPendente ?? false,
            // Item 4 (Desmaio Genérico) — badge/aviso simples, sem efeito
            // mecânico; "acordar" é sempre manual (ver acordarDesmaioGodmode
            // em mestre.js).
            desmaiado: dados.desmaiado ?? false,
            // Fase 6.2 do plano de efeitos de equipamentos médicos —
            // plano-efeitos-equipamentos-medicos.txt: prazo (timestamp
            // contínuo em horas, ver horasTotaisCalendario em regras.js)
            // até quando a penalidade de Machucado/Muito Machucado fica
            // ignorada por causa de um item usado (ex: Morfina, 1h) —
            // gravado por usarEquipamentoMedico (ficha.js), lido em
            // renderizarAtributos junto do sub-toggle de Godmode
            // equivalente (ignorarPenalidadeSaudeAtivo).
            ignorarPenalidadeSaudeAte: dados.ignorarPenalidadeSaudeAte ?? null,
            // Fase 7 do plano de efeitos de equipamentos médicos —
            // plano-efeitos-equipamentos-medicos.txt: fatores de tempo
            // de recuperação de PV gravados por item usado num
            // tratamento de ferida bem-sucedido (ver
            // aplicarFatoresRecuperacaoItens em regras.js) — objeto
            // chaveado por pushKey, cada entrada { origem, fator,
            // criadoEm }, consumido/zerado quando o Mestre aprova o
            // pedido de recuperação de PV (ver "iniciar_recuperacao_pv"
            // em mestre.js).
            fatoresRecuperacaoItens: dados.fatoresRecuperacaoItens || {},
            pvMaximoOverride: dados.pvMaximoOverride ?? null,
            energiaMaximoOverride: dados.energiaMaximoOverride ?? null
        },
        saldos: normalizarSaldos(raw.saldos, dados),
        pericias: normalizarPericias(raw.pericias || {}),
        inventario: normalizarInventario(raw.inventario || {}),
        categoriasInventario: raw.categoriasInventario || {},
        gastosExtras: raw.gastosExtras || {},
        vantagens: raw.vantagens || {},
        desvantagens: raw.desvantagens || {},
        especializacoes: raw.especializacoes || {},
        fatosUniversais: raw.fatosUniversais || {},
        // Efeitos ativos de drogas consumidas (manual, cap. Drogas):
        // { <substanciaNormalizada>: { nome, diaIndiceConsumido, modificadores } }
        // — gravado por consumirDroga (ficha.js) ao clicar "Consumir" num
        // item de inventário com tag "droga"; dura até o fim do dia em
        // jogo em que foi consumido (ver calcularModificadoresDrogasAtivas
        // em regras.js). O vício em si (Abstinência) não é um campo à
        // parte — é a Desvantagem "Vício", com um campo `substancia` e
        // `diaIndiceUltimoUso` (ver modal-campo-substancia-vicio).
        efeitosDrogas: raw.efeitosDrogas || {},
        // Efeitos temporários de equipamento médico usado (Fase 6.2 do
        // plano de efeitos de equipamentos médicos —
        // plano-efeitos-equipamentos-medicos.txt): mesmo formato de
        // efeitosDrogas acima ({ <chave>: { nome, diaIndiceConsumido,
        // horasExpira, modificadores } }), irmão dele — gravado por
        // usarEquipamentoMedico (ficha.js) quando o item tem o efeito
        // `efeito_temporario_modificador` (ver calcularModificadoresDrogasAtivas
        // em regras.js, que soma os dois juntos).
        efeitosItens: raw.efeitosItens || {},
        // Receitas que este personagem CONHECE (diferente do Banco Global de (diferente do Banco Global de
        // Receitas em si, que é compartilhado entre todas as mesas — ver
        // receitas-globais.js). Cada entrada aqui só guarda a referência
        // (receitaGlobalId) + a perícia/nível daquele slot + a origem:
        // "livre" (a receita gratuita de um nível da perícia, escolhida
        // pelo próprio jogador) ou "mestre" (adicionada pelo Mestre,
        // representando uma receita adquirida durante o jogo). Ver
        // renderizarReceitas em ficha.js.
        receitasConhecidas: raw.receitasConhecidas || {},
        criacao: normalizarCriacao(raw.criacao, dados),
        treinamento: normalizarTreinamento(raw.treinamento),
        levelUpPendente: raw.levelUpPendente || null,
        determinacoes: normalizarDeterminacoes(raw.determinacoes),
        // Índices do array `determinacoes` já validados pelo Mestre —
        // ver renderizarDeterminacoes/liberarDeterminacao em abas/determinacoes.js e
        // confirmarAcaoPendente (tipo "validar_determinacao") em
        // mestre.js. Mesma lógica de normalizarDeterminacoes: aceita só
        // array (o Realtime Database já entrega array quando as chaves
        // são sequenciais a partir do 0 — ver comentário em mestre.js).
        determinacoesValidadas: Array.isArray(raw.determinacoesValidadas) ? raw.determinacoesValidadas : [],
        // Veículos (manual pg. 36-43) — Fase 1 do plano (ver
        // plano-veiculos.txt): só os 5 atributos com escala fixa. Ver
        // normalizarVeiculos abaixo.
        veiculos: normalizarVeiculos(raw.veiculos),
        // Credenciais da Dark Net (cards por site — nome, pontuação e
        // avaliações; ver plano-darknet-credenciais.txt) — ver
        // credenciaisDoSite/renderizarCredenciaisDarknet em ficha.js.
        // Aceita só objeto; qualquer coisa fora do formato vira {}.
        darknetCredenciais: normalizarDarknetCredenciais(raw.darknetCredenciais),
        // Regra do Esteroide (catálogo de drogas, dados-manual.js): flag
        // manual que só o Mestre marca (checkbox na aba Treinamento),
        // liberando treinar Força/Constituição até 8 em vez do limite
        // humano normal (7) — ver limiteTreinoAtributo em regras.js e
        // configurarTreinamento em ficha.js. Não afeta level up.
        usaEsteroides: raw.usaEsteroides ?? false,
        notas: raw.notas || ""
    };
    // Sistema de Slots de Porte (Fase 8): migra containers antigos pro
    // modelo de compartimentos — precisa rodar depois do inventário já
    // montado acima. Ver normalizarCompartimentos.
    normalizarCompartimentos(ficha);
    return ficha;
}

// Determinações eram um único textarea de texto livre (linhas "1. ...",
// "2. ...") e viraram uma caixa de texto por slot — a quantidade de
// slots depende do Nível do personagem (ver maxDeterminacoes em
// abas/determinacoes.js: 3 no nível 1, 6 no nível 3, 9 no nível 6, 10 no nível 9).
// Aqui só normalizamos o formato de armazenamento pra um array de
// strings; fichas já migradas (raw já é array) passam direto, e o
// texto livre antigo é quebrado por linha, descartando a numeração
// manual que o próprio jogador digitava.
// Credenciais da Dark Net — modelo novo (ver plano-darknet-credenciais.txt,
// Parte 1): cada credencial passou de string solta pra um objeto com
// nome + pontuação (só usada por sites com fórmula tipo P2K — ver
// DARKNET_SITES_PONTUACAO em ficha.js) + avaliações (só usada por sites
// tipo Creators/RabbitHole/BlackPrint — ver DARKNET_SITES_AVALIACAO).
// Sites sem fórmula (Dm, Void, P2C, DarkArt) recebem o mesmo formato de
// objeto, só que pontuacao/avaliacoes nunca são lidos/editados neles.
//
// Aceita as DUAS formas que podem chegar do Realtime Database:
//   - formato ANTIGO: { [siteId]: string[] } — cada string vira uma
//     credencial nova com pontuacao 0 e avaliacoes [].
//   - formato NOVO: { [siteId]: object[] } — cada objeto é limpo campo
//     a campo (nunca confia cegamente no que veio do banco).
// Qualquer outra coisa (null, tipo errado, item corrompido dentro da
// lista) é descartada sem quebrar o resto — mesmo espírito defensivo
// das outras normalizações deste arquivo.
function gerarIdCredencialDarknet() {
    return "cred_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function normalizarAvaliacaoDarknet(raw) {
    if (!raw || typeof raw !== "object") return null;
    const estrelas = Math.max(1, Math.min(5, Math.round(Number(raw.estrelas)) || 1));
    return {
        id: (typeof raw.id === "string" && raw.id) ? raw.id : gerarIdCredencialDarknet(),
        estrelas,
        texto: typeof raw.texto === "string" ? raw.texto : "",
        autor: typeof raw.autor === "string" ? raw.autor : "",
        data: typeof raw.data === "string" ? raw.data : ""
    };
}

// Contato salvo de uma credencial do site Dm (plano-darknet-passo9.txt,
// Parte 1). Só lido/editado pelo site "dm" — nos demais sites o array
// existe mas fica vazio e ignorado, mesmo espírito de pontuacao/avaliacoes.
function normalizarContatoDm(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
        id: (typeof raw.id === "string" && raw.id) ? raw.id : gerarIdCredencialDarknet(),
        numero: typeof raw.numero === "string" ? raw.numero : String(raw.numero ?? ""),
        nome: typeof raw.nome === "string" ? raw.nome : String(raw.nome ?? "")
    };
}

// Item à venda cadastrado numa credencial do site Creators ou BlackPrint
// (plano-darknet-passo9.txt, Parte 1 e 5). Usado depois pelo sorteio por
// dificuldade em regras.js (dificuldadeItemDarknet / sortearItemPorResultado).
function normalizarItemVendaDarknet(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
        id: (typeof raw.id === "string" && raw.id) ? raw.id : gerarIdCredencialDarknet(),
        nome: typeof raw.nome === "string" ? raw.nome : String(raw.nome ?? ""),
        valor: Math.max(0, Number(raw.valor) || 0)
    };
}

// Stats do site Void (seguidores / posts / seguindo). Sempre presente no
// objeto normalizado, mas só editado pelo site "void" (ver
// DARKNET_SITES_STATS em ficha.js).
function normalizarStatsVoidDarknet(raw) {
    const r = (raw && typeof raw === "object") ? raw : {};
    return {
        seguidores: Math.max(0, Math.round(Number(r.seguidores)) || 0),
        posts: Math.max(0, Math.round(Number(r.posts)) || 0),
        seguindo: Math.max(0, Math.round(Number(r.seguindo)) || 0)
    };
}

function normalizarCredencialDarknet(raw) {
    // Formato antigo: a própria credencial era uma string.
    if (typeof raw === "string") {
        return {
            id: gerarIdCredencialDarknet(),
            nome: raw,
            pontuacao: 0,
            avaliacoes: [],
            contatos: [],
            stats: normalizarStatsVoidDarknet(null),
            itens: []
        };
    }
    if (!raw || typeof raw !== "object") return null;
    return {
        id: (typeof raw.id === "string" && raw.id) ? raw.id : gerarIdCredencialDarknet(),
        nome: typeof raw.nome === "string" ? raw.nome : String(raw.nome ?? ""),
        pontuacao: Math.max(0, Number(raw.pontuacao) || 0),
        avaliacoes: Array.isArray(raw.avaliacoes)
            ? raw.avaliacoes.map(normalizarAvaliacaoDarknet).filter(Boolean)
            : [],
        contatos: Array.isArray(raw.contatos)
            ? raw.contatos.map(normalizarContatoDm).filter(Boolean)
            : [],
        stats: normalizarStatsVoidDarknet(raw.stats),
        itens: Array.isArray(raw.itens)
            ? raw.itens.map(normalizarItemVendaDarknet).filter(Boolean)
            : []
    };
}

function normalizarDarknetCredenciais(raw) {
    const saida = {};
    if (!raw || typeof raw !== "object") return saida;
    for (const [siteId, lista] of Object.entries(raw)) {
        saida[siteId] = Array.isArray(lista)
            ? lista.map(normalizarCredencialDarknet).filter(Boolean)
            : [];
    }
    return saida;
}

function normalizarDeterminacoes(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.trim()) {
        return raw
            .split("\n")
            .map(linha => linha.replace(/^\s*\d+[.)]\s*/, "").trim())
            .filter(Boolean);
    }
    return [];
}

// Veículos (manual pg. 36-43) — Fase 1 do plano (ver plano-veiculos.txt):
// registro próprio por veículo em fichas/{id}/veiculos/{veiculoId},
// paralelo ao inventário (mesmo padrão de normalizarInventario). Cada
// atributo é clampado pra escala válida (0-5) — um valor fora disso só
// pode vir de edição manual direto no Firebase ou de um bug futuro, e
// nivelVeiculo (dados-manual.js) já cai pro nível 0 nesse caso, mas
// clampar aqui também evita salvar o valor inconsistente de volta.
const NIVEL_VEICULO_MIN = 0;
const NIVEL_VEICULO_MAX = 5;
function clamparNivelVeiculo(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n)) return 0;
    return Math.max(NIVEL_VEICULO_MIN, Math.min(NIVEL_VEICULO_MAX, Math.round(n)));
}

// Tipo inválido/ausente (ficha antiga, ou campo nunca preenchido pelo
// Mestre) cai em "pessoal" — é a periodicidade de manutenção mais
// tolerante (mensal), então não pune ninguém por um veículo ainda sem
// tipo definido.
const TIPOS_VEICULO_VALIDOS = TIPOS_VEICULO.map(t => t.key);
function normalizarTipoVeiculo(tipo) {
    return TIPOS_VEICULO_VALIDOS.includes(tipo) ? tipo : "pessoal";
}

// Vida do veículo (manual pg. 39, Fase 2 — ver plano-veiculos-fase2.txt):
// `pvAtual` segue exatamente a mesma convenção já usada em
// dados.pvAtual da ficha do personagem — null/undefined = "cheio"
// (equivale ao pvMaxVeiculo(protecao) calculado na hora, não um valor
// fixo gravado), só passa a guardar um número quando o veículo já
// tomou dano de verdade. Isso evita ter que "inicializar" pvAtual em
// todo veículo já existente só porque a Fase 2 chegou.
function normalizarPvAtualVeiculo(valor) {
    if (valor === null || valor === undefined) return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
}

// `deterioracoes`: array de { atributo, valor } — cada entrada é um -1
// isolado (não um total já somado), pra ficar fácil zerar só as
// deteriorações de UM atributo específico quando ele for reparado
// (Fase 3), sem mexer nas dos outros atributos. Entradas malformadas
// (sem atributo válido ou sem valor numérico) são descartadas — o
// mesmo espírito defensivo do resto desta função: nunca deixar lixo de
// edição manual no Firebase quebrar o cálculo.
function normalizarDeterioracoesVeiculo(lista) {
    if (!Array.isArray(lista)) return [];
    return lista
        .filter(d => d && ATRIBUTOS_VEICULO.includes(d.atributo) && Number.isFinite(Number(d.valor)))
        .map(d => ({ atributo: d.atributo, valor: Number(d.valor) }));
}

// `bonusTemporarios` (Fase 4 do plano — ver plano-veiculos-fase2.txt,
// seção "FASE 4"): array de { atributo, valor, motivo, criadoEm } —
// bônus de manobra "por uma cena" (ex.: Cavalo de Pau, Drift). Mesmo
// espírito defensivo de normalizarDeterioracoesVeiculo: entrada sem
// atributo válido ou sem valor numérico é descartada. Fica de fora até
// alguma manobra aplicar um (nunca precisa ser "inicializado").
function normalizarBonusTemporariosVeiculo(lista) {
    if (!Array.isArray(lista)) return [];
    return lista
        .filter(b => b && ATRIBUTOS_VEICULO.includes(b.atributo) && Number.isFinite(Number(b.valor)))
        .map(b => ({
            atributo: b.atributo,
            valor: Number(b.valor),
            motivo: b.motivo || "",
            criadoEm: b.criadoEm || Date.now()
        }));
}

// `acessoriosInstalados` (Fase 5a do plano — ver
// plano-acessorios-veiculo.txt; catálogo em si é a Fase 5b): array de
// { key, instaladoEm, usadoNestaCena } pros acessórios passivos do
// catálogo (CATALOGO_ACESSORIOS_VEICULO, dados-manual.js). Os 3
// acessórios-arma (Fase 5c) NÃO entram neste array — vivem como item
// de inventário normal com `item.instaladoEmVeiculoId` apontando pro
// veículo. Entrada sem `key` (string não vazia) é descartada — mesmo
// espírito defensivo do resto deste arquivo. Entrada com `key` que não
// bate com NENHUM acessório do catálogo atual também é descartada (ex.:
// catálogo mudou depois de instalado) — mais seguro que deixar um
// `nivel: 0` fantasma comendo 0 slots mas aparecendo na lista.
//
// `nivel` é resolvido AQUI, a cada normalização, a partir do catálogo
// atual (nunca gravado no Firebase) — assim slotsAcessoriosUsados
// (regras.js) só precisa ler `.nivel` de cada entrada sem se importar
// se ela veio do catálogo passivo ou (futuramente) de outro lugar, e o
// número nunca fica dessincronizado do catálogo.
//
// `usadoNestaCena`: só relevante pros acessórios com
// mecanica === "uma_vez_por_cena" (IA de Bordo, Lança Fumaça) — o
// Mestre zera manualmente ao trocar de cena (botão "Resetar usos",
// mesmo espírito do "Limpar" de bonusTemporarios).
function normalizarAcessoriosInstaladosVeiculo(lista) {
    if (!Array.isArray(lista)) return [];
    return lista
        .filter(a => a && typeof a.key === "string" && a.key.trim() !== "")
        .map(a => {
            const doCatalogo = buscarAcessorioVeiculo(a.key);
            return doCatalogo ? {
                key: a.key,
                nivel: doCatalogo.nivel,
                instaladoEm: Number.isFinite(Number(a.instaladoEm)) ? Number(a.instaladoEm) : Date.now(),
                usadoNestaCena: a.usadoNestaCena === true
            } : null;
        })
        .filter(Boolean);
}

export function normalizarVeiculos(lista) {
    const out = {};
    if (!lista) return out;
    for (const id of Object.keys(lista)) {
        const v = lista[id] || {};
        const atributosBrutos = v.atributos || {};
        const atributos = {};
        for (const chave of ATRIBUTOS_VEICULO) {
            atributos[chave] = clamparNivelVeiculo(atributosBrutos[chave]);
        }
        out[id] = {
            nome: v.nome || "",
            tipo: normalizarTipoVeiculo(v.tipo),
            atributos,
            // Vida do veículo (Fase 2 do plano) — ver comentários das
            // funções normalizarPvAtualVeiculo/normalizarDeterioracoesVeiculo
            // logo acima.
            pvAtual: normalizarPvAtualVeiculo(v.pvAtual),
            deterioracoes: normalizarDeterioracoesVeiculo(v.deterioracoes),
            // Bônus temporário de manobra (Fase 4 — ver comentário de
            // normalizarBonusTemporariosVeiculo logo acima).
            bonusTemporarios: normalizarBonusTemporariosVeiculo(v.bonusTemporarios),
            // Slots de acessórios/armamento (Fase 5a — ver comentário de
            // normalizarAcessoriosInstaladosVeiculo logo acima).
            acessoriosInstalados: normalizarAcessoriosInstaladosVeiculo(v.acessoriosInstalados),
            criadoEm: v.criadoEm || Date.now(),
            // Trava física (ver plano-veiculos.txt, adendo "chave"):
            // veículo criado pela feature nova já nasce trancado (só
            // destranca com a chave correspondente no inventário da
            // mesma ficha). Veículo antigo, migrado de antes dessa
            // feature existir, não tem `trancado` salvo — cai em
            // `false` (destrancado) de propósito, senão toda ficha já
            // em jogo ficaria com o carro trancado do nada, sem chave
            // nenhuma pra abrir.
            trancado: typeof v.trancado === "boolean" ? v.trancado : false,
            // Id do item-chave criado junto (inventário da mesma
            // ficha) — só um atalho de conveniência pra UI (destacar a
            // chave "oficial" na lista, por ex.); a checagem de "tem
            // chave pra destrancar" em si busca por veiculoId no
            // inventário (ver veiculoTemChaveDisponivel em regras.js),
            // não por esse id — assim, mesmo se esse item específico
            // for perdido e outro for criado manualmente com o mesmo
            // veiculoId, o destrave continua funcionando.
            chaveItemId: v.chaveItemId || null,
            // "Aparecer no Cenário" (Fase 6 do plano — ver
            // plano-veiculos-fase2.txt, seção "FASE 6"): cenarioId aponta
            // pro cenário onde este veículo está presente agora (null =
            // "guardado", fora de cena — estado padrão). cenarioEntryId
            // guarda a push key da entrada-ponteiro correspondente em
            // cenarios/{cenarioId}/veiculos/{cenarioEntryId}, pra
            // remover/atualizar sem precisar procurar em todos os
            // cenários (ver aparecerVeiculoNoCenario/removerVeiculoDoCenario,
            // mestre.js).
            cenarioId: v.cenarioId || null,
            cenarioEntryId: v.cenarioEntryId || null,
            // "Quem destrancou por último" (Fase 6, item 4 — ver
            // plano-veiculos-fase2.txt, seção "FASE 6"): registro simples
            // de texto pra apoiar a narração de um roubo (Arrombar bem-
            // sucedido) — gravado por definirTrancaVeiculoJogador
            // (mestre.js) sempre que o Mestre destranca o veículo de
            // outro dono pelo Gerenciador de Cenário. Não tem relação
            // nenhuma com a chave física de verdade (chaveItemId acima),
            // que continua sempre com o dono original.
            ultimoADestrancar: v.ultimoADestrancar || null
        };
    }
    return out;
}

// Migra o antigo par fixo `dados.dinheiroLimpo` / `dados.dinheiroSujo`
// (fichas criadas antes da refatoração financeira) pro novo modelo de
// saldos livres, preservando os valores já jogados. Fichas novas (sem
// `raw.saldos` e sem os campos antigos) recebem os 3 saldos fixos
// zerados. Saldos customizados criados pelos jogadores são preservados
// como estão.
function normalizarSaldos(saldosRaw, dadosAntigos) {
    const out = {};
    for (const [id, padrao] of Object.entries(SALDOS_FIXOS_PADRAO)) {
        out[id] = { ...padrao };
    }
    // Migração de fichas antigas: só roda se ainda não existe um objeto
    // `saldos` salvo (ou seja, a ficha nunca passou por este código).
    if (!saldosRaw) {
        if (dadosAntigos && dadosAntigos.dinheiroLimpo !== undefined) {
            out.limpo.valor = Number(dadosAntigos.dinheiroLimpo) || 0;
        }
        if (dadosAntigos && dadosAntigos.dinheiroSujo !== undefined) {
            out.sujo.valor = Number(dadosAntigos.dinheiroSujo) || 0;
        }
        return out;
    }
    for (const [id, s] of Object.entries(saldosRaw)) {
        const ehFixo = Object.prototype.hasOwnProperty.call(SALDOS_FIXOS_PADRAO, id);
        out[id] = {
            nome: s.nome || (ehFixo ? SALDOS_FIXOS_PADRAO[id].nome : "(sem nome)"),
            valor: Number(s.valor) || 0,
            fixo: ehFixo
        };
    }
    return out;
}

function normalizarCriacao(c, dados) {
    c = c || {};
    return {
        etapa: c.etapa ?? 1,
        funcaoEscolhida: c.funcaoEscolhida ?? "",
        escolhaAtributoFuncao: c.escolhaAtributoFuncao ?? "",
        etapa1JaConfirmadaAntes: c.etapa1JaConfirmadaAntes ?? false,
        pontosAtributosRestantes: c.pontosAtributosRestantes ?? 7,
        pontosPericiasRestantes: c.pontosPericiasRestantes ?? 5,
        pontosFuncaoRestantes: c.pontosFuncaoRestantes ?? 0,
        pontosBonusDesvantagens: c.pontosBonusDesvantagens ?? 0,
        bonusGasto: c.bonusGasto ?? 0,
        bonusGastoDetalhe: c.bonusGastoDetalhe ?? {},
        concluida: c.concluida ?? (dados.criacaoConcluida ?? false)
    };
}

function normalizarTreinamento(t) {
    t = t || {};
    return {
        ativo: t.ativo ?? false,
        periciaFisica: t.periciaFisica ?? null,
        periciaMental: t.periciaMental ?? null,
        atributoFisico: t.atributoFisico ?? null,
        atributoMental: t.atributoMental ?? null,
        // Fila de espera de cada tipo (ver treinamento.js, iniciarTreinoCaracteristica/
        // filaTreino) — sem isso aqui, a sincronização em tempo real apagava
        // a fila da ficha em memória assim que o próprio salvarTreinamento()
        // (ficha.js) confirmava a gravação: enfileirava certinho no banco,
        // mas sumia na hora porque essa função reconstrói o objeto inteiro
        // sem esses 4 campos. Precisa ser array (não objeto) — Object.values
        // cobre tanto array quanto o formato de objeto-com-chaves-numéricas
        // que o Realtime Database às vezes entrega pra arrays esparsos.
        filaPericiaFisica: Array.isArray(t.filaPericiaFisica) ? t.filaPericiaFisica : Object.values(t.filaPericiaFisica || {}),
        filaPericiaMental: Array.isArray(t.filaPericiaMental) ? t.filaPericiaMental : Object.values(t.filaPericiaMental || {}),
        filaAtributoFisico: Array.isArray(t.filaAtributoFisico) ? t.filaAtributoFisico : Object.values(t.filaAtributoFisico || {}),
        filaAtributoMental: Array.isArray(t.filaAtributoMental) ? t.filaAtributoMental : Object.values(t.filaAtributoMental || {})
    };
}

function normalizarPericias(lista) {
    const out = {};
    for (const id of Object.keys(lista)) {
        const p = lista[id];
        const oficial = buscarPericiaPorNome(p.nome);
        out[id] = {
            nome: p.nome || "",
            nivel: p.nivel ?? 0,
            descricao: p.descricao || "",
            modificadores: p.modificadores || [],
            especializacoes: Array.isArray(p.especializacoes) ? p.especializacoes : [],
            legado: !oficial // marca perícias fora da lista fechada (criadas antes da migração)
        };
    }
    return out;
}

export function normalizarInventario(lista) {
    const out = {};
    for (const id of Object.keys(lista)) {
        const it = lista[id];
        out[id] = {
            nome: it.nome || "",
            descricao: it.descricao || "",
            modificadores: it.modificadores || [],
            ativo: it.ativo ?? true,
            // Miniatura opcional do item (ver configurarImagemItemGenerico
            // em ficha.js) — sem essa linha, a normalização apagava o
            // campo toda vez que a ficha recarregava do Firebase.
            imagem: it.imagem || null,
            tag: it.tag || "geral",
            nivelTag: it.nivelTag ?? null,
            // Checkbox "Limitar rolagem" (ver tagPermiteLimiteRolagemPorNivel
            // em dados-manual.js): quando true, a rolagem da perícia
            // vinculada ao usar este item fica travada no nível do
            // próprio item (nivelTag), mesmo que a perícia do
            // personagem seja mais alta. Default false (não muda
            // comportamento de itens antigos).
            limitarRolagemPorNivel: it.limitarRolagemPorNivel ?? false,
            peso: it.peso ?? 0,
            // Quantidade genérica (ver tagTemQuantidadeGeral em
            // dados-manual.js): pesoUnitario só existe pra tags que
            // usam esse esquema — pra elas, peso acima já é o TOTAL
            // (pesoUnitario × quantidade), calculado e gravado no
            // momento de salvar o item.
            pesoUnitario: it.pesoUnitario ?? null,
            // Volume/tamanho (Fase 0/7 do sistema "cabe ou não cabe" —
            // ver dados-manual.js e inventario.js). Item antigo (criado
            // antes desses campos existirem) cai nos defaults mais
            // permissivos possíveis: volume 0 e tamanho "pequeno" (o
            // menor da lista — tamanhoCabe deixa passar em qualquer
            // recipiente) — assim ele não "empurra" a capacidade de
            // ninguém nem trava por tamanho até o jogador/Mestre editar
            // o item e preencher de verdade.
            volume: it.volume ?? 0,
            volumeUnitario: it.volumeUnitario ?? null,
            tamanho: it.tamanho || "pequeno",
            // Recipiente antigo sem capacidadeVolume/tamanhoMaximoAceito
            // definidos fica null (não 0/"pequeno") — null é o valor que
            // itemCabeNoContainer/tamanhoCabe leem como "sem limite",
            // então o recipiente continua aceitando qualquer coisa até o
            // Mestre preencher esses campos de propósito. Isso evita
            // travar de uma vez toda mochila já em uso assim que a
            // funcionalidade entra no ar.
            capacidadeVolume: it.capacidadeVolume ?? null,
            tamanhoMaximoAceito: it.tamanhoMaximoAceito || null,
            quantidade: it.quantidade ?? null,
            categoria: it.categoria || "levando",
            // Item guardado dentro de um recipiente (mochila etc. — ver
            // ehContainer/itensDentroDe em inventario.js). Estava faltando
            // aqui — mesmo bug de "campo apagado a cada recarga" que
            // materialTipo/ehSaldo já tiveram (ver comentário mais abaixo):
            // sem essa linha, todo item guardado numa mochila "soltava"
            // sozinho assim que a ficha recarregasse.
            dentroDe: it.dentroDe || null,
            // Sistema de Slots de Porte (Fase 8 — ver projeto-slots-porte.txt).
            // subtipoPorte/compartimentos só têm sentido em item com
            // ehContainer(tag) === true, mas ficam gravados soltos aqui
            // igual todo o resto do item (mesma classe de bug que
            // materialTipo/veiculoId já tiveram: se não estiver listado
            // aqui, é apagado a cada recarga da ficha). Container antigo
            // sem compartimentos ainda é migrado por normalizarCompartimentos,
            // logo abaixo, então aqui só preserva o que já existir.
            subtipoPorte: it.subtipoPorte || null,
            compartimentos: Array.isArray(it.compartimentos) ? it.compartimentos : null,
            // PREPARADO PRA FUTURO — quando o sistema de Slots de
            // Equipamento existir (lista de "lugares no corpo" tipo
            // cabeça/torso/pernas/cintura/costas/mão — ver nota grande
            // em SUBTIPOS_PORTE, dados-manual.js), o campo novo
            // `item.slot` entra bem aqui do lado, seguindo o mesmo
            // padrão: `slot: it.slot || null`. Não existe ainda de
            // propósito — sem a lista fechada de slots definida, não
            // tem o que normalizar.
            // Mãos necessárias pra segurar/equipar o item solto (default
            // 1 — arma de duas mãos usa 2). Vale pra qualquer item, não
            // só container.
            maosNecessarias: it.maosNecessarias ?? 1,
            // Qual compartimento específico do container-pai este item
            // ocupa (ex: "c2"). Só importa quando dentroDe também está
            // preenchido.
            compartimentoId: it.compartimentoId || null,
            // Armas precisam estar equipadas (empunhadas) pra serem
            // usadas em combate — ver itemPodeUsar em inventario.js.
            // Itens que já existiam antes dessa trava nascem desequipados
            // (padrão seguro: o jogador precisa equipar explicitamente).
            equipada: it.equipada ?? false,
            // Equipável: além de arma (sempre equipável por natureza —
            // ver ehArma em itemEhEquipavel, inventario.js), qualquer
            // outro item pode ser marcado como tal no modal do item.
            equipavel: it.equipavel ?? false,
            // arma.dilacera/dilaceraEmGolpeNormal (item 7 do plano de
            // saúde/complicações): default false pra itens/armas
            // antigos que ainda não têm esses dois campos.
            arma: it.arma ? { ...it.arma, dilacera: it.arma.dilacera ?? false, dilaceraEmGolpeNormal: it.arma.dilaceraEmGolpeNormal ?? false } : null,
            // Produto Químico (tag "produto_quimico" — ver plano-quimicos-
            // cenario.txt): mesmo padrão de `it.arma`, só relevante pra essa
            // tag. Item com essa tag sem `it.quimico` ainda preenchido
            // (recém-criado ou item antigo) normaliza pro objeto default
            // (raio 0, sem dificuldade, sem tipo) em vez de null, já que pra
            // essa tag o bloco sempre é relevante.
            quimico: it.tag === "produto_quimico"
                ? {
                    raio: Number(it.quimico?.raio) || 0,
                    dificuldadeUsar: it.quimico?.dificuldadeUsar ?? null,
                    tipoEfeito: it.quimico?.tipoEfeito || "",
                    // Efeitos mecânicos do item (it.quimico.efeitos — gerado
                    // pelo modal via lerConfigQuimicoDoModal). Faltava aqui:
                    // toda normalização de ficha jogava esse array fora,
                    // deixando consumirDroga/painel de área sem nada pra
                    // disparar (Parte 8, item 5.1 do plano-automacao-
                    // materiais-quimicos-v3).
                    efeitos: Array.isArray(it.quimico?.efeitos) ? it.quimico.efeitos : [],
                    // Veículo de transporte (continuação da v3 — automação
                    // da entrega): pontosVeiculoTransporte precisa
                    // sobreviver à normalização pra restaurar a linha da
                    // receita ao reabrir o item pra edição (ver
                    // renderizarLinhasMateriaisQuimico em ficha.js); sem
                    // isso, editar um item já salvo zerava esse campo
                    // silenciosamente porque este bloco reconstrói o objeto
                    // do zero em vez de espalhar (...it.quimico).
                    pontosVeiculoTransporte: Number(it.quimico?.pontosVeiculoTransporte) || 0,
                    tipoEntrega: it.quimico?.tipoEntrega || "area",
                    tipoEntregaLabel: it.quimico?.tipoEntregaLabel || "Área"
                  }
                : (it.quimico || null),
            // Efeitos de Equipamento Médico (tag "equipamento_medico" —
            // ver plano-efeitos-equipamentos-medicos.txt, Fase 2). Mesmo
            // padrão de `modificadores` acima (array simples, sem objeto
            // default por tag como `quimico`/`implante` têm, já que aqui
            // não existe nenhum sub-campo obrigatório fora da lista em
            // si). Item sem esse campo ainda gravado (criado antes desse
            // plano, ou de qualquer tag que não seja equipamento médico)
            // normaliza pra array vazio — não quebra nada, só não tem
            // efeito nenhum até alguém cadastrar um.
            efeitosMedicos: Array.isArray(it.efeitosMedicos) ? it.efeitosMedicos : [],
            // Implante de Biomecânica (tag "biomecanica" — ver plano-
            // implantes-biomecanica.txt). Mesmo padrão de `it.quimico`
            // acima: só relevante pra essa tag, mas normaliza pro objeto
            // default em vez de null quando a tag bate, pra sempre ter
            // os campos prontos pro modal/UI ler sem checagem extra.
            // `instalado` é o que diferencia "produto comprado, ainda na
            // mochila" de "já implantado, mora no painel da aba Saúde".
            implante: it.tag === "biomecanica"
                ? {
                    subtipo: it.implante?.subtipo || null,
                    dificuldadeInstalar: it.implante?.dificuldadeInstalar ?? null,
                    funcoesEspeciais: it.implante?.funcoesEspeciais || "",
                    instalado: it.implante?.instalado ?? false,
                    // Testes de adaptação (Constituição, feitos pelo
                    // próprio paciente, sozinho, após a cirurgia — ver
                    // Fase 6 do plano): contagem de quantos já foram
                    // feitos e quantas falhas viraram rejeição parcial.
                    testesAdaptacaoFeitos: it.implante?.testesAdaptacaoFeitos ?? 0,
                    rejeicaoParcial: it.implante?.rejeicaoParcial ?? 0,
                    // Histórico simples da cirurgia (quem instalou/
                    // removeu, resultado, data) — só pra exibição no
                    // card, sem efeito mecânico.
                    historico: Array.isArray(it.implante?.historico) ? it.implante.historico : [],
                    // Marcado pela Fase 5 (confirmarAcaoPendente
                    // "instalar_implante", mestre.js) numa falha
                    // crítica de instalação — item vira sucata inútil,
                    // sem efeito mecânico automático além do aviso na
                    // Fase 9 (painel Implantes da aba Saúde).
                    quebrado: it.implante?.quebrado ?? false
                  }
                : (it.implante || null),
            periciaUso: it.periciaUso || null,
            // Carteira digital (Eletrônico ou Dinheiro físico — ver
            // ehTagQuePodeSerSaldo em dados-manual.js): saldoValor só
            // importa quando ehSaldo é true, mas preserva o valor mesmo
            // assim (evita perder o histórico se o jogador desmarcar e
            // marcar de novo). Eletrônico guarda DOIS saldos separados
            // (notas/moedas — pedido do grupo: mesmo item, saldos
            // independentes, cada um gasto/movido à parte na aba
            // Finanças). Item eletrônico ANTIGO que só tinha saldoValor
            // (de antes dessa separação existir) migra automaticamente
            // pra saldoNotas na primeira carga — sem isso o saldo dele
            // sumiria da tela sem aviso, mesmo continuando gravado.
            ehSaldo: it.ehSaldo ?? false,
            saldoValor: it.saldoValor ?? 0,
            saldoNotas: it.saldoNotas ?? (it.tag === "eletronico" ? (it.saldoValor ?? 0) : 0),
            saldoMoedas: it.saldoMoedas ?? 0,
            classeProtecao: it.classeProtecao || null,
            calibre: it.calibre || null,
            reducoesDano: Array.isArray(it.reducoesDano) ? it.reducoesDano : [],
            localProtegido: it.localProtegido || null,
            carregador: it.carregador || null,
            projetil: it.projetil || null,
            // Materiais de Criação (tag "material") — estavam faltando
            // aqui, então eram apagados a cada recarga da ficha (mesma
            // classe de bug que ehSaldo/saldoValor tinham antes de
            // entrar nessa lista). Ver uso em ficha.js (materialTipo,
            // qualidadesDoMaterial, agruparMateriaisPorTipo etc.).
            materialTipo: it.materialTipo ?? null,
            materialQualidade: it.materialQualidade ?? null,
            materialQuantidade: it.materialQuantidade ?? null,
            // Chave de veículo (tag "chave" — ver plano-veiculos.txt):
            // aponta pro id do veículo que essa chave destranca (mesmo
            // padrão de referência cruzada que dentroDe usa pra
            // recipientes). Mesma classe de bug do materialTipo/ehSaldo
            // se esquecido aqui — teria sido apagado a cada recarga.
            veiculoId: it.veiculoId || null,
            // Acessório-arma montado no veículo (tag "arma" — Fase 5c do
            // plano, ver plano-acessorios-veiculo.txt, seção "FASE 5c"):
            // ponteiro pro veículo onde este item está instalado, mesmo
            // espírito do `veiculoId` da chave acima (referência cruzada,
            // não cópia) — null = "na mão"/guardado, fora de qualquer
            // veículo. Mesma classe de bug do materialTipo/ehSaldo se
            // esquecido aqui.
            instaladoEmVeiculoId: it.instaladoEmVeiculoId || null,
            // Onde no carro a arma fica (texto livre — "traseira",
            // "teto", "torreta" etc.): o manual só dá exemplos, não uma
            // lista fechada de posições, então não vira enum. Só
            // informativo pra UI, sem efeito mecânico.
            slotVeiculo: it.slotVeiculo || null
        };
    }
    return out;
}

// Sistema de Slots de Porte (Fase 8 — ver projeto-slots-porte.txt, seção
// 6). Containers já existentes (criados antes dessa mudança, com
// capacidadeVolume/tamanhoMaximoAceito soltos no item, sem
// subtipoPorte/compartimentos) precisam ser convertidos automaticamente
// ao carregar a ficha — sem exigir nenhuma ação manual do jogador/Mestre.
// Chamada depois de normalizarInventario já ter rodado (precisa dos
// campos novos já presentes no objeto, mesmo que null/vazios).
export function normalizarCompartimentos(fichaAtual) {
    const inventario = (fichaAtual && fichaAtual.inventario) || {};

    for (const item of Object.values(inventario)) {
        if (!item || !ehContainer(item.tag)) continue;

        if (!item.compartimentos || item.compartimentos.length === 0) {
            item.compartimentos = [{
                id: "principal",
                nome: "Principal",
                capacidadeVolume: item.capacidadeVolume ?? 0,
                tamanhoMaximoAceito: item.tamanhoMaximoAceito ?? null
            }];
            // Os campos soltos antigos somem — o dado real agora mora
            // dentro do compartimento "principal" criado acima.
            delete item.capacidadeVolume;
            delete item.tamanhoMaximoAceito;
        }

        // Default seguro pra não quebrar mochilas já vestidas: um
        // container antigo não tem como saber se era roupa/cinto/bolsa
        // de mão, então cai em "mochila" (não exclusivo, não ocupa mão)
        // — o jogador/Mestre corrige depois no modal do item se for
        // outro subtipo.
        item.subtipoPorte = item.subtipoPorte || "mochila";
    }

    // Item filho (dentroDe já existia) sem compartimentoId ainda cai no
    // compartimento "principal" recém-criado (ou já existente) do
    // container-pai — feito num segundo laço pra não depender da ordem
    // de iteração de Object.values entre pai e filho.
    for (const item of Object.values(inventario)) {
        if (item && item.dentroDe && !item.compartimentoId) {
            item.compartimentoId = "principal";
        }
    }

    return fichaAtual;
}

export function fichaVaziaPadrao(nomeExibicao) {
    return {
        dados: {
            nome: nomeExibicao, vulgo: "", idade: "", nacionalidade: "", funcao: "",
            maldade: 0, remorso: 0, status: 0,
            dm: "", void: "", p2k: "", rabbithole: "", p2c: "", creators: "",
            darkart: "", blackprint: "",
            nivel: 1, xp: 0,
            forca: 0, constituicao: 0, destreza: 0, sabedoria: 0,
            inteligencia: 0, raciocinio: 0, carisma: 0, manipulacao: 0,
            pvAtual: null, energiaAtual: null,
            mortoDeVez: false,
            pvBonusExtra: 0,
            padraoDeVida: "",
            ganhoFixo: 0,
            ultimoPagamentoCustoVida: 0,
            custoVidaPagos: {},
            criacaoConcluida: false,
            recuperacaoPV: null,
            infeccao: null,
            coma: null,
            saiuDoComaPendente: false,
            desmaiado: false,
            ignorarPenalidadeSaudeAte: null,
            fatoresRecuperacaoItens: {},
            pvMaximoOverride: null,
            energiaMaximoOverride: null
        },
        saldos: {
            sujo: { nome: "Dinheiro sujo em casa", valor: 0, fixo: true },
            limpo: { nome: "Dinheiro limpo na conta", valor: 0, fixo: true },
            bolso: { nome: "No bolso", valor: 0, fixo: true }
        },
        pericias: {},
        inventario: {},
        categoriasInventario: {},
        gastosExtras: {},
        vantagens: {},
        desvantagens: {},
        especializacoes: {},
        fatosUniversais: {},
        efeitosDrogas: {},
        efeitosItens: {},
        receitasConhecidas: {},
        criacao: {
            etapa: 1, funcaoEscolhida: "", escolhaAtributoFuncao: "", etapa1JaConfirmadaAntes: false,
            pontosAtributosRestantes: 7, pontosPericiasRestantes: 5,
            pontosFuncaoRestantes: 0, pontosBonusDesvantagens: 0,
            bonusGasto: 0, bonusGastoDetalhe: {},
            concluida: false
        },
        treinamento: {
            ativo: false, periciaFisica: null, periciaMental: null, atributoFisico: null, atributoMental: null,
            filaPericiaFisica: [], filaPericiaMental: [], filaAtributoFisico: [], filaAtributoMental: []
        },
        levelUpPendente: null,
        determinacoes: [],
        determinacoesValidadas: [],
        veiculos: {},
        darknetCredenciais: {},
        notas: ""
    };
}

// =====================================================================
// NPC "modo detalhado" → visão de Ficha completa
// =====================================================================
// Converte um registro `npcs/{id}` (modoDetalhado) pro MESMO formato
// que normalizarFicha() produz, pra que o Mestre possa abrir a tela da
// Ficha "atuando como" esse NPC e usar a interface normal de perícias,
// manobras de combate e itens — em vez de uma tela separada.
//
// Só NPCs modoDetalhado têm atributos primários estruturados (0-99) e,
// portanto, só eles podem virar uma "ficha" completa; NPCs do gerador
// rápido continuam funcionando só pelo Painel do Mestre / Gerenciador
// de Combate, como antes.
//
// Duas listas guardam o mesmo tipo de coisa em nós diferentes por
// compatibilidade com o editor de mini-ficha do Mestre:
//   - periciasNpc: { nome, nivel } — editado pelo mini-editor de NPC
//   - pericias (visão de ficha): mesmo registro + modificadores/
//     especializacoes/descrição, pra reaproveitar a UI de perícia do
//     jogador (que permite anexar modificadores estruturados por
//     perícia). Ao salvar pela tela da Ficha, grava de volta em
//     periciasNpc (ver caminhoListaNpc em ficha.js).
export function normalizarNpcComoFicha(npcId, raw) {
    const npc = raw || {};
    const ap = npc.atributosPrimarios || {};

    const pericias = {};
    for (const [id, p] of Object.entries(npc.periciasNpc || {})) {
        pericias[id] = {
            nome: p.nome || "",
            nivel: p.nivel ?? 0,
            descricao: p.descricao || "",
            modificadores: p.modificadores || [],
            especializacoes: Array.isArray(p.especializacoes) ? p.especializacoes : [],
            legado: !buscarPericiaPorNome(p.nome)
        };
    }

    // Os overrides manuais (PV/Velocidade/etc digitados à mão no editor
    // de NPC) viram um "pacote de modificadores" com origem própria, pra
    // que os cálculos derivados (calcularDerivados) da tela de Ficha
    // cheguem no mesmo valor que o editor de NPC já mostrava.
    const deltas = deltaModificadoresOverrideNpc(ap, npc.secundariosOverride);

    const fichaNpc = {
        npcId,
        ehNpc: true,
        config: { nomeExibicao: npc.nome || "NPC sem nome" },
        dados: {
            nome: npc.nome ?? "", vulgo: npc.vulgo ?? "", idade: npc.idade ?? "",
            nacionalidade: "", funcao: npc.funcaoNarrativa ?? "",
            maldade: 0, remorso: 0, status: 0,
            dm: "", void: "", p2k: "", rabbithole: "", p2c: "", creators: "",
            darkart: "", blackprint: "",
            nivel: 1, xp: 0,
            forca: ap.forca ?? 0, constituicao: ap.constituicao ?? 0, destreza: ap.destreza ?? 0,
            sabedoria: ap.sabedoria ?? 0, inteligencia: ap.inteligencia ?? 0,
            raciocinio: ap.raciocinio ?? 0, carisma: ap.carisma ?? 0, manipulacao: ap.manipulacao ?? 0,
            pvAtual: npc.pvAtual ?? null, energiaAtual: npc.energiaAtual ?? null,
            mortoDeVez: npc.mortoDeVez ?? false,
            pvBonusExtra: 0,
            padraoDeVida: "", ganhoFixo: 0, ultimoPagamentoCustoVida: 0,
            criacaoConcluida: true,
            recuperacaoPV: npc.recuperacaoPV || null,
            infeccao: npc.infeccao || null,
            pvMaximoOverride: npc.pvMaximoOverride ?? null,
            energiaMaximoOverride: npc.energiaMaximoOverride ?? null
        },
        saldos: {},
        pericias,
        inventario: normalizarInventario(npc.inventario || {}),
        categoriasInventario: npc.categoriasInventario || {},
        gastosExtras: {},
        // vantagens: já são gravadas certinho em npcs/{id}/vantagens pelo
        // modal genérico de Vantagem/Desvantagem (ficha.js: caminhoBase()
        // + a lista, sem remapeamento — só `pericias` precisa virar
        // `periciasNpc`, ver caminhoLista). Faltava só ESTA leitura
        // devolver o dado de verdade em vez de {} fixo — sem isso, uma
        // Vantagem cadastrada num NPC nunca entrava em coletarModificadores
        // nem aparecia na aba "Vantagens / Desvantagens" ao atuar como ele.
        vantagens: npc.vantagens || {},
        desvantagens: {},
        // Os deltas de override entram como uma "especialização" oculta
        // — é a fonte de modificadores estruturados mais neutra que já
        // existe (coletarModificadores, em regras.js, soma todas elas
        // igual, sem exigir nenhum campo novo no motor de regras).
        especializacoes: deltas.length ? { _overrideNpc: { nome: "Ajuste manual do NPC", modificadores: deltas } } : {},
        fatosUniversais: {},
        receitasConhecidas: {},
        criacao: {
            etapa: 1, funcaoEscolhida: "", escolhaAtributoFuncao: "", etapa1JaConfirmadaAntes: false,
            pontosAtributosRestantes: 0, pontosPericiasRestantes: 0,
            pontosFuncaoRestantes: 0, pontosBonusDesvantagens: 0,
            bonusGasto: 0, bonusGastoDetalhe: {},
            concluida: true
        },
        treinamento: {
            ativo: false, periciaFisica: null, periciaMental: null, atributoFisico: null, atributoMental: null,
            filaPericiaFisica: [], filaPericiaMental: [], filaAtributoFisico: [], filaAtributoMental: []
        },
        levelUpPendente: null,
        determinacoes: [],
        determinacoesValidadas: [],
        veiculos: {},
        notas: npc.funcaoNarrativa || ""
    };
    // Mesmo inventário/containers da Ficha normal — precisa da mesma
    // migração (ver normalizarCompartimentos acima).
    normalizarCompartimentos(fichaNpc);
    return fichaNpc;
}
