// =====================================================================
// CHUVA DE NEON — Dados fixos do manual
// =====================================================================
// Tudo que é "lista fechada" do livro mora aqui: perícias por categoria,
// funções e seus bônus de criação, manobras de combate, tags de item.
// Separado de regras.js (que guarda fórmulas) pra facilitar manutenção.

// ---------------------------------------------------------------------
// Perícias — lista fechada, dividida por categoria (Física/Mental/Social)
// Cada perícia carrega o(s) atributo(s) sugerido(s) pelo manual (só
// informativo aqui; o atributo-base real de cálculo é fixo por perícia,
// usando o primeiro da lista).
// ---------------------------------------------------------------------
export const CATEGORIAS_PERICIA = [
    { key: "fisica", label: "Física" },
    { key: "mental", label: "Mental" },
    { key: "social", label: "Social" }
];

export const PERICIAS_MANUAL = [
    // ---------- Físicas ----------
    { nome: "Briga de Rua", categoria: "fisica", atributo: "forca" },
    { nome: "Arremessar", categoria: "fisica", atributo: "forca" },
    { nome: "Armas de Fogo de Pequeno Porte", categoria: "fisica", atributo: "destreza" },
    { nome: "Armas de Fogo de Médio Porte", categoria: "fisica", atributo: "destreza" },
    { nome: "Armas de Fogo de Grande Porte", categoria: "fisica", atributo: "destreza" },
    { nome: "Lâminas Curtas", categoria: "fisica", atributo: "destreza" },
    { nome: "Lâminas Longas", categoria: "fisica", atributo: "destreza" },
    { nome: "Contundentes Curtas", categoria: "fisica", atributo: "destreza" },
    { nome: "Contundentes Longas", categoria: "fisica", atributo: "destreza" },
    { nome: "Armas Brancas Exóticas", categoria: "fisica", atributo: "destreza" },
    { nome: "Furtividade", categoria: "fisica", atributo: "destreza" },
    { nome: "Dirigir Veículos", categoria: "fisica", atributo: "destreza" },
    { nome: "Dirigir Veículos Exóticos", categoria: "fisica", atributo: "destreza" },
    { nome: "Resistência Imunológica", categoria: "fisica", atributo: "constituicao" },
    { nome: "Tolerância", categoria: "fisica", atributo: "constituicao" },
    { nome: "Mecânica Automotiva", categoria: "fisica", atributo: "destreza" },
    { nome: "Armeiro", categoria: "fisica", atributo: "destreza" },
    { nome: "Ofícios Utilitários", categoria: "fisica", atributo: "destreza" },
    { nome: "Manobras", categoria: "fisica", atributo: "forca" },
    { nome: "Mão Leve", categoria: "fisica", atributo: "destreza" },
    { nome: "Arrombamento", categoria: "fisica", atributo: "destreza" },
    { nome: "Força Bruta", categoria: "fisica", atributo: "forca" },
    { nome: "Jiu Jitsu", categoria: "fisica", atributo: "destreza" },
    { nome: "Muay Thai", categoria: "fisica", atributo: "forca" },
    { nome: "Boxe", categoria: "fisica", atributo: "forca" },
    { nome: "Karatê Cobra Kai", categoria: "fisica", atributo: "destreza" },
    { nome: "CQC", categoria: "fisica", atributo: "destreza" },

    // ---------- Mentais ----------
    { nome: "Camuflar", categoria: "mental", atributo: "inteligencia" },
    { nome: "Cultura Popular", categoria: "mental", atributo: "inteligencia" },
    { nome: "Explosivos", categoria: "mental", atributo: "inteligencia" },
    { nome: "Eletrônica", categoria: "mental", atributo: "inteligencia" },
    { nome: "Investigação", categoria: "mental", atributo: "inteligencia" },
    { nome: "Procurar", categoria: "mental", atributo: "sabedoria" },
    { nome: "Resistência Mental", categoria: "mental", atributo: "sabedoria" },
    { nome: "Rastreio", categoria: "mental", atributo: "inteligencia" },
    { nome: "Hacking", categoria: "mental", atributo: "inteligencia" },
    { nome: "Programação", categoria: "mental", atributo: "inteligencia" },
    { nome: "Controle Remoto", categoria: "mental", atributo: "raciocinio" },
    { nome: "Desenvolvimento de IA", categoria: "mental", atributo: "inteligencia" },
    { nome: "Cozinhar", categoria: "mental", atributo: "sabedoria" },
    { nome: "Artes", categoria: "mental", atributo: "sabedoria" },
    { nome: "Química", categoria: "mental", atributo: "sabedoria" },
    { nome: "Concentração", categoria: "mental", atributo: "sabedoria" },
    { nome: "Primeiros Socorros", categoria: "mental", atributo: "sabedoria" },
    { nome: "Medicina", categoria: "mental", atributo: "sabedoria" },
    { nome: "Biomecânica", categoria: "mental", atributo: "sabedoria" },
    { nome: "Cirurgia", categoria: "mental", atributo: "sabedoria" },
    { nome: "Engenharia", categoria: "mental", atributo: "sabedoria" },

    // ---------- Sociais ----------
    { nome: "Convencimento", categoria: "social", atributo: "carisma" },
    { nome: "Diplomacia", categoria: "social", atributo: "carisma" },
    { nome: "Intimidação", categoria: "social", atributo: "manipulacao" },
    { nome: "Sentir Motivação", categoria: "social", atributo: "sabedoria" },
    { nome: "Mentir", categoria: "social", atributo: "carisma" },
    { nome: "Sedução", categoria: "social", atributo: "carisma" }
];

export function listaPericiasPorCategoria(categoria) {
    return PERICIAS_MANUAL.filter(p => p.categoria === categoria);
}

export function buscarPericiaPorNome(nome) {
    return PERICIAS_MANUAL.find(p => p.nome === nome);
}

// ---------------------------------------------------------------------
// Requisitos de acesso a perícia (manual pg. 22): algumas perícias só
// podem ser adquiridas (ir de nível 0 para 1) se o personagem já
// cumprir certas condições. Hoje só "Força Bruta" tem essa trava no
// manual — "necessário Força 9 para ter acesso à essa perícia e Briga
// de Rua 5 ou Contundentes [Curtas ou Longas] 5" — mas a estrutura é
// genérica pra caber outras perícias com requisito no futuro.
// ---------------------------------------------------------------------
export const REQUISITOS_PERICIA = {
    "Força Bruta": {
        atributoMinimo: { atributo: "forca", label: "Força", valor: 9 },
        // Precisa de UMA destas (nível mínimo indicado):
        periciaMinimaAlternativas: [
            { nome: "Briga de Rua", nivel: 5 },
            { nome: "Contundentes Curtas", nivel: 5 },
            { nome: "Contundentes Longas", nivel: 5 }
        ]
    }
};

// Verifica se a ficha (dados primários + perícias já cadastradas)
// cumpre o requisito de acesso à perícia `nomePericia`. Perícias sem
// requisito cadastrado em REQUISITOS_PERICIA sempre passam (ok: true).
// Só bloqueia ADQUIRIR a perícia (nível 0 → 1+); não se aplica a quem
// já tem nível ≥ 1, pra não confiscar retroativamente algo já obtido
// antes dessa trava existir ou por meio de vantagem/narrativa do Mestre.
export function atendeRequisitoPericia(nomePericia, dadosPrimarios, periciasFicha) {
    const req = REQUISITOS_PERICIA[nomePericia];
    if (!req) return { ok: true };

    if (req.atributoMinimo) {
        const valorAtual = Number(dadosPrimarios && dadosPrimarios[req.atributoMinimo.atributo]) || 0;
        if (valorAtual < req.atributoMinimo.valor) {
            return {
                ok: false,
                motivo: `Requer ${req.atributoMinimo.label} ${req.atributoMinimo.valor} (atual: ${valorAtual}).`
            };
        }
    }

    if (req.periciaMinimaAlternativas) {
        const lista = Object.values(periciasFicha || {});
        const atende = req.periciaMinimaAlternativas.some(alt => {
            const entrada = lista.find(p => p.nome === alt.nome);
            return (entrada ? Number(entrada.nivel) || 0 : 0) >= alt.nivel;
        });
        if (!atende) {
            const opcoes = req.periciaMinimaAlternativas.map(a => `${a.nome} ${a.nivel}`).join(" ou ");
            return { ok: false, motivo: `Requer ${opcoes}.` };
        }
    }

    return { ok: true };
}

