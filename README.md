# Plataforma Dros

Plataforma interna composta por dois sistemas independentes que compartilham infraestrutura e padrões de arquitetura: o **Hub** para gestão operacional da agência e o **Painel de Performance** para análise consolidada de campanhas dos clientes.

---

## Hub

Sistema de gestão completo para operação de agência de marketing, com workflow editorial estruturado, ciclo de aprovação cliente-equipe, controle financeiro e calendário de produção audiovisual.

### Funcionalidades

#### Gestão Multi-tenant de Clientes e Contas
- Cadastro hierárquico de clientes, contas e usuários com isolamento completo entre tenants
- Filtragem automática por `client_id` em toda camada de dados
- Sistema de papéis granular: `dono`, `gerente`, `funcionario`, `cliente`
- Visibilidade restrita para perfis cliente — só acessam tarefas em estágios de aprovação

#### Workflow Editorial Estruturado
- Tarefa-mãe (`mae_editorial`) gera automaticamente cinco subtarefas iniciais (Briefing, Reunião de Aprovação Cliente, Aprovação Interna Final, Aprovação Cliente Final, Publicação)
- Triggers dinâmicos disparam subtarefas adicionais conforme a tarefa avança no pipeline:
  - Briefing → Criação de Imagens (paralelo)
  - Criação de Imagens → Programação de Publicação
  - Reunião → Gravação (com data/hora obrigatória)
  - Gravação → Subir Arquivos → Editar Vídeos → Programar Publicação
- Auto-fechamento da tarefa-mãe quando todas as 11 subtarefas conhecidas concluem
- Atribuição automática a usuários específicos por departamento

#### Ciclo de Aprovação Cliente
- Estágio dedicado `aguardando_cliente` com interface dedicada para aprovação ou solicitação de alteração
- Solicitação de alteração com texto livre que volta a tarefa para `revisao_interna`, com flag persistente na pipeline e banner contextual no detalhe
- Solicitação de tarefa pelo cliente (estágio `solicitacao_pendente`) com aprovação obrigatória de gerente/dono antes de virar backlog
- Trilha de auditoria completa de transições entre estágios

#### Calendário de Gravações
- Visualização agregada de tarefas com `subtask_kind='gravacao'` ou departamento de Captação que tenham `recording_datetime` definido
- Sincronização automática com tarefas-mãe relacionadas

#### Controle Financeiro
- DRE (Demonstrativo de Resultados) com cálculo automático por período
- Despesas fixas e variáveis com data de pagamento (`paid_at`) auditada
- Parcelamentos com geração automática de parcelas
- Receitas extras fora do fluxo padrão de cobrança
- Relatórios consolidados por mês, trimestre e ano

#### Timer Automático de Produção
- Start automático ao entrar no estágio `em_producao`
- Stop automático na saída, com cálculo preciso de duração
- Agregação de tempo da tarefa-mãe a partir das filhas
- Histórico de sessões de trabalho por tarefa e por usuário

### Arquitetura

- **API REST** organizada por domínio (`tasks`, `clients`, `users`, `financial`, `approvals`)
- **SSE (Server-Sent Events)** com canais segmentados por `account` e `user` para atualização em tempo real respeitando isolamento multi-tenant
- **Persistência embarcada** em SQLite via `better-sqlite3`, com migrations idempotentes na inicialização do servidor
- **Autenticação JWT** com middleware unificado e validação por papel/permissão
- **Frontend SPA** servido como estático pela própria API, com base path `/hub/`

### Stack

- Node.js + Express 5
- SQLite (`better-sqlite3` v12) — banco embarcado, zero overhead de configuração
- React 19 + TypeScript 5 + Vite 6
- React Router 7, Recharts, Lucide React
- jsonwebtoken + bcryptjs

---

## Painel de Performance

Dashboard consolidado de performance para clientes da agência. Centraliza dados de aquisição paga (Meta Ads, Google Ads), conversão (Kiwify) e qualificação de leads em uma única interface visual.

### Funcionalidades

