# Agendador de Salas da Paróquia — Requisitos


## Visão geral

O sistema organiza o uso das 6 a 7 salas da paróquia numa agenda pública, colorida por sala, em que qualquer pessoa consulta e pede uma sala, e a secretaria aprova. A referência é o Google Agenda, com melhorias pensadas para a realidade paroquial.

**Público:** coordenadores de pastorais, catequistas, movimentos e paroquianos, muitos deles idosos e acessando pelo celular; secretaria e responsáveis pela gestão das salas.

**Princípios:**

- **Simples antes de completo:** letras grandes, poucos botões por tela, linguagem do dia a dia.
- **Visualização aberta:** a agenda pode ser vista por todos, sem login.
- **Edição protegida:** só quem tem login e senha cria, altera ou aprova reservas.
- **Sem conflito de horário:** o sistema impede duas reservas confirmadas na mesma sala e horário.
- **WhatsApp como canal:** a solicitação fica registrada no sistema e também é enviada à secretaria pelo WhatsApp.

## Perfis de usuário e permissões

Três perfis atendem a paróquia: visitante sem login e usuários com login, cadastrados pelo administrador sem limite de quantidade, com perfil de secretaria ou de administração.

| Ação | Visitante (sem login) | Secretaria / Editor | Administrador |
|---|---|---|---|
| Ver agenda e salas | Sim | Sim | Sim |
| Solicitar sala | Sim | Sim | Sim |
| Ver nome e telefone de quem pediu | Não | Sim | Sim |
| Aprovar, editar ou recusar solicitações | Não | Sim | Sim |
| Criar e editar reservas e recorrências | Não | Sim | Sim |
| Cadastrar e editar salas (fotos, cores) | Não | Não | Sim |
| Cadastrar e gerenciar usuários | Não | Não | Sim |
| Alterar configurações (número do WhatsApp, textos) | Não | Não | Sim |
| Limpar dados pessoais de pedidos antigos | Não | Não | Sim |

O acesso é por e-mail e senha, com opção "Esqueci minha senha" por e-mail.

## Funcionalidades

### 1. Agenda

A agenda é a tela principal, aberta a todos, com cada sala numa cor fixa e o nome da sala sempre escrito junto da cor.

- **Hoje:** lista simples do que acontece no dia, por horário. É a tela inicial no celular.
- **Por sala:** colunas com as salas e linhas com os horários. Mostra de relance o que está livre.
- **Semana e Mês:** visões no estilo do Google Agenda.
- **Filtro por sala:** mostrar ou esconder salas, com legenda de cores sempre visível.
- **Salas livres agora:** botão na tela inicial que lista as salas desocupadas no momento.
- **Detalhe do evento:** ao tocar, mostra sala (com foto), horário, pastoral e atividade.
- **Solicitações pendentes:** aparecem tracejadas ou em tom mais claro, marcadas como "Aguardando confirmação".
- **Impressão da semana:** versão para imprimir e afixar no mural.
- **Modo TV:** agenda do dia em tela cheia para um monitor na secretaria ou na entrada, atualizada sozinha.

### 2. Cadastro de salas

Cada sala tem uma ficha com:

- nome e cor na agenda;
- uma ou mais fotos;
- capacidade (número de pessoas);
- localização (andar, prédio, ponto de referência);
- recursos: projetor, TV, som, ar-condicionado, ventilador, mesas, cadeiras, acessibilidade para cadeirantes;
- precisa buscar a chave na secretaria (Sim / Não), usado como padrão na aprovação;
- observações;
- situação: ativa ou inativa (ex.: em reforma), sem apagar o histórico.

A ficha da sala é pública e acessível pela agenda e pela solicitação.

### 3. Reservas e recorrência

A secretaria cria reservas avulsas ou recorrentes. Os campos são os mesmos da solicitação: responsável, pastoral, sala, data, horário, atividade e estimativa de pessoas.

Padrões de recorrência:

- todo dia, em dias da semana escolhidos;
- toda semana ou a cada 2 semanas;
- todo mês por posição (ex.: "toda 1ª sexta", "toda 3ª terça", "último sábado");
- todo mês por dia (ex.: "todo dia 15");
- com término por data ou por número de encontros.

Regras da recorrência:

- antes de salvar, o sistema mostra as datas que têm conflito e deixa pular ou trocar a sala só nelas;
- é possível cancelar ou mudar um único encontro sem afetar a série;
- ao editar, a secretaria escolhe: "só este", "este e os próximos" ou "todos";
- datas bloqueadas cadastradas (feriados, Semana Santa, Natal) podem ser puladas automaticamente.

### 4. Solicitar sala (menu lateral)

Formulário aberto a todos, sem login, com os campos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome do responsável | Texto | Sim |
| Telefone / WhatsApp | Telefone | Sim |
| Pastoral | Texto livre | Sim |
| Data | Calendário | Sim |
| Hora de início | Horário | Sim |
| Hora de término | Horário | Sim |
| Sala | Lista com foto | Sim |
| Descrição da atividade | Texto | Sim |
| Estimativa de pessoas | Número | Sim |
| É recorrente? | Sim / Não + padrão | Não |

O telefone foi acrescentado para a secretaria retornar ao solicitante. A sala é escolhida em cartões grandes com foto, nome e capacidade.

Ao enviar, o sistema:

1. Salva a solicitação como **pendente**, já visível na agenda como "Aguardando confirmação".
2. Abre o WhatsApp com a mensagem pronta para o número configurado, hoje +55 19 3421-2290.
3. Mostra a confirmação: "Seu pedido foi registrado. Toque em Enviar no WhatsApp para avisar a secretaria."

Modelo da mensagem:

```
*Solicitação de Sala* — Pedido nº 0123
Responsável: Maria da Silva — (19) 99999-0000
Pastoral: Catequese
Sala: Sala São José
Data: 12/11/2026, das 19h00 às 21h00
Atividade: Encontro de pais
Pessoas: 25
```

### 5. Verificação de disponibilidade

Assim que a pessoa escolhe data, horário e sala, o sistema mostra na hora:

| Situação | O que aparece | Pode enviar? |
|---|---|---|
| Sala livre | "Sala livre neste horário" em verde | Sim |
| Pedido pendente no horário | "Já existe um pedido aguardando confirmação" em amarelo | Sim, a secretaria decide |
| Sala ocupada | "Sala ocupada" em vermelho, com o evento e outras salas livres no mesmo horário | Não |
| Capacidade menor que a estimativa | Aviso "Esta sala comporta até X pessoas" | Sim, com aviso |

Na lista de salas, cada cartão já indica se está livre ou ocupada no horário escolhido. O banco de dados também impede duas reservas confirmadas sobrepostas, mesmo que duas pessoas aprovem ao mesmo tempo.

### 6. Painel da secretaria

- Lista de solicitações pendentes, das mais antigas para as mais novas, com contador no menu.
- Para cada pedido: **Confirmar**, **Editar e confirmar** (trocar sala ou horário) ou **Não aprovar** com motivo.
- Campo **"Buscar a chave na secretaria?"** (Sim / Não), já preenchido conforme a ficha da sala; a secretaria pode alterar em cada pedido.
- Ao confirmar ou não aprovar, o sistema abre o WhatsApp no número do solicitante com a mensagem de retorno pronta; a secretaria só toca em Enviar.
- Histórico de quem criou, aprovou ou alterou cada reserva.

**Mensagem de retorno — aprovada** (a linha da chave aparece só quando marcado "Sim"; se sala ou horário forem alterados, a mensagem avisa a mudança):

```
*Reserva APROVADA* — Pedido nº 0123
Sala: Sala São José
Data: 12/11/2026, das 19h00 às 21h00
Pastoral: Catequese
*BUSCAR A CHAVE NA SECRETARIA* antes do horário.
```