// Requisito pra AUTORAR (criar/registrar) uma receita de nível `nivel`
// vinculada à perícia `periciaVinculada` (ex.: Armeiro): precisa ter
// Engenharia E a própria perícia vinculada em nível ≥ nível do item —
// ex.: receita de uma pistola 1911 (classe de proteção II) exige, no
// mínimo, Engenharia 2 e Armeiro 2. Engenharia é quem "sabe desenhar o
// esquema"; a perícia vinculada é quem "sabe pra que serve o item" —
// as duas juntas autorizam a receita a entrar no Banco Global. Não
// confundir com CRAFTAR/fabricar um item a partir de uma receita já
// pronta (resolverCriacaoReceita) — aquilo só exige a perícia
// vinculada, não Engenharia; este requisito é só pra ORIGINAR a
// receita em si.
export function atendeRequisitoCriarReceita(periciasFicha, nivel, periciaVinculada) {
    const nivelAlvo = Number(nivel) || 1;
    const lista = Object.values(periciasFicha || {});
    const nivelEngenharia = Number(lista.find(p => p.nome === "Engenharia")?.nivel) || 0;
    const nivelPericiaVinculada = Number(lista.find(p => p.nome === periciaVinculada)?.nivel) || 0;
    if (nivelEngenharia < nivelAlvo || nivelPericiaVinculada < nivelAlvo) {
        return {
            ok: false,
            motivo: `Criar uma receita de nível ${nivelAlvo} exige Engenharia ${nivelAlvo} e ${periciaVinculada} ${nivelAlvo} (atual: Engenharia ${nivelEngenharia}, ${periciaVinculada} ${nivelPericiaVinculada}).`
        };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------
// Artes Marciais — tecnicamente perícias físicas de combate corpo a
// corpo, listadas em separado no manual. Entram na categoria Física,
// mas guardamos a lista pra uso na aba de Combate (filtragem de manobra).
// ---------------------------------------------------------------------
export const ARTES_MARCIAIS = ["Jiu Jitsu", "Muay Thai", "Boxe", "Karatê Cobra Kai", "CQC"];

// ---------------------------------------------------------------------
// "Uma arte marcial tem vantagem contra Briga de Rua. A dificuldade ao
// usar Briga de Rua contra uma arte marcial é 2 pontos maior" (manual
// pg. 22). Briga de Rua nunca é usada pra Aparar (manual: "Briga de rua
// não pode ser usada para aparar ataques"), então esse bônus só entra
// na hora de ATACAR com Briga de Rua contra um alvo com nível ≥ 1 em
// qualquer uma das 5 artes marciais — ver resolverAtaque em ficha.js.
// ---------------------------------------------------------------------
export function alvoTemArteMarcialTreinada(periciasAlvo) {
    return Object.values(periciasAlvo || {}).some(p => ARTES_MARCIAIS.includes(p && p.nome) && (Number(p.nivel) || 0) >= 1);
}

// ---------------------------------------------------------------------
// Funções — bônus de criação de personagem.
// atributosFixos: { atributo: pontos } sempre aplicados, sem escolha.
// atributosEscolha: { grupo: [opções], pontos } — jogador escolhe 1 do
//   grupo pra receber os pontos indicados.
// pontosLivresAtributo: pontos extras pra distribuir em qualquer atributo
//   (além dos 7 padrão da criação), por causa da função.
// periciasFixas: { nome: pontos } sempre aplicados, sem escolha (perícia
//   de função "pronta").
// periciasEscolha: { pontos, opções: [nomes] } — pontos exclusivos da
//   função, o jogador distribui livremente entre as perícias listadas.
// itemInicial: descrição do item que a função já começa com.
// ---------------------------------------------------------------------
export const FUNCOES = {
    nerd: {
        key: "nerd",
        label: "Nerd",
        descricao: "Criminosos cibernéticos: clonam cartões, quebram firewalls, exploram falhas de segurança no webworld.",
        atributosFixos: { raciocinio: 3, inteligencia: 3, sabedoria: 3 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: ["Hacking", "Programação"] },
        itemInicial: "Notebook"
    },
    paulada: {
        key: "paulada",
        label: "Paulada",
        descricao: "Malucos agressivos que \"dão lições\" por dinheiro, como mercenários ou em nome de uma causa.",
        atributosFixos: { forca: 3, destreza: 3, constituicao: 3 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: null, categoriaOpcoes: "fisica" }, // qualquer perícia física
        itemInicial: "Arma nível 2"
    },
    mecanico: {
        key: "mecanico",
        label: "Mecânico",
        descricao: "Nerds práticos que ganham a vida consertando, desmontando ou criando itens ao juntar peças.",
        atributosFixos: { inteligencia: 3, destreza: 3, sabedoria: 3 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: ["Mecânica Automotiva", "Armeiro", "Ofícios Utilitários", "Eletrônica"] },
        itemInicial: "Kit de ferramentas nível 2"
    },
    pilantra: {
        key: "pilantra",
        label: "Pilantra",
        descricao: "Trombadinha, 155: furtam ou destravam portas (ou os dois) com suas mãos habilidosas.",
        atributosFixos: { raciocinio: 3, destreza: 4, inteligencia: 2 },
        pontosLivresAtributo: 0,
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: ["Mão Leve", "Arrombamento"] },
        itemInicial: "Destrave nível 2"
    },
    mercador: {
        key: "mercador",
        label: "Mercador",
        descricao: "Narcotraficantes — apenas dois atributos obrigatórios, com pontos extras pra distribuir livremente.",
        atributosFixos: { raciocinio: 3 },
        atributosEscolha: { grupo: ["carisma", "manipulacao"], pontos: 3 },
        pontosLivresAtributo: 3, // livres em qualquer atributo
        periciasFixas: {},
        periciasEscolha: { pontos: 3, opcoes: null, categoriaOpcoes: "social" },
        itemInicial: "Contato: Fornecedor de drogas"
    },
    piloto: {
        key: "piloto",
        label: "Piloto",
        descricao: "Usam seu veículo para correr em corridas ilegais ou transportar cargas e pessoas.",
        atributosFixos: { destreza: 4 },
        pontosLivresAtributo: 5,
        periciasFixas: { "Dirigir Veículos": 2 },
        periciasEscolha: { pontos: 1, opcoes: null, categoriaOpcoes: null }, // 1 ponto livre em qualquer perícia
        itemInicial: "Veículo nível 2"
    },
    vagabundo: {
        key: "vagabundo",
        label: "Vagabundo",
        descricao: "Sem habilidades específicas — vive por conta própria, sem função fixa no jogo dos outros.",
        atributosFixos: {},
        pontosLivresAtributo: 7, // extras, além dos 7 padrão
        periciasFixas: {},
        periciasEscolha: null, // não escolhe perícia de função
        itemInicial: "Dois itens de até nível 2"
    }
};

export function listaFuncoes() {
    return Object.values(FUNCOES);
}

// ---------------------------------------------------------------------
// Tags de item — categorias fechadas usadas no Inventário.
// Tags de arma têm nível (1 a 5), correspondendo à letalidade/preço do
// manual. Outras tags são qualitativas, sem nível.
// ---------------------------------------------------------------------
export const NIVEIS_ARMA = [1, 2, 3, 4, 5];

export const TAGS_ITEM = [
    { key: "arma", label: "Arma", temNivel: true },
    { key: "carregador", label: "Carregador", temNivel: false },
    { key: "projetil", label: "Projétil / munição", temNivel: false },
    { key: "colete", label: "Proteção", temNivel: true },
    { key: "destrave", label: "Destrave", temNivel: true },
    { key: "ferramenta_criacao", label: "Ferramenta de criação (geral)", temNivel: true },
    { key: "ferramenta_criacao_quimica", label: "Ferramenta de criação química", temNivel: true },
    { key: "ferramenta_criacao_biomecanica", label: "Ferramenta de criação biomecânica", temNivel: true },
    { key: "eletronico", label: "Eletrônico", temNivel: true },
    { key: "dinheiro", label: "Dinheiro", temNivel: false },
    { key: "drone", label: "Drone", temNivel: false },
    { key: "veiculo", label: "Veículo", temNivel: true },
    { key: "biomecanica", label: "Biomecânica / prótese", temNivel: true },
    { key: "mecanito", label: "Mecânito", temNivel: false },
    { key: "droga", label: "Droga", temNivel: false },
    { key: "produto_quimico", label: "Produto Químico", temNivel: false },
    { key: "equipamento_medico", label: "Equipamento médico", temNivel: false },
    { key: "explosivo", label: "Explosivo", temNivel: true },
    { key: "modulo_detonacao", label: "Módulo de Detonação", temNivel: true },
    { key: "material", label: "Material de criação", temNivel: false },
    { key: "recipiente", label: "Recipiente (guarda outros itens)", temNivel: false },
    { key: "vestimenta", label: "Vestimenta (roupa que também guarda outros itens)", temNivel: false },
    { key: "chave", label: "Chave de veículo", temNivel: false },
    { key: "geral", label: "Geral / diverso", temNivel: false }
];

// Chave de veículo (ver plano-veiculos.txt, adendo "chave"): item
// criado automaticamente junto com o veículo, referenciando-o por
// `veiculoId` (ver normalizarInventario em normalizacao.js). Só serve
// pra destrancar o veículo correspondente — não tem perícia vinculada,
// não tem nível, não é arma. Função própria (em vez de comparar
// `tagKey === "chave"` espalhado pelo código) pro caso de essa
// classificação crescer depois (ex.: chave mestra, cópia de chave).
export function ehChaveVeiculo(tagKey) {
    return tagKey === "chave";
}

// ---------------------------------------------------------------------
// Implantes de Biomecânica (manual pg. 84-88 — Tomada, Chips, Membros
// superiores e inferiores, Extremidades periféricas, Olhos, Endo
// esqueleto, Órgãos). Todos vivem sob a tag "biomecanica"; este campo
// extra por item (subtipoImplante) é que diferencia qual dos sete é.
// Mecânitos/Colateral ficam de fora por enquanto (ver plano-implantes-
// biomecanica.txt) — são uma mecânica de ativação temporária bem
// diferente de prótese permanente, tratada à parte depois.
// ---------------------------------------------------------------------
export const SUBTIPOS_IMPLANTE = [
    { key: "tomada", label: "Tomada" },
    { key: "chip", label: "Chip" },
    { key: "membro", label: "Membro superior/inferior" },
    { key: "extremidade", label: "Extremidade periférica (mão/pé)" },
    { key: "olho", label: "Olho" },
    { key: "endoesqueleto", label: "Endoesqueleto" },
    { key: "orgao", label: "Órgão" }
];

export function rotuloSubtipoImplante(subtipo) {
    const s = SUBTIPOS_IMPLANTE.find(s => s.key === subtipo);
    return s ? s.label : subtipo;
}

// Chip não ocupa vaga do limite de implantes (manual: "Chips não
// contam como implantes, somente o implante 'tomada'.") — todo o
// resto conta. Usado pra contar o limite (Fase 9/10 do plano) e pra
// decidir se o item precisa de uma Tomada instalada com vaga livre
// antes de poder ser "inserido" (ver Fase de UI de Chips, mais adiante
// no plano — ainda não implementada nesta etapa).
export function subtipoContaComoImplante(subtipo) {
    return subtipo !== "chip";
}

// ---------------------------------------------------------------------
// Tomada e Chips (manual pg. 84) — os dois únicos subtipos de implante
// com valores MECÂNICOS fixos e determinísticos no texto do manual
// (diferente de Membro/Extremidade/Olho/Endoesqueleto/Órgão, cujos
// "diversos bônus possíveis" ficam "a cargo do narrador quantos desses
// bônus a prótese terá no jogo" — manual pg. 83). Por isso só esses
// dois ganham automação de efeito aqui; os demais continuam resolvidos
// pelo editor genérico de "Modificadores automáticos" do item (mesma
// mesa decide o que aplicar).
//
// Tomada: implante atrás da orelha que acopla Chips. Sua única função
// mecânica é oferecer um número de vagas (slots) igual ao próprio
// nível — daí `slots: nivel` em toda a tabela.
export const TOMADA_NIVEIS = [
    { nivel: 1, slots: 1, receita: "3 metais leves, 3 eletrônicos, 2 eletrônicos avançados, 1 material especial", preco: 6050, dificuldadeCriar: 15, dificuldadeInstalar: 18 },
    { nivel: 2, slots: 2, receita: "3 metais leves, 3 eletrônicos, 3 eletrônicos avançados, 2 materiais especiais", preco: 11150, dificuldadeCriar: 16, dificuldadeInstalar: 19 },
    { nivel: 3, slots: 3, receita: "sem receita definida no manual", preco: 19700, dificuldadeCriar: 17, dificuldadeInstalar: 20 },
    { nivel: 4, slots: 4, receita: "4 metais leves, 5 eletrônicos, 5 eletrônicos avançados, 4 materiais especiais", preco: 24700, dificuldadeCriar: 18, dificuldadeInstalar: 21 },
    { nivel: 5, slots: 5, receita: "5 metais leves, 6 eletrônicos, 6 eletrônicos avançados, 5 materiais especiais", preco: 36100, dificuldadeCriar: 19, dificuldadeInstalar: 22 }
];

// Chip: drive inserido numa Tomada. Nível 1-2 dá um modificador
// numérico fixo (+1 / +2) numa rolagem à escolha; nível 3-5 concede
// uma Especialização (nível igual ao do chip) numa perícia à escolha —
// o EFEITO exato dessa especialização vem do catálogo de
// especializações da perícia (fora do escopo desta tabela), então só o
// "slot" da especialização é automático aqui, igual prótese comum.
export const CHIP_NIVEIS = [
    { nivel: 1, tipoEfeito: "modificador", valorEfeito: 1, receita: "2 eletrônicos, 1 eletrônico avançado", preco: 1800, dificuldadeCriar: 13, dificuldadeInstalar: 14 },
    { nivel: 2, tipoEfeito: "modificador", valorEfeito: 2, receita: "3 eletrônicos, 2 eletrônicos avançados", preco: 3500, dificuldadeCriar: 15, dificuldadeInstalar: 16 },
    { nivel: 3, tipoEfeito: "especializacao", valorEfeito: 3, receita: "3 eletrônicos, 2 eletrônicos avançados, 1 material especial", preco: 7000, dificuldadeCriar: 17, dificuldadeInstalar: 18 },
    { nivel: 4, tipoEfeito: "especializacao", valorEfeito: 4, receita: "4 eletrônicos, 3 eletrônicos avançados, 2 materiais especiais", preco: 13000, dificuldadeCriar: 19, dificuldadeInstalar: 20 },
    { nivel: 5, tipoEfeito: "especializacao", valorEfeito: 5, receita: "4 eletrônicos, 4 eletrônicos avançados, 3 materiais especiais", preco: 22000, dificuldadeCriar: 21, dificuldadeInstalar: 22 }
];

// Slots de chip que uma Tomada de dado nível suporta. Cai pra 0 fora da
// faixa 1-5 (nível inválido/não definido ainda) em vez de estourar.
export function slotsTomada(nivel) {
    const linha = TOMADA_NIVEIS.find(t => t.nivel === Number(nivel));
    return linha ? linha.slots : 0;
}

// Efeito mecânico do Chip por nível — null fora da faixa 1-5.
export function efeitoChip(nivel) {
    const linha = CHIP_NIVEIS.find(c => c.nivel === Number(nivel));
    return linha ? { tipo: linha.tipoEfeito, valor: linha.valorEfeito } : null;
}

export function rotuloTag(tagKey) {
    const t = TAGS_ITEM.find(t => t.key === tagKey);
    return t ? t.label : tagKey;
}

export function tagTemNivel(tagKey) {
    const t = TAGS_ITEM.find(t => t.key === tagKey);
    return t ? t.temNivel : false;
}

// Tags cujo item pode, opcionalmente, LIMITAR a rolagem da perícia
// vinculada ao nível do próprio item (checkbox "Limitar rolagem" no
// modal — ver el.modalLimitarRolagem em ficha.js). Regra do manual:
// Arrombamento/Destrave, Hacking/Eletrônico e as perícias de criação
// (Ofícios Utilitários, Armeiro, Mecânica Automotiva, Explosivos,
// Eletrônica, Química, Biomecânica) usando Ferramentas de Criação —
// ex.: perícia Arrombamento 3 mas notebook nível 2 só rola com +2.
// Feito como flag opcional por item (em vez de hard-code da regra
// sempre-ativa) porque nem toda mesa/item quer essa restrição — ex.
// um Destrave "mestre" que o Narrador queira liberar sem cap. Só as
// tags abaixo mostram o checkbox; Arma e Explosivo, mesmo tendo
// nível, NÃO entram aqui (não é regra do manual pra combate).
export function tagPermiteLimiteRolagemPorNivel(tagKey) {
    return tagKey === "destrave" || tagKey === "eletronico" ||
        tagKey === "ferramenta_criacao" || tagKey === "ferramenta_criacao_quimica" ||
        tagKey === "ferramenta_criacao_biomecanica";
}

export function ehArma(tagKey) {
    return tagKey === "arma";
}

// Explosivo é tratado como uma categoria de dano PRÓPRIA, separada de
// "Arma" — uma bomba/granada não é uma arma disfarçada, é o item que a
// tag já promete (ver TAGS_ITEM acima). Fora isso, ela reaproveita a
// MESMA infraestrutura de dano de uma arma (dano base, tipo de dano,
// modificações — ver "Configuração da arma" no modal de item e
// atualizarCamposPorTag/lerConfigArmaDoModal em ficha.js), só que sem
// escala (o dano de uma explosão não escala com o atributo de quem
// arremessa, ao contrário de uma arma branca) e sem os campos
// exclusivos de arma de fogo. ehArmaOuExplosivo é o helper que os
// pontos do sistema que só precisam saber "isso causa dano de verdade,
// como uma arma" (ex.: liberar o botão de atacar em combate, mostrar a
// seção de dano no modal de item) devem usar; ehArma sozinho continua
// servindo pra tudo que É específico de arma (carregador, arma de
// fogo, escala corpo a corpo, checkbox "equipável" implícito etc.).
export function ehExplosivo(tagKey) {
    return tagKey === "explosivo";
}

export function ehArmaOuExplosivo(tagKey) {
    return ehArma(tagKey) || ehExplosivo(tagKey);
}

// "Droga" (uso pessoal, botão "Consumir" — ver consumirDroga em ficha.js)
// e "Produto Químico" (uso em área/cenário — ver plano-quimicos-cenario.txt)
// são duas tags SEPARADAS, mesmo espírito de "arma" vs "explosivo": mesma
// infraestrutura (perícia, dificuldade, modificadores, duração em horas),
// fluxos de uso completamente diferentes. Sem campo "modo de uso" — a
// própria tag já diz o modo.
export function ehDroga(tagKey) {
    return tagKey === "droga";
}

export function ehProdutoQuimico(tagKey) {
    return tagKey === "produto_quimico";
}

// ---------------------------------------------------------------------
// Explosivos (manual pg. 82) — os 5 modelos padrão de bomba da perícia
// Explosivos. Cada um tem DUAS dificuldades (teste e dif "criar e
// armar"): a primeira é rolada na hora de CRIAR o item (perícia
// Explosivos, resolverCriacaoReceita em ficha.js); a segunda é a que
// fica gravada no item pronto e é rolada de novo toda vez que ele for
// ARMADO/usado (ver dificuldadeArmar no item, e "Usar" em combate —
// abrirModalArmarExplosivo). Raio e dano são só referência informativa
// pro Mestre aplicar manualmente (o sistema não simula área/alcance).
// Dados da perícia Química (bombas por pontos de material) ficam de
// fora por enquanto — não implementados.
// ---------------------------------------------------------------------
export const EXPLOSIVOS_PADRAO = [
    { nome: "Granular / Pequeno Porte", nivel: 1, dano: 50, raio: 2, dificuldadeCriar: 12, dificuldadeArmar: 8, receita: "1 metal leve, 1 CEB", preco: 2650, descricao: "Pequena carga para portas comuns ou equipamentos." },
    { nome: "Carga de Ruptura", nivel: 2, dano: 100, raio: 3, dificuldadeCriar: 14, dificuldadeArmar: 10, receita: "1 metal leve, 2 CEB", preco: 5200, descricao: "Dano a veículos leves e cofres pequenos." },
    { nome: "Dispositivo de Sabotagem", nivel: 3, dano: 200, raio: 4, dificuldadeCriar: 16, dificuldadeArmar: 12, receita: "1 metal leve, 3 CEB, 1 eletrônico", preco: 30700, descricao: "Destrói veículos blindados e derruba pequenos edifícios." },
    { nome: "Demolição Estrutural", nivel: 4, dano: 300, raio: 6, dificuldadeCriar: 18, dificuldadeArmar: 14, receita: "2 metais leves, 4 CEB, 1 eletrônico", preco: 41300, descricao: "Derruba prédios." },
    { nome: "Termobárica / Arrasa Quarteirão", nivel: 5, dano: 600, raio: 10, dificuldadeCriar: 22, dificuldadeArmar: 18, receita: "2 metais leves, 5 CEB, 2 eletrônicos", preco: 130100, descricao: "Aniquilação total no alcance e efeitos colaterais até 50m. Consome oxigênio: qualquer ser vivo no raio faz teste de Constituição (dif 20) ou desmaia por 1d4 turnos." }
];

// Módulos de detonação (manual pg. 81) — item À PARTE, acoplado ao
// explosivo na criação, sem teste pra juntar os dois (só a criação do
// módulo em si tem teste, com a perícia/dificuldade daqui). Determinam
// COMO o explosivo arma/detona (fusível, sensor, controle remoto...).
export const MODULOS_DETONACAO = [
    { nome: "Fusível Simples", nivel: 1, efeito: "Queima por até três turnos antes de explodir. Pode ser cortado. Pode ser usado como pino de granada — não precisa de teste pra armar e não dá pra interromper a detonação.", receita: "1 metal leve, 1 eletrônico", preco: 350, periciaCriacao: "Ofícios Utilitários", dificuldadeCriar: 8 },
    { nome: "Fio de Trava", nivel: 1, efeito: "Ativa se o fio for rompido. Usado como booby trap.", receita: "1 metal leve, 1 eletrônico", preco: 350, periciaCriacao: "Ofícios Utilitários", dificuldadeCriar: 9 },
    { nome: "Temporizador Digital", nivel: 2, efeito: "Programável de um segundo a vinte e quatro horas.", receita: "2 eletrônicos, 1 eletrônico avançado", preco: 1000, periciaCriacao: "Eletrônica", dificuldadeCriar: 10 },
    { nome: "Sensor de Pressão", nivel: 2, efeito: "Ativa ao ser pisado por dois quilos ou mais.", receita: "1 metal leve, 2 eletrônicos, 1 eletrônico avançado", preco: 1150, periciaCriacao: "Eletrônica", dificuldadeCriar: 12 },
    { nome: "Controle Remoto (Celular)", nivel: 2, efeito: "Alcance global (com sinal de rede). Pode ser rastreado.", receita: "2 eletrônicos, 1 eletrônico avançado", preco: 1000, periciaCriacao: "Eletrônica", dificuldadeCriar: 12 },
    { nome: "Controle Remoto (Rádio)", nivel: 2, efeito: "Alcance cem metros. Sinal pode ser interceptado (Hacking dif 14).", receita: "2 eletrônicos, 2 eletrônicos avançados", preco: 1600, periciaCriacao: "Eletrônica", dificuldadeCriar: 12 },
    { nome: "Sensor de Movimento", nivel: 3, efeito: "Ativa ao detectar calor ou vibração num raio de dois metros.", receita: "2 eletrônicos, 2 eletrônicos avançados", preco: 3200, periciaCriacao: "Eletrônica", dificuldadeCriar: 13 },
    { nome: "Frequência de Rádio Codificada", nivel: 3, efeito: "Sinal criptografado (Hacking dif 18). Alcance quinhentos metros.", receita: "2 eletrônicos, 2 eletrônicos avançados", preco: 3200, periciaCriacao: "Eletrônica", dificuldadeCriar: 14 }
];

export function ehCarregador(tagKey) {
    return tagKey === "carregador";
}

export function ehProjetil(tagKey) {
    return tagKey === "projetil";
}

// Item container (ex.: mochila, bolsa, malote — tag "recipiente"; ou
// uma peça de roupa que também guarda itens — tag "vestimenta", ex.:
// jaqueta com bolsos internos) — outros itens do inventário podem ser
// guardados dentro dele (ver item.dentroDe e as funções de container
// em inventario.js). As duas tags funcionam de forma IDÊNTICA daqui
// pra frente (volume, tamanho, compartimentos, subtipoPorte etc.) —
// a diferença é só de categorização/exibição pro jogador escolher a
// tag que melhor descreve o item (uma calça é "vestimenta", uma
// mochila é "recipiente"). subtipoPorte (roupa/cinto/mochila/
// bolsa_mao — ver SUBTIPOS_PORTE) continua sendo quem decide o
// comportamento de fato (ocupa mão, exclusividade), não a tag.
export function ehContainer(tagKey) {
    return tagKey === "recipiente" || tagKey === "vestimenta";
}

// ---------------------------------------------------------------------
// Volume — Fase 0/1 do sistema de "cabe ou não cabe" (ver conversa de
// design: peso já limita quanto dá pra carregar, volume limita quanto
// dá pra GUARDAR num recipiente específico). Dois eixos, cada um
// resolvendo um problema diferente:
//
//   - volume (número, soma) — igual peso: quanto espaço o item ocupa.
//     Empilhável (peso × quantidade) via mesma lógica de
//     pesoUnitario/quantidade — ver lerPesoVolumeEQuantidadeDoModal em
//     ficha.js (Fase 3).
//   - tamanho (categoria, TAMANHOS_ITEM abaixo) — trava binária,
//     independente da soma: um item "Comprido" (katana, fuzil) não
//     cabe num recipiente que só aceita até "Médio", nem que sobre
//     volume numérico. Resolve o problema que volume puro não resolve
//     sozinho (comprimento ≠ volume).
//
// Campos novos no item (fichaAtual.inventario[id]), gravados pelo
// modal (Fase 3) e lidos por itemCabeNoContainer (Fase 2, inventario.js):
//   item.volume            — total (como peso)
//   item.volumeUnitario    — só pra reexibir no modal em item empilhável
//   item.tamanho           — key de TAMANHOS_ITEM
//
// Campos novos SÓ em item com ehContainer(tag) === true:
//   item.capacidadeVolume     — soma máxima de volume que cabe dentro
//   item.tamanhoMaximoAceito  — key de TAMANHOS_ITEM, o maior que entra
// ---------------------------------------------------------------------

// Ordem importa: cada key é estritamente maior que a anterior — é o
// que permite comparar "cabe ou não" (ver tamanhoCabe abaixo) sem
// precisar de uma tabela de comparação à parte.
export const TAMANHOS_ITEM = [
    { key: "pequeno", label: "Pequeno (cabe no bolso/mão — faca, celular, carregador de pistola)" },
    { key: "medio", label: "Médio (cabe numa mochila — pistola, notebook, colete)" },
    { key: "grande", label: "Grande (precisa de mochila/mala grande — fuzil desmontado, escudo)" },
    { key: "comprido", label: "Comprido (não dobra — katana, fuzil montado, lança; só cabe em recipiente feito pra isso)" }
];

export function rotuloTamanho(tamanhoKey) {
    const t = TAMANHOS_ITEM.find(t => t.key === tamanhoKey);
    return t ? t.label : tamanhoKey;
}

// true se um item desse tamanho cabe num recipiente cujo maior
// tamanho aceito é tamanhoMaximoAceito. Sem tamanho definido em
// nenhum dos dois lados (dado antigo/recipiente ainda não configurado
// — ver Fase 7, migração), não trava: deixa passar, quem trava de
// verdade é a capacidade em volume.
export function tamanhoCabe(tamanhoItem, tamanhoMaximoAceito) {
    if (!tamanhoItem || !tamanhoMaximoAceito) return true;
    const idxItem = TAMANHOS_ITEM.findIndex(t => t.key === tamanhoItem);
    const idxMax = TAMANHOS_ITEM.findIndex(t => t.key === tamanhoMaximoAceito);
    if (idxItem === -1 || idxMax === -1) return true;
    return idxItem <= idxMax;
}

// Carregador, quando criado, define quantos projéteis cabem nele.
export function tagExigeCapacidadeCarregador(tagKey) {
    return ehCarregador(tagKey);
}

// ---------------------------------------------------------------------
// Sistema de Slots de Porte (Fase 8 — ver projeto-slots-porte.txt).
// Só existem 2 slots totalmente livres: as MÃOS. Roupa/cinto/mochila
// são a exceção porque são recipientes (ehContainer) — não ocupam mão,
// mas precisam estar "equipadas" (vestidas/carregadas) pra contarem
// como levadas soltas em "levando consigo". Cada subtipo define:
//   - ocupaMao: se estar "equipada" desse subtipo consome mão (só
//     bolsa_mao consome; roupa/cinto/mochila não)
//   - exclusivo: se só pode existir 1 desse subtipo equipada por vez
//     (não dá pra vestir 2 calças ao mesmo tempo)
// ---------------------------------------------------------------------
export const SUBTIPOS_PORTE = [
    { key: "mochila",   label: "Mochila (vai nas costas)",        ocupaMao: false, exclusivo: false },
    { key: "roupa",     label: "Peça de roupa (veste no corpo)",  ocupaMao: false, exclusivo: false },
    { key: "cinto",     label: "Cinto (veste na cintura)",        ocupaMao: false, exclusivo: false },
    { key: "bolsa_mao", label: "Bolsa/maleta de mão",             ocupaMao: true,  exclusivo: false }
];
// exclusivo = true: só pode ter 1 desse subtipo "equipada" (ativa) ao
// mesmo tempo (impediria vestir 2 calças, por ex). Por enquanto NENHUM
// subtipo é exclusivo — o jogo é monitorado pelo Mestre item a item,
// então dá pra vestir cinto + jaqueta + mochila + colete (etc.) tudo
// ao mesmo tempo sem trava nenhuma de "só 1 roupa" ou "só 1 cinto". Se
// no futuro a mesa quiser reintroduzir esse limite (ex.: só 1 peça de
// roupa "de baixo" por vez), basta virar `exclusivo: true` de volta no
// subtipo desejado aqui — o resto do sistema (itemPodeEquiparContainer,
// o botão "equipada" na lista) já reage a essa flag automaticamente,
// sem precisar mexer em mais nada.
//
// PREPARADO PRA FUTURO — Slots de Equipamento (ainda sem spec, ver
// pedido do jogador): a ideia é ter uma lista fechada de "lugares no
// corpo" (ex.: cabeça, torso, pernas, cintura, costas, mão) e cada
// item equipável apontar pra um `slot` específico, em vez de só um
// `subtipoPorte` genérico. Hoje NÃO existe essa lista — de propósito,
// pra não inventar um molde que não bata com o que a mesa definir
// depois. Quando a lista vier, os pontos de entrada são:
//   1. Uma nova constante aqui do lado de SUBTIPOS_PORTE, tipo
//      `export const SLOTS_EQUIPAMENTO = [{ key, label }, ...]`
//      (mesmo formato de TAMANHOS_ITEM/SUBTIPOS_PORTE).
//   2. Campo novo no item — `item.slot` (key de SLOTS_EQUIPAMENTO) —
//      normalizado em normalizarInventario (normalizacao.js), do lado
//      de subtipoPorte/compartimentos, com default null/não migrado
//      pra não quebrar item antigo.
//   3. itemPodeEquiparContainer (inventario.js) troca a exclusividade
//      de "por subtipoPorte" pra "por slot": só 1 item com
//      `equipada=true` por `item.slot` ao mesmo tempo — a função já
//      tem esse formato de checagem pronto, só troca o campo comparado
//      (`it.subtipoPorte === item.subtipoPorte` vira
//      `it.slot === item.slot`).
//   4. Campo "Slot" no modal (ficha.html/ficha.js), do lado do campo
//      "Tipo de porte" (`#modal-campo-subtipo-porte`) — mesmo padrão
//      de <select> populado a partir da constante nova.
// Enquanto isso não existir, o sistema continua funcionando do jeito
// atual (subtipoPorte + exclusivo, sem exclusividade nenhuma ligada).

export function rotuloSubtipoPorte(subtipoKey) {
    const s = SUBTIPOS_PORTE.find(s => s.key === subtipoKey);
    return s ? s.label : subtipoKey;
}

export function subtipoPorteOcupaMao(subtipoKey) {
    const s = SUBTIPOS_PORTE.find(s => s.key === subtipoKey);
    return s ? s.ocupaMao : false;
}

// Decide se um item "levando consigo" e equipado ocupa uma mão do
// personagem (ver maosDisponiveis em inventario.js). Container (roupa/
// recipiente) segue seu subtipoPorte (só bolsa_mao ocupa mão hoje).
// Qualquer item comum equipável — arma, carregador solto (fora da
// arma), item marcado equipável, ou item comum qualquer segurado solto
// — sempre ocupa mão: é o que fica "na mão" em vez de guardado (ver
// item.dentroDe) ou vestido.
export function itemOcupaMao(tagKey, subtipoPorte) {
    if (ehContainer(tagKey)) return subtipoPorteOcupaMao(subtipoPorte);
    return true;
}

export function subtipoPorteExclusivo(subtipoKey) {
    const s = SUBTIPOS_PORTE.find(s => s.key === subtipoKey);
    return s ? s.exclusivo : false;
}

// Projétil é um item "de estoque": guarda quantos projéteis daquele
// calibre esse item representa (o que entra no carregador ao carregar).
export function tagExigeQuantidadeProjetil(tagKey) {
    return ehProjetil(tagKey);
}

// Quantidade genérica ("tenho 3 desse item") — igual a como munição já
// funciona (Peso total = Peso unitário × Quantidade), só que pra
// qualquer item, não só projétil. Fica de fora das tags que já têm o
// próprio jeito de contar "quanto tem": Projétil (rounds — reload é
// item por item, cada carregador puxa dali) e Material de criação
// (estoque com qualidade, ver materialQuantidade). Carregador também
// fica de fora: cada um guarda seu próprio estado de munição atual
// (municaoAtual), então "empilhar" vários no mesmo registro quebraria
// esse controle por unidade.
export function tagTemQuantidadeGeral(tagKey) {
    return !ehProjetil(tagKey) && tagKey !== "material" && !ehCarregador(tagKey);
}

// ---------------------------------------------------------------------
// Classes de Proteção Balística (manual pg. 53) — indicam até qual
// calibre um colete aguenta com eficácia, e (aqui) também o calibre de
// uma arma de fogo, pra confronto direto arma x colete na hora do dano.
// ---------------------------------------------------------------------
export const CLASSES_PROTECAO = [
    { key: "I", label: "Classe I — .22 LR, .380 ACP, .38 Special (baixo poder)" },
    { key: "II", label: "Classe II — 9mm, .40 S&W, .45 ACP, 10mm Auto" },
    { key: "III", label: "Classe III — .357 SIG, .41 Magnum, .44 Magnum" },
    { key: "IIIA", label: "Classe IIIA — 5.56x45mm, 5.45x39mm, 7.62x39mm (fuzis leves)" },
    { key: "IV", label: "Classe IV — 7.62x51mm (.308), 6.5 Creedmoor, 7.62x54mmR" },
    { key: "V", label: "Classe V — .338 Lapua, .50 BMG, 14.5x114mm (pesado)" }
];

export function rotuloClasseProtecao(classeKey) {
    const c = CLASSES_PROTECAO.find(c => c.key === classeKey);
    return c ? c.label : classeKey;
}

// Só armas de fogo (não brancas) usam classe de proteção — é o calibre
// delas que determina contra qual colete elas são eficazes.
export function ehArmaDeFogo(periciaUso) {
    return PERICIAS_ARMA_FOGO.includes(periciaUso);
}

export function tagExigeClasseProtecao(tagKey, periciaUso) {
    // Armas de fogo pararam de usar Classe de Proteção pra confronto de
    // combate (agora usam Dificuldade de Acerto própria, pg. 95-97), mas
    // o mesmo select de CLASSES_PROTECAO virou o campo de CALIBRE:
    // colete pergunta até que calibre ele aguenta; carregador e projétil
    // perguntam de que calibre eles são; e arma de fogo pergunta que
    // calibre ela dispara — é isso que casa arma, carregador e projétil.
    if (tagKey === "colete") return true;
    if (ehCarregador(tagKey) || ehProjetil(tagKey)) return true;
    if (ehArma(tagKey) && ehArmaDeFogo(periciaUso)) return true;
    return false;
}

// ---------------------------------------------------------------------
// Calibres (manual pg. 53) — cada calibre pertence a uma Classe de
// Proteção (é o calibre que a classe engloba). Colete usa só a Classe
// (campo único: até que calibre ele aguenta). Carregador, projétil e
// arma de fogo usam os DOIS campos: primeiro a Classe (restringe as
// opções abaixo), depois o Calibre específico dentro dela — é esse
// calibre específico que casa os três entre si (carregar/recarregar),
// não mais a classe inteira.
// ---------------------------------------------------------------------
export const CALIBRES = [
    // Classe I — abaixo do que um colete de serviço padrão (9mm/.40)
    // já resolve. .38 Special entra aqui (não na II): é mais fraco que
    // 9mm/.45 na prática, apesar do nome parecer "maior" que 9mm.
    { key: "22lr", label: ".22 LR", classeProtecao: "I" },
    { key: "380acp", label: ".380 ACP", classeProtecao: "I" },
    { key: "32acp", label: ".32 ACP", classeProtecao: "I" },
    { key: "38special", label: ".38 Special", classeProtecao: "I" },
    // Classe II — pistola de serviço padrão (polícia/segurança privada
    // em qualquer lugar do mundo hoje). 10mm Auto é o "irmão mais forte"
    // do .45 ACP na mesma família de pistola semiauto de serviço.
    { key: "9mm", label: "9mm", classeProtecao: "II" },
    { key: "40sw", label: ".40 S&W", classeProtecao: "II" },
    { key: "45acp", label: ".45 ACP", classeProtecao: "II" },
    { key: "10mmauto", label: "10mm Auto", classeProtecao: "II" },
    // Classe III — o teto do que colete macio (não-rígido) ainda para.
    // .357 SIG + .44 Magnum são literalmente o par de referência do
    // nível real equivalente (não o .357 Magnum, que é mais fraco e
    // pertence à mesma faixa do 9mm/.45 da Classe II). .41 Magnum fica
    // no meio dos dois, como na vida real.
    { key: "357sig", label: ".357 SIG", classeProtecao: "III" },
    { key: "41mag", label: ".41 Magnum", classeProtecao: "III" },
    { key: "44mag", label: ".44 Magnum", classeProtecao: "III" },
    // Classe IIIA — fuzil leve/carabina: já exige placa rígida, nenhum
    // colete macio (I/II/III) para. 5.45x39mm é o calibre do AK-74 (o
    // "outro" AK, ao lado do 7.62x39 do AK-47/AKM); .300 AAC Blackout é
    // a carabina americana moderna mais comum em fuzil compacto/silenciado.
    { key: "556x45", label: "5.56x45mm", classeProtecao: "IIIA" },
    { key: "545x39", label: "5.45x39mm", classeProtecao: "IIIA" },
    { key: "762x39", label: "7.62x39mm", classeProtecao: "IIIA" },
    { key: "300blk", label: ".300 AAC Blackout", classeProtecao: "IIIA" },
    // Classe IV — fuzil pesado/DMR de longo alcance. Trocado o .30-06
    // (fora de uso militar desde os anos 50, hoje é calibre de arma de
    // caça/colecionador) por três calibres que continuam em uso real
    // hoje: 6.5 Creedmoor (o mais popular em fuzil de precisão militar e
    // civil atualmente) e 7.62x54mmR (o par "do outro lado", calibre do
    // Dragunov/PKM, ainda padrão em vários exércitos e milícias).
    { key: "762x51", label: "7.62x51mm (.308)", classeProtecao: "IV" },
    { key: "65creedmoor", label: "6.5 Creedmoor", classeProtecao: "IV" },
    { key: "300wm", label: ".300 Winchester Magnum", classeProtecao: "IV" },
    { key: "762x54r", label: "7.62x54mmR", classeProtecao: "IV" },
    // Classe V — anti-material/sniper pesado, acima de qualquer colete
    // vestível. 14.5x114mm é o calibre soviético de metralhadora
    // pesada/fuzil anti-material (KPV), o equivalente "do outro lado"
    // do .50 BMG, ainda em uso em conflitos atuais.
    { key: "338lapua", label: ".338 Lapua", classeProtecao: "V" },
    { key: "50bmg", label: ".50 BMG", classeProtecao: "V" },
    { key: "145x114", label: "14.5x114mm", classeProtecao: "V" },
    // Escopeta 12 gauge — mesmo cano, munições bem diferentes entre si em
    // poder real. Por isso entram como várias entradas de CALIBRES em vez
    // de uma só, cada uma na Classe de Proteção que corresponde ao
    // impacto real dela — mesmo padrão já usado pra qualquer outro
    // calibre aqui (1 calibre = 1 Classe):
    //   - Chumbo fino/Birdshot: munição de caça de pequeno porte, é
    //     parada até por colete fraco — Classe I.
    //   - Buckshot: chumbo grosso, os grãos se comportam como pistola de
    //     baixa velocidade — Classe II.
    //   - Slug (chumbo maciço comum): bate forte mas achata contra colete
    //     de topo, não perfura de verdade — Classe III (par do .44 Mag).
    //   - Slug Sabot (encamisado moderno, alta velocidade): aí sim já
    //     deixa de ser "ameaça de pistola" — derruba colete macio de topo
    //     e é tratado como ameaça de classe rifle — Classe IIIA, junto
    //     dos fuzis leves.
    { key: "12gauge_birdshot", label: "12 Gauge — Chumbo fino (Birdshot)", classeProtecao: "I" },
    { key: "12gauge_buckshot", label: "12 Gauge — Buckshot", classeProtecao: "II" },
    { key: "12gauge_slug", label: "12 Gauge — Slug", classeProtecao: "III" },
    { key: "12gauge_slug_sabot", label: "12 Gauge — Slug Sabot", classeProtecao: "IIIA" }
];

export function calibresPorClasse(classeKey) {
    return CALIBRES.filter(c => c.classeProtecao === classeKey);
}

export function rotuloCalibre(calibreKey) {
    const c = CALIBRES.find(c => c.key === calibreKey);
    return c ? c.label : calibreKey;
}

// ---------------------------------------------------------------------
// Redução do Dano por Colete x Calibre (manual pg. 53, "Proteção
// Balística" > "Redução do dano") — passo 1 do plano
// (plano-reducao-dano-colete.txt): ordem fixa entre as Classes de
// Proteção, pra dar pra comparar "quantas classes acima" o calibre do
// tiro está em relação à classe do colete que parou (ou não) o
// impacto. Reaproveita a MESMA ordem já usada em CLASSES_PROTECAO
// acima, só extraindo as keys — se um dia mudar a lista lá, a ordem
// daqui muda junto, sem precisar duplicar manualmente.
// ---------------------------------------------------------------------
const ORDEM_CLASSES_PROTECAO = CLASSES_PROTECAO.map(c => c.key);

function indiceClasseProtecao(classeKey) {
    const i = ORDEM_CLASSES_PROTECAO.indexOf(classeKey);
    return i === -1 ? null : i;
}

// Diferença de posição entre o calibre do tiro e a classe do colete:
//   <= 0  -> calibre igual ou inferior à classe do colete
//   === 1 -> calibre uma classe acima
//   >= 2  -> calibre duas classes acima ou mais
// Devolve null quando a comparação não é possível (calibre sem
// classeProtecao cadastrada, ou colete sem classe setada) — quem
// consome isso (calcularDanoContraColete, em regras.js) trata null
// como "sem regra nova, aplica a redução normal do item", pra nunca
// quebrar um item antigo ou mal configurado.
export function diferencaClasseCalibreVsColete(calibreKey, classeColeteKey) {
    const calibre = CALIBRES.find(c => c.key === calibreKey);
    if (!calibre) return null;
    const iCalibre = indiceClasseProtecao(calibre.classeProtecao);
    const iColete = indiceClasseProtecao(classeColeteKey);
    if (iCalibre === null || iColete === null) return null;
    return iCalibre - iColete;
}

// ---------------------------------------------------------------------
// Dilaceração (item 7 do plano de saúde/complicações) — campo `arma.
// dilacera` (schema de arma, junto com `dilaceraEmGolpeNormal`) é
// SEMPRE manual, marcado item a item na criação/edição da arma. Isto
// aqui só dá o PADRÃO SUGERIDO no formulário (checkbox nasce marcada,
// continua 100% editável): calibre Classe V (.338 Lapua/.50 BMG) já
// nasce sugerindo Dilacera — cobre calibres especiais/futuros que
// também sejam Classe V, sem precisar listar caso a caso. Arma branca
// nasce sempre com dilacera:false (não tem calibre pra sugerir nada).
// ---------------------------------------------------------------------
export function calibreSugereDilacera(calibreKey) {
    const c = CALIBRES.find(c => c.key === calibreKey);
    return !!(c && c.classeProtecao === "V");
}

// ---------------------------------------------------------------------
// Calibres de escopeta (munição 12 gauge) — regra própria: diferente de
// qualquer outra arma de fogo do sistema, uma arma nesse calibre NÃO usa
// carregador. Ela é carregada projétil a projétil, direto do estoque de
// munição no inventário (ver consumirMunicaoSeArmaDeFogo em ficha.js).
// Todas as variantes saem do mesmo cano, então uma arma cadastrada em
// qualquer uma delas aceita munição de qualquer uma das outras também.
// ---------------------------------------------------------------------
export const CALIBRES_ESCOPETA = ["12gauge_birdshot", "12gauge_buckshot", "12gauge_slug", "12gauge_slug_sabot"];

export function ehCalibreEscopeta(calibreKey) {
    return CALIBRES_ESCOPETA.includes(calibreKey);
}

// Calibres que "casam" com o calibre informado pra fins de carregador/
// projétil compatível. Pra qualquer calibre comum isso é só ele mesmo;
// pra calibre de escopeta, os dois tipos (buckshot/slug) são
// intercambiáveis entre si, porque é a mesma arma física.
export function calibresCompativeis(calibreKey) {
    if (ehCalibreEscopeta(calibreKey)) return CALIBRES_ESCOPETA;
    return [calibreKey];
}

// Só carregador, projétil e arma de fogo têm o segundo campo (Calibre
// específico) — colete continua só com a Classe de Proteção (até que
// calibre ele aguenta, sem precisar dizer qual calibre exato).
export function tagUsaCalibreEspecifico(tagKey, periciaUso) {
    if (ehCarregador(tagKey) || ehProjetil(tagKey)) return true;
    if (ehArma(tagKey) && ehArmaDeFogo(periciaUso)) return true;
    return false;
}

// Rótulo do campo de Calibre (segundo campo, abaixo da Classe de
// Proteção). Só é exibido pra tags que passam em tagUsaCalibreEspecifico.
export function rotuloCampoCalibre() {
    return "Calibre (obrigatório)";
}

// ---------------------------------------------------------------------
// Armas de Fogo — Alcance e Recuo (manual pg. 95-97). Recuo tem efeito
// mecânico direto: penalidade acumulada nos disparos seguintes no mesmo
// turno do personagem.
// ---------------------------------------------------------------------
export const ALCANCES_ARMA_FOGO = [
    { key: "curtissimo", label: "Curtíssimo" },
    { key: "curtissimo_curto", label: "Curtíssimo/Curto" },
    { key: "curto", label: "Curto" },
    { key: "curto_medio", label: "Curto/Médio" },
    { key: "medio", label: "Médio" },
    { key: "medio_longo", label: "Médio/Longo" },
    { key: "longo", label: "Longo" }
];

// Padrões de recuo do manual — cada arma cadastrada escolhe um destes.
// O modificador é calculado por número do disparo dentro do turno atual
// do personagem (1º, 2º, 3º...), não pelo total de turnos do combate.
export const PADROES_RECUO = [
    { key: "comum", label: "Comum (–1 no 2º tiro, –2 no 3º em diante)" },
    { key: "forte", label: "Forte (1º tiro sem penalidade, –2 do 2º em diante)" },
    { key: "bipe", label: "Só controlável com bipé/apoio (–3 em todos os disparos sem apoio)" }
];

export function rotuloPadraoRecuo(key) {
    const p = PADROES_RECUO.find(p => p.key === key);
    return p ? p.label : key;
}

export function rotuloAlcanceArmaFogo(key) {
    const a = ALCANCES_ARMA_FOGO.find(a => a.key === key);
    return a ? a.label : key;
}

// Modificador de recuo pro N-ésimo disparo desta arma no turno atual
// (numeroDoTiro começa em 1, pro primeiro disparo do turno).
export function modificadorRecuo(padraoKey, numeroDoTiro) {
    const n = Number(numeroDoTiro) || 1;
    if (n <= 1) return padraoKey === "bipe" ? -3 : 0;
    switch (padraoKey) {
        case "comum": return n === 2 ? -1 : -2;
        case "forte": return -2;
        case "bipe": return -3;
        default: return 0;
    }
}

// ---------------------------------------------------------------------
// Golpes desarmados que causam dano automatizável (manual pg. 49-50):
// todos seguem a fórmula "1dForça + Força [escala]" — o dado tem faces
// iguais ao valor de Força do personagem, e a escala é sempre sobre
// Força (independente de qual perícia física foi usada pra rolar o
// golpe, ex: Karatê Cobra Kai usa Destreza pra rolar, mas o dano
// continua escalando com Força, como o manual descreve).
// ---------------------------------------------------------------------
export const ESCALA_MULT_DESARMADO = {
    "Soco": 1,       // Escala D
    "Chute": 1,      // Escala D
    "Joelhada": 2,   // Escala C
    "Cotovelada": 2  // Escala C
};

export function ehGolpeDesarmadoComDano(nomeManobra) {
    return Object.prototype.hasOwnProperty.call(ESCALA_MULT_DESARMADO, nomeManobra);
}

// ---------------------------------------------------------------------
// Dificuldade base de acerto por manobra desarmada (manual pg. 49-50):
// "8 + Agilidade do alvo" (Soco), "9 + Agilidade do alvo" (Chute),
// "10 + Agilidade do alvo" (Joelhada/Cotovelada). Usada junto com
// calcularDificuldadeDefesaJogador (que soma a Agilidade do alvo por
// cima desse valor) — antes disso a base vinha fixa em 10 pra qualquer
// golpe, o que deixava Soco e Chute com dificuldade errada.
// ---------------------------------------------------------------------
export const BASE_DIFICULDADE_GOLPE_DESARMADO = {
    "Soco": 8,
    "Chute": 9,
    "Joelhada": 10,
    "Cotovelada": 10
};

// Perícias de arma branca corpo a corpo (manual pg. 49-50: "Arma
// branca" tem dificuldade "9 + Agilidade do alvo", não os 10 fixos que
// o sistema usava antes pra qualquer arma equipada não-de-fogo).
export const PERICIAS_ARMA_BRANCA = [
    "Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas",
    "Contundentes Longas", "Armas Brancas Exóticas"
];

// Perícias desarmadas que servem pra Aparar (manobra defensiva, manual):
// só as de combate corpo a corpo "de luta", não qualquer perícia física.
export const PERICIAS_APARAR_DESARMADO = ["Karatê Cobra Kai", "Jiu Jitsu", "Força Bruta", "CQC"];

// Todas as perícias com as quais dá pra tentar Aparar um golpe — arma
// branca (curto/longo alcance) OU luta desarmada. Manual: "não é
// possível aparar ataques de arma branca estando desarmado" — por isso
// o código só oferece as opções desarmadas quando o golpe recebido NÃO
// veio de uma perícia de arma branca (ver PERICIAS_ARMA_BRANCA acima).
export const PERICIAS_APARAR = [...PERICIAS_ARMA_BRANCA, ...PERICIAS_APARAR_DESARMADO];

// Devolve a dificuldade base (o número que soma com a Agilidade/Força
// do alvo) pra um ataque, a partir do nome da manobra (golpes
// desarmados clicados na lista de Manobras) ou da perícia usada
// (armas equipadas — arma branca corpo a corpo). Cai pra 10 se não
// achar nenhuma correspondência (mantém o valor genérico do manual
// pra outras manobras, como Agarrar/Derrubar).
export function baseDificuldadeAtaque(nomeManobra, periciaUso) {
    if (Object.prototype.hasOwnProperty.call(BASE_DIFICULDADE_GOLPE_DESARMADO, nomeManobra)) {
        return BASE_DIFICULDADE_GOLPE_DESARMADO[nomeManobra];
    }
    if (PERICIAS_ARMA_BRANCA.includes(periciaUso)) {
        return 9;
    }
    return 10;
}

// ---------------------------------------------------------------------
// Especificidades das perícias de combate desarmado (manual pg. 22).
// A escala/dado padrão de cada golpe (ESCALA_MULT_DESARMADO) é a mesma
// pra qualquer perícia usada pra rolá-lo, mas algumas perícias mudam
// isso quando é ELA que está sendo usada pra rolar o golpe:
//
// - Muay Thai: nos níveis 3 e 5 aumenta a escala de Chute e Joelhada.
// - Boxe: multiplica o dado de dano do Soco (1dForça) pelo valor da
//   perícia.
// - Karatê Cobra Kai: dispensa a rolagem do dado, usando sempre dano
//   máximo (o valor de Força vira o dano do dado direto).
// - Força Bruta: também sempre com dano máximo, e SOMA um bônus de
//   escala em cima da escala padrão do golpe — cumulativo entre níveis:
//   +D no nível 1, +C (adicional) no nível 3, +B (adicional) no nível 5.
//   Ex: Soco (escala D) com Força Bruta nível 5 fica com escala
//   D (do soco) + D + C + B = 1+1+2+4 = 8, não escala B sozinha.
//
// Perícias fora dessa lista (Briga de Rua, CQC, etc.) usam a escala
// padrão do golpe sem alteração.
// ---------------------------------------------------------------------
export function calcularEspecificidadeGolpe(nomeManobra, nomePericia, nivelPericia) {
    const nivel = Number(nivelPericia) || 0;
    let escalaMult = ESCALA_MULT_DESARMADO[nomeManobra] || 0;
    let dadoMultiplicador = 1;
    let danoMaximoSemRolar = false;

    switch (nomePericia) {
        case "Muay Thai":
            if (nomeManobra === "Chute") {
                if (nivel >= 5) escalaMult = 4;       // Escala B
                else if (nivel >= 3) escalaMult = 2;  // Escala C
            } else if (nomeManobra === "Joelhada") {
                if (nivel >= 5) escalaMult = 5;       // Escala A
                else if (nivel >= 3) escalaMult = 4;  // Escala B
            }
            break;

        case "Boxe":
            // Técnica baseada em socos — só se aplica ao Soco, que é o
            // golpe que essa perícia de fato cobre.
            if (nomeManobra === "Soco" && nivel > 0) {
                dadoMultiplicador = nivel;
            }
            break;

        case "Karatê Cobra Kai":
            danoMaximoSemRolar = true;
            break;

        case "Força Bruta":
            danoMaximoSemRolar = true;
            // O adicional de Força Bruta SOMA em cima da escala padrão do
            // golpe (ex: Soco já é escala D sozinho) e é cumulativo entre
            // os níveis — nível 5 já teve o bônus D do nível 1 e o C do
            // nível 3 antes de ganhar o B, não troca um pelo outro.
            // Nível 1: +1 (escala D) · Nível 3: +2 (escala C) · Nível 5: +4 (escala B)
            if (nivel >= 1) escalaMult += 1;
            if (nivel >= 3) escalaMult += 2;
            if (nivel >= 5) escalaMult += 4;
            break;

        default:
            break;
    }

    return { escalaMult, dadoMultiplicador, danoMaximoSemRolar };
}

// ---------------------------------------------------------------------
// Força Bruta — efeitos defensivos (manual pg. 22), além do dano máximo/
// escala já cobertos acima. Só valem quando o GOLPE ESTÁ SENDO ROLADO
// com a perícia Força Bruta (mesmo critério de danoMaximoSemRolar/
// escalaMult logo acima — é a perícia usada NESTE golpe que importa,
// não só ter o nível cadastrado na ficha):
//
// Nível 2: "seus golpes ignoram armadura em pontos igual a sua Força."
// Nível 4: "bloquear seus golpes diminui apenas em 1/4 o dano [em vez
// da metade normal]; para se esquivar [de você] tem penalidade -1;
// seus golpes ignoram armadura em pontos igual ao DOBRO de sua Força"
// (substitui o efeito do nível 2, não soma com ele).
// Nível 5: "esquivar [de você] tem penalidade -2; não é possível
// bloquear [seus] golpes."
// ---------------------------------------------------------------------

// Pontos de armadura ignorados pelo golpe — nível 4 já inclui (substitui)
// o efeito do nível 2, não é cumulativo.
export function ignorarArmaduraForcaBruta(nivelForcaBruta, forcaAtacante) {
    const nivel = Number(nivelForcaBruta) || 0;
    const forca = Number(forcaAtacante) || 0;
    if (nivel >= 4) return forca * 2;
    if (nivel >= 2) return forca;
    return 0;
}

// Penalidade (negativa) no teste de Esquivar de quem está tentando
// esquivar de um golpe rolado com Força Bruta nível 4/5.
export function penalidadeEsquivarContraForcaBruta(nivelForcaBruta) {
    const nivel = Number(nivelForcaBruta) || 0;
    if (nivel >= 5) return -2;
    if (nivel >= 4) return -1;
    return 0;
}

// Como a manobra "Bloquear" se comporta contra um golpe rolado com
// Força Bruta nível 4/5 — null = comportamento padrão (reduz pela
// metade, ver responderReacaoPendente em mestre.js).
export function bloqueioContraForcaBruta(nivelForcaBruta) {
    const nivel = Number(nivelForcaBruta) || 0;
    if (nivel >= 5) return { impossivel: true };
    if (nivel >= 4) return { fracaoDanoRestante: 0.75 }; // reduz só 1/4 (25%) do dano
    return null;
}

// ---------------------------------------------------------------------
// Karatê Cobra Kai (manual pg. 22): "a cada dois pontos na perícia
// bônus +1 na iniciativa e golpes desarmados causam o dano total, não
// sendo necessário rolar Força [dano máximo já coberto acima, em
// danoMaximoSemRolar]. No nível 5 todos os ataques desarmados são
// críticos." Os outros dois efeitos, faltantes até então:
//
// - bonusCobraKaiIniciativa: +1 na iniciativa a cada 2 pontos na
//   perícia (nível 2 → +1, nível 4 → +2 etc.) — automático pra quem
//   tem a perícia, sem depender de escolha narrativa (diferente do +1
//   de CQC nível 2, que É condicional). Somado direto em
//   iniciarIniciativaCombate (mestre.js), igual ao resto da iniciativa.
// - cobraKaiCriticoAutomatico: no nível 5, todo golpe desarmado
//   ROLADO COM Karatê Cobra Kai que acerta já é Acerto Crítico (dano
//   dobrado), sem precisar do resultado final ser exatamente 20 — ver
//   resolverAtaque em ficha.js, que soma essa condição em
//   criticoPositivo assim que o ataque é confirmado como acerto.
// ---------------------------------------------------------------------
export function bonusCobraKaiIniciativa(nivelCobraKai) {
    return Math.floor((Number(nivelCobraKai) || 0) / 2);
}

export function cobraKaiCriticoAutomatico(nivelCobraKai) {
    return Number(nivelCobraKai) >= 5;
}

// Boxe também dá um bônus passivo pra esquivar desarmado (manual pg. 22):
// +2 contra golpes desarmados, +1 contra armas brancas — independe do
// nível, basta ter a perícia. Usado pra mostrar o bônus na manobra
// "Esquivar", que não tem rolagem automatizada (é Agilidade vs. a
// pontuação do ataque sofrido).
export function bonusEsquivaBoxe(nivelBoxe) {
    const nivel = Number(nivelBoxe) || 0;
    if (nivel <= 0) return null;
    return { desarmado: 2, armaBranca: 1 };
}

// ---------------------------------------------------------------------
// Perícia vinculada por tag — usada pelo botão "Usar" do inventário pra
// saber qual perícia rolar quando o jogador usa o item. Reaproveita
// agrupamentos que já existem no manual (as mesmas opções de perícia de
// função do Mecânico e do Pilantra) em vez de inventar listas novas.
// ---------------------------------------------------------------------
export const PERICIAS_ELETRONICO = ["Hacking", "Programação"];
// Ferramenta de Criação "geral" (manual pg. 71): usada nas perícias de
// Ofícios Utilitários, Armeiro, Mecânica Automotiva, Explosivos e
// Eletrônica — TODAS elas de uma vez, é o que torna o kit "geral" (o
// mesmo kit físico serve pra qualquer uma das 5). Por isso o item NÃO
// trava numa perícia só na criação (ver ehFerramentaCriacaoGeral abaixo
// e tagExigePericiaUso/periciasVinculaveisPorTag logo a seguir) — quem
// escolhe é o jogador na hora de "Usar" o kit (ver
// abrirModalEscolherPericiaItem em ficha.js).
// Química e Biomecânica ficam de fora de propósito — cada uma usa um
// kit próprio (Ferramentas de Criação Química, pg. 92; e Ferramenta de
// Criação Biomecânica), com receita igual mas item/perícia distintos.
export const PERICIAS_FERRAMENTA_CRIACAO = ["Mecânica Automotiva", "Armeiro", "Ofícios Utilitários", "Explosivos", "Eletrônica"];
export const PERICIAS_FERRAMENTA_CRIACAO_QUIMICA = ["Química"];
export const PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA = ["Biomecânica"];

// ---------------------------------------------------------------------
// Receitas (aba "Receitas" da ficha): PERICIAS_CRIACAO_ITEM é a lista
// de perícias de CRIAÇÃO DE ITEM (as mesmas que usam Ferramenta de
// Criação geral, química ou biomecânica, ver PERICIAS_FERRAMENTA_CRIACAO/
// PERICIAS_FERRAMENTA_CRIACAO_QUIMICA/PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA
// acima) — usada tanto pra saber quais perícias mostrar seção na aba
// quanto pra popular o select de "Perícia de criação vinculada" no
// modal de criar receita. As receitas em si NÃO ficam numa lista
// estática aqui — elas são cadastradas pelo jogador ou pelo Mestre e
// guardadas no Banco Global de Receitas (receitas-globais.js),
// compartilhado entre todas as mesas, igual o Banco Global de Itens —
// ver renderizarReceitas/abrirModalCriarReceita em ficha.js.
// ---------------------------------------------------------------------
export const PERICIAS_CRIACAO_ITEM = [...PERICIAS_FERRAMENTA_CRIACAO, ...PERICIAS_FERRAMENTA_CRIACAO_QUIMICA, ...PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA];

// Materiais de criação (seção "Materiais" do Manual do Jogador) — a
// lista fechada de tipos de material que uma receita pode exigir como
// ingrediente. Cada receita guarda uma lista de
// { material, qualidade, quantidade } usando exatamente um destes nomes
// (ver abrirModalCriarReceita, em ficha.js, que restringe o seletor a
// esta lista — nada de texto livre). `qualidades` é a lista EXATA de
// tiers que aquele material tem no manual (a maioria é Baixa/Média/Boa;
// CEB e Material Químico usam Alta em vez de Boa); `null` pros materiais
// sem variação de qualidade (preço único no manual): Material bélico e
// Materiais especiais.
export const MATERIAIS_CRIACAO = [
    { nome: "Metal leve", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Metal pesado", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Material bélico", qualidades: null },
    { nome: "Propelente", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Carga Explosiva Bruta (CEB)", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Eletrônico", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Eletrônico avançado", qualidades: ["Baixa", "Média", "Boa"] },
    { nome: "Material especial", qualidades: null },
    { nome: "Material Químico: Sedativo", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Tóxico", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Veículo de transporte", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Inflamável", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Explosivo", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Oxidante", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Corrosivo", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Catalizador", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Psicotrópico", qualidades: ["Baixa", "Média", "Alta"] },
    { nome: "Material Químico: Bioquímico", qualidades: ["Baixa", "Média", "Alta"] }
];

export function qualidadesDoMaterial(nomeMaterial) {
    const m = MATERIAIS_CRIACAO.find(m => m.nome === nomeMaterial);
    return m ? m.qualidades : null;
}

export const PERICIAS_DESTRAVE = ["Mão Leve", "Arrombamento"];
export const PERICIAS_ARMA_FOGO = ["Armas de Fogo de Pequeno Porte", "Armas de Fogo de Médio Porte", "Armas de Fogo de Grande Porte"];
export const PERICIAS_ARMA_COMBATE = [
    "CQC", "Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas",
    "Armas Brancas Exóticas", ...PERICIAS_ARMA_FOGO
];

// Ferramenta de Criação "geral" — a única tag cujo item serve pra mais
// de uma perícia ao mesmo tempo (as 5 de PERICIAS_FERRAMENTA_CRIACAO).
// Usada em vários pontos pra tratar esse caso especial: não exigir (nem
// mostrar) um select de perícia única na criação do item, e deixar a
// escolha pra hora de "Usar" (ver ficha.js).
export function ehFerramentaCriacaoGeral(tagKey) {
    return tagKey === "ferramenta_criacao";
}

// Tags cujo item TEM a opção de perícia vinculada (mostra o campo no
// modal) — armas, eletrônicos, ferramentas de criação (química e
// biomecânica) e destraves.
export function tagTemPericiaUso(tagKey) {
    return tagKey === "arma" || tagKey === "explosivo" || tagKey === "eletronico" ||
        tagKey === "ferramenta_criacao_quimica" || tagKey === "ferramenta_criacao_biomecanica" ||
        tagKey === "destrave" || tagKey === "produto_quimico";
}

// Tags cujo item PRECISA de uma perícia vinculada pra ter ação de "Usar"
// com rolagem automática (armas, ferramentas de criação — química e
// biomecânica — e destraves — manual pg. 49-50 e regras de teste de
// perícia). Ferramenta de Criação GERAL fica de fora desta lista de
// propósito — ver ehFerramentaCriacaoGeral acima: ela não trava numa
// perícia só na criação, então não "exige" escolher uma aqui.
//
// Eletrônico também fica de fora: nem todo item eletrônico serve pra
// Hackear (ex.: uma lanterna, um carregador) — o campo continua
// disponível (ver tagTemPericiaUso acima) pra quem QUISER vincular
// Hacking a um item específico, mas deixar sem perícia vinculada
// também é válido (o item só não ganha o botão "Usar" com rolagem
// automática).
export function tagExigePericiaUso(tagKey) {
    return tagKey === "arma" || tagKey === "explosivo" ||
        tagKey === "ferramenta_criacao_quimica" || tagKey === "ferramenta_criacao_biomecanica" ||
        tagKey === "destrave" || tagKey === "produto_quimico";
}

// Eletrônico é a única tag (fora Ferramenta de Criação geral, que tem
// mecanismo próprio) cujo item pode ficar vinculado a MAIS DE UMA
// perícia ao mesmo tempo — um item pode servir tanto pra Hackear
// quanto pra Programar. periciaUso guarda um array quando é essa a
// tag; as demais tags continuam guardando uma string única (ou null).
// periciaUsoComoArray normaliza os dois formatos pra quem só quer
// iterar as perícias vinculadas, não importa a tag.
export function ehTagMultiPericia(tagKey) {
    return tagKey === "eletronico";
}

export function periciaUsoComoArray(periciaUso) {
    if (!periciaUso) return [];
    return Array.isArray(periciaUso) ? periciaUso.filter(Boolean) : [periciaUso];
}

// Alguns Eletrônicos guardam dinheiro digital (moedas e notas virtuais
// — um pendrive com cripto, um celular com app de banco), e itens com a
// tag "Dinheiro" (grana física — maços de cash, ver
// transformar_dinheiro_item/depositar_dinheiro_item em mestre.js) são
// isso por natureza. Esses itens podem ser marcados (it.ehSaldo) pra
// funcionar como mais uma "conta" de dinheiro da ficha, com valor
// próprio (it.saldoValor), ao lado dos saldos fixos (sujo/limpo/bolso)
// e customizados. Os ids desses saldos "de item" usam o prefixo
// PREFIXO_SALDO_ITEM pra não colidir com os ids normais e pra dar pra
// rastrear de volta o item de origem — ver idSaldoDeItem /
// ehIdSaldoDeItem / idItemDoSaldo e todosOsSaldos.
export function ehTagQuePodeSerSaldo(tagKey) {
    return tagKey === "eletronico" || tagKey === "dinheiro";
}

export const PREFIXO_SALDO_ITEM = "item:";

// Eletrônicos marcados como carteira digital guardam DOIS saldos
// separados (notas e moedas — pedido do grupo: "mesmo dinheiro
// virtual", mas contados à parte, cada um gastável/movível sozinho).
// "Dinheiro" físico continua com um valor só (saldoValor) — não faz
// sentido separar notas/moedas num maço de cash já representado como
// um único item. Esse subtipo ("notas"/"moedas"/null) fica gravado no
// PRÓPRIO id do saldo (sufixo ":notas" ou ":moedas" — ver
// idSaldoDeItem), pra dar pra distinguir os dois saldos do mesmo item
// em qualquer lugar que só tenha o id à mão (fila de aprovação,
// dropdowns etc.) sem precisar ir consultar o item de novo.
export function idSaldoDeItem(itemId, subtipo = null) {
    return subtipo ? `${PREFIXO_SALDO_ITEM}${itemId}:${subtipo}` : `${PREFIXO_SALDO_ITEM}${itemId}`;
}

export function ehIdSaldoDeItem(saldoId) {
    return typeof saldoId === "string" && saldoId.startsWith(PREFIXO_SALDO_ITEM);
}

export function idItemDoSaldo(saldoId) {
    return ehIdSaldoDeItem(saldoId) ? saldoId.slice(PREFIXO_SALDO_ITEM.length).split(":")[0] : null;
}

// "notas", "moedas", ou null (saldo de item sem subtipo — dinheiro
// físico, ou carteira digital antiga migrada sem quebra ainda).
export function subtipoSaldoDoId(saldoId) {
    if (!ehIdSaldoDeItem(saldoId)) return null;
    const partes = saldoId.slice(PREFIXO_SALDO_ITEM.length).split(":");
    return partes.length > 1 ? partes[1] : null;
}

// Nome do campo em fichas/{id}/inventario/{itemId}/<campo> onde o
// VALOR desse saldo específico está gravado — saldoNotas/saldoMoedas
// pra carteira digital (eletrônico), saldoValor pra tudo o mais
// (dinheiro físico). Centraliza essa escolha pra quem só tem o
// saldoId em mãos (gastar/mover/pegar dinheiro, custo semanal etc.)
// não precisar reimplementar a lógica de qual campo mexer.
export function campoSaldoDoItem(saldoId) {
    const subtipo = subtipoSaldoDoId(saldoId);
    if (subtipo === "notas") return "saldoNotas";
    if (subtipo === "moedas") return "saldoMoedas";
    return "saldoValor";
}

// Arredonda qualquer valor monetário (CN$) pra 1 casa decimal antes de
// gravar (o jogo não usa mais fração de nota/moeda — no máximo 1
// algarismo depois da vírgula). Sem isso, débitos/créditos sucessivos
// em ponto flutuante (ex.: 2 - 1 deveria dar 1, mas se o saldo já
// tinha um resto binário de uma operação anterior, o resultado vira
// algo como 0.9999999999999998 ou 1.1111111111111112 — dízima
// aparente por imprecisão de IEEE754, não por conta nenhuma do jogo)
// — chamado em todo ponto que grava um novo saldo
// (debitarSaldoFicha/creditarSaldoFicha em mestre.js, edição direta
// do Mestre em ficha.js) pra que o arredondamento aconteça uma vez só,
// na escrita, e o erro nunca se acumule de transação em transação.
export function arredondarMoeda(valor) {
    const n = Number(valor) || 0;
    return Math.round(n * 10) / 10;
}

// Lista unificada de saldos pra exibir/escolher em qualquer lugar da
// ficha (grid de Finanças, dropdown de "de onde sai" o gasto, origem do
// pagamento semanal): junta os saldos normais (fichaAtual.saldos) com
// os saldos guardados em itens marcados como carteira digital ou
// dinheiro físico. Eletrônico marcado como carteira digital entra como
// DOIS saldos separados (notas e moedas do mesmo item — ver
// idSaldoDeItem/campoSaldoDoItem); dinheiro físico continua como um só.
export function todosOsSaldos(fichaAtual) {
    const saldosFicha = Object.entries(fichaAtual.saldos || {}).map(([id, s]) => ({
        id, nome: s.nome, valor: arredondarMoeda(s.valor), fixo: !!s.fixo, deItem: false
    }));
    const saldosItem = [];
    Object.entries(fichaAtual.inventario || {}).forEach(([itemId, it]) => {
        if (!it.ehSaldo) return;
        if (it.tag === "eletronico") {
            saldosItem.push({ id: idSaldoDeItem(itemId, "notas"), nome: `${it.nome} (notas)`, valor: arredondarMoeda(it.saldoNotas), fixo: false, deItem: true, itemId });
            saldosItem.push({ id: idSaldoDeItem(itemId, "moedas"), nome: `${it.nome} (moedas)`, valor: arredondarMoeda(it.saldoMoedas), fixo: false, deItem: true, itemId });
        } else {
            saldosItem.push({ id: idSaldoDeItem(itemId), nome: `${it.nome} (dinheiro físico)`, valor: arredondarMoeda(it.saldoValor), fixo: false, deItem: true, itemId });
        }
    });
    return [...saldosFicha, ...saldosItem];
}

export function periciasVinculaveisPorTag(tagKey) {
    switch (tagKey) {
        // "Sem Perícia" fica só aqui (não entra em PERICIAS_ARMA_COMBATE
        // nem em PERICIAS_MANUAL) — é uma opção de vínculo de arma, não
        // uma perícia de personagem de verdade. Como nenhuma perícia da
        // ficha se chama "Sem Perícia", modificadorDePericiaComPenalidade
        // (ficha.js) nunca encontra uma correspondência e aplica a
        // penalidade padrão de manobra sem treinamento (-1 fixo) — a
        // mesma regra já usada em qualquer perícia no nível 0/ausente.
        case "arma": return [...PERICIAS_ARMA_COMBATE, "Sem Perícia"];
        // Explosivo usa a própria perícia de criação (Explosivos) também
        // pra arremessar/detonar — é ela que o botão "Usar"/"Atacar" rola
        // em combate (ver dificuldadeArmar em receitas-globais.js: o
        // manual já trata "criar" e "armar/usar" como testes da mesma
        // perícia).
        case "explosivo": return ["Explosivos", "Sem Perícia"];
        // Produto Químico usa a mesma perícia de criação química (manual
        // pág. 91-93) pra "espalhar"/ativar em área — ver
        // PERICIAS_FERRAMENTA_CRIACAO_QUIMICA acima.
        case "produto_quimico": return PERICIAS_FERRAMENTA_CRIACAO_QUIMICA;
        case "eletronico": return PERICIAS_ELETRONICO;
        case "ferramenta_criacao": return PERICIAS_FERRAMENTA_CRIACAO;
        case "ferramenta_criacao_quimica": return PERICIAS_FERRAMENTA_CRIACAO_QUIMICA;
        case "ferramenta_criacao_biomecanica": return PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA;
        case "destrave": return PERICIAS_DESTRAVE;
        default: return [];
    }
}

// Tipos de dano físico, usados na configuração de armas.
export const TIPOS_DANO = [
    { key: "contusao", label: "Contusão" },
    { key: "perfuracao_comum", label: "Perfuração comum" },
    { key: "perfuracao_especial", label: "Perfuração especial (tiro)" },
    { key: "corte", label: "Corte" },
    { key: "explosao", label: "Explosão" },
    { key: "fogo", label: "Fogo" },
    { key: "eletrico", label: "Elétrico" },
    { key: "frio", label: "Frio / gelo" },
    { key: "especial", label: "Especial (ácido, mental, outro)" }
];

// ---------------------------------------------------------------------
// Golpes Mirados (manual): todo golpe pode ser mirado num local do
// corpo, cada um com seu próprio agravante de dificuldade — mas só
// alguns têm efeitos extras (sangramento, amputação, desmaio). Não
// mirar (golpe "Padrão") é narrado aleatoriamente, sem nenhum efeito
// extra, e é sempre reduzido pelo equipamento de TORSO.
//
// localArmadura: qual "slot" de Proteção (ver LOCAIS_PROTECAO) reduz o
// dano recebido nesse local — cada item de Proteção só reduz dano de
// golpes mirados (ou não mirados) na MESMA parte do corpo que ele
// protege (ver localProtegido no item, dados-manual.js).
//
// sangramento: regra de Golpes Perfurantes (manual) — null quando o
// local não tem regra própria (Padrão). difExtra soma em cima da
// dificuldade base do teste de Constituição (10 + nível da arma, ver
// dificuldadeSangramento em regras.js); turnos e fracaoDano definem a
// duração e o dano fixo por turno (fração do dano causado pelo golpe
// que sangrou — SEM rolar dado, valor fixo).
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Golpes Mirados por lado (extensão da diferenciação de local — o
// jogador antes só mirava em "Membro"/"Extremidade" de forma genérica
// e o lado (esquerdo/direito) era sorteado depois só pra fins de
// registro da ferida, plano-silhueta-saude.txt Fase 1). Agora o
// próprio jogador escolhe o lado NA HORA de atacar — os 8 locais
// específicos abaixo substituem as duas entradas genéricas antigas
// ("membro"/"extremidade"), cada um herdando exatamente o mesmo difMod/
// localArmadura/sangramento do grupo a que pertencia (o manual não
// diferencia mecanicamente braço de perna, nem mão de pé — só Membro
// vs. Extremidade). sortearLocalDetalhado (mais abaixo) não precisa
// mudar: quando a chave já é uma das 8 específicas (sem grupo em
// SUB_LOCAIS_FERIDA), ela já devolve a própria chave sem sortear nada.
//
// Redução de armadura (Proteção) continua igual — colete/braçadeira
// não tem lado, então localArmadura continua "membro"/"extremidade"
// genérico nos 8 locais novos, só pra saber COM QUAL peça de Proteção
// a redução deve ser calculada (ver aplicarDano em mestre.js).
export const LOCAIS_MIRA = [
    { key: "padrao", label: "Padrão (sem mirar)", difMod: 0, localArmadura: "torso", sangramento: null },
    { key: "torso", label: "Torso", difMod: 1, localArmadura: "torso", sangramento: { difExtra: 1, turnos: 3, fracaoDano: 1 / 4 } },
    { key: "braco_esquerdo", label: "Braço esquerdo", difMod: 2, localArmadura: "membro", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "braco_direito", label: "Braço direito", difMod: 2, localArmadura: "membro", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "perna_esquerda", label: "Perna esquerda", difMod: 2, localArmadura: "membro", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "perna_direita", label: "Perna direita", difMod: 2, localArmadura: "membro", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "mao_esquerda", label: "Mão esquerda", difMod: 3, localArmadura: "extremidade", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "mao_direita", label: "Mão direita", difMod: 3, localArmadura: "extremidade", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "pe_esquerda", label: "Pé esquerdo", difMod: 3, localArmadura: "extremidade", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    { key: "pe_direita", label: "Pé direito", difMod: 3, localArmadura: "extremidade", sangramento: { difExtra: 0, turnos: 2, fracaoDano: 1 / 4 } },
    // Cabeça: dificuldade normal +2 (corpo a corpo/arma branca); só um
    // TIRO de arma de fogo especificamente na cabeça usa +4 — e é o
    // único caso que aumenta o dano em 1/3 (ver difModLocalMira e
    // bonusDanoFracaoLocalMira abaixo).
    { key: "cabeca", label: "Cabeça", difMod: 2, difModArmaFogo: 4, localArmadura: "cabeca", sangramento: { difExtra: 2, turnos: 3, fracaoDano: 1 / 3 } }
];

export function localMiraPorKey(key) {
    return LOCAIS_MIRA.find(l => l.key === key) || LOCAIS_MIRA[0];
}

// ---------------------------------------------------------------------
// Lateralidade da FERIDA registrada (plano-silhueta-saude.txt, Fase 1):
// desde a diferenciação de Golpes Mirados por lado (acima), o próprio
// jogador já escolhe o braço/perna/mão/pé específico no ataque — a
// chave de LOCAIS_MIRA JÁ chega pronta pra virar ferida.local, sem
// precisar sortear nada.
//
// SUB_LOCAIS_FERIDA/sortearLocalDetalhado abaixo ficam só por
// COMPATIBILIDADE: uma Ação Pendente antiga (golpe resolvido antes
// desta mudança, ainda na fila com localMiraKey = "membro"/
// "extremidade" genérico) ou qualquer chamador externo que ainda passe
// essas duas chaves genéricas continua sorteando um lado em vez de
// quebrar. Nenhum caminho novo do sistema gera mais essas duas chaves.
//
// Isso é PURAMENTE cosmético/de registro: a redução de dano por
// Proteção continua usando a chave genérica de localArmadura acima
// ("membro"/"extremidade", sem lado) — colete/braçadeira de Proteção
// não tem lado hoje, então não faz diferença nenhuma pra armadura qual
// braço/perna específico foi escolhido (ver plano, seção "FORA DESTE
// PLANO").
export const SUB_LOCAIS_FERIDA = {
    membro: ["braco_esquerdo", "braco_direito", "perna_esquerda", "perna_direita"],
    extremidade: ["mao_esquerda", "mao_direita", "pe_esquerda", "pe_direita"]
};

// As 10 zonas "finais" que a silhueta de Saúde desenha (plano-silhueta-
// saude.txt, Fase 2/3) — mesmas chaves usadas em ferida.local depois do
// sorteio de lado (sortearLocalDetalhado abaixo), mais "torso"/"cabeca"
// que não têm lado. Usado por agruparFeridasPorLocal (saude.js) pra
// sempre devolver as 10 zonas, mesmo as sem nenhuma ferida.
export const ZONAS_SILHUETA = [
    "cabeca", "torso",
    "braco_esquerdo", "braco_direito",
    "perna_esquerda", "perna_direita",
    "mao_esquerda", "mao_direita",
    "pe_esquerda", "pe_direita"
];

export const LABELS_LOCAL_FERIDA = {
    cabeca: "Cabeça",
    torso: "Torso",
    braco_esquerdo: "Braço esquerdo",
    braco_direito: "Braço direito",
    perna_esquerda: "Perna esquerda",
    perna_direita: "Perna direita",
    mao_esquerda: "Mão esquerda",
    mao_direita: "Mão direita",
    pe_esquerda: "Pé esquerdo",
    pe_direita: "Pé direito",
    // Chaves genéricas antigas (feridas criadas ANTES deste plano, sem
    // lado sorteado) — mantidas só pra rótulo continuar legível em
    // fichas antigas; sortearLocalDetalhado nunca produz essas duas.
    membro: "Membro (lado indefinido)",
    extremidade: "Extremidade (lado indefinido)"
};

export function labelLocalFerida(localKey) {
    return LABELS_LOCAL_FERIDA[localKey] || localKey;
}

// Sorteia o local DETALHADO de uma ferida a partir de uma chave de
// LOCAIS_MIRA. Desde a diferenciação de Golpes Mirados por lado, a
// própria chave de LOCAIS_MIRA já é um local específico (braco_esquerdo,
// pe_direita etc.) na imensa maioria dos casos — SUB_LOCAIS_FERIDA não
// tem grupo pra essas chaves, então a função só devolve a própria
// chave de volta, sem sortear nada. O sorteio de verdade só acontece
// por COMPATIBILIDADE, se alguma coisa ainda passar a chave genérica
// antiga "membro"/"extremidade" (ex.: uma Ação Pendente criada antes
// desta mudança). Chamar UMA vez por golpe só — reaproveitar o mesmo
// resultado se o mesmo golpe gerar mais de uma ferida (ex.: Sangramento
// + Corte vinculados), pra não sortear lados diferentes pro mesmo
// ferimento (só relevante mesmo no caso de compatibilidade acima).
export function sortearLocalDetalhado(localMiraKey) {
    const grupo = SUB_LOCAIS_FERIDA[localMiraKey];
    if (!grupo) return localMiraKey;
    return grupo[Math.floor(Math.random() * grupo.length)];
}

// Dificuldade efetiva de mirar num local: só a Cabeça muda conforme o
// tipo de ataque (manual: "Atirar com arma de fogo especificamente na
// cabeça tem dificuldade aumentada em +4"); os demais locais (e a
// própria Cabeça em golpe corpo a corpo/arma branca) usam o difMod normal.
export function difModLocalMira(local, ehFogo) {
    if (ehFogo && local.difModArmaFogo != null) return local.difModArmaFogo;
    return local.difMod;
}

// Bônus de dano (manual): só dispara quando o golpe é um TIRO de arma
// de fogo especificamente na Cabeça.
export function bonusDanoFracaoLocalMira(local, ehFogo) {
    return (local.key === "cabeca" && ehFogo) ? 1 / 3 : 0;
}

// ---------------------------------------------------------------------
// Tipos de dano com efeitos obrigatórios de Golpe Mirado (manual):
// perfurante sangra, cortante amputa, contundente (na Cabeça) agrava o
// teste de desmaio.
// ---------------------------------------------------------------------
export function ehDanoPerfurante(tipoDanoKey) {
    return tipoDanoKey === "perfuracao_comum" || tipoDanoKey === "perfuracao_especial";
}

export function ehDanoCortante(tipoDanoKey) {
    return tipoDanoKey === "corte";
}

export function ehDanoContundente(tipoDanoKey) {
    return tipoDanoKey === "contusao";
}

// Tags cujo item pode ter redução de dano configurada (coletes, placas
// balísticas, etc — manual pg. 52-53). Um mesmo item pode reduzir vários
// tipos de dano diferentes, cada um com seu próprio valor de redução.
export const TAGS_REDUCAO_DANO = ["colete"];
export function tagPodeReduzirDano(tagKey) {
    return TAGS_REDUCAO_DANO.includes(tagKey);
}

// Parte do corpo que um item de Proteção cobre — escolhida na criação
// do item. Reaproveita as mesmas 4 regiões dos Golpes Mirados (ver
// LOCAIS_MIRA acima), sem o local "Padrão" (que não é uma parte
// específica do corpo).
export const LOCAIS_PROTECAO = [
    { key: "cabeca", label: "Cabeça" },
    { key: "torso", label: "Torso" },
    { key: "membro", label: "Membros (braços ou pernas)" },
    { key: "extremidade", label: "Extremidades (pés ou mãos)" }
];

export function rotuloLocalProtecao(key) {
    const l = LOCAIS_PROTECAO.find(l => l.key === key);
    return l ? l.label : key;
}

// Tags que exigem escolher a parte do corpo protegida — hoje, as mesmas
// que podem ter redução de dano configurada.
export function tagExigeLocalProtegido(tagKey) {
    return tagPodeReduzirDano(tagKey);
}

// Escalas de arma corpo a corpo (bônus sobre o atributo).
export const ESCALAS_ARMA = [
    { key: "E", label: "Escala E (metade do atributo)", mult: 0.5 },
    { key: "D", label: "Escala D (1x o atributo)", mult: 1 },
    { key: "C", label: "Escala C (2x o atributo)", mult: 2 },
    { key: "B", label: "Escala B (4x o atributo)", mult: 4 },
    { key: "A", label: "Escala A (5x o atributo)", mult: 5 },
    { key: "S", label: "Escala S (7x o atributo)", mult: 7 }
];

// Modificações comuns de arma (manual, pg. 65) — usadas como sugestão
// no modal de configuração de arma; o jogador pode digitar outras.
export const MODIFICACOES_ARMA_SUGERIDAS = [
    "Aumento de dano (+1/4 do dano)",
    "Aumento de escala",
    "Maior cadência (+1/3 disparos por turno)",
    "Counter",
    "Duelista",
    "Sedenta por Sangue"
];

// ---------------------------------------------------------------------
// Manobras de combate (golpes) — manual pg. 49-50. Cada manobra carrega
// alcance, a lista de perícias que podem testá-la, a fórmula textual de
// dificuldade e o efeito. São fixas: o jogador não cria manobras novas,
// só visualiza essa lista fixa na aba de Combate.
// ---------------------------------------------------------------------
export const MANOBRAS_COMBATE = [
    {
        nome: "Soco",
        alcance: "Médio",
        pericias: ["Boxe", "Força Bruta", "Briga de Rua", "Karatê Cobra Kai"],
        dificuldade: "8 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força D"
    },
    {
        nome: "Chute",
        alcance: "Longo",
        pericias: ["Briga de Rua", "Karatê Cobra Kai", "Força Bruta", "Muay Thai"],
        dificuldade: "9 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força D"
    },
    {
        nome: "Joelhada",
        alcance: "Curto",
        pericias: ["Briga de Rua", "Muay Thai", "Força Bruta"],
        dificuldade: "10 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força C"
    },
    {
        nome: "Cotovelada",
        alcance: "Curto",
        pericias: ["Briga de Rua", "Karatê Cobra Kai", "Força Bruta"],
        dificuldade: "10 + Agilidade do alvo",
        efeito: "Dano 1dForça + Força C"
    },
    {
        nome: "Arma branca",
        alcance: "Longo",
        pericias: ["Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas", "Armas Brancas Exóticas"],
        dificuldade: "9 + Agilidade do alvo",
        efeito: "Dano variável (de acordo com a arma)"
    },
    {
        nome: "Agarrar",
        alcance: "Médio",
        pericias: ["Briga de Rua", "Jiu Jitsu", "Força Bruta", "CQC"],
        dificuldade: "10 + Força do alvo",
        efeito: "Impossibilita golpes de alcance médio e longo, reduz pela metade os danos da vítima"
    },
    {
        nome: "Desarmar",
        alcance: "Médio",
        pericias: ["Briga de Rua", "Força Bruta", "CQC", "Jiu Jitsu", "Karatê Cobra Kai", "Lâminas Curtas", "Lâminas Longas"],
        dificuldade: "10 + perícia da vítima",
        efeito: "Retira uma arma equipada do alvo"
    },
    {
        nome: "Derrubar",
        alcance: "Curto",
        pericias: ["Briga de Rua", "Jiu Jitsu", "Força Bruta", "CQC", "Karatê Cobra Kai"],
        dificuldade: "10 + Constituição do alvo",
        efeito: "Derruba o alvo; dif. pra acertá-lo cai -3; precisa gastar ação pra se levantar"
    },
    {
        nome: "Aparar",
        alcance: "Curto/Longo",
        pericias: ["Lâminas Curtas", "Lâminas Longas", "Contundentes Curtas", "Contundentes Longas", "Karatê Cobra Kai", "Jiu Jitsu", "Força Bruta", "CQC"],
        dificuldade: "Igual à pontuação do atacante no teste de ataque",
        efeito: "Anula o golpe recebido; pode atacar imediatamente com modificador -1. Não dá pra aparar arma branca desarmado"
    },
    {
        nome: "Bloquear",
        alcance: "Curto",
        pericias: ["Constituição"],
        dificuldade: "10 + perícia do alvo",
        efeito: "Reduz o dano recebido pela metade. Se o dano for perfurante, não reduz nada"
    },
    {
        nome: "Esquivar",
        alcance: "Variável",
        pericias: ["Agilidade"],
        dificuldade: "Igual à pontuação do ataque sofrido",
        efeito: "Anula o golpe recebido"
    },
    {
        nome: "Delimitar alcance",
        alcance: "Variável",
        pericias: [...PERICIAS_APARAR],
        dificuldade: "11 + perícia corpo a corpo do alvo",
        efeito: "Escolhe um alcance único pra ser utilizado nesse combate"
    },
    {
        nome: "Retomar alcance",
        alcance: "Variável",
        pericias: [...PERICIAS_APARAR],
        dificuldade: "Igual à pontuação da delimitação de alcance do adversário",
        efeito: "Retira a limitação de alcance imposta pelo oponente"
    }
];

// ---------------------------------------------------------------------
// "Arremessar" (manual pg. 23, dentro da descrição de CQC nível 3) é
// uma manobra EXCLUSIVA de quem tem CQC nível 3+ — por isso não mora na
// tabela MANOBRAS_COMBATE (que é a lista "aberta pra qualquer perícia"
// do manual, pg. 49-50): só aparece na lista de manobras de ficha.js
// quando o personagem tem o nível (ver renderizarManobrasCombate).
// Guardada separada só pra reaproveitar o mesmo formato de exibição
// (nome/alcance/perícias/dificuldade/efeito) das outras linhas.
//
// IMPORTANTE: isso NÃO é arremessar uma arma (faca/adaga) — é arremessar
// o(s) PRÓPRIO ALVO. Texto do manual: "Para cada inimigo a mais até um
// máximo de 3, você recebe modificador +1 para arremessá-los ou
// derrubá-los. Arremessar causa Força C, teste de derrubar, porém com
// dificuldade aumentada em +2." Não há menção a arma equipada — é
// manobra desarmada (dano tratado como contusão, igual golpe desarmado).
// ---------------------------------------------------------------------
export const MANOBRA_ARREMESSAR_CQC = {
    nome: "Arremessar",
    alcance: "Longo",
    pericias: ["CQC"],
    dificuldade: "9 + agilidade do alvo (dificuldade -1 já embutida do nível 3)",
    efeito: "Exclusiva de CQC nível 3+. Arremessa o(s) alvo(s) (até 3, +1 no ataque por alvo extra); dano Força [escala C] (contusão); cada acerto testa Derrubar (dificuldade +2)"
};

// ---------------------------------------------------------------------
// "Imobilizar" (manual pg. 23, dentro da descrição de CQC nível 4
// "Disparar e Avançar") é outra manobra EXCLUSIVA — só aparece pra quem
// tem CQC nível 4+ (ver renderizarManobrasCombate em ficha.js), igual
// Arremessar acima. Só faz sentido contra um alvo já Derrubado (o
// manual: "Após derrubar pode imobilizar o alvo") — a lista de alvos é
// filtrada pra isso na hora de abrir a modal (ver
// abrirModalSelecionarAlvoImobilizar em ficha.js).
// ---------------------------------------------------------------------
export const MANOBRA_IMOBILIZAR_CQC = {
    nome: "Imobilizar",
    alcance: "Curto",
    pericias: ["CQC"],
    dificuldade: "10 + melhor perícia do alvo entre Jiu Jitsu, CQC ou Briga de Rua",
    efeito: "Exclusiva de CQC nível 4+, só pode ser usada contra um alvo já Derrubado. Sucesso IMOBILIZA o alvo: impede completamente ataques e movimentação até ele testar Destreza (no próprio turno, dificuldade = resultado deste teste de Imobilizar) pra se libertar"
};

// Melhor perícia elegível pra RESISTIR à manobra "Imobilizar" (CQC
// nível 4 — manual: "teste CQC resistido contra Jiu Jitsu, CQC ou Briga
// de Rua do alvo"). Lista fechada e diferente de PERICIAS_APARAR (que
// serve pra Desarmar/Delimitar alcance) porque o manual explicita quais
// perícias valem aqui.
export const PERICIAS_IMOBILIZAR_CQC = ["Jiu Jitsu", "CQC", "Briga de Rua"];

export function listaManobrasCombate() {
    return MANOBRAS_COMBATE;
}

// ---------------------------------------------------------------------
// CQC (manual pg. 20-21): tática militar com bônus progressivos por
// nível. Implementados por enquanto:
//
// Nível 1 (Desarmado): +1 em rolagens de CQC quando o combate é 1x1
// (só o atacante e mais um participante no Gerenciador de Combate), e
// +1 na manobra "Desarmar" quando rolada com CQC de verdade (ver
// resolverDesarmar em ficha.js).
//
// Nível 3 (Esfaquear e Arremessar): golpear com faca ou adaga tem
// dificuldade -1 e ganha +Destreza [escala D, 1x o atributo] de dano
// extra — vale mesmo rolando a perícia Lâminas Curtas em vez de CQC
// (é o NÍVEL de CQC que concede o bônus, não exige rolar com ele). A
// parte de arremessar (MANOBRA_ARREMESSAR_CQC acima) só aparece pra
// quem tem o nível — ver resolverArremessar em ficha.js.
//
// Nível 2 ("Avançar em direção a oponentes armados e derrubá-los tem
// modificador +1 em sua iniciativa e derrubar uma vez. Causa dano
// contundente Destreza D"): condicional a uma escolha narrativa (nem
// todo golpe de Derrubar de quem tem o nível é esse avanço específico),
// então não é automático feito o resto — o +1 de iniciativa e a
// variante de dano de Derrubar entram como checkbox condicional (ver
// participantesElegiveisCQCIniciativa/abrirModalBonusIniciativaCQC e o
// checkbox da modal de Derrubar em ficha.js).
//
// Nível 4 (Disparar e Avançar): duas partes.
// (1) "pode efetuar dois disparos em um alvo fora de seu turno com uma
// pistola, utilizando uma ação do seu primeiro turno" — oferecido igual
// ao bônus de iniciativa do nível 2, no mesmo checkbox pré-rolagem de
// iniciativa (ver abrirModalBonusIniciativaCQC). Marcar reserva 1 ação
// do 1º turno (iniciarIniciativaCombate em mestre.js) e libera um botão
// "Disparar e Avançar" (resolverDispararAvancar em ficha.js) que rola 2
// disparos de Armas de Fogo de Pequeno Porte contra o alvo escolhido,
// fora da ordem de turno normal (mesmo mecanismo de bypass da ação que
// o contra-ataque do Aparar já usa).
// (2) "Após derrubar pode imobilizar o alvo [...] Requer uma ação e
// teste CQC resistido contra Jiu Jitsu, CQC ou Briga de Rua do alvo" —
// vira a manobra exclusiva "Imobilizar" (MANOBRA_IMOBILIZAR_CQC acima),
// só disponível contra quem já está Derrubado. Sucesso trava o alvo
// (ver definirImobilizado em mestre.js): nenhum ataque passa enquanto
// durar (bloqueio TOTAL, mais forte que Agarrar, que só bloqueia
// alcance médio/longo), até um teste de Destreza no próprio turno da
// vítima (ver tentarLibertarImobilizado em ficha.js).
// A "movimentação livre igual à Velocidade" pra avançar em inimigos
// distantes é só narrativa — o sistema não tem grade/posicionamento, só
// registra a nota no Log quando os disparos são resolvidos.
//
// Nível 5 (Agente Impossível): "Além de todos benefícios dos níveis
// anteriores, você recebe uma ação extra em seu turno para rolagens de
// CQC." Diferente do resto — não é condicional a nenhuma escolha
// narrativa, então é automático (nenhum checkbox), mas a restrição
// ("para rolagens de CQC") IMPORTA: não é uma ação genérica a mais, só
// serve quando a rolagem usa a perícia CQC especificamente. Por isso é
// um contador SEPARADO (acoesExtraCQC/acoesExtraCQCMax), nunca somado
// ao `acoes` normal — ver iniciarIniciativaCombate/avancarTurnoCombate/
// consumirAcaoExtraCQC em mestre.js e checarConsumoDeAcao (parâmetro
// ehCQC) em ficha.js, que é quem decide se uma rolagem específica pode
// recorrer a esse contador quando o normal já zerou.
// ---------------------------------------------------------------------
export function bonusCQC1x1(nivelCQC) {
    return Number(nivelCQC) >= 1 ? 1 : 0;
}

// Nível 1: +1 pra desarmar oponentes — só quando a perícia usada pra
// rolar a manobra Desarmar é CQC de verdade (igual ao bônus 1x1 acima).
export function bonusCQCDesarmar(nivelCQC) {
    return Number(nivelCQC) >= 1 ? 1 : 0;
}

// Detecção simples por nome do item — cobre "Faca", "Faca de combate",
// "Adaga ritual" etc. Itens de faca/adaga customizados que fujam desse
// padrão de nome não são detectados automaticamente.
export function ehFacaOuAdaga(nomeItem) {
    return /\bfacas?\b|\badagas?\b/i.test(String(nomeItem || ""));
}

export function bonusCQCFacaAdaga(nivelCQC) {
    if (Number(nivelCQC) < 3) return null;
    return { difAjuste: -1, escalaMultDano: 1 }; // escala D = 1x Destreza
}

// ---------------------------------------------------------------------
// Jiu Jitsu (manual pg. 22): "Técnica baseada em derrubar, imobilizar e
// quebrar ossos." Implementado por completo:
//
// Base (qualquer nível, exige ao menos nível 1): "Ao derrubar alguém
// que não tenha Jiu Jitsu, cause 1/10 do total de PV da vítima." — bônus
// automático de dano na manobra "Derrubar" (manual pg. 49-50) quando
// rolada com a perícia Jiu Jitsu, contra alvo sem a perícia. Ver
// danoQuedaJiuJitsu abaixo e o hook em resolverDerrubar (ficha.js) — o
// "PV total" usado é o PV MÁXIMO do alvo (participante.pvMax, já
// calculado no Gerenciador de Combate), não o atual.
//
// Nível 1 (Quedas): é o próprio nível que HABILITA o bônus acima — o
// manual não descreve nada além do título "Quedas" nesse nível, e o
// parágrafo-base já cobre o efeito (Derrubar é a manobra "de qualquer
// perícia" padrão da lista MANOBRAS_COMBATE, sem exigir nível pra
// existir — só o BÔNUS de dano extra por não-ter-Jiu-Jitsu depende do
// atacante ter pelo menos nível 1 na perícia).
//
// Nível 2 (Imobilização): igual em espírito ao "Imobilizar" do CQC
// nível 4 (MANOBRA_IMOBILIZAR_CQC acima) — por isso REAPROVEITA toda a
// mecânica de status já pronta (definirImobilizado/soltarImobilizado em
// mestre.js, badges 🔒 Imobilizado, bloqueio de ataque em resolverAtaque,
// teste de Destreza pra se libertar). A diferença é só na ROLAGEM: o
// manual diz "vítima não pode fazer nenhuma ação até vencer em um teste
// disputado de Força ou Jiu Jitsu. O usuário pode escolher entre usar a
// perícia Jiu Jitsu, Força ou Destreza nesse teste" — ou seja, tabela
// própria (o atacante rola Jiu Jitsu OU o atributo Força OU o atributo
// Destreza, sua escolha; a dificuldade é 10 + o melhor entre Força e
// Jiu Jitsu do ALVO), diferente da lista fixa do CQC (10 + melhor entre
// Jiu Jitsu/CQC/Briga de Rua do alvo). Ver MANOBRA_IMOBILIZAR_JIUJITSU
// abaixo e resolverImobilizarJiuJitsu/calcularMelhorForcaOuJiuJitsuAlvo
// em ficha.js. Segue a mesma convenção do resto do sistema pra "teste
// disputado" (transformar em dificuldade estática 10 + atributo/perícia
// do alvo — igual Agarrar "10 + Força do alvo", Derrubar "10 +
// Constituição do alvo" etc.), e também exige alvo já Derrubado (mesma
// leitura usada pro Imobilizar do CQC — "imobilizar" no manual de Jiu
// Jitsu é sempre citado junto de "derrubar" no parágrafo-base da perícia).
//
// Nível 3 (Desacordar ao Imobilizar): "Ao vencer no teste disputado, a
// vítima é desacordada se for da vontade do usuário" — oferecido como
// checkbox opcional na mesma modal de alvo do Imobilizar-Jiu-Jitsu
// (só quando nível >= 3). Sucesso com a caixa marcada troca o resultado
// de Imobilizado por um status NOVO, "Desacordado" (definirDesacordado/
// soltarDesacordado em mestre.js) — inconsciente de verdade: bloqueia
// tudo igual Imobilizado, mas SEM teste de Destreza pra se libertar
// sozinho (o manual não dá esse recurso pra quem foi nocauteado) — só
// o Mestre pode "Acordar" a vítima (botão no Gerenciador de Combate).
//
// Níveis 4 e 5 (Quebrar pequenos ossos / Quebrar ossos): "Com o alvo
// imobilizado, o dano é de Destreza C [nível 4] / B [nível 5] e reduz
// em um [nível 4] / dois [nível 5] pontos qualquer ação física, e caso
// seja em um membro inferior, impossibilita correr [só nível 5; ambas
// pernas quebradas = só se arrasta, testando Tolerância dificuldade
// 15]." Vira a manobra exclusiva "Quebrar ossos" (MANOBRA_QUEBRAR_OSSOS_JIUJITSU
// abaixo), só disponível contra quem VOCÊ está imobilizando agora (ver
// abrirModalQuebrarOssosJiuJitsu/resolverQuebrarOssosJiuJitsu em
// ficha.js) — aplica o dano automaticamente (ver danoQuebrarOssosJiuJitsu
// abaixo) e registra o status ossosQuebrados (badge 🦴) com a nota
// textual da penalidade pro Mestre aplicar nos testes físicos seguintes
// da vítima — o sistema não tem uma trava genérica de "penalidade em
// qualquer ação física de um participante específico" (só o dono da
// ficha tem seu próprio estado de saúde/energia calculado), então essa
// parte final fica com o Mestre, igual outras notas só-narrativas já
// existentes no CQC nível 4 (ver comentário acima de MANOBRA_IMOBILIZAR_CQC).
// ---------------------------------------------------------------------

// Bônus de dano da manobra "Derrubar" quando rolada com Jiu Jitsu contra
// alvo sem a perícia — manual: "cause 1/10 do total de PV da vítima".
// pvMaxAlvo é o PV MÁXIMO do participante (não o atual).
export function danoQuedaJiuJitsu(nivelJJAtacante, alvoTemJiuJitsu, pvMaxAlvo) {
    if (Number(nivelJJAtacante) < 1) return 0;
    if (alvoTemJiuJitsu) return 0;
    return Math.floor((Number(pvMaxAlvo) || 0) / 10);
}

export const MANOBRA_IMOBILIZAR_JIUJITSU = {
    nome: "Imobilizar (Jiu Jitsu)",
    alcance: "Curto",
    pericias: ["Jiu Jitsu", "Força", "Destreza"],
    dificuldade: "Teste disputado — 10 + melhor entre Força ou Jiu Jitsu do alvo",
    efeito: "Exclusiva de Jiu Jitsu nível 2+, só pode ser usada contra um alvo já Derrubado. Escolha rolar com Jiu Jitsu, Força ou Destreza. Sucesso IMOBILIZA o alvo (mesmo efeito do CQC nível 4): impede completamente ataques e movimentação até testar Destreza pra se libertar. Jiu Jitsu nível 3: pode escolher Desacordar o alvo em vez disso (sem teste pra se libertar sozinho)."
};

export const MANOBRA_QUEBRAR_OSSOS_JIUJITSU = {
    nome: "Quebrar ossos",
    alcance: "Curto",
    pericias: ["Jiu Jitsu"],
    dificuldade: "Automático — só contra alvo que você já Imobilizou",
    efeito: "Exclusiva de Jiu Jitsu nível 4+, só pode ser usada contra um alvo que você esteja Imobilizando agora. Causa dano automático (Destreza C no nível 4, Destreza B no nível 5) e reduz em 1 (nível 4) ou 2 (nível 5) pontos qualquer ação física da vítima; se atingir um membro inferior (nível 5), impossibilita correr — ambas as pernas quebradas, só dá pra se arrastar (teste de Tolerância, dificuldade 15)."
};

// Escala/label de dano de "Quebrar ossos" por nível de Jiu Jitsu — null
// se o personagem não tem nível suficiente (< 4).
export function danoQuebrarOssosJiuJitsu(nivelJJ) {
    const nivel = Number(nivelJJ) || 0;
    if (nivel >= 5) return { escalaMult: 4, label: "Destreza B", pontosPenalidade: 2 }; // Escala B = 4x
    if (nivel >= 4) return { escalaMult: 2, label: "Destreza C", pontosPenalidade: 1 }; // Escala C = 2x
    return null;
}

// ---------------------------------------------------------------------
// Catálogo de Drogas (manual, cap. Drogas, pág. 58–62) — dados fixos de
// referência. `modificadores`: versão estruturada do `efeito` (mesmo
// formato de qualquer entidade — alvo/valor, ver listaAlvosModificador
// em regras.js), aplicada automaticamente quando o item correspondente
// (tag "droga") é consumido — ver consumirDroga em ficha.js — e dura até
// o fim do dia em jogo em que foi consumida (o calendário da mesa não
// conta hora a hora, só dia — ver calcularModificadoresDrogasAtivas em
// regras.js). Efeitos que não têm como virar um número direto (ex.:
// "reduz tempo de aprendizado", "retira necessidade de sono") ficam só
// no texto de `efeito`, sem entrar em `modificadores`.
// `testeVicio`/`testeOverdose` ficam como texto livre — o resultado de
// cada rolagem continua sendo apurado manualmente pelo jogador/Mestre,
// igual qualquer outro teste do manual.
// ---------------------------------------------------------------------
export const CATALOGO_DROGAS = [
    {
        nome: "Maconha", preco: "CN$10-20", dose: "a partir de 0,5 g (um fino)",
        efeito: "-1 em Percepção e testes mentais e de destreza.",
        modificadores: [
            { alvo: "secundario:percepcao", valor: -1 },
            { alvo: "testes_mentais", valor: -1 },
            { alvo: "atributo:destreza", valor: -1 }
        ],
        testeVicio: "Consumida todos os dias durante um mês: teste de Constituição, dif. 18 — falha vicia."
    },
    {
        nome: "Álcool", preco: "CN$5-200", dose: "destilado: 1 copo pequeno · cerveja: 3 latas · vinho: 1 taça",
        efeito: "-1 em testes sociais, mentais e de destreza; -1 em Velocidade.",
        modificadores: [
            { alvo: "testes_sociais", valor: -1 },
            { alvo: "testes_mentais", valor: -1 },
            { alvo: "atributo:destreza", valor: -1 },
            { alvo: "secundario:velocidade", valor: -1 }
        ],
        testeVicio: "Consumido 1x/semana durante um mês: teste de Constituição, dif. 18 — falha vicia.",
        testeOverdose: "A partir de 4 doses: teste de Resistência Imunológica, dif. 16 — falha: coma alcoólico (PV reduzido a 1); sucesso: desmaia; crítico: nenhum efeito."
    },
    {
        nome: "Anfetamina", preco: "CN$50", dose: "meia pílula (0,5 g)",
        efeito: "-1 em testes mentais; +1 em Agilidade e Percepção.",
        modificadores: [
            { alvo: "testes_mentais", valor: -1 },
            { alvo: "secundario:agilidade", valor: 1 },
            { alvo: "secundario:percepcao", valor: 1 }
        ],
        testeVicio: "Consumida 1x/semana durante um mês: teste de Constituição, dif. 20 — falha vicia.",
        testeOverdose: "A partir de 3 doses: teste de Resistência Imunológica, dif. 16 — falha: convulsão, 10 de dano por turno até tratamento médico; sucesso: nenhum efeito."
    },
    {
        nome: "LSD", preco: "CN$200", dose: "¼ de drop, 0,001 de gota",
        efeito: "-3 em todas as rolagens de perícia; exige teste de Concentração pra atividades do dia a dia (servir comida, dirigir, pedir carro por aplicativo).",
        modificadores: [
            { alvo: "testes_fisicos", valor: -3 },
            { alvo: "testes_mentais", valor: -3 },
            { alvo: "testes_sociais", valor: -3 }
        ],
        testeVicio: "Não vicia, mas perde o efeito se usada toda semana durante um mês."
    },
    {
        nome: "NBomb", preco: "CN$70", dose: "¼ de drop, 0,01 de gota", efeitoExtra: "LSD falsa.",
        efeito: "-3 em todas as rolagens de perícia; exige teste de Concentração pra atividades do dia a dia.",
        modificadores: [
            { alvo: "testes_fisicos", valor: -3 },
            { alvo: "testes_mentais", valor: -3 },
            { alvo: "testes_sociais", valor: -3 }
        ],
        testeVicio: "Não vicia, mas perde o efeito se usada toda semana durante um mês.",
        testeOverdose: "A partir de 3 doses: teste de Resistência Imunológica, dif. 17 — falha: convulsão, 10 de dano por turno até atendimento médico; sucesso: nenhum efeito."
    },
    {
        nome: "Cocaína", preco: "CN$100", dose: "0,5 g",
        efeito: "-1 em testes que exigem concentração; +1 em Raciocínio; retira a necessidade de sono por 4h.",
        modificadores: [
            { alvo: "testes_mentais", valor: -1 },
            { alvo: "atributo:raciocinio", valor: 1 }
        ],
        testeVicio: "Consumida 1x/mês: teste de Constituição, dif. 19 — falha vicia.",
        testeOverdose: "Sempre que usar: teste de Resistência Imunológica, dif. 15 — falha: 15 de dano e o próximo uso tem modificador -1."
    },
    {
        nome: "Brilho", preco: "CN$200", dose: "0,5 g",
        efeito: "Reduz em 1/3 o tempo de aprendizado, se usado dia sim, dia não.",
        modificadores: [],
        testeVicio: "Uso intercalado por duas semanas seguidas: teste de Constituição, dif. 20 — falha vicia. Depois de viciado, os efeitos de abstinência afetam em dobro os testes mentais."
    },
    {
        nome: "Phantom", preco: "CN$200", dose: "a partir de 0,5 g (um fino)",
        efeito: "+1 em Resistência Mental (Força de Vontade); -1 em Destreza e Percepção.",
        modificadores: [
            { alvo: "secundario:forca_vontade", valor: 1 },
            { alvo: "atributo:destreza", valor: -1 },
            { alvo: "secundario:percepcao", valor: -1 }
        ],
        testeVicio: "Consumido 1x/semana durante um mês: teste de Constituição, dif. 18 — falha vicia."
    },
    {
        nome: "Lótus", preco: "CN$200", dose: "a partir de 0,5 g (um fino)",
        efeito: "-1 em Percepção e testes mentais e de destreza.",
        modificadores: [
            { alvo: "secundario:percepcao", valor: -1 },
            { alvo: "testes_mentais", valor: -1 },
            { alvo: "atributo:destreza", valor: -1 }
        ],
        testeVicio: "Consumido 1x/semana durante um mês: teste de Constituição, dif. 21."
    },
    {
        nome: "Esteroide", preco: "CN$100", dose: "1 ml",
        efeito: "Reduz em 1/4 a necessidade de treino; aumenta o limite de Massa Corpórea para 16.",
        modificadores: [],
        testeVicio: "Não causa vício nem overdose, mas causa problemas de saúde a longo prazo (recomendado fazer exames)."
    },
    {
        nome: "Opioides", preco: "CN$100", dose: "30 mg (dose padrão recreativa)",
        efeito: "+1 em resistência à dor; -1 em Percepção e Inteligência.",
        modificadores: [
            { alvo: "secundario:percepcao", valor: -1 },
            { alvo: "atributo:inteligencia", valor: -1 }
        ],
        testeVicio: "Consumido toda semana por um mês: teste de Constituição, dif. 16 — falha vicia.",
        testeOverdose: "A partir de 3 doses: teste de Resistência Imunológica, dif. 15 — falha: convulsão, 10 de dano por turno até tratamento médico; sucesso: nenhum efeito."
    },
    {
        nome: "Aderal", preco: "CN$100", dose: "um comprimido",
        efeito: "+1 em Percepção, Agilidade e testes que exijam concentração, por 2h.",
        modificadores: [
            { alvo: "secundario:percepcao", valor: 1 },
            { alvo: "secundario:agilidade", valor: 1 },
            { alvo: "testes_mentais", valor: 1 }
        ],
        testeVicio: "Consumido todos os dias por uma semana: teste de Constituição, dif. 17 — falha vicia.",
        testeOverdose: "Três doses sem descanso: teste de Resistência Imunológica, dif. 16 — falha: 15 de dano; sucesso: nenhum efeito."
    },
    {
        nome: "QuickRegen", preco: "CN$10.000", dose: "uma seringa",
        efeito: "Reduz pela metade o tempo de descanso necessário pra recuperar PVs.",
        modificadores: [],
        testeVicio: "Consumido 1x/mês: teste de Constituição, dif. 18 — falha: desenvolve algum tipo de câncer; sucesso: nenhum efeito."
    }
];

// ---------------------------------------------------------------------
// Veículos (manual pg. 36-43) — Plano: implementação em fases, ver
// README/plano-veiculos.txt. Fase 1 (esta aqui) cobre só os cinco
// atributos com escala fixa de nível 0 a 5: Velocidade, Eficiência,
// Proteção, Capacidade de Carga e Controle. Cada nível tem um efeito
// descritivo (direto do manual) e um preço de mercado — o preço é a
// base do cálculo de manutenção (ver valorManutencaoVeiculo em
// regras.js, fase 2 do plano).
//
// "Acessórios/Armamento" (a sexta área personalizável do veículo) fica
// de fora por enquanto: é um catálogo de itens com slot próprio, não
// uma escala de nível com preço fixo como as outras cinco — não entra
// no cálculo de manutenção do jeito que o manual descreve.
// ---------------------------------------------------------------------
export const NIVEIS_VEICULO = [0, 1, 2, 3, 4, 5];

// Tipo do veículo — só define a periodicidade da cobrança de
// manutenção (manual pg. 41): veículos de corrida pagam toda semana,
// de carga a cada duas semanas, pessoais uma vez por mês.
export const TIPOS_VEICULO = [
    { key: "corrida", label: "Veículo de corrida", periodicidadeManutencao: "semanal" },
    { key: "carga", label: "Veículo de carga", periodicidadeManutencao: "quinzenal" },
    { key: "pessoal", label: "Veículo pessoal", periodicidadeManutencao: "mensal" }
];

export function rotuloTipoVeiculo(tipoKey) {
    const t = TIPOS_VEICULO.find(t => t.key === tipoKey);
    return t ? t.label : tipoKey;
}

export function periodicidadeManutencaoVeiculo(tipoKey) {
    const t = TIPOS_VEICULO.find(t => t.key === tipoKey);
    return t ? t.periodicidadeManutencao : "mensal";
}

// Escala de nível 0-5 de cada atributo. Cada entrada de `niveis` traz:
//   - efeito: texto descritivo (direto do manual)
//   - preco: custo em CN$ pra comprar aquele nível (nível 0 é de
//     fábrica, sem custo) — usado em regras.js pra somar o valor total
//     do veículo e calcular a manutenção (1/20 do valor de cada
//     atributo, somados)
//   - campos extras específicos do atributo (kmhMax, turnosAteVelMax,
//     pv, reducaoDano, kgMax) — usados pelos modificadores derivados
//     da fase 2 (regras.js) e pela UI da ficha (fase 4).
export const ESCALAS_VEICULO = {
    velocidade: {
        label: "Velocidade",
        descricao: "Rapidez, aceleração e mobilidade. Cada ponto determina o número de ações que podem ser realizadas em um turno enquanto dirige (acelerar, atropelar, manobrar) — o número máximo de ações por turno é limitado pelo atributo Raciocínio do piloto.",
        niveis: [
            { nivel: 0, efeito: "0 km/h (parado ou quebrado)", kmhMax: 0, preco: 0 },
            { nivel: 1, efeito: "até 40 km/h (muito lento)", kmhMax: 40, preco: 7000 },
            { nivel: 2, efeito: "até 100 km/h", kmhMax: 100, preco: 14000 },
            { nivel: 3, efeito: "até 170 km/h (carro comum em boas condições)", kmhMax: 170, preco: 40000 },
            { nivel: 4, efeito: "até 200 km/h (esportivo)", kmhMax: 200, preco: 115000 },
            { nivel: 5, efeito: "até 300 km/h (especializado)", kmhMax: 300, preco: 207000 }
        ]
    },
    eficiencia: {
        label: "Eficiência",
        descricao: "Quantos turnos o veículo leva para atingir sua velocidade máxima. Cada ponto reduz o tempo necessário.",
        niveis: [
            { nivel: 0, efeito: "8 turnos (aceleração extremamente lenta)", turnosAteVelMax: 8, preco: 0 },
            { nivel: 1, efeito: "5 turnos", turnosAteVelMax: 5, preco: 8750 },
            { nivel: 2, efeito: "4 turnos", turnosAteVelMax: 4, preco: 26250 },
            { nivel: 3, efeito: "3 turnos", turnosAteVelMax: 3, preco: 55000 },
            { nivel: 4, efeito: "2 turnos", turnosAteVelMax: 2, preco: 293000 },
            { nivel: 5, efeito: "1 turno", turnosAteVelMax: 1, preco: 775000 }
        ]
    },
    protecao: {
        label: "Proteção",
        descricao: "Quanto dano o veículo aguenta e quanto reduz de dano recebido (tanto para a estrutura quanto para os tripulantes). A cada dois pontos em Proteção, o veículo sofre -1 em Velocidade.",
        niveis: [
            { nivel: 0, efeito: "sem proteção — o carro está sem carroceria", pv: 70, reducaoDano: 0, preco: 0 },
            { nivel: 1, efeito: "frágil — reduz -5 de danos sofridos pelos tripulantes e a si mesmo", pv: 200, reducaoDano: 5, preco: 40150 },
            { nivel: 2, efeito: "padrão — reduz -15 de danos", pv: 300, reducaoDano: 15, preco: 100750 },
            { nivel: 3, efeito: "blindado — reduz -30 de danos", pv: 500, reducaoDano: 30, preco: 274500 },
            { nivel: 4, efeito: "blindagem pesada — reduz -45 de danos", pv: 800, reducaoDano: 45, preco: 466000 },
            { nivel: 5, efeito: "extra blindagem pesada — reduz -100 de danos", pv: 1200, reducaoDano: 100, preco: 750000 }
        ]
    },
    capacidadeCarga: {
        label: "Capacidade de Carga",
        descricao: "O quanto o veículo pode aguentar carregar e armazenar, em peso e tamanho. A partir do nível 3, cada nível acima do 2 dá -1 em Contabilidade.",
        niveis: [
            { nivel: 0, efeito: "sem porta-malas (ou danificado)", kgMax: 0, preco: 0 },
            { nivel: 1, efeito: "porta-malas padrão", kgMax: 30, preco: 10000 },
            { nivel: 2, efeito: "porta-malas grande (SUV ou bancos traseiros removidos)", kgMax: 100, preco: 25000 },
            { nivel: 3, efeito: "baú de van", kgMax: 300, preco: 240000 },
            { nivel: 4, efeito: "baú de caminhão", kgMax: 500, preco: 320000 },
            { nivel: 5, efeito: "ônibus", kgMax: 1000, preco: 900000 }
        ]
    },
    controle: {
        label: "Controle",
        descricao: "Sua capacidade de controlar o carro e realizar manobras.",
        niveis: [
            { nivel: 0, efeito: "seu carro está muito danificado e patina bastante — recebe -3 em todas as rolagens", preco: 0 },
            { nivel: 1, efeito: "seu carro está no padrão — anda normalmente, porém é incapaz de realizar manobras", preco: 5750 },
            { nivel: 2, efeito: "seu carro está mexido — pronto para realizar drifts", preco: 17250 },
            { nivel: 3, efeito: "seu carro está mexidão — pronto para drifts (+1 para realizá-los) e +1 em rolagens de fuga e corridas", preco: 31000 },
            { nivel: 4, efeito: "seu carro está mexidíssimo — +2 para drifts, +2 em rolagens de fuga e corridas", preco: 221000 },
            { nivel: 5, efeito: "o carro mexido da porra — +3 para drifts, +3 em rolagens de fuga e corridas", preco: 475000 }
        ]
    },
    // Fase 5a do plano (ver plano-acessorios-veiculo.txt): o manual (pg.
    // 37) cita "Acessórios" como um dos atributos do veículo, mas nunca
    // fecha uma escala 0-5 com efeito por nível nem uma tabela de preço
    // (diferente dos cinco acima). Seguindo a leitura (A) do plano: o
    // nível deste atributo É a capacidade total de slots do veículo — o
    // efeito de cada nível é só "N slots disponíveis", sem efeito
    // mecânico próprio além disso (o efeito de verdade vem do que for
    // instalado, catálogo da Fase 5b). `preco: null` em toda linha —
    // sem tabela publicada, custo de subir o nível fica "a combinar com
    // o narrador" (mesmo tratamento de Explosivos/Química, pg. 82).
    acessorios: {
        label: "Acessórios",
        descricao: "Slots disponíveis para instalar acessórios e armamento no veículo. Cada acessório consome slots iguais ao seu próprio nível.",
        niveis: [
            { nivel: 0, efeito: "0 slots disponíveis para acessórios/armamento", preco: null },
            { nivel: 1, efeito: "1 slot disponível para acessórios/armamento", preco: null },
            { nivel: 2, efeito: "2 slots disponíveis para acessórios/armamento", preco: null },
            { nivel: 3, efeito: "3 slots disponíveis para acessórios/armamento", preco: null },
            { nivel: 4, efeito: "4 slots disponíveis para acessórios/armamento", preco: null },
            { nivel: 5, efeito: "5 slots disponíveis para acessórios/armamento", preco: null }
        ]
    }
};

// Lista fechada das chaves de atributo de veículo, na mesma ordem do
// manual — usada pra iterar (formulário do Mestre, soma da
// manutenção) sem depender da ordem de inserção do objeto.
//
// "acessorios" entra nesta lista de propósito (Fase 5a) pra herdar de
// graça toda a UI/normalização genérica que já itera ATRIBUTOS_VEICULO
// (clamp de nível em normalizarVeiculos, atributoEfetivoVeiculo, o
// card padrão da aba Veículos, o modal de "Melhorar"). As DUAS exceções
// são valorTotalVeiculo e valorManutencaoVeiculo (regras.js), que
// excluem "acessorios" explicitamente — esse atributo não tem preço
// por nível (preco: null acima), então não entra nessas somas.
export const ATRIBUTOS_VEICULO = ["velocidade", "eficiencia", "protecao", "capacidadeCarga", "controle", "acessorios"];

export function rotuloAtributoVeiculo(atributoKey) {
    const escala = ESCALAS_VEICULO[atributoKey];
    return escala ? escala.label : atributoKey;
}

export function escalaVeiculo(atributoKey) {
    return ESCALAS_VEICULO[atributoKey] || null;
}

// Devolve a entrada de nível (efeito + preço + campos extras) de um
// atributo de veículo. Nível fora da escala (undefined/negativo/maior
// que 5) cai pro nível 0 — nunca deve travar a UI por um dado
// inconsistente vindo do Firebase.
export function nivelVeiculo(atributoKey, nivel) {
    const escala = ESCALAS_VEICULO[atributoKey];
    if (!escala) return null;
    return escala.niveis.find(n => n.nivel === Number(nivel)) || escala.niveis[0];
}

export function precoNivelVeiculo(atributoKey, nivel) {
    const entrada = nivelVeiculo(atributoKey, nivel);
    return entrada ? entrada.preco : 0;
}

// =====================================================================
// REPARO E UPGRADE DE ATRIBUTO — "ir ao mecânico" (manual pg. 38-39) —
// Fase 3 do plano (ver plano-veiculos-fase2.txt).
// =====================================================================
//
// Tabela preenchida com os valores do manual (pg. 38-39, seção
// "Aumentando atributos e confeccionando veículo"). Nenhum material
// tem tier mínimo especificado nessa seção do manual — por isso
// `qualidade: null` em toda linha (qualquer tier do material serve).
//
// Formato: por atributo (chaves de ATRIBUTOS_VEICULO), um array de 5
// posições — índice 0 = custo pra subir DO nível 0 PRO nível 1, índice
// 1 = de 1 pro 2, ..., índice 4 = de 4 pro 5 (ou seja, índice =
// nivelAlvo - 1; ver custoUpgradeVeiculoTabela abaixo, que já esconde
// essa conta de quem consome a tabela). Cada entrada preenchida deve
// ter o formato:
//   { preco: number, materiais: [{ material: string (nome batendo
//     com MATERIAIS_CRIACAO acima), qualidade: string|null (tier
//     mínimo exigido, ou null = qualquer tier serve), quantidade:
//     number }] }
//
// A dificuldade do teste NÃO mora aqui — é calculada por fórmula (11 +
// nível-alvo do manual pg. 38) em dificuldadeUpgradeVeiculo (regras.js),
// não é um dado de tabela.
//
// Reparo (manual pg. 39) NÃO tem tabela própria: reaproveita a receita
// de subir "1 nível" (índice 0, ou seja, a receita de comprar o nível
// 1) e multiplica a quantidade de cada material pelo nível ATUAL do
// atributo — ver custoReparoVeiculo em regras.js. Preencher só esta
// tabela de upgrade já é suficiente pros dois fluxos funcionarem.
export const CUSTOS_UPGRADE_VEICULO = {
    velocidade: [
        { preco: 7000, materiais: [{ material: "Eletrônico", qualidade: null, quantidade: 10 }, { material: "Metal pesado", qualidade: null, quantidade: 10 }] },
        { preco: 14000, materiais: [{ material: "Eletrônico", qualidade: null, quantidade: 20 }, { material: "Metal pesado", qualidade: null, quantidade: 20 }] },
        { preco: 40000, materiais: [{ material: "Eletrônico", qualidade: null, quantidade: 40 }, { material: "Metal pesado", qualidade: null, quantidade: 30 }] },
        { preco: 115000, materiais: [{ material: "Eletrônico", qualidade: null, quantidade: 60 }, { material: "Metal pesado", qualidade: null, quantidade: 20 }, { material: "Material especial", qualidade: null, quantidade: 15 }] },
        { preco: 207000, materiais: [{ material: "Eletrônico", qualidade: null, quantidade: 100 }, { material: "Metal pesado", qualidade: null, quantidade: 15 }, { material: "Material especial", qualidade: null, quantidade: 20 }] }
    ],
    eficiencia: [
        { preco: 8750, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 5 }, { material: "Eletrônico avançado", qualidade: null, quantidade: 5 }, { material: "Material especial", qualidade: null, quantidade: 1 }] },
        { preco: 26250, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 15 }, { material: "Eletrônico avançado", qualidade: null, quantidade: 15 }, { material: "Material especial", qualidade: null, quantidade: 3 }] },
        { preco: 55000, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 20 }, { material: "Eletrônico avançado", qualidade: null, quantidade: 20 }, { material: "Material especial", qualidade: null, quantidade: 5 }] },
        { preco: 293000, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 70 }, { material: "Eletrônico avançado", qualidade: null, quantidade: 60 }, { material: "Material especial", qualidade: null, quantidade: 40 }] },
        { preco: 775000, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 150 }, { material: "Eletrônico avançado", qualidade: null, quantidade: 100 }, { material: "Material especial", qualidade: null, quantidade: 80 }] }
    ],
    protecao: [
        { preco: 40150, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 30 }, { material: "Metal leve", qualidade: null, quantidade: 1 }, { material: "Material especial", qualidade: null, quantidade: 5 }] },
        { preco: 100750, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 100 }, { material: "Metal leve", qualidade: null, quantidade: 5 }, { material: "Material especial", qualidade: null, quantidade: 10 }] },
        { preco: 274500, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 150 }, { material: "Metal leve", qualidade: null, quantidade: 15 }, { material: "Material especial", qualidade: null, quantidade: 30 }] },
        { preco: 466000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 200 }, { material: "Metal leve", qualidade: null, quantidade: 20 }, { material: "Material especial", qualidade: null, quantidade: 60 }] },
        { preco: 750000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 400 }, { material: "Metal leve", qualidade: null, quantidade: 50 }, { material: "Material especial", qualidade: null, quantidade: 1 }] }
    ],
    capacidadeCarga: [
        { preco: 10000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 20 }] },
        { preco: 25000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 50 }] },
        { preco: 240000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 300 }] },
        { preco: 320000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 400 }] },
        { preco: 900000, materiais: [{ material: "Metal pesado", qualidade: null, quantidade: 500 }] }
    ],
    controle: [
        { preco: 5750, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 5 }, { material: "Material especial", qualidade: null, quantidade: 1 }] },
        { preco: 17250, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 15 }, { material: "Material especial", qualidade: null, quantidade: 3 }] },
        { preco: 31000, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 20 }, { material: "Material especial", qualidade: null, quantidade: 5 }] },
        { preco: 221000, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 70 }, { material: "Material especial", qualidade: null, quantidade: 40 }] },
        { preco: 475000, materiais: [{ material: "Metal leve", qualidade: null, quantidade: 150 }, { material: "Material especial", qualidade: null, quantidade: 80 }] }
    ],
    // Fase 5a (plano-acessorios-veiculo.txt): sem tabela no manual —
    // preço a combinar com o narrador (mesmo tratamento dado a
    // Explosivos por pontos de material, pg. 82). Array vazio de
    // propósito: custoUpgradeVeiculoTabela("acessorios", nivelAlvo)
    // devolve null pra qualquer nível (nenhum índice preenchido), e
    // motivoMecanicoVeiculoIndisponivel (ficha.js) já sabe mostrar
    // "custo ainda não cadastrado, fale com o Mestre" e desabilitar o
    // botão "Melhorar" quando custo é null — sem precisar de nenhum
    // código novo. O Mestre pode setar `atributos.acessorios` na mão
    // (mesmo caminho de edição direta que qualquer atributo de veículo
    // já usa) se quiser liberar slots sem passar pelo fluxo de compra.
    acessorios: []
};

