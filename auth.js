// =====================================================================
// CHUVA DE NEON — Autenticação (login / registro / sessão)
// =====================================================================
// Como funciona:
// - Cada Mestre listado em MESTRES tem sua PRÓPRIA mesa (mesaId = o
//   login dele). "Login do Mestre" dá acesso total, mas só à mesa
//   daquele Mestre — nunca às mesas dos outros.
// - Qualquer outro login cria (ou acessa) uma ficha de jogador. Ao
//   REGISTRAR, o jogador escolhe em qual mesa (qual Mestre) vai jogar;
//   essa escolha fica gravada na ficha e não muda mais sozinha.
// - O login em si é único em toda a rede (não só dentro de uma mesa),
//   pra manter o fluxo de "entrar" simples — sem precisar escolher a
//   mesa de novo toda vez que loga. Um índice separado (`loginIndex`)
//   guarda em qual mesa cada login mora, só pra resolver isso no login.
// - A sessão fica salva no localStorage do navegador, então ao recarregar
//   a página o jogador continua logado até clicar em "Sair".
//
// ATENÇÃO SOBRE SEGURANÇA:
// As senhas ficam salvas em texto simples dentro do Firebase Realtime
// Database. Isso é suficiente para uma mesa entre amigos, mas NÃO é uma
// autenticação de verdade — alguém com conhecimento técnico que acesse
// a URL do banco consegue ler as senhas. Para travar isso de verdade,
// configure as "Regras" do Realtime Database no painel do Firebase
// (veja o README.md do repositório para o trecho de regras sugerido).

import { db } from "./firebase-config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

// ACESSO DO(S) MESTRE(S) CANÔNICO(S) — um por mesa. `mesaId` é o
// identificador da mesa no banco (`mesas/{mesaId}/...`); `mesaNome` é
// só o rótulo bonito mostrado pro jogador na hora de escolher a mesa.
const MESTRES = [
    { login: "frkstnmsk", senha: "31outcaseri", mesaId: "frkstnmsk", mesaNome: "77³" },
    { login: "yan", senha: "ian", mesaId: "yan", mesaNome: "Mesa do Yan" },
    { login: "cyberpunk", senha: "31outcaseri", mesaId: "cyberpunk", mesaNome: "isso não é cyberpunk" },
    { login: "lukethemaster", senha: "@master556", mesaId: "lukethemaster", mesaNome: "luke" }
];

let modoAtual = "entrar";

const tabEntrar = document.getElementById("tab-entrar");
const tabCriar = document.getElementById("tab-criar");
const btnAcao = document.getElementById("btn-acao");
const statusMsg = document.getElementById("login-status-msg");
const spinner = document.getElementById("login-spinner");
const campoNomeExibicao = document.getElementById("campo-nome-exibicao");
const campoMesa = document.getElementById("campo-mesa");
const selectMesa = document.getElementById("login-mesa");
const inputUser = document.getElementById("login-user");
const inputPass = document.getElementById("login-pass");
const inputNomeExibicao = document.getElementById("login-nome-exibicao");

popularSelectMesas();

// Se já existe sessão válida, manda direto pra ficha.
(function redirecionarSeJaLogado() {
    const saved = localStorage.getItem("cdn_session");
    if (saved) {
        try {
            const sessao = JSON.parse(saved);
            if (sessao && sessao.idLimpo !== undefined && sessao.role && sessao.mesaId) {
                window.location.href = "ficha.html";
            }
        } catch (e) {
            localStorage.removeItem("cdn_session");
        }
    }
})();

function popularSelectMesas() {
    if (!selectMesa) return;
    selectMesa.innerHTML = "";
    MESTRES.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.mesaId;
        opt.innerText = m.mesaNome;
        selectMesa.appendChild(opt);
    });
}

tabEntrar.addEventListener("click", () => {
    modoAtual = "entrar";
    tabEntrar.classList.add("active");
    tabCriar.classList.remove("active");
    btnAcao.innerText = "Inicializar Link";
    campoNomeExibicao.style.display = "none";
    if (campoMesa) campoMesa.style.display = "none";
    ocultarErro();
});

tabCriar.addEventListener("click", () => {
    modoAtual = "criar";
    tabCriar.classList.add("active");
    tabEntrar.classList.remove("active");
    btnAcao.innerText = "Registrar Nova Ficha";
    campoNomeExibicao.style.display = "flex";
    if (campoMesa) campoMesa.style.display = "flex";
    ocultarErro();
});

btnAcao.addEventListener("click", executarAcao);
[inputUser, inputPass, inputNomeExibicao].forEach(el => {
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") executarAcao();
    });
});