**Mensagem de retorno — não aprovada:**

```
*Reserva NÃO APROVADA* — Pedido nº 0123
Sala: Sala São José
Data: 12/11/2026, das 19h00 às 21h00
Motivo: sala já reservada para outra atividade.
Procure a secretaria para combinar outra data ou sala.
```

### 7. Configurações

- **Número do WhatsApp da secretaria:** campo editável pelo administrador.
- Textos dos modelos de mensagem: solicitação, aprovada e não aprovada.
- Horário de funcionamento exibido na agenda (ex.: 7h às 22h).
- Datas bloqueadas (feriados e períodos litúrgicos).
- Nome e logotipo da paróquia.

## Fluxos principais

### Solicitar e aprovar uma sala

Fluxo da solicitação:

1. A pessoa preenche o pedido.
2. O sistema verifica a sala na hora.
3. Se a sala está ocupada: sugere outras salas livres e a pessoa escolhe outra.
4. Se não está ocupada: salva como pendente e abre o WhatsApp com a mensagem pronta.
5. A secretaria analisa o pedido.
6. Se confirma ou edita: a reserva entra na agenda e abre-se o aviso de aprovação no WhatsApp.
7. Se não aprova: abre-se o aviso de não aprovação no WhatsApp, com o motivo.

Se a sala estiver ocupada, a pessoa escolhe outra sem sair do formulário; pedidos pendentes no mesmo horário não bloqueiam o envio, quem decide é a secretaria.

### Criar uma recorrência (secretaria)

1. Preencher a reserva normalmente e marcar "Repetir".
2. Escolher o padrão (ex.: "toda 3ª terça") e o término.
3. Conferir a lista de datas geradas, com conflitos e datas bloqueadas destacados.
4. Pular ou trocar a sala nas datas com conflito e salvar.

## Acessibilidade e usabilidade

O sistema deve ser usado sem ajuda por uma pessoa de 70 anos no próprio celular. Esse é o critério de aceite das telas.

- **Texto:** mínimo de 18 px no corpo, títulos maiores; botão "A+ / A−" para aumentar a letra.
- **Contraste:** texto escuro sobre fundo claro, sem cinza-claro em informação importante.
- **Botões:** grandes, com no mínimo 48 px de altura, ícone e texto juntos.
- **Cores:** paleta de 7 cores bem distintas entre si, sempre acompanhadas do nome da sala; nada é informado só pela cor.
- **Linguagem:** "Pedir uma sala", "Ver a agenda", "Salas livres agora"; sem termos técnicos.
- **Formulário:** um campo por linha, rótulos sempre visíveis, data e hora escolhidas em seletores grandes, mensagens de erro claras ao lado do campo.
- **Navegação:** menu lateral no computador e barra inferior com 3 ou 4 opções no celular; sem gestos escondidos.
- **Celular primeiro:** todas as telas pensadas para o celular e adaptadas para computador e TV.
- **Teste com usuários reais:** validar o protótipo com 3 a 5 paroquianos mais velhos antes da entrega final.

## Privacidade e LGPD

A agenda pública mostra apenas sala, horário, pastoral e atividade; nome e telefone do solicitante ficam visíveis só para quem tem login.

- Aviso curto no formulário: "Seus dados serão usados apenas pela secretaria para tratar este pedido."
- Senhas guardadas de forma criptografada pelo serviço de login; nenhuma senha em texto aberto.
- Regras de acesso no próprio banco de dados, para que visitantes não leiam dados pessoais nem por acesso direto.
- Limpeza de dados exclusiva do administrador: ele escolhe o período e apaga nome e telefone de solicitações recusadas ou antigas; a ação pede confirmação e fica registrada no histórico.

## Arquitetura técnica

O sistema roda em Vercel (site) e Supabase (banco, login e fotos), dois serviços com plano gratuito suficiente para o porte da paróquia.

