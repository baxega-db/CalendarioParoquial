# Agendador de Salas da Paróquia

Sistema web para agendar as salas de uma paróquia. Fonte de verdade dos requisitos: `REQUISITOS.md` (leia antes de qualquer tarefa).

## Stack
- Next.js (React, App Router) hospedado na Vercel
- Supabase: PostgreSQL, Auth (e-mail e senha) e Storage (fotos das salas)
- Segurança com RLS do Supabase; visitante só lê dados públicos
- Idioma da interface: português do Brasil

## Decisões já aprovadas (não rediscutir)
- Agenda pública, sem login. Edição exige login.
- Perfis: visitante, secretaria/editor, administrador. Sem limite de usuários; o administrador os cadastra no sistema.
- Pastoral é campo de texto livre.
- Solicitação de sala fica salva como **pendente** e também abre o WhatsApp (link wa.me) com mensagem pronta. O número da secretaria (hoje +55 19 3421-2290) fica nas configurações e é editável pelo administrador.
- Ao aprovar ou não aprovar, abrir o WhatsApp no número do solicitante com a mensagem de retorno. Campo "Buscar a chave na secretaria?" (padrão vem da ficha da sala); se "Sim", a mensagem inclui "BUSCAR A CHAVE NA SECRETARIA".
- Verificação de disponibilidade em tempo real ao escolher sala, data e horário. O banco impede por restrição duas reservas confirmadas sobrepostas na mesma sala.
- Cada encontro de uma recorrência é uma linha em `reservas`, ligada a uma série.
- Limpeza de dados pessoais de pedidos antigos: somente administrador.
- Nome e telefone do solicitante nunca aparecem na agenda pública.
- Horário de funcionamento exibido na agenda, configurável.

## Princípios de interface (público com muitos idosos)
- Celular primeiro. Texto mínimo de 18 px, botões com pelo menos 48 px, alto contraste.
- Cor da sala sempre acompanhada do nome; nada informado só pela cor.
- Linguagem simples: "Pedir uma sala", "Ver a agenda", "Salas livres agora".
- Critério de aceite: uma pessoa de 70 anos usa sem ajuda no próprio celular.

## Fases de entrega
1. Essencial: login, salas com fotos, agenda (Hoje, Por sala, Semana, Mês) com cores, reservas avulsas, solicitação com verificação e WhatsApp, painel de pendentes com mensagem de retorno, configuração do número.
2. Recorrência e rotina: recorrências completas com exceções, datas bloqueadas, histórico.
3. Extras: impressão da semana, modo TV, migração para o domínio da paróquia.

Começar pela Fase 1. Fora do escopo: envio automático pela API do WhatsApp, app nas lojas, cobrança, controle de chaves e materiais.

## Como trabalhar
- Confirmar com o usuário antes de mudar uma decisão aprovada.
- Migrações do banco em `supabase/migrations`, sempre com políticas RLS.
- Nunca commitar chaves ou senhas; usar variáveis de ambiente (`.env.local`).