// Lookup de conveniência: nivelAlvo vai de 1 a 5 (não existe "upgrade
// pro nível 0"). Devolve null se o atributo não existir na tabela OU
// se a linha daquele nível ainda não tiver sido preenchida (placeholder).
export function custoUpgradeVeiculoTabela(atributoKey, nivelAlvo) {
    const lista = CUSTOS_UPGRADE_VEICULO[atributoKey];
    if (!lista) return null;
    const idx = Number(nivelAlvo) - 1;
    if (idx < 0 || idx > 4) return null;
    return lista[idx] || null;
}

// Perícias que o manual permite usar pra ir ao mecânico (upgrade ou
// reparo) — a critério do narrador, exatamente como Ferramenta de
// Criação geral já permite escolher entre várias perícias na hora de
// usar (ver PERICIAS_FERRAMENTA_CRIACAO acima). Mecânica Automotiva é
// a "óbvia"; Ofícios Utilitários serve de alternativa genérica.
export const PERICIAS_MECANICO_VEICULO = ["Mecânica Automotiva", "Ofícios Utilitários"];

// =====================================================================
// CATÁLOGO DE ACESSÓRIOS DE VEÍCULO (manual pg. 37-38) — Fase 5b do
// plano (ver plano-acessorios-veiculo.txt).
// =====================================================================
//
// Os 9 acessórios NÃO-armados do manual. Os outros 3 (Truck Pistol,
// Metralhadora de Teto, Torreta Tática) SÃO armas de verdade e vivem
// como item de inventário comum (tag "arma") em vez de entrar aqui —
// ver Fase 5c do plano, ainda não implementada.
//
// Cada entrada:
//   key         — id estável (usado em acessoriosInstalados, nunca muda)
//   nome        — texto exibido na UI
//   nivel       — 1 a 5, direto do manual
//   slots       — quantos slots ocupa ao instalar; É SEMPRE igual a
//                 `nivel` (manual: "cada acessório consome slots iguais
//                 ao seu nível") — campo redundante de propósito, só pra
//                 deixar explícito na leitura do código sem precisar
//                 lembrar a regra geral toda vez que este catálogo for
//                 lido.
//   descricao   — efeito direto do manual.
//   mecanica    — como a Fase 5d (UI) decide o que desenhar:
//     "passivo"              — só texto, efeito fica a critério do
//                               narrador na hora que a situação surgir.
//                               Nenhum botão de ação.
//     "teste_dif_fixa"        — tem uma dificuldade fixa própria
//                               (`dificuldade` + `periciaTeste` abaixo)
//                               e ganha um botão "🎲 Testar" que rola
//                               essa perícia da PRÓPRIA ficha contra
//                               essa dificuldade (ver
//                               rolarTesteAcessorioVeiculo, ficha.js).
//                               Óleo e Cospe Prego impõem a dificuldade
//                               a QUEM PERSEGUE, não a quem instalou —
//                               fora de uma Perseguição ativa (Fase 7)
//                               em que dê pra automatizar de quem é a
//                               rolagem, o botão serve de atalho/registro
//                               no Log; o Mestre decide manualmente quem
//                               rola contra essa mesma dificuldade
//                               quando o alvo é outro personagem.
//     "uma_vez_por_cena"      — tem "usos": campo `usadoNestaCena` (bool)
//                               em cima da entrada de acessoriosInstalados
//                               (ver normalizarAcessoriosInstaladosVeiculo,
//                               normalizacao.js), Mestre zera manualmente
//                               ao trocar de cena — mesmo padrão simples
//                               de bonusTemporarios (Fase 4), sem cron job.
//   dificuldade   — só presente quando mecanica === "teste_dif_fixa".
//   periciaTeste  — idem; nome batendo com PERICIAS_MANUAL.
//
// Preço de aquisição: NENHUM dos 9 tem preço em CN$ publicado no manual
// (diferente dos 5 atributos numéricos) — fica a critério do narrador em
// toda instalação, mesmo tratamento "a combinar" já usado no upgrade do
// atributo Acessórios (ver CUSTOS_UPGRADE_VEICULO.acessorios acima).
export const CATALOGO_ACESSORIOS_VEICULO = [
    {
        key: "oleo",
        nome: "Óleo",
        nivel: 1,
        slots: 1,
        descricao: "Espalha óleo na pista atrás do veículo. Quem estiver perseguindo precisa passar em um teste de Dirigir Veículos (dificuldade 14) ou perde o controle momentaneamente.",
        mecanica: "teste_dif_fixa",
        dificuldade: 14,
        periciaTeste: "Dirigir Veículos"
    },
    {
        key: "pneu-para-neve",
        nome: "Pneu para Neve",
        nivel: 1,
        slots: 1,
        descricao: "Pneus especiais que mantêm a aderência em gelo, neve e terrenos escorregadios. Efeito puramente narrativo — o narrador decide quando ele evita uma penalidade que se aplicaria de outra forma.",
        mecanica: "passivo"
    },
    {
        key: "compartimento-secreto",
        nome: "Compartimento Secreto",
        nivel: 1,
        slots: 1,
        descricao: "Um esconderijo disfarçado no veículo, difícil de encontrar numa revista comum. Efeito narrativo — o narrador decide a dificuldade de encontrá-lo caso alguém reviste o carro.",
        mecanica: "passivo"
    },
    {
        key: "para-choque-mad-max",
        nome: "Para-choque Mad Max",
        nivel: 2,
        slots: 2,
        descricao: "Um para-choque reforçado e hostil, ideal pra atropelamentos. Efeito narrativo por enquanto — quando o sistema de Combate com veículo (Fase 8/9) existir, este acessório passa a somar um bônus automático dentro de resolverEfeitoAtropelamento; até lá, o narrador aplica o bônus na mesa.",
        mecanica: "passivo"
    },
    {
        key: "no-network",
        nome: "No Network",
        nivel: 2,
        slots: 2,
        descricao: "Bloqueia sinais de celular e rádio num raio curto ao redor do veículo. Operá-lo exige um teste de Eletrônica (dificuldade 16).",
        mecanica: "teste_dif_fixa",
        dificuldade: 16,
        periciaTeste: "Eletrônica"
    },
    {
        key: "ia-de-bordo",
        nome: "IA de Bordo",
        nivel: 2,
        slots: 2,
        descricao: "Uma inteligência artificial simples embarcada, capaz de auxiliar o piloto ou operar sistemas do veículo (como uma Torreta Tática instalada — ver Fase 5c) de forma limitada. Uso limitado a uma vez por cena.",
        mecanica: "uma_vez_por_cena"
    },
    {
        key: "lanca-fumaca",
        nome: "Lança Fumaça",
        nivel: 3,
        slots: 3,
        descricao: "Libera uma cortina de fumaça atrás do veículo, dificultando a visão e a mira de quem está atrás. Uso limitado a uma vez por cena.",
        mecanica: "uma_vez_por_cena"
    },
    {
        key: "cospe-prego",
        nome: "Cospe Prego",
        nivel: 4,
        slots: 4,
        descricao: "Espalha uma esteira de pregos atrás do veículo. Quem estiver perseguindo precisa passar em um teste de Dirigir Veículos (dificuldade 18) ou fica seriamente prejudicado, podendo até ser deixado pra trás.",
        mecanica: "teste_dif_fixa",
        dificuldade: 18,
        periciaTeste: "Dirigir Veículos"
    },
    {
        key: "dispositivo",
        nome: "Dispositivo",
        nivel: 4,
        slots: 4,
        descricao: "Um espaço reservado e blindado pra transportar um dispositivo especial (explosivo, equipamento de missão, carga sensível) escondido no próprio veículo. Efeito narrativo — cabe ao narrador definir o que está instalado ali e as consequências de cada situação.",
        mecanica: "passivo"
    }
];

