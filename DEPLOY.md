# Deploy — Sistema de Medições DER/PR

Guia para colocar o sistema no ar. A arquitetura recomendada (mais simples de
manter) é de **serviço único**: o backend serve a API e também o build do
frontend, com um PostgreSQL gerenciado e um bucket S3/compatível para anexos.

## Pré-requisitos externos

1. **Banco PostgreSQL** — gerenciado (Railway, Render, Neon, Supabase) ou via Docker.
2. **Bucket de anexos** — Amazon S3 ou Cloudflare R2 (recomendado: R2, sem custo de saída).
3. **Conta Gmail** com verificação em duas etapas e uma **senha de app** (16 caracteres).

## Variáveis de ambiente (consolidado)

| Variável | Obrigatória | Descrição |
|----------|:-:|-----------|
| `DATABASE_URL` | sim | String de conexão PostgreSQL |
| `JWT_SECRET` | sim | String longa e aleatória (ex.: `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | não | Validade do token (padrão `8h`) |
| `APP_URL_BASE` | sim | URL pública do app (base do link de aceite de convite) |
| `CONVITE_VALIDADE_HORAS` | não | Padrão `72` |
| `SEED_COORDENADOR_NOME/EMAIL/SENHA` | sim* | Administrador inicial (*só no primeiro deploy) |
| `TRUST_PROXY` | prod | `true` atrás de proxy reverso |
| `SERVE_FRONTEND` | prod | `true` para servir o SPA pelo backend |
| `FRONTEND_DIST` | não | Caminho do build (o Dockerfile já define) |
| `CORS_ORIGIN` | não | Só se o frontend estiver em outra origem |
| `S3_BUCKET/REGION/ENDPOINT/ACCESS_KEY/SECRET_KEY` | sim | Armazenamento de anexos |
| `MAX_UPLOAD_MB` | não | Padrão `25` |
| `DOWNLOAD_EXPIRA_SEGUNDOS` | não | Padrão `300` |
| `LINK_EMAIL_EXPIRA_SEGUNDOS` | não | Padrão `259200` (3 dias) |
| `SMTP_HOST/PORT/USER/PASS` | sim | Gmail: `smtp.gmail.com` / `587` / e-mail / senha de app |
| `EMAIL_REMETENTE/REPLY_TO/FINANCEIRO` | sim | Remetente (Gmail), reply-to e destino do financeiro |

## Opção A — Docker Compose (VPS ou local)

Sobe app + PostgreSQL juntos. Anexos e e-mail continuam externos.

1. Preencha o `.env` (use `.env.example` como base). Em produção:
   `NODE_ENV=production`, `SERVE_FRONTEND=true`, `TRUST_PROXY=true`,
   `APP_URL_BASE=https://seu-dominio`.
2. Suba:
   ```
   docker compose up -d --build
   ```
   O container aplica as migrations (`prisma migrate deploy`) automaticamente.
3. Crie o coordenador inicial (uma vez):
   ```
   docker compose run --rm app npm run seed
   ```
4. Teste o e-mail:
   ```
   docker compose run --rm app npm run email:teste seu-email@gmail.com
   ```

Coloque um proxy reverso (Nginx/Caddy/Traefik) com HTTPS à frente da porta 3000.

## Opção B — Plataforma gerenciada (Railway / Render)

1. Conecte o repositório.
2. Provisione um **PostgreSQL** gerenciado e copie a `DATABASE_URL`.
3. Configure as variáveis de ambiente da tabela acima
   (`SERVE_FRONTEND=true`, `TRUST_PROXY=true`).
4. Build e start:
   - Build: `npm ci && npm run prisma:generate && (cd frontend && npm ci && npm run build)`
   - Start: `npm run prisma:deploy && npm start`
   - Ou use o `Dockerfile` (a plataforma detecta e constrói a imagem — caminho mais simples).
5. Primeiro deploy: rode `npm run seed` uma vez (console da plataforma) para criar o coordenador.

## Pós-deploy — checklist

- [ ] `JWT_SECRET` forte e único (não reaproveitar o de exemplo).
- [ ] HTTPS ativo; `APP_URL_BASE` com `https://`.
- [ ] `npm run email:teste` enviou e chegou (verifique inclusive a caixa de spam do financeiro).
- [ ] Bucket privado (sem acesso público); downloads só por URL assinada.
- [ ] Backup automático do PostgreSQL habilitado.
- [ ] Coordenador inicial criado; remova as `SEED_*` do ambiente depois.
- [ ] Variáveis de seed e SMTP fora de qualquer repositório (apenas no ambiente).

## Notas

- Anexos não são removidos (acervo append-only) — dimensione o bucket conforme o volume.
- O e-mail sai pelo Gmail (limite ~500/dia em conta comum). Para volume maior ou
  melhor entregabilidade ao `@simemp.com.br`, troque para um remetente do próprio
  domínio via serviço transacional — só mudam as variáveis `SMTP_*`/`EMAIL_*`.
