# Roteiro — colocar o sistema em funcionamento

Guia linear, do zero até o sistema rodando e testado de ponta a ponta. Siga as
fases na ordem. A Fase 1 sobe tudo na sua máquina (para ver funcionando); a
Fase 4 leva para produção.

---

## Fase 0 — O que você precisa antes de começar

Ferramentas na sua máquina:
- Node.js 18 ou superior (recomendado: 20).
- Um PostgreSQL (vamos subir um local com Docker na Fase 1, ou use um gerenciado).
- Opcional, mas recomendado: Docker (para o banco local e/ou o deploy).

Insumos externos (preparados na Fase 2):
- Um bucket S3 ou Cloudflare R2 para os anexos.
- Uma conta Gmail com senha de app (para os e-mails).

> Dica: você pode subir o sistema na Fase 1 sem o bucket e o Gmail prontos. Há
> um **modo de armazenamento local** (`STORAGE_DRIVER=local`) que guarda os
> anexos numa pasta da sua máquina (`uploads_local/`) em vez de um bucket —
> assim você testa o upload e o download de verdade sem criar S3/R2. Sem SMTP,
> os e-mails entram em modo "dry-run" (apenas registrados no log do servidor).
> O fluxo de estados funciona em qualquer caso. Em produção, use S3/R2 (o disco
> é efêmero em hospedagens gerenciadas).

---

## Fase 1 — Rodar na sua máquina

> **Atualizando uma instalação existente (Grupo B):** se você já tinha o sistema
> rodando e está trocando os arquivos por esta versão, o banco mudou (novas
> tabelas e colunas). Para aplicar **sem perder seus dados de teste**, rode na
> pasta do projeto: `npx prisma migrate dev --name grupo_b`. A mudança é aditiva
> (não apaga nada). Depois reinicie os dois `npm run dev`. Alternativa: rodar o
> `iniciar-teste.cmd` de novo — mas ele recria o banco do zero (zera os dados).
>
> **IA:** sem `ANTHROPIC_API_KEY` no `.env`, a análise por IA funciona em modo de
> simulação (para você ver o fluxo). Com a chave preenchida, a IA analisa o
> relatório de verdade.

> **Atalho no Windows:** se você só quer testar rápido, extraia o projeto, entre
> na pasta e dê dois cliques em **`iniciar-teste.cmd`**. Ele faz tudo desta fase
> automaticamente (sobe o Postgres no Docker, configura o `.env` em modo de
> teste, instala as dependências, cria as tabelas e o coordenador, e liga
> backend e frontend). Pré-requisitos: ter o **Node.js** e o **Docker Desktop**
> instalados e o Docker em execução. Os passos manuais abaixo continuam valendo
> como alternativa ou para entender o que o script faz.

### 1.1 Abrir o projeto
Descompacte o `medicao-der-pr.tar.gz` e entre na pasta `medicao-der-pr`.

### 1.2 Subir um PostgreSQL local (via Docker)
```
docker run --name medicao-db \
  -e POSTGRES_USER=medicao \
  -e POSTGRES_PASSWORD=medicao \
  -e POSTGRES_DB=medicao_der_pr \
  -p 5432:5432 -d postgres:16
```
A string de conexão será:
```
postgresql://medicao:medicao@localhost:5432/medicao_der_pr?schema=public
```
(Se usar um PostgreSQL gerenciado, use a string que ele fornecer.)

### 1.3 Configurar o backend
Na raiz do projeto:
```
npm install
cp .env.example .env
```
Abra o `.env` e preencha, no mínimo:
- `DATABASE_URL` — a string do passo 1.2.
- `JWT_SECRET` — gere uma aleatória: `openssl rand -hex 32` (cole o resultado).
- `APP_URL_BASE=http://localhost:5173`
- `SEED_COORDENADOR_NOME`, `SEED_COORDENADOR_EMAIL`, `SEED_COORDENADOR_SENHA` —
  seus dados; é o login de administrador inicial.

As variáveis `S3_*` e `SMTP_*`/`EMAIL_*` você preenche na Fase 2.

> Para testar **sem bucket** agora: adicione `STORAGE_DRIVER=local` ao `.env`.
> Os anexos serão gravados na pasta `uploads_local/` do projeto, e o download
> funciona normalmente pelo sistema. Quando for para produção, troque para S3/R2
> (defina as `S3_*` e remova o `STORAGE_DRIVER`, ou ponha `s3`).

### 1.4 Criar as tabelas e o coordenador
```
npm run prisma:generate
npm run prisma:migrate
npm run seed
```
O `seed` cria o seu usuário coordenador. Se aparecer "Coordenador criado", deu certo.

### 1.5 Subir o backend
```
npm run dev
```
Deixe rodando. Teste em outra aba: abra `http://localhost:3000/saude` — deve
responder `{"ok":true,...}`.

