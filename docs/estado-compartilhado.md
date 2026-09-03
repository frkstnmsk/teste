# Estado compartilhado do ficha.js

Este documento é o resultado do **Passo 2** do plano de modularização
(`plano-modularizacao-ficha-js.txt`). Não muda nenhum código — é só o
mapeamento de quais variáveis vivem no topo do `ficha.js` (fora de
qualquer função) e por isso são "compartilhadas": qualquer função do
arquivo pode ler e escrever nelas livremente.

Essa lista vai guiar o Passo 3 (criar `estado.js`) e todos os passos
seguintes: quando uma função for movida pra outro arquivo, ela precisa
continuar tendo acesso a essas variáveis — só que de forma explícita
(importando de `estado.js`), em vez de "por estar no mesmo arquivo".

## Sessão / identidade de quem está usando a ficha
- `sessao` — dados de login (role, mesaId, idLimpo) vindos do localStorage.
- `isMestre` — true/false, calculado uma vez a partir da sessão.
- `fichaAtualId` — id da ficha (jogador) atualmente aberta na tela.
- `fichaAtual` — snapshot completo da ficha vindo do Firebase.
- `modoNpc`, `npcAtualId`, `npcRawAtual` — quando o Mestre está "atuando
  como NPC", a tela passa a ler/escrever em `npcs/{id}` em vez de
  `fichas/{id}`.
- `listenerAtivo`, `listenerAtivoTipo` — controla qual listener do
  Firebase está ligado agora (fichas ou npcs).
- `salvandoDebounce` — controla o atraso entre digitar e salvar no banco.

## Permissões (constantes, não mudam em runtime)
- `CAMPOS_SO_MESTRE` — campos que só o Mestre pode editar direto.
- `CAMPOS_PERICIA_BLOQUEADOS_FORA_DE_EDICAO` — trava de perícia/atributo
  fora de Criação/Level Up/Treinamento.
- `CAMPOS_PERFIL_SIMPLES` — lista de campos de texto simples do Perfil.
- `DARKNET_SITES` — catálogo fixo dos sites da Dark Net.

## Efeito visual de dano
- `pvAtualUltimaSync`, `idUltimaSyncEfeitoDano` — usados só pra detectar
  queda de PV entre um snapshot e outro e disparar o efeito de tela.

## Modal genérico (usado por várias abas: Inventário, Receitas, Cenário...)
- `modalContexto` — qual lista/id o modal de item está editando agora.
- `receitaAguardandoVinculo`, `idBancoParaRetomarReceita` — ponte entre o
  modal de Receita e o modal de Item.
- `criarItemApenasNoBanco` — flag do fluxo "criar item só no Banco Global".
- `cenarioIdParaCriarItem` — flag do fluxo "criar item solto no Cenário".
- `imagemItemModalAtual` — imagem em edição dentro do modal de item.

## Configurações da mesa (Godmode e afins)
- `godmodeAtivo`, `ignorarPenalidadeSaudeAtivo`
- `fatorPrecoMateriaisVeiculoAtivo`, `fatorPrecoDarknetAtivo`

## Calendário
- `calendarioAtual`

## Caches compartilhados entre TODA a mesa (não só a ficha aberta)
- `todasAsFichasCache` — usado pelo Dashboard de Fichas do Mestre.
- `itensGlobaisCache`, `receitasGlobaisCache` — Banco Global.
- `npcsCache` — Painel de NPCs.
- `combateAtivoCache`, `combateNpcFormVisivel`, `painelIniciativaJogadorAberto`
  — Gerenciador de Combate.
- `pendentesCache`, `contadorPendentesAnterior` — Ações Pendentes.
- `cenariosCache` — Gerenciador de Cenário.
- `perseguicaoAtivaCache` — Gerenciador de Perseguição.

## Específico da ficha atualmente aberta (não compartilhado com a mesa toda)
- `feridasCache`, `unsubFeridas`, `feridasFichaIdOuvida` — aba Saúde.
- `xpHistoricoCache`, `unsubXpHistorico`, `xpHistoricoFichaIdOuvida`.
- `categoriaInventarioAtiva`, `containersInventarioAbertos` — Inventário.
- `pvRecuperacaoContexto`, `ultimoContextoRecuperacaoPV` — recuperação de PV.
- `ultimoAvisoCustoVida` — fila local do aviso de custo semanal.

## Controle interno de listeners do Painel do Mestre
- `limpezaPainelMestreAtual` + `definirLimpezaPainelMestre(...)` — garante
  que só um listener de painel do Mestre fique vivo por vez.
- `_pausarListener` — semáforo pra ignorar snapshots do Firebase durante
  uma sequência de updates compostos.

---

## O que isso significa pros próximos passos

Toda função que for movida de `ficha.js` pra um arquivo de aba (Passo 6
em diante) provavelmente usa uma ou mais dessas variáveis. No Passo 3,
elas vão passar a morar em `estado.js`, com funções de leitura/escrita
(ex: `getFichaAtual()`, `setFichaAtual(novoValor)`) em vez de acesso
direto — assim qualquer arquivo novo pode importar só o que precisa,
sem precisar estar no mesmo arquivo que a variável original.