#### Consolidação Multi-plataforma
- Integração nativa com **Meta Marketing API** (Facebook/Instagram Ads) — extração de spend, impressões, cliques, CPC, CPM, CTR e conversões por campanha
- Integração com **Google Ads API** via OAuth2 com refresh token persistido — métricas de campanhas Search/Display/PMAX, com suporte a hierarquia MCC (manager account)
- Integração com **Kiwify** via OAuth2 — vendas, taxa de aprovação, ticket médio e LTV
- Normalização de dados entre plataformas com modelo unificado de campanha/conjunto/anúncio

#### Visualização Comparativa
- Gráficos temporais de evolução por métrica e plataforma
- Comparação direta de performance entre origens de tráfego
- Funil de conversão completo (impressões → cliques → leads → vendas)
- Análise de retorno (ROAS, CPA, CAC) calculada cross-plataforma

#### Qualificação de Leads
- Pipeline de qualificação configurável por cliente
- Mapeamento de leads por origem (Meta Lead Ads, formulário, manual)
- Métricas de taxa de qualificação por campanha e por período
- Identificação de campanhas com leads não qualificados para otimização

#### Acesso Multi-cliente
- Cada cliente acessa apenas seu próprio dashboard via login dedicado
- Painel administrativo para gestão de credenciais de integração por cliente
- Refresh automático de tokens OAuth2 em background

### Arquitetura

- **Adapters por plataforma** — camada de abstração que normaliza diferenças de API entre Meta, Google e Kiwify
- **Cache de respostas** com invalidação por TTL para reduzir custo de chamadas externas e respeitar rate limits
- **Refresh de tokens em background** — worker dedicado renova credenciais OAuth antes do vencimento
- **API REST** com rotas por integração (`/api/meta`, `/api/google-ads`, `/api/kiwify`)
- **Frontend SPA** com base path `/core/`, mesmo padrão de servir estáticos pela própria API

### Stack

- Node.js + Express 5
- SQLite (`better-sqlite3` v12) para cache de tokens, configurações e histórico
- React 19 + TypeScript 5 + Vite 6
- Recharts para visualizações temporais e comparativas
- OAuth2 client implementations para Google Ads e Kiwify
- jsonwebtoken + bcryptjs

---

## Arquitetura compartilhada

Ambos os sistemas seguem o mesmo padrão arquitetural, o que reduz custo de manutenção e simplifica onboarding entre eles:

- **Backend Express monolítico** servindo API REST + SPA estático no mesmo processo
- **SQLite embarcado** como persistência primária — sem dependência de banco externo, sem custo de gerenciamento de conexões, com performance superior em workloads de leitura intensa
- **Schema versionado** com migrations idempotentes executadas na inicialização — atualizações de modelo não exigem coordenação manual em deploy
- **Autenticação JWT stateless** com tokens de expiração configurável e middleware reutilizável
- **SSE para realtime** quando aplicável, evitando complexidade de WebSocket bidirecional para casos de uso unidirecionais (notificações, atualizações de UI)
- **Process manager PM2** em produção com logs estruturados e restart automático
- **Multi-tenancy enforced em SQL** — toda query de domínio filtra por `client_id` no nível de query, não no nível de aplicação

## Segurança

- Senhas armazenadas com bcrypt (salt + hash, custo configurável)
- Tokens JWT assinados com secret rotacionável
- OAuth2 refresh tokens criptografados em repouso (Painel de Performance)
- Webhooks de entrada verificados por token secreto antes de processamento
- Validação de entrada em todas as rotas que aceitam payload externo
- CORS configurado por ambiente, com whitelist explícita em produção
- Logs estruturados sem exposição de credenciais ou dados sensíveis

## Frontend Build Strategy

Os bundles do frontend são gerados localmente em ambiente de desenvolvimento (Node.js 18+) e versionados como artefato em `dist/`. Esta estratégia é deliberada e tem três motivações:

1. **Compatibilidade com infraestrutura legada** — o servidor de produção roda Node 16, incompatível com versões modernas do Vite (6+) que exigem APIs do Node 18+
2. **Deploy idempotente e rápido** — não há etapa de build no servidor, eliminando classes inteiras de erro (compilação de módulos nativos, divergência de cache npm, falhas de rede em CDN)
3. **Reprodutibilidade** — o bundle é deterministicamente o mesmo entre ambiente local e produção, eliminando "works on my machine"

Esta decisão é revisada quando há migração de versão da plataforma de execução.
