# Pitchômetro

Aplicação web em português do Brasil para gestão de bancas de avaliação de apresentações.

## Stack

- Next.js 16 (App Router, Cache Components, `proxy.ts`)
- TypeScript
- Prisma + PostgreSQL (Neon, conectado via integração da Vercel)

## Estrutura principal

- `src/app/admin` — painel do administrador (bancas, avaliadores, grupos, links, dashboard, exportações)
- `src/app/avaliar/[token]` — ficha do avaliador (rascunho e envio; ficha enviada fica bloqueada)
- `src/app/devolutiva/[token]` — devolutiva do grupo (visível apenas quando a avaliação está **publicada**)
- `src/app/sorteio/[banca]` — sorteio da ordem de apresentação (somente admin; a ordem é gravada ao confirmar)
- `src/app/api` — rotas de API; todas as rotas de gestão exigem sessão de admin
- `src/lib/data.ts` — conversão dos modelos do Prisma para os objetos usados nas telas
- `src/lib/session.ts` — cookie de sessão assinado (HMAC com `SESSION_SECRET`)
- `src/proxy.ts` — redireciona `/admin` e `/sorteio` para `/login` sem sessão válida
- `src/scripts/seed.ts` — cria/atualiza o admin e os dados iniciais (idempotente)
- `prisma/schema.prisma` — modelo de dados

## Variáveis de ambiente

Veja `.env.example`. Obrigatórias: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

## Como rodar localmente

```bash
copy .env.example .env.local   # preencha os valores
npm install
npm run db:push                # sincroniza o schema com o banco
npm run db:seed                # cria/atualiza o admin e os dados iniciais
npm run dev
```

## Deploy na Vercel

O `npm run build` executa `prisma db push` (só aplica mudanças sem perda de dados), roda o seed e depois o `next build`. Basta configurar as variáveis no projeto da Vercel e rodar `vercel --prod`.

## Senha do administrador

- **Alterar:** no painel, botão **Alterar senha** (`/admin/senha`). Outras sessões abertas são encerradas.
- **Esqueci a senha:** link na tela de login (`/esqueci-senha`). Um link de redefinição, válido por 30 minutos e de uso único, é enviado por e-mail via [Resend](https://resend.com). Requer `RESEND_API_KEY` e `EMAIL_FROM`.
- **Último recurso (sem e-mail):** defina `ADMIN_RESET_PASSWORD=true` e `ADMIN_PASSWORD` e rode o seed (ou faça um deploy); depois remova `ADMIN_RESET_PASSWORD`.

## Fluxo de uso

O painel `/admin` é um fluxo em etapas; cada etapa só é liberada quando a anterior está completa:

1. **Banca** — selecionar uma banca existente ou criar uma nova.
2. **Avaliadores** — liberada após selecionar a banca.
3. **Grupos** — liberada após cadastrar ao menos um avaliador.
4. **Links** — liberada quando a banca está ativa (com avaliadores e grupos); copie o link individual de cada avaliador.
5. **Dashboard** — nota final, links de devolutiva, grupo x critério, notas por avaliador, média por critério e feedbacks (ocultar/publicar).

O **sorteio** aparece em destaque no painel somente enquanto nenhum avaliador registrou nota; depois disso ele é bloqueado também na API.
Ao publicar os resultados, os grupos acessam a devolutiva pelo link/QR code. **Revogar** gera um novo link e invalida o anterior.
