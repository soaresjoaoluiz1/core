# Contributing to Opensquad

Você está contribuindo para algo maior que código.

Opensquad existe para liberar empresas do trabalho repetitivo. Cada skill que você cria, cada melhoria que você faz, permite que empreendedores e times dediquem seu tempo àquilo que máquinas não conseguem fazer: criatividade, relacionamento, decisão humana.

Você não está apenas desenvolvendo um framework. Você está mudando a forma como as pessoas trabalham.

---

## Bem-vindo

Queremos contribuidores que entendem nossa missão: **liberar tempo para trabalho humano**.

### Quem somos

Opensquad é um framework de orquestração multi-agente. Ajudamos empreendedores e profissionais não-técnicos a criar times de agentes de IA que trabalham juntos automaticamente.

### Quem queremos como contribuidor

- Designers de IA (entendem prompts, orquestração de agentes)
- Desenvolvedores (podem implementar integrações técnicas)
- Qualquer mix de skill — desde que entenda nossa visão

### O que valorizamos

- **Simplicidade sobre features** — não adicione "só porque sim"
- **Performance, clareza, código limpo** — faça mais com menos
- **Sem fricção, sem carga cognitiva** — se complica, não entra

---

## O Que NÃO Fazer

Algumas contribuições não servem nossa missão. Elas adicionam complexidade sem liberar tempo humano. Vamos rejeitar, educadamente, com explicações.

### Exemplos de anti-padrões

Estas contribuições serão **rejeitadas**, educadamente:

❌ **Docker, containerização**
Adiciona complexidade de setup para usuários não-técnicos. Contra-produtivo.

❌ **Banco de dados, multi-org, SQLite**
Aumenta carga cognitiva e complexidade arquitetural. Quebra simplicidade.

❌ **Features "enterprise"** (SAML, billing, multi-tenancy)
Scope creep que não serve nosso core mission. Não é pra esse projeto.

❌ **Mudanças que complicam UX**
Torna o software mais difícil de usar, não entra.

❌ **Infraestrutura por infraestrutura** (CI/CD pipelines, deployment tools)
A menos que sirvam contribuidores ou usuários finais diretamente.

### Teste sua ideia

Pergunte-se: *"Isso ajuda um empreendedor fazer mais em menos tempo, ou adiciona fricção?"*

Se em dúvida, abra uma issue para discutir antes de investir tempo em código.

---

## Como Contribuir

Você pode contribuir de 3 formas. Escolha a sua.

### 1️⃣ Criar Uma Nova Skill

Uma **skill** é um superpoder novo para squads. Ela conecta Opensquad a plataformas externas, dá aos agentes novos conhecimentos, novas capacidades.

#### Que skills valem a pena?

- Integrações com ferramentas que empreendedores já usam (Canva, Instagram, YouTube, Apify)
- Automação de tarefas repetitivas (buscar dados, processar, publicar)
- Modelos de IA especializados (análise, criação, otimização)

#### Passo a passo

**1. Defina a skill**

O que ela resolve? Para quem?

**2. Escolha o tipo**

- **MCP** — Integração com API externa
- **Script** — Lógica customizada (Node.js, Python, Bash)
- **Hybrid** — MCP + script combinados
- **Prompt** — Instruções puras para agentes

**3. Use a ferramenta `/opensquad-skill-creator`**

Em sua IDE (Claude Code, Cursor, Codex), rode:

```
/opensquad-skill-creator
```

Essa ferramenta (um assistente de IA) vai te guiar por:
- Definir o que a skill faz
- Escolher o tipo correto
- Escrever o arquivo SKILL.md
- Testar com prompts reais
- Iterar baseado em feedback

**Se a ferramenta não estiver disponível:**
- Veja `skills/README.md` para estrutura de skill
- Veja skills existentes (`skills/canva/SKILL.md`, `skills/instagram-publisher/SKILL.md`) como template
- Crie o arquivo SKILL.md seguindo o formato (YAML frontmatter + Markdown body)
- Teste manualmente ou abra issue se tiver dúvidas

**4. Teste com dados reais**

Certifique-se que funciona em runs reais de squads.

**5. Abra um PR**

Com documentação clara.

#### Requisitos

- Resolve um problema real (não feature creep)
- Bem documentada (usuários não-técnicos conseguem usar)
- Com testes (se aplicável)
- Metadados SKILL.md corretos (name, description, version, type, env vars)

**Veja também:** `skills/README.md` e skills existentes (`canva/`, `instagram-publisher/`, `image-creator/`)

---

### 2️⃣ Criar Um Template de Squad

Um **template** é um squad reutilizável. Você desenha um workflow, automatiza um processo, e multiplica o impacto: centenas de empreendedores economizam horas.

#### Que templates valem a pena?

- **Content creation** — Instagram carousels, LinkedIn posts, emails, blog posts
- **Research & analysis** — Análise de tendências, research competitivo, dados de mercado
- **Customer support** — Geração de FAQs, triage de tickets, draft de respostas
- **Product launch** — Sales pages, messaging, email campaigns, landing pages
- **Training** — Scripts de tutoriais, guides com screenshots, video outlines

