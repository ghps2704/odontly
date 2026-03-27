# Odontly (Sozio ERP) — Guia para Claude

## O que é este projeto

**Odontly** (package name: `sozio-erp`) é um sistema ERP completo voltado para clínicas odontológicas e PMEs. Inclui:
- Agendamentos e controle de profissionais
- Catálogo de produtos, serviços e insumos com BOM (Bill of Materials)
- Gestão financeira com DRE e fluxo de caixa
- Compliance fiscal brasileiro (NF-e, NCM, CEST)
- Gestão de contatos (clientes e fornecedores)
- Copiloto de IA via Google Gemini (análise de margens, previsão, busca de fornecedores)

---

## Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Framework | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Backend/DB | Supabase (PostgreSQL + Auth) |
| IA | Google Gemini (`@google/genai`) |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Estilização | Tailwind CSS (via CDN no `index.html`) |

---

## Comandos principais

```bash
npm run dev      # Servidor de desenvolvimento em localhost:3000
npm run build    # Build de produção (saída em dist/)
npm run preview  # Preview do build de produção
```

---

## Variáveis de ambiente

Arquivo: `.env.local` (não commitar)

```bash
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
GEMINI_API_KEY=[gemini-key]
```

---

## Estrutura do projeto

```
/
├── app.html                 # HTML entry point da aplicação React
├── index.html               # Landing page (marketing)
├── landing.html             # Versão alternativa da landing
├── vite.config.ts           # Config Vite (porta 3000, alias @/* → src/)
├── tsconfig.json
│
├── public/
│   ├── favicon.svg
│   └── sitemap.xml
│
└── src/
    ├── App.tsx              # Roteamento principal e controle de auth
    ├── main.tsx             # Entry point React DOM
    │
    ├── types/
    │   └── index.ts         # Todos os tipos TypeScript do domínio
    │
    ├── contexts/
    │   └── NexusContext.tsx # Context global — toda a state da app
    │
    ├── components/
    │   ├── Layout.tsx       # Shell com navegação lateral
    │   └── ui/
    │       └── logo.tsx     # Logo do sistema
    │
    ├── pages/
    │   ├── Dashboard.tsx    # KPIs e gráficos financeiros
    │   ├── Calendar.tsx     # Agendamentos
    │   ├── Catalog.tsx      # Produtos, serviços e insumos
    │   ├── Contacts.tsx     # Clientes e fornecedores
    │   ├── Finance.tsx      # Lançamentos e DRE
    │   ├── Fiscal.tsx       # Notas fiscais e tributação
    │   ├── Settings.tsx     # Configurações (protegido por PIN)
    │   ├── Login.tsx        # Tela de autenticação
    │   └── AICopilot.tsx    # Interface do copiloto Gemini
    │
    ├── integrations/
    │   ├── supabase.ts      # Cliente Supabase configurado
    │   ├── gemini.ts        # Integração com Google Gemini AI
    │   └── firebase.ts      # Configuração Firebase
    │
    ├── hooks/               # Custom React hooks
    ├── lib/                 # Utilitários e helpers
    └── data/                # Dados estáticos / seeds
```

---

## Arquitetura e padrões

### Estado global
- **React Context API** via `NexusContext` — estado monolítico centralizado
- Todos os dados são carregados no login via `Promise.all` (load paralelo)
- Atualizações otimistas: UI atualiza antes da confirmação do DB
- Toda persistência vai direto ao Supabase

### Tabelas Supabase
Todas isoladas por `user_id`:

| Tabela | Propósito |
|--------|-----------|
| `items` | Catálogo (produtos, serviços, insumos) |
| `transactions` | Lançamentos financeiros |
| `appointments` | Agendamentos |
| `contacts` | Clientes e fornecedores |
| `accounts` | Contas bancárias e caixa |
| `professionals` | Profissionais da clínica |
| `invoices` | Notas fiscais |
| `categories` | Categorias financeiras |
| `settings` | Configurações por usuário |

### Autenticação
1. Login Supabase (email/senha)
2. Sessão persistida no `localStorage` com auto-refresh
3. PIN opcional protege módulos sensíveis (Financeiro, Configurações)

### Integração IA
- Modelo: Gemini Flash com grounding via Google Search
- Recebe contexto completo: estoque, transações, margens
- Detecta erosão de margem e sugere fornecedores

---

## Tipos de domínio principais (`types.ts`)

- **Item**: produto/serviço/insumo com preço, custo, estoque, BOM, NCM/CEST
- **Transaction**: lançamento com itens, categoria, status, parcelamento, recorrência, impacto fiscal/gerencial
- **Appointment**: agendamento com profissional, cliente, itens consumidos, duração, status, NPS
- **Contact**: cliente ou fornecedor com endereço e dados fiscais
- **Invoice**: NF-e com regime tributário, CFOP, impostos

---

## Convenções

- Alias `@/*` aponta para `src/`
- Componentes em PascalCase, arquivos `.tsx`
- Tipos centralizados em `src/types/index.ts` — não dispersar por componentes
- Tailwind via CDN: não há arquivo de config — classes direto no JSX
- Tema de cores: azul/ciano (`#0284c7`) com variantes `ice-blue`, `polar-white`, `deep-navy`
