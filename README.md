# Planner de Tarefas

Sistema web para acompanhar as atividades semanais da sua filha, com valores
ganhos por tarefa, tarefas extras/bônus, histórico de pagamentos e alertas de
desempenho — pensado para rodar num tablet.

## Como funciona

- **Tarefas diárias**: marcadas dia a dia (Seg a Dom).
- **Tarefas semanais**: marcadas uma vez por semana (ex: aspirar a casa).
- **Tarefas extras/bônus**: podem ser marcadas várias vezes na semana e rendem
  valor adicional.
- Cada marcação guarda o **valor exato** da atividade no momento em que foi
  feita, então mudar o valor de uma atividade no futuro nunca altera o
  histórico já registrado (importante para conferência).
- O fechamento é sempre **semanal**: total ganho, total pago e saldo a pagar
  ficam visíveis na tela dos pais.
- A área dos pais (`/admin.html`) é protegida por um PIN simples
  (`ADMIN_PIN` no `.env`) — suficiente para uma criança não mexer sem querer,
  não é um sistema de autenticação robusto.

## Rodando localmente

```bash
npm install
cp .env.example .env   # ajuste o ADMIN_PIN
npm start
```

Acesse `http://localhost:3000` (tela da filha) e
`http://localhost:3000/admin.html` (área dos pais).

No primeiro start, o banco SQLite é criado em `data/planner.db` e populado com
as atividades do planner impresso (você pode editar nomes, emojis e valores
depois, pela tela de Admin).

## Colocando no tablet

Basta abrir `http://<ip-do-servidor>:3000` no navegador do tablet e, se
quiser, adicionar à tela inicial ("Adicionar à tela de início") para abrir em
modo tela cheia como um app.

## Deploy na nuvem (Render, Railway, Fly.io, VPS, etc.)

Este é um app Node.js único que serve API + frontend estático — não precisa
de build step.

1. Suba o projeto num repositório Git (GitHub, por exemplo).
2. No serviço escolhido, configure:
   - Build command: `npm install`
   - Start command: `npm start`
   - Variável de ambiente `ADMIN_PIN`
3. **Atenção ao banco**: por padrão o SQLite fica em `data/planner.db`,
   dentro da própria pasta do projeto. Em muitas plataformas essa pasta é
   **substituída ou apagada a cada novo deploy**, então:
   - configure um **disco persistente** (ex: "Persistent Disk" no Render,
     volume no Fly.io, disco de dados no VPS) e
   - aponte a variável de ambiente `DATA_DIR` para esse disco (ex:
     `DATA_DIR=/data`). Deixando `DATA_DIR` vazio, o app usa `./data` como no
     dev local — bom para VPS, onde a pasta do projeto já é persistente.

### Deploy na Azure (App Service)

Opção recomendada por não exigir gerenciar servidor:

1. Criar um **App Service** Linux, runtime Node.js 20+, plano Basic B1 (ou
   superior), com **apenas 1 instância** (sem auto-scale — SQLite não
   suporta múltiplas instâncias escrevendo ao mesmo tempo).
2. Em Configuration → Application settings, adicionar:
   - `ADMIN_PIN=<seu pin>`
   - `DATA_DIR=/home/data` (a pasta `/home` no App Service Linux é a única
     parte do sistema de arquivos que persiste entre deploys e reinícios —
     sem isso, um novo deploy apagaria todo o histórico de tarefas e
     pagamentos)
   - `WEBSITE_RUN_FROM_PACKAGE` deve ficar **desligado/ausente** (esse modo
     monta o código como somente leitura, o que impediria o app de criar o
     `data/` local caso `DATA_DIR` não esteja configurado)
3. Ativar **Always On** (em General settings), senão o App Service hiberna o
   processo quando fica sem acesso e o tablet demora pra "acordar" o site.
4. Deploy via GitHub Actions (a própria Azure gera o workflow ao conectar o
   repositório em Deployment Center) ou `az webapp up` pela CLI.

## Estrutura

```
server/          backend Express
  db.js          conexão SQLite + schema
  seed.js        atividades padrão (1ª execução)
  lib/week.js    cálculo de semana (Seg-Dom)
  routes/        activities, completions, weeks, payments, alerts, admin
public/          frontend estático (sem build)
  index.html     tela da filha
  admin.html     área dos pais
data/             banco SQLite (gerado automaticamente, fora do git)
```