#### Passo a passo

**1. Crie o squad**

Na sua IDE, rode:

```
/opensquad create
```

Ou abra o menu:

```
/opensquad
```

O Architect vai te guiar.

**2. Desenvolva e teste**

Construa os agentes, teste com dados reais, itere até funcionar perfeitamente.

**3. Documente em `squads/<squad-name>/README.md`**

Use essa estrutura:

```markdown
# Squad Name

## O que este squad faz

[2-3 sentences explicando o problema que resolve]

## Quem deveria usar

[Seu público-alvo]

## Antes de começar

- Variáveis de ambiente necessárias (API keys, etc.)
- Contas externas ou ferramentas required

## Como usar

1. Rode: `/opensquad run <squad-name>`
2. Siga os prompts
3. Veja resultados em `output/`

## Inputs & Outputs

**Inputs:** [O que o squad espera de você?]

**Outputs:** [O que o squad produz?]

## Exemplo

[Mostre um exemplo real: inputs que você deu, outputs que o squad produziu]
```

**4. Salve em `squads/` e abra PR**

Estrutura:
```
squads/
  instagram-carousel-generator/
    README.md
    [squad files]
    output/
```

#### Requisitos

- Resolve um problema real que empreendedores enfrentam hoje (trabalho manual, ferramentas espalhadas)
- Documentação clara e amigável para não-técnicos (use template acima)
- Funciona pronto para rodar, sem tweaks necessários)
- Inclui um exemplo real (inputs/outputs demonstrados)

---

### 3️⃣ Melhorias Internas

**Melhoria** = performance, tamanho de arquivo, deduplicação, clareza de mensagens, documentação.

Parecem "pequenas", mas compõem. Um squad 10% mais rápido economiza horas por ano.

#### Que melhorias valem a pena?

- Otimizar velocidade de execução de squads
- Reduzir tamanho de arquivos (instalar/atualizar mais rápido)
- Remover código duplicado ou instruções
- Melhorar mensagens de erro
- Refatorar engine (simplificar, manutenibilidade)

#### Passo a passo

**1. Identifique a melhoria**

Onde está o bottleneck? Duplicação? Issue de clareza?

**2. Meça o impacto**

Antes/depois: tempo, tamanho, memória.

**3. Implemente**

Faça a mudança.

**4. Teste**

Rode `npm test` — tudo deve passar.

**5. Abra PR**

Com medições e rationale.

#### Requisitos

- NÃO muda comportamento existente
- Se precisar mudar, abra issue first pra discussão
- Testes passam
- Dados de benchmark (before/after)

---

## Fluxo Prático: Do Código pro Merge

### Setup

```bash
git clone https://github.com/renatoasse/opensquad
cd opensquad
npm install
npm test
```

### Crie uma branch

```bash
# Para skills
git checkout -b skill/seu-nome

# Para templates
git checkout -b template/seu-squad

# Para melhorias
git checkout -b improve/descrição
```

Exemplos:
```
skill/slack-integration
template/linkedin-content-machine
improve/reduce-squad-startup-time
```

### Desenvolva

- Código limpo, seguindo patterns existentes
- Teste localmente com casos reais
- Commits atômicos e claros

### Mensagens de commit

```
feat: add skill for LinkedIn schedule & publish
improve: reduce squad startup time by 40%
docs: clarify CONTRIBUTING.md for skill creators
fix: prevent duplicate agent instructions
```

Evite:
```
updated stuff
fix typo
wip
```

### Teste antes de submeter

```bash
npm test
```

- **Skills:** teste com dados reais, screenshots
- **Templates:** test squad end-to-end, mostre inputs/outputs
- **Melhorias:** benchmark antes/depois

### Abra um Pull Request

**Título claro:**
```
Add skill: Slack integration for squad notifications
Improve: reduce squad execution time by 35%
```

**Descrição:**

```markdown
## O que isto faz

[1-2 sentences]

## Por que importa

[Como serve nossa missão?]

## Como testei

[Detalhe seu teste]

Para skills/templates: screenshots, outputs
Para melhorias: benchmark data
```

**Exemplo (Skill):**

```markdown
## O que isto faz

Nova skill para gerar Instagram Reels automaticamente.

## Por que importa

Empreendedores gastam horas criando e editando Reels.
Esta skill automatiza: scripting → geração de vídeo → captions → publicação.

## Como testei

- Criei 5 Reels teste com tipos de conteúdo diferentes
- Verifiquei que publicam corretamente via Instagram API
- Testei edge cases: missing API key, rate limits

Outputs: [attach screenshots]

## Sem breaking changes
```

**Exemplo (Melhoria):**

```markdown
## O que isto faz

Otimiza squad startup reduzindo parsing de instruções.

## Por que importa

Startup mais rápido = iteração mais rápida = empreendedores mais produtivos.

## Benchmark

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Startup | 2.3s | 1.9s | 17% mais rápido |
| File size | 850KB | 820KB | 30KB menor |

Todos os testes passam.
```

### Review & Merge