export function buscarAcessorioVeiculo(key) {
    return CATALOGO_ACESSORIOS_VEICULO.find(a => a.key === key) || null;
}

// =====================================================================
// MANOBRAS DE VEÍCULO (manual pg. 41) — Fase 4 do plano (ver
// plano-veiculos-fase2.txt, seção "FASE 4").
// =====================================================================
//
// Cada entrada:
//   chave            — id estável (usado em Firebase/log, nunca muda)
//   nome, descricao  — texto direto do manual, exibido na UI
//   requisitos       — { <chave de ATRIBUTOS_VEICULO>: nível mínimo
//                        EFETIVO exigido } — só as exigências
//                        numéricas; ver requisitoExtra abaixo pras que
//                        não são.
//   requisitoExtra   — texto de um requisito que o manual descreve mas
//                       que não dá pra checar automaticamente contra um
//                       número fixo (ex.: Totozinho pede "Velocidade
//                       igual à do perseguidor/perseguido", que depende
//                       de OUTRO veículo em cena) — mostrado na UI como
//                       aviso pro jogador/Mestre conferirem na mesa.
//   dificuldade      — número fixo da dificuldade do teste de Dirigir
//                       Veículos, OU null quando o manual não define um
//                       valor fixo (Cavalo de Pau, Drift, Retorno — a
//                       dificuldade real depende da cena, a critério do
//                       Mestre). Quando null, a UI (ficha.js) pede pra
//                       digitar a dificuldade combinada na mesa antes
//                       de liberar o botão de rolar.
//   turnos           — texto livre descrevendo a duração da manobra.
//   efeitoSucesso/efeitoFalha/efeitoFalhaCritica — texto do efeito
//                       (sempre mostrado no resultado, mesmo quando não
//                       automatizável).
//   efeitoMecanico   — só presente nas manobras cujo efeito é 100%
//                       mecânico (dano numérico ou bônus de atributo) e
//                       por isso a UI aplica sozinha (ver
//                       resolverEfeitoManobra em regras.js). Formato:
//                       { sucesso: { tipo: "bonusTemporario", atributo,
//                       valor }, falha: { tipo: "dano", fracaoDano },
//                       falhaCritica: { tipo: "dano", fracaoDano } } —
//                       qualquer chave ausente (ex.: sem falhaCritica
//                       definida) significa "nenhum efeito automático
//                       nesse resultado", só o texto.
export const MANOBRAS_VEICULO = [
    {
        chave: "grau",
        nome: "Grau",
        descricao: "Passa por cima de carros que estejam de frente para você. Manobra de no mínimo dois turnos. Primeiro teste Dirigir Veículos, dificuldade 15, para levantar a moto — nesse ponto, o piloto fica sensível a quedas e não pode esquivar. Depois de levantar, teste Dirigir Veículos, dificuldade 12, para manter a moto, ou dificuldade 16 para pular por cima de um carro.",
        requisitos: { controle: 2, velocidade: 2, eficiencia: 2 },
        dificuldade: 15,
        turnos: "no mínimo 2 turnos (levantar + manter/pular)",
        efeitoSucesso: "A moto levanta. Testes seguintes (manter: dificuldade 12; pular por cima de um carro: dificuldade 16) são rolagens separadas — role de novo aqui quando chegar a hora.",
        efeitoFalha: "Não levanta a moto — o Mestre decide a consequência narrativa.",
        efeitoFalhaCritica: "Não levanta a moto e sofre uma queda — o Mestre decide a consequência narrativa."
    },
    {
        chave: "corredor",
        nome: "Corredor",
        descricao: "Passar entre fileiras de carros. Manobra de turnos variáveis. Teste Dirigir Veículos, dificuldade 13, para cada turno entre carros.",
        requisitos: { controle: 2, velocidade: 1, eficiencia: 2 },
        dificuldade: 13,
        turnos: "variável — um teste por turno entre os carros",
        efeitoSucesso: "Avança mais um turno entre os carros.",
        efeitoFalha: "Não avança neste turno — o Mestre decide a consequência narrativa.",
        efeitoFalhaCritica: "Bate nos carros ao lado — o Mestre decide a consequência narrativa."
    },
    {
        chave: "arranqueComum",
        nome: "Arranque Comum",
        descricao: "Ao arrancar, reduz em um o número de turnos até a velocidade máxima. Teste Dirigir Veículos, dificuldade 15.",
        requisitos: { eficiencia: 2, velocidade: 2, controle: 1 },
        dificuldade: 15,
        turnos: "1",
        efeitoSucesso: "Reduz em 1 o número de turnos até a velocidade máxima.",
        efeitoFalha: "Arrancada normal — sem redução de turnos.",
        efeitoFalhaCritica: "Arrancada normal — sem redução de turnos; Mestre decide se há alguma consequência extra."
    },
    {
        chave: "arranque",
        nome: "Arranque",
        descricao: "Ao arrancar, reduz em dois o número de turnos até a velocidade máxima. Teste Dirigir Veículos, dificuldade 16.",
        requisitos: { controle: 4, velocidade: 2, eficiencia: 2 },
        dificuldade: 16,
        turnos: "1",
        efeitoSucesso: "Reduz em 2 o número de turnos até a velocidade máxima.",
        efeitoFalha: "Arrancada normal — sem redução de turnos.",
        efeitoFalhaCritica: "Arrancada normal — sem redução de turnos; Mestre decide se há alguma consequência extra."
    },
    {
        chave: "totozinho",
        nome: "Totozinho",
        descricao: "Bater em um veículo próximo para fazê-lo perder o controle. Teste Dirigir Veículos, dificuldade 15. Cada ponto extra na rolagem concede modificador –1 ao motorista vítima (máximo –3).",
        requisitos: { controle: 3, protecao: 2 },
        requisitoExtra: "Velocidade igual à do veículo perseguido/perseguidor (confira manualmente contra o outro veículo em cena).",
        dificuldade: 15,
        turnos: "1",
        efeitoSucesso: "O motorista vítima recebe –1 no próximo teste por cada ponto acima da dificuldade (máximo –3) — aplique manualmente no teste seguinte dele.",
        efeitoFalha: "O veículo vítima não perde o controle.",
        efeitoFalhaCritica: "A manobra falha e pode atingir o próprio veículo — o Mestre decide a consequência."
    },
    {
        chave: "cavaloDePau",
        nome: "Cavalo de Pau",
        descricao: "Fazer curvas fechadas e parar o carro em seguida. Teste Dirigir Veículos. Com sucesso, o carro para imediatamente após a curva e o piloto fica com +1 em Eficiência por uma cena. Com falha, o veículo para antes da curva e recebe 1/10 de dano baseado no seu total de pontos de vida. Com falha crítica, o carro capota e recebe 1/3 de dano.",
        requisitos: { controle: 4, velocidade: 2, eficiencia: 1 },
        dificuldade: null,
        turnos: "1",
        efeitoSucesso: "O carro para imediatamente após a curva. +1 em Eficiência por uma cena.",
        efeitoFalha: "O veículo para antes da curva e recebe 1/10 de dano baseado no seu total de pontos de vida.",
        efeitoFalhaCritica: "O carro capota e recebe 1/3 de dano.",
        efeitoMecanico: {
            sucesso: { tipo: "bonusTemporario", atributo: "eficiencia", valor: 1 },
            falha: { tipo: "dano", fracaoDano: 1 / 10 },
            falhaCritica: { tipo: "dano", fracaoDano: 1 / 3 }
        }
    },
    {
        chave: "drift",
        nome: "Drift",
        descricao: "Fazer curvas fechadas sem desacelerar. Teste Dirigir Veículos. Com sucesso, o veículo aumenta sua velocidade máxima em +1 após fazer a curva. Com falha, o veículo desacelera ao realizar a curva e recebe 1/10 de dano baseado no seu total de pontos de vida. Com falha crítica, o veículo capota e recebe 1/3 de dano.",
        requisitos: { controle: 4, velocidade: 2, eficiencia: 1 },
        dificuldade: null,
        turnos: "1",
        efeitoSucesso: "O veículo aumenta sua velocidade máxima em +1 após fazer a curva (por uma cena).",
        efeitoFalha: "O veículo desacelera ao realizar a curva e recebe 1/10 de dano baseado no seu total de pontos de vida.",
        efeitoFalhaCritica: "O veículo capota e recebe 1/3 de dano.",
        efeitoMecanico: {
            sucesso: { tipo: "bonusTemporario", atributo: "velocidade", valor: 1 },
            falha: { tipo: "dano", fracaoDano: 1 / 10 },
            falhaCritica: { tipo: "dano", fracaoDano: 1 / 3 }
        }
    },
    {
        chave: "retorno",
        nome: "Retorno",
        descricao: "Vira o veículo em 180 graus. A manobra demora três turnos.",
        requisitos: { controle: 3, velocidade: 3, eficiencia: 2 },
        dificuldade: null,
        turnos: "3",
        efeitoSucesso: "O veículo vira 180°.",
        efeitoFalha: "O veículo não completa o giro — o Mestre decide a consequência narrativa.",
        efeitoFalhaCritica: "O veículo perde o controle durante o giro — o Mestre decide a consequência narrativa."
    }
];