### 1.6 Subir o frontend
Em outro terminal:
```
cd frontend
npm install
cp .env.example .env
npm run dev
```
Abra `http://localhost:5173`. Faça login com o e-mail e a senha do coordenador
(passo 1.3). Você verá a fila de relatórios (vazia por enquanto).

✅ Sistema rodando localmente.

---

## Fase 2 — Preparar os insumos externos

### 2.1 Senha de app do Gmail
1. Ative a verificação em duas etapas na sua Conta Google.
2. Acesse `https://myaccount.google.com/apppasswords` e gere uma senha de app
   (16 caracteres, sem espaços).
3. No `.env` do backend, preencha:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASS=a-senha-de-app-de-16-caracteres
   EMAIL_REMETENTE=seu-email@gmail.com
   EMAIL_REPLY_TO=seu-email@gmail.com
   EMAIL_FINANCEIRO=financeiro@simemp.com.br
   ```
4. Teste (com o backend parado ou em outro terminal):
   ```
   npm run email:teste seu-email@gmail.com
   ```
   Deve dizer "Conexão SMTP verificada" e enviar um teste. Confira a caixa de entrada.

### 2.2 Bucket de anexos (Cloudflare R2 — recomendado)
1. No painel da Cloudflare, crie um bucket R2 (privado).
2. Gere um token de API R2 (Access Key ID + Secret Access Key).
3. Anote o endpoint S3 do R2: `https://<sua-conta>.r2.cloudflarestorage.com`.
4. No `.env`:
   ```
   S3_BUCKET=nome-do-bucket
   S3_REGION=auto
   S3_ENDPOINT=https://<sua-conta>.r2.cloudflarestorage.com
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   ```
   (Para Amazon S3: deixe `S3_ENDPOINT` vazio e informe a `S3_REGION` real, ex. `sa-east-1`.)

Reinicie o backend (`Ctrl+C` e `npm run dev`) para carregar as novas variáveis.

---

## Fase 3 — Testar o fluxo completo (uma vez)

Com Gmail e bucket configurados, percorra o ciclo inteiro:

1. **Convidar** (como coordenador): menu "Convites" → informe um e-mail (pode ser
   um seu, secundário) → "Enviar convite".
2. **Aceitar**: abra o link que chegou por e-mail (ou veja no log do servidor se
   o SMTP não estiver ativo) → defina nome e senha.
3. **Entrar como colaborador**: saia e entre com o e-mail convidado.
4. **Criar relatório**: "Novo relatório" → preencha os campos, anexe um PDF →
   "Enviar para análise". O status vai para *Em análise*.
5. **Analisar** (como coordenador): abra o relatório na fila → "Aprovar"
   (ou "Reprovar" com observações, para testar o reenvio).
6. **Documentação fiscal** (como colaborador): no relatório aprovado, anexe a
   documentação fiscal. Um e-mail é enviado ao financeiro automaticamente.
   O status vai para *Aguardando atesto*.
7. **Atesto** (como coordenador): abra o relatório → anexe o atesto (opcional) →
   "Inserir atesto e concluir". O status vai para *Concluído*.
8. **Conferir**: veja a linha do tempo de auditoria e baixe os anexos. O
   colaborador agora vê o atesto disponível.

✅ Fluxo validado de ponta a ponta.

---

## Fase 4 — Colocar em produção

Resumo (o detalhamento está em `DEPLOY.md`):

1. Ajuste o `.env` de produção: `NODE_ENV=production`, `SERVE_FRONTEND=true`,
   `TRUST_PROXY=true`, `APP_URL_BASE=https://seu-dominio`.
2. Escolha o caminho:
   - **Docker Compose** (VPS): `docker compose up -d --build`, depois
     `docker compose run --rm app npm run seed`.
   - **Plataforma gerenciada** (Railway/Render): conecte o repositório, provisione
     o PostgreSQL, configure as variáveis e use o `Dockerfile` para o build.
3. Garanta HTTPS (proxy reverso ou a própria plataforma).
4. Rode o checklist de pós-deploy do `DEPLOY.md`.

---

## Se algo der errado

- **`prisma migrate` falha** → confira a `DATABASE_URL` e se o PostgreSQL está no ar.
- **Erro de engine do Prisma / openssl** (em Linux) → instale `openssl`
  (`apt-get install -y openssl`). O `Dockerfile` já faz isso.
- **Gmail recusa o login** → use a *senha de app* (não a senha normal) e confirme
  que a verificação em duas etapas está ativa.
- **E-mails não chegam** → rode `npm run email:teste`; verifique a caixa de spam
  do destinatário. Sem `SMTP_*`, os envios ficam só no log (modo dry-run).
- **Upload de anexo falha** → confira as variáveis `S3_*` e se o bucket existe.
- **Login não funciona após o seed** → confirme `SEED_COORDENADOR_EMAIL/SENHA` e
  que o `npm run seed` rodou sem erro.