async function executarAcao() {
    const rawUser = inputUser.value.trim();
    const pass = inputPass.value;
    const nomeExibicao = inputNomeExibicao.value.trim();
    const mesaEscolhida = selectMesa ? selectMesa.value : (MESTRES[0] && MESTRES[0].mesaId);

    if (rawUser === "" || pass === "") {
        mostrarErro("SINAL INCOMPLETO: preencha login e senha.");
        return;
    }
    if (modoAtual === "criar" && nomeExibicao === "") {
        mostrarErro("SINAL INCOMPLETO: dê um nome pra sua ficha.");
        return;
    }
    if (modoAtual === "criar" && !mesaEscolhida) {
        mostrarErro("SINAL INCOMPLETO: escolha em qual mesa você vai jogar.");
        return;
    }

    const userClean = rawUser.toLowerCase().replace(/[^a-z0-9]/g, "-");

    if (userClean === "" ) {
        mostrarErro("LOGIN INVÁLIDO: use letras, números ou hífen.");
        return;
    }

    // Validação do Mestre — sempre tratado de forma especial, em qualquer aba.
    // Cada Mestre só acessa a própria mesa (mesaId = o login dele).
    const mestreEncontrado = MESTRES.find(m => m.login === rawUser.toLowerCase());
    if (mestreEncontrado) {
        if (pass === mestreEncontrado.senha) {
            definirSessao("mestre", "Mestre", "", mestreEncontrado.mesaId);
        } else {
            mostrarErro("CORTA-FOGO: senha de mestre inválida.");
        }
        return;
    }

    travarBotao(true);
    try {
        if (modoAtual === "criar") {
            const indiceRef = ref(db, `loginIndex/${userClean}`);
            const snapIndice = await get(indiceRef);
            if (snapIndice.exists()) {
                mostrarErro("ERRO: esse login já está em uso. Escolha outro ou entre com a senha dele.");
                return;
            }
            await criarFichaNova(userClean, pass, nomeExibicao, mesaEscolhida);
            definirSessao("jogador", nomeExibicao, userClean, mesaEscolhida);
        } else {
            // "Entrar" não sabe de antemão em qual mesa o login mora —
            // o loginIndex resolve isso antes de ler a ficha em si.
            const snapIndice = await get(ref(db, `loginIndex/${userClean}`));
            if (!snapIndice.exists()) {
                mostrarErro("ERRO: ficha inexistente. Use a aba \"Registrar Nova Ficha\" pra criar uma.");
                return;
            }
            const mesaId = snapIndice.val();
            const configRef = ref(db, `mesas/${mesaId}/fichas/${userClean}/config`);
            const snapshot = await get(configRef);
            if (!snapshot.exists()) {
                mostrarErro("ERRO: ficha inexistente. Use a aba \"Registrar Nova Ficha\" pra criar uma.");
                return;
            }
            const config = snapshot.val();
            if (config.senha === pass) {
                definirSessao("jogador", config.nomeExibicao || rawUser, userClean, mesaId);
            } else {
                mostrarErro("CORTA-FOGO: senha incorreta.");
            }
        }
    } catch (err) {
        console.error(err);
        mostrarErro("FALHA DE CONEXÃO COM A REDE. Tente novamente em alguns segundos.");
    } finally {
        travarBotao(false);
    }
}

async function criarFichaNova(idLimpo, senha, nomeExibicao, mesaId) {
    const fichaVazia = {
        config: {
            senha,
            nomeExibicao,
            mesaId,
            criadoEm: Date.now()
        },
        dados: {
            nome: nomeExibicao, vulgo: "", idade: "", nacionalidade: "", funcao: "",
            maldade: 0, remorso: 0, status: 0,
            dm: "", void: "", p2k: "", rabbithole: "", p2c: "", creators: "",
            darkart: "", blackprint: "",
            nivel: 1, xp: 0,
            forca: 0, constituicao: 0, destreza: 0, sabedoria: 0,
            inteligencia: 0, raciocinio: 0, carisma: 0, manipulacao: 0,
            pvAtual: null, energiaAtual: null,
            padraoDeVida: "",
            ganhoFixo: 0,
            ultimoPagamentoCustoVida: 0,
            custoVidaPagos: {},
            criacaoConcluida: false
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
        criacao: {
            etapa: 1,
            funcaoEscolhida: "",
            escolhaAtributoFuncao: "",
            etapa1JaConfirmadaAntes: false,
            pontosAtributosRestantes: 7,
            pontosPericiasRestantes: 5,
            pontosFuncaoRestantes: 0,
            pontosBonusDesvantagens: 0,
            bonusGasto: 0,
            bonusGastoDetalhe: {},
            concluida: false
        },
        treinamento: {
            ativo: false,
            periciaFisica: null,
            periciaMental: null,
            atributoFisico: null,
            atributoMental: null
        },
        levelUpPendente: null,
        determinacoes: [],
        notas: ""
    };
    // Grava a ficha dentro da mesa escolhida E registra no índice global
    // de logins (só {mesaId}, pra achar a mesa certa num próximo login)
    // — as duas escritas precisam acontecer juntas pro login funcionar.
    await set(ref(db, `mesas/${mesaId}/fichas/${idLimpo}`), fichaVazia);
    await set(ref(db, `loginIndex/${idLimpo}`), mesaId);
}

function definirSessao(role, nome, idLimpo, mesaId) {
    const sessao = { role, nome, idLimpo, mesaId };
    localStorage.setItem("cdn_session", JSON.stringify(sessao));
    window.location.href = "ficha.html";
}

function mostrarErro(txt) {
    statusMsg.innerText = txt;
    statusMsg.style.display = "block";
}
function ocultarErro() {
    statusMsg.style.display = "none";
}
function travarBotao(travado) {
    btnAcao.disabled = travado;
    spinner.style.display = travado ? "block" : "none";
}
