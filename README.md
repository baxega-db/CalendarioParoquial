# Agendador de Salas da Paróquia

Agenda pública das salas, pedido de sala com aviso pelo WhatsApp e painel da secretaria.
Requisitos completos em [REQUISITOS.md](REQUISITOS.md). Esta versão entrega a **Fase 1**.

**Site publicado:** https://calendariosaopedro.vercel.app — cada envio para o ramo
`main` do GitHub publica uma nova versão automaticamente na Vercel.

## O que já funciona (Fase 1)

- **Agenda pública, sem login**: Dia, Por sala, Semana e Mês; cores com o nome da sala;
  filtro de salas; detalhe do evento com foto; pedidos pendentes tracejados
  ("Aguardando confirmação"); horário de funcionamento; botão A+ / A−.
- **Salas livres agora**.
- **Pedir uma sala**: verificação na hora (livre / pedido aguardando / ocupada com
  sugestão de outras salas / aviso de capacidade), salva como pendente e abre o WhatsApp
  da secretaria com a mensagem pronta.
- **Painel da secretaria**: pendentes do mais antigo ao mais novo, com contador no menu;
  Confirmar, Editar e confirmar, Não aprovar com motivo; "Buscar a chave na secretaria?"
  vindo da ficha da sala; abre o WhatsApp de quem pediu com a mensagem de retorno.
- **Reservas avulsas** criadas, editadas e canceladas pela secretaria.
- **Administração**: salas com fotos (reduzidas no próprio aparelho antes do envio),
  usuários (secretaria ou administrador), número do WhatsApp, nome da paróquia,
  horário de funcionamento e limpeza de dados pessoais.
- **Segurança no banco (RLS)**: o visitante só lê a visão `agenda_publica` (sem nome nem
  telefone) e só cria pedidos pela função `solicitar_sala`. O banco recusa duas reservas
  confirmadas sobrepostas na mesma sala.

## Como colocar no ar

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Em **SQL Editor**, cole e rode o arquivo
   `supabase/migrations/20261104000000_fase1.sql`
   (ou, com a CLI: `supabase link` e depois `supabase db push`).
3. Em **Authentication > Providers > Email**, deixe ligado o login por e-mail e senha
   e **desligue "Allow new users to sign up"** (só o administrador cadastra usuários).
4. Em **Authentication > URL Configuration**, coloque o endereço do site em
   *Site URL* e acrescente `https://SEU-SITE/auth/confirmar` em *Redirect URLs*
   (e `http://localhost:3000/auth/confirmar` para testes).

### 2. Primeiro administrador

Em **Authentication > Users > Add user**, crie o usuário com e-mail e senha
(marque "Auto confirm"). Depois, no **SQL Editor**:

```sql
insert into public.usuarios (id, nome, email, perfil)
select id, 'Nome do Administrador', email, 'admin'
from auth.users where email = 'email-do-admin@exemplo.com';
```

Os próximos usuários são cadastrados pelo próprio sistema, em **Usuários**.

### 3. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os dados de
**Project Settings > API**. Na Vercel, cadastre as mesmas variáveis em
**Settings > Environment Variables**. A `SUPABASE_SERVICE_ROLE_KEY` é secreta:
nunca a coloque no código nem com prefixo `NEXT_PUBLIC_`.

### 4. Rodar no computador

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000.

### 5. Vercel

Importe o repositório na Vercel, cadastre as variáveis e publique. Depois,
atualize a *Site URL* do Supabase com o endereço final.

## Organização do código

- `src/app` — telas (agenda em `page.tsx`, `pedir`, `livres`, `salas`, `painel`, `admin`).
- `src/components/agenda` — visões da agenda.
- `src/lib` — acesso ao Supabase, datas no fuso de São Paulo, mensagens de WhatsApp.
- `supabase/migrations` — banco de dados com as regras de acesso.

## Próximas fases

- **Fase 2**: recorrências completas com exceções, datas bloqueadas, tela de histórico
  (o banco já grava o histórico desde a Fase 1).
- **Fase 3**: impressão da semana, modo TV, domínio da paróquia.
