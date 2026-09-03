# Chuva de Neon — Ficha Digital

## Mesas separadas (multi-Mestre)

Cada Mestre cadastrado em `MESTRES` (dentro de `auth.js`) tem sua própria
mesa isolada no banco: fichas de jogador, NPCs, calendário, log de dados,
Godmode e o Gerenciador de Combate vivem em `mesas/{mesaId}/...` e nunca
aparecem pra outra mesa. O `mesaId` de cada mestre é o próprio login dele.

O único dado que continua compartilhado entre TODAS as mesas, de
propósito, é o Banco Global de Itens (`itensGlobais`) — assim os Mestres
podem reaproveitar o mesmo catálogo de armas/equipamentos.

Pra adicionar um novo Mestre (nova mesa): edite o array `MESTRES` em
`auth.js` e adicione `{ login, senha, mesaId, mesaNome }` — `mesaId`
normalmente igual ao `login`.

Jogador escolhe a mesa (o Mestre) na aba **"Registrar Nova Ficha"**, na
tela de login. Essa escolha fica salva na ficha e não muda mais sozinha.