| Parte | Tecnologia | Função |
|---|---|---|
| Site | Next.js (React) na Vercel | Telas da agenda, solicitação e painel |
| Banco de dados | Supabase (PostgreSQL) | Salas, reservas, solicitações, configurações |
| Login | Supabase Auth | E-mail e senha dos usuários cadastrados |
| Fotos | Supabase Storage | Fotos das salas, reduzidas no envio |
| Segurança de dados | Regras RLS do Supabase | Visitante só lê dados públicos |
| WhatsApp | Link wa.me com texto pronto | Abre a conversa no celular ou no WhatsApp Web |

### Modelo de dados (resumo)

| Tabela | Principais campos |
|---|---|
| salas | nome, cor, capacidade, localização, recursos, observações, precisa de chave, ativa |
| fotos_sala | sala, arquivo, ordem |
| series | regra de recorrência, data de início, data ou número de término |
| reservas | sala, início, fim, pastoral, atividade, pessoas, responsável, telefone, situação (pendente, confirmada, recusada, cancelada), buscar chave (sim/não), motivo da não aprovação, série |
| datas_bloqueadas | data, descrição |
| configuracoes | número do WhatsApp, modelo de mensagem, horário de funcionamento |
| usuarios | nome, e-mail, perfil (editor ou administrador) |
| historico | reserva, ação, usuário, data e hora |

Cada encontro de uma recorrência vira uma linha em **reservas**, ligada à sua série. Isso permite mudar um único encontro e checar conflitos de forma simples. Uma restrição no banco impede duas reservas confirmadas sobrepostas na mesma sala.

### Cuidados com os planos gratuitos

- O Supabase gratuito pausa projetos sem uso por 7 dias; com uso diário isso não ocorre, mas vale um acesso automático periódico.
- O armazenamento gratuito comporta folgadamente as fotos de 7 salas, desde que reduzidas no envio.
- Backup semanal do banco exportado automaticamente.

### Migração para o site da paróquia

O banco e o login continuam no Supabase; só muda onde o site fica. Opções, da mais simples à mais trabalhosa:

1. Subdomínio apontando para a Vercel (ex.: agenda.paroquia.org.br), com link no menu do site.
2. Agenda incorporada numa página do site atual.
3. Hospedagem do sistema no mesmo servidor do site, se ele suportar Node.js.

## Fases de entrega

A entrega em três fases coloca a agenda em uso cedo e deixa os extras para depois que a paróquia estiver usando.

1. **Fase 1 — Essencial:** login, cadastro de salas com fotos, agenda (Hoje, Por sala, Semana, Mês) com cores, reservas avulsas, solicitação com verificação de disponibilidade e WhatsApp, painel de pendentes com mensagem de retorno pelo WhatsApp (aprovada ou não, com aviso da chave), configuração do número.
2. **Fase 2 — Recorrência e rotina:** recorrências completas com exceções, datas bloqueadas, histórico de alterações.
3. **Fase 3 — Extras:** impressão da semana, modo TV, migração para o domínio do site da paróquia.

**Fora do escopo inicial:** envio automático de mensagens pelo WhatsApp (exige a API paga do WhatsApp Business), aplicativo nas lojas, cobrança pelo uso das salas, controle de chaves e de materiais.

## Decisões aprovadas

- [x] Número do WhatsApp Business confirmado e editável nas configurações
- [x] Solicitação salva como pendente para a secretaria editar e confirmar
- [x] Pastoral como campo livre
- [x] Hospedagem inicial em Vercel e Supabase
- [x] Lista final das salas, com nome, foto, capacidade e cor de cada uma
- [x] Nomes e e-mails dos usuários e quem será administrador, cadastrados no próprio sistema
- [x] Limpeza de dados pessoais disponível apenas para o administrador
- [x] Aprovação das fases de entrega
- [x] Horário de funcionamento exibido na agenda, configurável pelo administrador
- [x] Mensagem de retorno (aprovada / não aprovada) com aviso "BUSCAR A CHAVE NA SECRETARIA"