export function buscarManobraVeiculo(chave) {
    return MANOBRAS_VEICULO.find(m => m.chave === chave) || null;
}

// =====================================================================
// CORRIDA E PERSEGUIÇÃO (manual pg. 42) — Fase 7 do plano (ver
// plano-veiculos-fase2.txt, seção "FASE 7").
// =====================================================================
//
// Tabelas preenchidas com os valores do manual (pg. 42, seções "Rotas
// de fuga" / "Bairros e voltas necessárias (sem rotas de fuga)" /
// "Dificuldade para Encontrar Rotas de Fuga por Bairro" / "Pontuação
// em testes de fuga").
//
// BAIRROS_PERSEGUICAO: cada entrada é um "cenário" de perseguição —
//   key                  — id estável (Firebase/log, nunca muda)
//   label                — nome exibido na UI
//   voltas               — number | null — quantas voltas a perseguição
//                           dura nesse bairro
//   dificuldadeRotaFuga  — number | null — dificuldade do teste de
//                           Velocidade pra "Tentar rota de fuga" (manual
//                           pg. 42), que abre mão da pontuação da volta
//   penalidadePerseguidor — number — modificador do perseguidor nesse
//                           bairro (manual: periferia/industrial dão
//                           -1 ao perseguidor); 0 quando o bairro não
//                           dá penalidade nenhuma.
export const BAIRROS_PERSEGUICAO = [
    { key: "periferia", label: "Periferia", voltas: 8, dificuldadeRotaFuga: 12, penalidadePerseguidor: -1 },
    { key: "industrial", label: "Industrial", voltas: 7, dificuldadeRotaFuga: 13, penalidadePerseguidor: -1 },
    { key: "comercial", label: "Comercial", voltas: 5, dificuldadeRotaFuga: 14, penalidadePerseguidor: 0 },
    { key: "classeMedia", label: "Classe Média", voltas: 4, dificuldadeRotaFuga: 14, penalidadePerseguidor: 0 },
    { key: "rico", label: "Rico", voltas: 3, dificuldadeRotaFuga: 16, penalidadePerseguidor: 0 }
];