- Vamos fazer perguntas — é colaborativo, não crítica
- Esperamos resposta em 2-3 dias
- Padrões que checamos:
  - Serve nossa missão?
  - Código de qualidade?
  - Afeta UX positivamente?

---

## Code Style & Qualidade

### Simplicidade em primeiro lugar

- **YAGNI** — não adicione features "just in case"
- **Legibilidade > Cleverness** — código claro > código smart
- **Uma coisa, feita bem** — evite soluções muito genéricas

### Código

Opensquad segue estas convenções:

- **JavaScript/Node.js** — ESLint e Prettier configurados
  - Rode: `npm run lint` pra checar
  - Rode: `npm run format` pra auto-fix
- **Naming** — kebab-case para arquivos/folders (`skill-name/`, `script.js`)
- **Indentação** — 2 spaces
- **Comentários** — só onde lógica não é óbvia

Veja skills e templates existentes para exemplos.

### Testes

- **Skills** — Inclua testes se output é verificável (transformações, extrações, API calls)
  - Rode: `npm test` antes de PR
  - Formato: Node.js test runner
- **Templates** — Teste manual com dados reais
  - Documente: inputs usados, outputs recebidos, casos extremos testados
- **Melhorias** — Mantenha cobertura de testes; `npm test` antes de PR

### Documentação

- **Skills**
  - SKILL.md frontmatter claro (name, description, version, type, env vars)
  - Instruções que não-técnicos conseguem seguir
  - Exemplos do que a skill faz
- **Templates**
  - README.md detalhado na pasta do squad
  - O que resolve, inputs, outputs, prerequisites, como usar
  - Dados de exemplo ou screenshots
- **Código** — Comentários só onde lógica não é óbvia

### Performance & Código Limpo

- Pense em squad runtime e tamanho de arquivos
- Se adiciona dependência, justifique no PR
- Otimize instruções (remova duplicação)
- **Menor é melhor** — se pode remover, remova

---

## Processo de Review & Governance

### Quem revisa?

Time core do Opensquad. Somos pequenos e lean — reviews são colaborativas.

### Timeline esperada

- **Reconhecimento** — 24 horas
- **Primeira review** — 2-3 dias
- **Mudanças complexas** — pode levar mais; vamos avisar
- **Revisões** — iteramos juntos

### Critério de merge

PR pronto quando:

- ✅ Passa em `npm test`
- ✅ Serve nossa missão (adiciona valor, sem fricção)
- ✅ Documentação clara (não-técnicos entendem)
- ✅ Sem breaking changes (a menos que discutido)
- ✅ Feedback endereçado e aprovado

### Dúvidas durante review?

Vamos perguntar pra entender. Pergunte de volta se feedback não for claro!

---

## Community & Support

### Antes de codar

Tem dúvida se algo encaixa? Abra uma issue ou discussion. Sem pressa em codar primeiro pra validar.

### Quando trava

- **GitHub Issues** (https://github.com/renatoasse/opensquad/issues) — Reporte bugs, peça clarificação, discuta ideias
- **GitHub Discussions** (https://github.com/renatoasse/opensquad/discussions) — Perguntas, feedback, colaboração
- **Community Chat** — Discord (link no README)

### Code of Conduct

- Respeito e colaboração
- Assuma boa intenção
- Ajude outros crescerem
- Discordâncias são profissionais

---

## License & IP

Ao submeter um PR, você concorda que sua contribuição será licensiada sob a mesma licença do Opensquad (MIT License).

Você **retém copyright**. Opensquad ganha direito de usar e distribuir seu código.

**Nenhum CLA (Contributor License Agreement) necessário.**

---

## Checklist Antes de Submeter

- [ ] Código segue patterns existentes no repo
- [ ] Testes passam (`npm test`)
- [ ] Documentação é clara (mesmo pra não-técnicos)
- [ ] Sem breaking changes (ou justificado em PR)
- [ ] Título e descrição de PR são claros
- [ ] Benchmark/test results inclusos (se aplicável)

---

## FAQ

**P: Posso submeter ideias meio prontas?**

R: Melhor abrir issue pra validar antes de investir tempo em código.

**P: E se meu PR for rejeitado?**

R: Vamos explicar o porquê. Se não encaixa nossa missão, diremos. Você pode iterar ou tentar outra PR no futuro.

**P: Quanto tempo pra review?**

R: Alvejamos 2-3 dias. Mudanças complexas podem levar mais. Vamos comunicar se precisamos de tempo.

**P: Posso contribuir em múltiplos tipos?**

R: Claro! Mas mantenha PRs focadas — um tipo por PR.

**P: Quero sugerir mudança grande no engine.**

R: Abra issue primeiro. Decisões arquiteturais grandes merecem discussão antes de código.

---

## Success

Você contribuiu com sucesso quando:

1. ✅ PR foi mergeado
2. ✅ Skill/template está installável e documentado
3. ✅ Empreendedores usam pra economizar tempo
4. ✅ Você nos moveu mais perto da missão: **liberar pessoas pra focar em trabalho humano**

Bem-vindo ao Opensquad. Vamos construir algo significativo juntos.