export function bairroPerseguicao(key) {
    return BAIRROS_PERSEGUICAO.find(b => b.key === key) || null;
}

// Helper de conveniência pra UI (ficha.js), mesmo padrão de
// tabelaPontuacaoFugaCadastrada abaixo: true assim que o bairro tiver
// uma dificuldadeRotaFuga cadastrada (não-null). Enquanto for null, o
// botão "Tentar Rota de Fuga" da perseguição (Fase 7c) fica desabilitado
// com aviso "dados ainda não cadastrados" — sem dificuldade inventada.
export function bairroTemDificuldadeRotaFuga(bairroKeyOuBairro) {
    const bairro = typeof bairroKeyOuBairro === "string" ? bairroPerseguicao(bairroKeyOuBairro) : bairroKeyOuBairro;
    return !!bairro && bairro.dificuldadeRotaFuga !== null && bairro.dificuldadeRotaFuga !== undefined;
}

export function listarBairrosPerseguicao() {
    return BAIRROS_PERSEGUICAO;
}

// TABELA_PONTUACAO_FUGA: mesma tabela dos rachas citada pelo manual
// como igual à de perseguição — resultado do teste de Dirigir Veículos
// (contra a dificuldade combinada na mesa) → pontos ganhos na volta,
// incluindo "+1 ponto extra por +2 acima de 20" (aplicado à parte, ver
// pontosPorResultadoTesteFuga em regras.js, que soma esse extra por
// cima do valor de faixa encontrado aqui). Formato: array de faixas
// { min, max, pontos }, checadas em ordem — `max: null` = sem teto.
// Faixas do manual pg. 42 (a de resultado 1 é a falha crítica).
export const TABELA_PONTUACAO_FUGA = [
    { min: 1, max: 1, pontos: -3 },
    { min: 2, max: 2, pontos: -2 },
    { min: 3, max: 3, pontos: -1 },
    { min: 4, max: 11, pontos: 0 },
    { min: 12, max: 13, pontos: 1 },
    { min: 14, max: 16, pontos: 2 },
    { min: 17, max: 18, pontos: 3 },
    { min: 19, max: 19, pontos: 4 },
    { min: 20, max: null, pontos: 5 }
];

// Helper de conveniência pra UI (ficha.js): true assim que alguém
// preencher pelo menos uma faixa da tabela acima. Enquanto vazia, os
// botões de "Testar Dirigir Veículos" da perseguição (Fase 7b) ficam
// desabilitados com aviso "dados ainda não cadastrados" — mesmo padrão
// já usado pro upgrade de veículo.
export function tabelaPontuacaoFugaCadastrada() {
    return TABELA_PONTUACAO_FUGA.length > 0;
}

// =====================================================================
// PRODUTOS QUÍMICOS — automação de receita/efeito (ver
// plano-automacao-materiais-quimicos-v3.md, Partes 2/3/4). Só dados e
// funções puras aqui — zero UI, zero leitura de DOM. A "fiação" com
// mestre.js/ficha.js (motor de status por turno, modal de criação,
// pontos de disparo) é passo separado do plano (Partes 5/6/8).
// =====================================================================

// ---------------------------------------------------------------------
// PARTE 2 — Fórmula de dificuldade de criação (manual: "dificuldade =
// 10 + 2×(maior pontuação entre os materiais da receita); para cada
// ponto ímpar de material além do de maior número, +1 na dificuldade").
//
// Leitura confirmada com o Mestre (a única ambiguidade do plano): a
// regra é POR MATERIAL secundário, flat — se a pontuação daquele
// material for ímpar, soma-se +1 uma única vez, não importa se ela é 1,
// 3 ou 5. Não é "+1 por cada ponto ímpar individual" dentro do mesmo
// material. Exemplo do manual confirmado: 3 de Explosivo + 1 de
// Oxidante → 10 + 2×3 + 1 = 17.
// ---------------------------------------------------------------------
export function calcularDificuldadeQuimico(pontosPorMaterial) {
    // pontosPorMaterial: { "Sedativo": 3, "Oxidante": 1, ... } — só
    // materiais com pontos > 0 (nomes sem o prefixo "Material Químico: ",
    // ver nomeMaterialQuimicoBase abaixo se vier da MATERIAIS_CRIACAO).
    const entradas = Object.entries(pontosPorMaterial || {}).filter(([, p]) => (Number(p) || 0) > 0);
    if (!entradas.length) return null;
    const maior = Math.max(...entradas.map(([, p]) => Number(p)));
    const jaContadoMaior = entradas.findIndex(([, p]) => Number(p) === maior);
    let dif = 10 + 2 * maior;
    entradas.forEach(([, p], i) => {
        if (i === jaContadoMaior) return; // só o PRIMEIRO material no valor máximo é "o maior"
        if (Number(p) % 2 !== 0) dif += 1; // ponto ímpar do material secundário — flat, não por ponto
    });
    return dif;
}

// Materiais Químicos em MATERIAIS_CRIACAO vêm com o prefixo
// "Material Químico: " (ex.: "Material Químico: Sedativo"). As chaves de
// EFEITOS_MATERIAL_QUIMICO abaixo usam o nome curto ("Sedativo"), igual
// o exemplo do manual e a Parte 2. Esta função normaliza os dois
// formatos pra quem chamar resolverNivelMaterial/calcularDificuldadeQuimico
// puder usar qualquer um dos dois.
export function nomeMaterialQuimicoBase(nomeMaterial) {
    if (!nomeMaterial) return nomeMaterial;
    const prefixo = "Material Químico: ";
    return nomeMaterial.startsWith(prefixo) ? nomeMaterial.slice(prefixo.length) : nomeMaterial;
}

// ---------------------------------------------------------------------
// Helpers genéricos de escalonamento — usados pelas tabelas abaixo pra
// não repetir a mesma lógica de "percorre a mecânica gerada e ajusta
// todo campo numérico chamado X" em cada material. Operam sobre uma
// CÓPIA da mecânica (ver clonarMecanica), nunca sobre a tabela original.
// ---------------------------------------------------------------------
function clonarMecanica(mecanica) {
    if (!mecanica) return mecanica;
    if (typeof structuredClone === "function") return structuredClone(mecanica);
    return JSON.parse(JSON.stringify(mecanica));
}

// Arredondamento dos multiplicadores de "Eficiência aumentada" (ex.:
// dano ×4/3, ×1.5) — Math.round, mesmo padrão usado em regras.js pra
// ajustes percentuais de valor (ver calcularPrecoComFator/análogos).
function arredondarValorQuimico(valor) {
    return Math.round(valor);
}

function ajustarCampoRecursivo(obj, chave, delta) {
    if (!obj || typeof obj !== "object") return;
    Object.entries(obj).forEach(([k, v]) => {
        if (k === chave && typeof v === "number") {
            obj[k] = v + delta;
        } else if (v && typeof v === "object") {
            ajustarCampoRecursivo(v, chave, delta);
        }
    });
}

function multiplicarCampoRecursivo(obj, chave, fator) {
    if (!obj || typeof obj !== "object") return;
    Object.entries(obj).forEach(([k, v]) => {
        if (k === chave && typeof v === "number") {
            obj[k] = arredondarValorQuimico(v * fator);
        } else if (v && typeof v === "object") {
            multiplicarCampoRecursivo(v, chave, fator);
        }
    });
}

// ---------------------------------------------------------------------
// PARTE 3 — Tabela completa de efeitos por material/nível (Manual 1.4).
// Cada `mecanica` é o descritor que os pontos de disparo (Parte 6, ainda
// não fiada) vão ler pra chamar as funções que já existem em mestre.js
// (aplicarStatusPorTurno e afins). Aqui só descrevemos os dados — nada
// chama mestre.js.
//
// Estrutura de cada entrada em EFEITOS_MATERIAL_QUIMICO:
//   niveis: { 1..5: { texto, mecanica } } — mecanica pode ser `null`
//     quando o efeito não é automatizável (ex.: Corrosivo).
//   automatizavel: false quando NENHUM nível é automatizável — sinaliza
//     pra UI futura (Parte 4) que o campo fica só informativo.
//   escalonamentoPorPontoExtra(mecanicaClonada, extra): aplica a regra
//     de "6+" sobre pontos além de 5, quando o manual dá uma regra
//     numérica clara. Omitido quando o manual não define "6+" (ex.:
//     Sedativo) ou quando é só narrativo.
//   eficienciaAumentada: { descricao, tipo: "automatico"|"escolha"|
//     "narrativo", aplicar(mecanicaClonada, escolha) } — aplicar() é
//     omitido quando o bônus é puramente narrativo (Corrosivo) ou
//     manual demais pra automatizar com segurança (Catalizador).
// ---------------------------------------------------------------------
export const EFEITOS_MATERIAL_QUIMICO = {
    // 3.1 — Sedativo
    "Sedativo": {
        niveis: {
            1: {
                texto: "-2 em todos os testes enquanto exposto",
                mecanica: { penalidadeTemporizada: { alvos: ["testes_fisicos", "testes_mentais", "testes_sociais"], valor: -2, turnos: "duracaoGeral" } }
            },
            2: {
                texto: "Após 3 turnos expostos, teste de Resistência Imunológica dif 14; falha → desmaia por 4 turnos",
                mecanica: { testeAtrasado: { turnos: 3, pericia: "Resistência Imunológica", dificuldade: 14, seFalhar: { desmaioTemporizado: { turnos: 4 } } } }
            },
            3: {
                texto: "-4 em todos os testes; teste pra desmaiar após 2 turnos, dif 16",
                mecanica: {
                    penalidadeTemporizada: { alvos: ["testes_fisicos", "testes_mentais", "testes_sociais"], valor: -4, turnos: "duracaoGeral" },
                    testeAtrasado: { turnos: 2, pericia: "Resistência Imunológica", dificuldade: 16, seFalhar: { desmaioIndefinido: true } }
                }
            },
            4: {
                texto: "Teste imediato dif 16; falha → adormece 6 turnos OU cena inteira + confusão -2 até fim de cena",
                mecanica: {
                    testeImediato: {
                        pericia: "Resistência Imunológica", dificuldade: 16,
                        seFalhar: {
                            desmaioTemporizado: { turnos: 6 },
                            depoisFlag: { alvos: ["testes_mentais", "testes_fisicos", "testes_sociais"], valor: -2, ateFimDeCena: true }
                        }
                    }
                }
            },
            5: {
                texto: "Teste imediato dif 18; falha → inconsciente até tratamento médico especializado",
                mecanica: { testeImediato: { pericia: "Resistência Imunológica", dificuldade: 18, seFalhar: { desmaioIndefinido: true } } }
            }
        },
        // Manual não define "6+" pra Sedativo — pontos extra não mudam a
        // mecânica (fica no nível 5).
        eficienciaAumentada: {
            descricao: "+2 na dif dos testes OU reduz os turnos necessários pro efeito — escolha do criador ao gerar",
            tipo: "escolha",
            // ⚠️ O manual não dá o número de turnos a reduzir — assumido
            // -1 turno (mínimo 1) até confirmação. Fácil de ajustar aqui.
            aplicar(mecanica, escolha) {
                if (escolha === "turnos") {
                    ajustarCampoRecursivo(mecanica, "turnos", -1);
                } else {
                    ajustarCampoRecursivo(mecanica, "dificuldade", 2);
                }
            }
        }
    },

    // 3.2 — Tóxico
    "Tóxico": {
        niveis: {
            1: { texto: "20 de dano no momento da exposição", mecanica: { danoImediato: { valor: 20 } } },
            2: { texto: "40 de dano no momento da exposição", mecanica: { danoImediato: { valor: 40 } } },
            3: { texto: "40 imediato + 10/turno por 3 turnos", mecanica: { danoImediato: { valor: 40 }, danoContinuo: { valor: 10, turnos: 3 } } },
            4: { texto: "80 imediato + 10/turno por 5 turnos", mecanica: { danoImediato: { valor: 80 }, danoContinuo: { valor: 10, turnos: 5 } } },
            5: { texto: "120 imediato + 15/turno por 5 turnos", mecanica: { danoImediato: { valor: 120 }, danoContinuo: { valor: 15, turnos: 5 } } }
        },
        escalonamentoPorPontoExtra(mecanica, extra) {
            // "+10 de dano residual por turno, por ponto extra" — soma ao danoContinuo.
            if (!mecanica.danoContinuo) mecanica.danoContinuo = { valor: 0, turnos: 5 };
            mecanica.danoContinuo.valor += 10 * extra;
        },
        eficienciaAumentada: {
            descricao: "dano extra de 1/3 (multiplica os valores por 4/3)",
            tipo: "automatico",
            aplicar(mecanica) {
                multiplicarCampoRecursivo(mecanica, "valor", 4 / 3);
            }
        }
    },

    // 3.3 — Inflamável
    "Inflamável": {
        niveis: {
            1: { texto: "10 de dano elemental de fogo quando exposto, dura 2 turnos", mecanica: { danoContinuo: { valor: 10, turnos: 2, tipoDanoKey: "fogo" } } },
            2: { texto: "25 de dano, dura 4 turnos", mecanica: { danoContinuo: { valor: 25, turnos: 4, tipoDanoKey: "fogo" } } },
            3: { texto: "40 de dano, dura 6 turnos", mecanica: { danoContinuo: { valor: 40, turnos: 6, tipoDanoKey: "fogo" } } },
            4: { texto: "50 de dano, dura 8 turnos", mecanica: { danoContinuo: { valor: 50, turnos: 8, tipoDanoKey: "fogo" } } },
            5: { texto: "60 de dano, dura uma cena", mecanica: { danoContinuo: { valor: 60, semTimer: true, tipoDanoKey: "fogo" } } }
        },
        escalonamentoPorPontoExtra(mecanica, extra) {
            // "+15 de dano elemental de fogo, por ponto extra"
            mecanica.danoContinuo.valor += 15 * extra;
        },
        eficienciaAumentada: {
            descricao: "dano extra OU duração extra em 1/3 — escolha do criador",
            tipo: "escolha",
            aplicar(mecanica, escolha) {
                if (escolha === "turnos" && !mecanica.danoContinuo.semTimer) {
                    mecanica.danoContinuo.turnos = arredondarValorQuimico(mecanica.danoContinuo.turnos * 4 / 3);
                } else {
                    mecanica.danoContinuo.valor = arredondarValorQuimico(mecanica.danoContinuo.valor * 4 / 3);
                }
            }
        }
    },

    // 3.4 — Explosivo. Já coberto pelo sistema de Explosivos existente
    // (fluxo de área, fora do motor de status por turno) — a "mecanica"
    // aqui é só a tabela de referência (dano/raio/detonação), não um
    // descritor pro motor de mestre.js. Fiação com o sistema de
    // explosivos existente é passo à parte (fora do escopo da Parte 3).
    "Explosivo": {
        niveis: {
            1: { texto: "30 de dano, raio 1m, detona após 2 turnos", mecanica: { explosivo: { dano: 30, raio: 1, detonaApos: 2 } } },
            2: { texto: "50 de dano, raio 1,5m, detona após 2 turnos", mecanica: { explosivo: { dano: 50, raio: 1.5, detonaApos: 2 } } },
            3: { texto: "80 de dano, raio 2m, detona após 2 turnos", mecanica: { explosivo: { dano: 80, raio: 2, detonaApos: 2 } } },
            4: { texto: "120 de dano, raio 2,5m, detona após 2 turnos", mecanica: { explosivo: { dano: 120, raio: 2.5, detonaApos: 2 } } },
            5: { texto: "160 de dano, raio 3m, detona após 2 turnos", mecanica: { explosivo: { dano: 160, raio: 3, detonaApos: 2 } } }
        },
        escalonamentoPorPontoExtra(mecanica, extra) {
            // "+20 dano/ponto" — automatizável. Raio "aumenta
            // substancialmente (sem número fixo)" — não automatizável,
            // deixado pro Mestre ajustar na mão.
            mecanica.explosivo.dano += 20 * extra;
        },
        eficienciaAumentada: {
            descricao: "dano extra de 1/3",
            tipo: "automatico",
            aplicar(mecanica) {
                mecanica.explosivo.dano = arredondarValorQuimico(mecanica.explosivo.dano * 4 / 3);
            }
        }
    },

    // 3.5 — Oxidante. Sem efeito próprio em alvo — é regra de VALIDAÇÃO
    // de receita (razão Explosivo/Inflamável : Oxidante), não status de
    // combate. Sem "niveis" de 1-5 porque o manual não define um.
    "Oxidante": {
        semEfeitoProprio: true,
        texto: "Sem efeito em alvo — a cada 3 pontos de Explosivo ou Inflamável na receita, é necessário 1 ponto de Oxidante.",
        validacaoReceita: {
            razaoPorPontosExplosivoOuInflamavel: 3,
            // Eficiência aumentada: razão cai de 3:1 para 2:1.
            razaoAltaQualidade: 2
        }
    },

    // 3.6 — Corrosivo. Afeta objetos/ambiente, não pessoas — "sem
    // automação possível" (confirmado pelo próprio plano). Fica só como
    // referência textual pro Mestre narrar; mecanica sempre null.
    "Corrosivo": {
        automatizavel: false,
        niveis: {
            1: { texto: "Corrói (em 3 turnos): fechaduras simples, fios elétricos, superfícies frágeis", mecanica: null },
            2: { texto: "Corrói (em 3 turnos): madeira, plástico duro, painéis metálicos finos", mecanica: null },
            3: { texto: "Corrói (em 3 turnos): aço industrial, trancas reforçadas, cofres pequenos", mecanica: null },
            4: { texto: "Corrói (em 3 turnos): paredes de concreto, cofres grandes, estruturas metálicas", mecanica: null },
            5: { texto: "Corrói (em 3 turnos): suportes de estrutura, blindagens pesadas, pisos/tetos", mecanica: null }
        },
        // "+ área maior + ignora camadas extras de proteção" — narrativo,
        // sem regra numérica fixa; sem escalonamentoPorPontoExtra.
        eficienciaAumentada: {
            descricao: "corrói o material do próximo nível de pontos, com +2 turnos adicionais de prazo no próximo nível",
            tipo: "narrativo"
        }
    },

    // 3.7 — Catalizador. Não tem efeito próprio no alvo — modifica OUTRO
    // material da mesma receita. Só os níveis 4 e 5 têm regra numérica
    // clara o bastante pra automatizar (ver plano, Parte 3.7); os demais
    // ficam manuais. Aplicar isso de fato exige combinar duas entradas
    // da receita (é trabalho da Parte 6 — integração, ainda não fiada).
    "Catalizador": {
        niveis: {
            1: { texto: "Reduz o tempo de ativação da substância mais presente da receita", mecanica: null, automatizavel: false },
            2: { texto: "+1 turno na duração da substância mais presente da receita", mecanica: null, automatizavel: false },
            3: { texto: "Estabiliza a mistura (sem falhas/vazamentos); só é perigoso criar se o teste de criação resultar em 1", mecanica: null, automatizavel: false },
            4: {
                texto: "+50% de eficácia da substância principal da receita",
                mecanica: { modificaOutroMaterial: { alvo: "material_principal", fator: 1.5 } }
            },
            5: {
                texto: "Substância principal ignora resistências/dificuldades de defesa",
                mecanica: { modificaOutroMaterial: { alvo: "material_principal", ignoraResistencia: true } }
            }
        },
        // "6+: escolhe uma substância adicional pra também receber os
        // efeitos" — escolha do criador, manual.
        eficienciaAumentada: {
            descricao: "todos os efeitos do catalisador se aplicam a duas substâncias simultaneamente desde o primeiro ponto",
            tipo: "narrativo"
        }
    },

    // 3.8 — Psicotrópico
    "Psicotrópico": {
        niveis: {
            1: {
                texto: "Confusão mental: -2 em atributos mentais por 2 turnos quando exposto",
                mecanica: { penalidadeTemporizada: { alvos: ["testes_mentais"], valor: -2, turnos: 2 } }
            },
            2: {
                texto: "Alucinações leves: teste de Resistência Mental dif 13; falha → perde 1 ação por turno durante 2 turnos",
                // Precisa do tipo novo "perde_acao_temporizado" no motor (Parte 5.1, ainda não implementada).
                mecanica: { testeImediato: { pericia: "Resistência Mental", dificuldade: 13, seFalhar: { perdeAcaoTemporizado: { turnos: 2 } } } }
            },
            3: {
                texto: "Alucinações intensas: teste de Resistência Imunológica dif 14; falha → -1 em rolagens mentais",
                mecanica: { testeImediato: { pericia: "Resistência Imunológica", dificuldade: 14, seFalhar: { penalidadeTemporizada: { alvos: ["testes_mentais"], valor: -1, turnos: "duracaoGeral" } } } }
            },
            4: {
                texto: "Alvo vê estímulos falsos como reais; teste de Resistência Mental dif 16; falha → -4 em rolagens mentais e -4 na dif pra ser acertado",
                mecanica: {
                    testeImediato: {
                        pericia: "Resistência Mental", dificuldade: 16,
                        seFalhar: {
                            penalidadeTemporizada: { alvos: ["testes_mentais"], valor: -4, turnos: "duracaoGeral" },
                            // "-4 na dif pra ser acertado" mexe em defesa, não em teste — flag narrativa manual.
                            flagNarrativa: "vulnerável a manipulação/ataques mentais (-4 na dif pra ser acertado)"
                        }
                    }
                }
            },
            5: {
                texto: "Psicose: teste de Resistência Mental dif 18; falha → perde controle completo das ações e capacidade mental",
                mecanica: { testeImediato: { pericia: "Resistência Mental", dificuldade: 18, seFalhar: { flagNarrativa: "perde controle das próprias ações — Mestre assume temporariamente" } } }
            }
        },
        escalonamentoPorPontoExtra(mecanica, extra) {
            // "Duração +1 turno, dif de resistência +2" por ponto extra.
            // Falhas críticas causando trauma/insanidade: narrativo, sem regra numérica.
            ajustarCampoRecursivo(mecanica, "turnos", 1 * extra);
            ajustarCampoRecursivo(mecanica, "dificuldade", 2 * extra);
        },
        eficienciaAumentada: {
            descricao: "+2 na dif dos testes",
            tipo: "automatico",
            aplicar(mecanica) {
                ajustarCampoRecursivo(mecanica, "dificuldade", 2);
            }
        }
    },

    // 3.9 — Bioquímico. Escolha de efeitos dentre uma lista (não
    // automatiza a escolha em si — só a lista de opções válidas
    // aparecer pronta). O que É automático e incondicional é o efeito
    // colateral, adicionado em resolverNivelMaterial (não aqui, porque
    // depende do total de pontos, não só do nível/tier).
    "Bioquímico": {
        niveis: {
            1: {
                texto: "Escolhe 1 efeito, dura 2 turnos",
                mecanica: {
                    curaEscolha: {
                        quantidadeEscolhas: 1, duracaoTurnos: 2,
                        opcoes: ["+1 atributo físico", "Restaura 5 PV", "-1 penalidade Machucado e Muito Machucado", "-10 no próximo dano recebido"]
                    }
                }
            },
            2: {
                texto: "Escolhe 2 efeitos, dura 3 turnos",
                mecanica: {
                    curaEscolha: {
                        quantidadeEscolhas: 2, duracaoTurnos: 3,
                        opcoes: ["+1 atributo físico", "Restaura 7 PV", "-1 penalidade Machucado e Muito Machucado", "-10 no próximo dano recebido"]
                    }
                }
            },
            3: {
                texto: "Escolhe 3 efeitos, dura 3 turnos",
                mecanica: {
                    curaEscolha: {
                        quantidadeEscolhas: 3, duracaoTurnos: 3,
                        opcoes: [
                            "+2 atributo físico", "Restaura 7 PV", "-50% penalidade Machucado/Muito Machucado", "-15 no próximo dano recebido",
                            "Ignore sangramento", "Ignore penalidade de velocidade por Machucado/Muito Machucado",
                            "Ignore modificadores negativos de manipulação mental", "Ignore penalidade de cansaço"
                        ]
                    }
                }
            },
            4: {
                texto: "Escolhe 3 efeitos, dura 4 turnos",
                mecanica: {
                    curaEscolha: {
                        quantidadeEscolhas: 3, duracaoTurnos: 4,
                        opcoes: [
                            "+2 atributo físico", "Restaura 7 PV", "-50% penalidade Machucado/Muito Machucado", "-15 no próximo dano recebido",
                            "Ignore sangramento", "Ignore penalidade de velocidade por Machucado/Muito Machucado",
                            "Ignore modificadores negativos de manipulação mental", "Ignore penalidade de cansaço"
                        ]
                    }
                }
            },
            5: {
                texto: "Escolhe 3 efeitos, dura uma cena",
                mecanica: {
                    curaEscolha: {
                        quantidadeEscolhas: 3, duracaoCena: true,
                        opcoes: [
                            "+2 atributo físico", "Restaura 7 PV", "-50% penalidade Machucado/Muito Machucado", "-20 no próximo dano recebido",
                            "Ignore sangramento", "Ignore penalidade de velocidade por Machucado/Muito Machucado",
                            "Ignore modificadores negativos de manipulação mental", "Ignore penalidade de cansaço",
                            "Ignore um golpe letal, mantendo 1 PV"
                        ]
                    }
                }
            }
        },
        // "6+: +1 efeito de nível 2 em paralelo" — muda a estrutura da
        // escolha, não um número simples; deixado manual.
        eficienciaAumentada: {
            descricao: "efeitos escolhidos duram +1 turno; efeitos de cura +3 PV",
            tipo: "automatico",
            aplicar(mecanica) {
                // Só a parte de duração é automatizável com segurança
                // aqui (campo estruturado). O "+3 PV" mexe no texto das
                // opções de cura (não estruturado) — fica manual/visual
                // pro Mestre, mesmo padrão do resto da Parte 3.9.
                ajustarCampoRecursivo(mecanica, "duracaoTurnos", 1);
            }
        }
    }
};

// ---------------------------------------------------------------------
// PARTE 4 — resolverNivelMaterial: pontos investidos num material →
// descritor de efeito pronto pra guardar em it.quimico.efeitos (ainda
// não fiado na criação de item — isso é Parte 4 da UI, passo separado).
// ---------------------------------------------------------------------
export function resolverNivelMaterial(nomeMaterialQualquerFormato, pontos, qualidadeAlta = false, escolhaEficiencia = null) {
    const pontosNum = Number(pontos) || 0;
    if (pontosNum <= 0) return null;

    const nomeMaterial = nomeMaterialQuimicoBase(nomeMaterialQualquerFormato);
    const tabela = EFEITOS_MATERIAL_QUIMICO[nomeMaterial];
    if (!tabela) return null;

    // Oxidante: sem tiers de 1-5, é só validação de receita.
    if (tabela.semEfeitoProprio) {
        return {
            material: nomeMaterial, pontos: pontosNum, semEfeitoProprio: true,
            texto: tabela.texto, mecanica: null, validacaoReceita: tabela.validacaoReceita
        };
    }

    const nivelBase = Math.min(pontosNum, 5);
    const tier = tabela.niveis[nivelBase];
    if (!tier) return null;

    const extra = Math.max(0, pontosNum - 5);
    let mecanica = clonarMecanica(tier.mecanica);

    if (mecanica && extra > 0 && typeof tabela.escalonamentoPorPontoExtra === "function") {
        tabela.escalonamentoPorPontoExtra(mecanica, extra);
    }
    if (mecanica && qualidadeAlta && tabela.eficienciaAumentada && typeof tabela.eficienciaAumentada.aplicar === "function") {
        tabela.eficienciaAumentada.aplicar(mecanica, escolhaEficiencia);
    }

    // Efeito colateral do Bioquímico é incondicional e escala com o
    // total de pontos investidos (10 × pontos), não só com o tier —
    // por isso é adicionado aqui, fora da tabela estática.
    if (nomeMaterial === "Bioquímico" && mecanica) {
        mecanica.efeitoColateral = { danoImediato: { valor: 10 * pontosNum } };
    }

    return {
        material: nomeMaterial,
        pontos: pontosNum,
        nivelBase,
        pontosExtra: extra,
        qualidadeAlta: !!qualidadeAlta,
        // Guardada só pra reconstruir a UI do modal ao editar um item já
        // salvo (Parte 4) — a mecânica em si já foi resolvida acima.
        escolhaEficiencia: qualidadeAlta ? (escolhaEficiencia || null) : null,
        automatizavel: tabela.automatizavel !== false && !!mecanica,
        texto: tier.texto,
        mecanica
    };
}

// =====================================================================
// PARTE 9 — Veículo de transporte (automação da mecânica de entrega —
// ver conversa "automação materiais químicos", continuação da v3).
// "Veículo de transporte" NÃO é um material de efeito (não entra em
// EFEITOS_MATERIAL_QUIMICO/resolverNivelMaterial — não tem `mecanica`
// de status pra disparar); ele é lido separadamente na receita pra
// decidir COMO o produto químico é entregue. Confirmado com o Mestre:
//   - conta normalmente na fórmula de dificuldade de criação (Parte 2)
//     junto com os outros materiais — calcularDificuldadeQuimico já
//     aceita isso de graça, não precisa de nenhuma mudança lá, desde
//     que o chamador inclua "Veículo de transporte" no mesmo objeto
//     pontosPorMaterial que os materiais de efeito.
//   - 0 pontos  → Seringa: uso direto (arma branca exótica) num alvo em
//     combate; fora de combate, em qualquer pessoa, inclusive em si
//     mesmo, sem teste.
//   - 1 ponto   → Spray: mesmo uso que a Seringa, só que -3 na
//     dificuldade de DEFESA do alvo (mais fácil de acertar), porque o
//     ataque de arma branca é teste oposto (não dificuldade fixa) — ver
//     resolverAtaque em ficha.js.
//   - 2+ pontos → Área: libera no cenário, mesmo fluxo que Explosivo
//     (ações pendentes "estava na área?" — já implementado em
//     liberarQuimicoCenario/mestre.js, sem mudança nenhuma aqui).
// A tag do item (arma+carga química vs. produto_quimico) continua
// escolhida à mão pelo criador — isto aqui só informa uma SUGESTÃO na
// UI (ficha.js), nunca trava a escolha.
// ---------------------------------------------------------------------
export const NOME_MATERIAL_VEICULO_TRANSPORTE = "Veículo de transporte";

export const NIVEIS_ENTREGA_QUIMICO = [
    {
        tipo: "seringa", label: "Seringa", pontosMin: 0, pontosMax: 0,
        modificadorDificuldadeDefesa: 0,
        descricao: "Uso direto num alvo (Armas Brancas Exóticas) em combate; fora de combate, em qualquer pessoa, inclusive em si mesmo, sem teste."
    },
    {
        tipo: "spray", label: "Spray", pontosMin: 1, pontosMax: 1,
        modificadorDificuldadeDefesa: -3,
        descricao: "Mesmo uso da Seringa (Armas Brancas Exóticas), mas -3 na dificuldade de defesa do alvo."
    },
    {
        tipo: "area", label: "Área", pontosMin: 2, pontosMax: Infinity,
        modificadorDificuldadeDefesa: 0,
        descricao: "Libera no cenário — o Mestre decide quem estava na área de efeito (mesmo fluxo de Explosivos)."
    }
];

// pontosVeiculoTransporte: número de pontos investidos no material
// "Veículo de transporte" da receita (0 se a receita não usa esse
// material). Sempre retorna uma entrada (0 pontos cai em "seringa").
export function resolverTipoEntregaQuimico(pontosVeiculoTransporte) {
    const pontos = Number(pontosVeiculoTransporte) || 0;
    return NIVEIS_ENTREGA_QUIMICO.find(n => pontos >= n.pontosMin && pontos <= n.pontosMax)
        || NIVEIS_ENTREGA_QUIMICO[NIVEIS_ENTREGA_QUIMICO.length - 1];
}

// =====================================================================
// EFEITOS DE EQUIPAMENTO MÉDICO (ver plano-efeitos-equipamentos-
// medicos.txt, Fase 1) — catálogo genérico de "o que um item da tag
// equipamento_medico pode fazer quando usado/escolhido num tratamento",
// pra não precisar programar cada item do manual (Atadura, Kit
// Cirúrgico, Soro Reconstituinte...) na unha. Ao cadastrar um item
// dessa tag, a pessoa escolhe 1+ entradas deste catálogo e preenche os
// `campos` de cada uma — mesmo espírito de `item.quimico.efeitos`
// (produtos químicos) e `item.modificadores` (bônus genérico), só que
// sem a parte de "receita"/materiais que só existe pra química.
//
// Cada tipo carrega:
//   key         — chave interna, gravada em item.efeitosMedicos[].tipo
//   label       — nome mostrado no seletor de cadastro
//   descricao   — explicação curta (tooltip/hint no formulário)
//   aplicavelEm — onde esse efeito é consultado: "tratamento" (modal de
//                 Tratar Ferida), "infeccao" (modal de Testar Infecção),
//                 "uso_direto" (botão "Usar" no card do item) ou
//                 "recuperacao" (cálculo de tempo de recuperação de PV)
//   campos      — schema dos parâmetros que o formulário de cadastro
//                 precisa desenhar pra essa entrada; cada campo tem
//                 {chave, tipo, label}. `tipo` aqui é só pro FORM (não
//                 confundir com o `tipo` do efeito em si):
//                   "multiselect_tratamento" — lista de checkboxes das
//                     chaves de TRATAMENTOS_FERIDA_MEDICO abaixo
//                   "multiselect_tipo_ferida" — idem, TIPOS_FERIDA_MEDICO
//                   "numero" — input numérico livre
// =====================================================================

// Cópia local das chaves de TRATAMENTOS_FERIDA (regras.js) — só pra
// alimentar o formulário de cadastro (multi-select) sem criar import
// circular (regras.js já importa DESTE arquivo, não pode ser o
// contrário). Se um tratamento novo for adicionado/renomeado em
// TRATAMENTOS_FERIDA, atualizar aqui também.
export const TRATAMENTOS_FERIDA_MEDICO = [
    { key: "estancar_sangramento", label: "Estancar Sangramento (Estabilização)" },
    { key: "remover_projetil", label: "Remover Projétil" },
    { key: "suturar_ferimento", label: "Suturar Ferimento (Fechar)" },
    { key: "tratar_fratura", label: "Tratar Fratura" },
    { key: "tratar_queimadura", label: "Tratar Queimadura" },
    { key: "cirurgia_de_campo", label: "Cirurgia de Campo (Emergência)" }
];

// Cópia local das chaves de TIPOS_FERIDA (regras.js) — mesmo motivo
// acima (evitar import circular).
export const TIPOS_FERIDA_MEDICO = [
    { key: "sangramento", label: "Sangramento" },
    { key: "corte", label: "Corte" },
    { key: "projetil", label: "Projétil alojado" },
    { key: "fratura", label: "Fratura" },
    { key: "queimadura", label: "Queimadura" }
];

export const CATALOGO_EFEITOS_MEDICOS = [
    {
        key: "bonus_teste_tratamento",
        label: "Bônus/penalidade num teste de tratamento",
        descricao: "Soma (ou subtrai, se negativo) um valor fixo no teste de tratamento escolhido. Ex.: Atadura +1 em Estancar Sangramento, Kit de Costura -2 em Suturar Ferimento.",
        aplicavelEm: "tratamento",
        campos: [
            { chave: "tratamentos", tipo: "multiselect_tratamento", label: "Em quais tratamentos" },
            { chave: "valor", tipo: "numero", label: "Valor do bônus (negativo para penalidade)" }
        ]
    },
    {
        key: "isenta_penalidade_item",
        label: "Isenta a penalidade de \"sem item adequado\"",
        descricao: "Conta como item adequado (penalidade 0) nos tratamentos escolhidos, sem precisar marcar isso à mão. Ex.: Kit de Primeiros Socorros, Kit Cirúrgico.",
        aplicavelEm: "tratamento",
        campos: [
            { chave: "tratamentos", tipo: "multiselect_tratamento", label: "Em quais tratamentos" }
        ]
    },
    {
        key: "reduz_dificuldade_tratamento",
        label: "Reduz a dificuldade do teste de tratamento",
        descricao: "Desconta um valor fixo da dificuldade escolhida pra rolar, além de já contar como item adequado. Ex.: Kit Cirúrgico Avançado -2, Clínica Portátil -4.",
        aplicavelEm: "tratamento",
        campos: [
            { chave: "tratamentos", tipo: "multiselect_tratamento", label: "Em quais tratamentos" },
            { chave: "valor", tipo: "numero", label: "Redução de dificuldade" }
        ]
    },
    {
        key: "sucesso_automatico_tratamento",
        label: "Sucesso automático (sem rolar)",
        descricao: "Pula a rolagem inteira — o tratamento é aplicado com sucesso garantido. Ex.: Sintetizador de Plaquetas, Bio-fita, Cicatrizador Dérmico.",
        aplicavelEm: "tratamento",
        campos: [
            { chave: "tratamentos", tipo: "multiselect_tratamento", label: "Em quais tratamentos" }
        ]
    },
    {
        key: "reduz_dificuldade_infeccao",
        label: "Reduz a dificuldade do Teste de Infecção",
        descricao: "Desconta um valor fixo da dificuldade do teste de Infecção da ferida tratada. Ex.: Soro Fisiológico -2.",
        aplicavelEm: "infeccao",
        campos: [
            { chave: "valor", tipo: "numero", label: "Redução de dificuldade" }
        ]
    },
    {
        key: "isenta_infeccao",
        label: "Isenta o Teste de Infecção",
        descricao: "A ferida tratada não corre risco de infeccionar — pula o teste inteiro. Ex.: Cicatrizador Dérmico.",
        aplicavelEm: "infeccao",
        campos: []
    },
    {
        key: "fator_tempo_recuperacao",
        label: "Acelera/atrasa o tempo de recuperação",
        descricao: "Multiplica o tempo de recuperação de PV por um fator (menor que 1 acelera, maior que 1 atrasa). Ex.: Pomada Cicatrizante 0.8 (reduz 1/5), Grampeador Cirúrgico 1.2 (+20%).",
        aplicavelEm: "recuperacao",
        campos: [
            { chave: "tiposFerida", tipo: "multiselect_tipo_ferida", label: "Em quais tipos de ferida" },
            { chave: "fator", tipo: "numero", label: "Fator multiplicador (ex.: 0.8, 1.2)" }
        ]
    },
    {
        key: "restaura_pv",
        label: "Restaura PV imediatamente",
        descricao: "Cura uma quantidade fixa de PV assim que o item é usado. Ex.: Soro Reconstituinte +30.",
        aplicavelEm: "uso_direto",
        campos: [
            { chave: "valor", tipo: "numero", label: "PV restaurado" }
        ]
    },
    {
        key: "estabiliza_condicao_critica",
        label: "Estabiliza condição crítica",
        descricao: "Reverte coma/desacordo imediatamente ao usar o item. Ex.: Soro Reconstituinte.",
        aplicavelEm: "uso_direto",
        campos: []
    },
    {
        key: "efeito_temporario_ignora_penalidade_saude",
        label: "Ignora penalidade de Machucado/Muito Machucado por um tempo",
        descricao: "Por N horas de jogo, o personagem age como se não estivesse Machucado/Muito Machucado. Ex.: Morfina, 1h.",
        aplicavelEm: "uso_direto",
        campos: [
            { chave: "horas", tipo: "numero", label: "Duração (horas de jogo)" }
        ]
    },
    {
        key: "efeito_temporario_modificador",
        label: "Modificador temporário (bônus/penalidade genérico)",
        descricao: "Aplica um ou mais modificadores (mesmo formato de \"Modificadores automáticos\" de qualquer item) por N horas de jogo ao usar o item.",
        aplicavelEm: "uso_direto",
        campos: [
            { chave: "modificadores", tipo: "lista_modificadores", label: "Modificadores (alvo + valor)" },
            { chave: "horas", tipo: "numero", label: "Duração (horas de jogo)" }
        ]
    }
];

export function efeitoMedicoPorKey(key) {
    return CATALOGO_EFEITOS_MEDICOS.find(e => e.key === key) || null;
}
