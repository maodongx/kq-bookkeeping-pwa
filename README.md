# KQ Bookkeeping

A personal multi-currency bookkeeping PWA for two users (husband + wife). Tracks assets, transactions, market prices, and exchange rates across USD / JPY / CNY, with a Chinese UI.

- **Live**: https://kq-bookkeeping-pwa.vercel.app/
- **Repo**: https://github.com/maodongx/kq-bookkeeping-pwa

This is a personal project, not a public product. The design goals are:

1. **Free to run** — no paid services; every tier used is on the vendor's free plan.
2. **Zero friction** — install to home screen, stay logged in for 30 days, no third-party OAuth.
3. **Works on phones and desktops** — a PWA rather than a native app, so both users get updates instantly via URL.

## Features

- Add assets in 8 categories: US stocks, JP funds, CN funds, money-market funds (货币基金), managed portfolios (委托理财), bank deposits, cash, other
- Transactions with five types: buy, sell, deposit, withdraw, adjustment
- Live price fetching for US stocks (Yahoo), MUFG / Rakuten JP funds, CN funds (Tiantian)
- Exchange rates auto-refreshed on dashboard load
- Dashboard with net worth, 累计盈亏 / 近1月 / 年化 stats, allocation pie charts by tag and by risk level, and a net-worth line chart (1W / 1M / 3M / 6M / 1Y / ALL)
- Bookkeeping: 记账 page for daily entry across 17 spending categories; 明细 page listing spending by date with per-day quick-add; 分析 page with monthly & annual views, per-category drill-down, budget tracking, and a friendly cat popup when a monthly budget is in warning/danger
- Monthly and annual budget types — monthly budgets reset each month; annual budgets (美容美妆, 远途旅行, 父母) carry Jan 1 to Dec 31
- PWA with a purple cat icon and a hand-rolled service worker
- Asian finance color convention throughout (red = gain, green = loss)

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (ES2022 target, strict mode) |
| Styling | Tailwind CSS 4 |
| UI | HeroUI v3 (`@heroui/react`) |
| Charts | Recharts |
| Icons | Lucide React |
| Database | Supabase PostgreSQL (free tier, Tokyo region) |
| Auth | Supabase email + password, 30-day sessions |
| Hosting | Vercel (free tier, auto-deploy on push) |
| CI/CD | GitHub → Vercel (~30s) |
| Total monthly cost | $0 |

## Prerequisites

- Node 20 (pinned in `.node-version`). On macOS with Homebrew: `brew install node@20` and use `/opt/homebrew/opt/node@20/bin` in `PATH`.
- A Supabase project. Set up the schema from `supabase/migrations/*.sql` in order via the Supabase SQL Editor.

## Local Setup

```bash
git clone https://github.com/maodongx/kq-bookkeeping-pwa.git
cd kq-bookkeeping-pwa

# .npmrc in this repo forces the public npm registry.
# Do not delete it — your shell's default registry may be something else.
npm install

# Create .env.local with your Supabase project credentials
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EOF

npm run dev   # http://localhost:3000
```

## Scripts

```bash
npm run dev      # Dev server with Turbopack
npm run build    # Production build (runs tsc + bundling + static page gen)
npm run start    # Serve the production build
npm run lint     # ESLint flat config (Next core-web-vitals + TS)
```

There is no test runner configured. `npm run build` and `npm run lint` must both be clean before a commit.

## Project Layout

```
src/
├── app/
│   ├── (main)/                    # Auth-gated route group with tab bar
│   │   ├── layout.tsx             # Redirects to /login if not authed
│   │   ├── page.tsx               # Dashboard (总览) — server component
│   │   ├── assets/
│   │   │   ├── page.tsx           # Asset list grouped by category
│   │   │   ├── add/page.tsx       # Client form, reuses AssetForm
│   │   │   ├── [id]/page.tsx      # Asset detail + transaction history
│   │   │   └── [id]/edit/page.tsx # Client form, reuses AssetForm
│   │   ├── spending/page.tsx      # 记账 — category grid entry
│   │   ├── details/page.tsx       # 明细 — by-date spending list + quick add
│   │   └── analytics/page.tsx     # 分析 — month/year view, budget drill-down
│   ├── api/
│   │   ├── prices/route.ts        # Proxies Yahoo / MUFG / Rakuten / Tiantian
│   │   ├── exchange-rates/route.ts
│   │   └── auth/signout/route.ts
│   ├── login/page.tsx             # Email + password form
│   ├── layout.tsx                 # Root layout, Toast.Provider, service worker
│   └── globals.css                # Tailwind import + HeroUI finances theme tokens
├── components/
│   ├── DashboardClient.tsx        # Dashboard: currency switcher, pie charts, net-worth line chart
│   ├── AssetForm.tsx              # Shared add/edit asset form (mode prop)
│   ├── TransactionList.tsx        # Manages edit-mode state per row
│   ├── TransactionRow.tsx         # Inline-editable single transaction
│   ├── AddTransactionForm.tsx
│   ├── UpdateBalanceForm.tsx      # For deposit/cash (not investments)
│   ├── EditPriceButton.tsx        # Inline price edit on asset detail
│   ├── RefreshPricesButton.tsx
│   ├── BottomTabBar.tsx           # Lavender nav bar, 5 tabs (总览/资产/记账/明细/分析)
│   ├── CurrencySwitcher.tsx       # ToggleButtonGroup; persists user's default on change
│   ├── NetWorthLineChart.tsx      # Recharts AreaChart (embedded in dashboard)
│   ├── AllocationPieChart.tsx     # Donut with Chip legend
│   ├── StatCard.tsx               # Small label+value summary card
│   ├── LabelValueRow.tsx          # Label ↔ value row inside a card
│   ├── ConfirmDialog.tsx          # useConfirmDialog hook + AlertDialog
│   ├── DeleteAssetButton.tsx
│   ├── ServiceWorkerRegister.tsx
│   ├── bookkeeping/               # 记账 / 明细 / 分析 feature
│   │   ├── CategoryIcon.tsx       # Circular lavender tile in the 记账 grid
│   │   ├── QuickEntryModal.tsx    # Create / edit a spending tx; optional picker mode
│   │   ├── SpendingClient.tsx     # 记账 page: category grid + modal
│   │   ├── DetailsClient.tsx      # 明细 page: group by date, per-day quick add
│   │   ├── AnalyticsClient.tsx    # 分析 page: month/year toggle + drill-down
│   │   ├── CategoryBreakdown.tsx  # Accordion of per-category budget + tx list
│   │   ├── SpendingLineChart.tsx  # Per-day or per-month spending chart
│   │   ├── BudgetSettingsModal.tsx
│   │   └── BudgetWarningModal.tsx # Friendly cat popup for budget warnings
│   └── ui/native-select.tsx       # The only remaining <select> wrapper
├── lib/
│   ├── asset-calculations.ts      # computeHolding() — single source of truth
│   ├── bookkeeping-data.ts        # SPENDING_CATEGORIES, CRUD, budget helpers
│   ├── bookkeeping-types.ts       # Spending / budget / summary types
│   ├── chart-utils.ts             # Net worth time series
│   ├── currency.ts                # Formatters, labels, color helpers
│   ├── date.ts                    # todayLocal / todayUTC / daysAgoLocal / monthBoundariesLocal
│   ├── exchange-rates.ts          # fetchLatestRates, convertCurrency
│   ├── prices.ts                  # Client helper to refresh both APIs
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client (cookies)
│   │   └── middleware.ts          # Session refresh + auth redirects
│   ├── types.ts                   # All domain TypeScript interfaces
│   └── utils.ts                   # cn()
└── proxy.ts                       # Next.js 16's renamed middleware entry
supabase/
└── migrations/                    # Run manually in the SQL editor
public/
├── manifest.json                  # PWA manifest
├── sw.js                          # Hand-written service worker
├── warning_cat.png                # Budget-warning popup art
├── danger_cat.png                 # Budget-danger popup art
└── icons/                         # 192 / 512 / maskable / apple-touch
```

## Data Model

Four tables in PostgreSQL:

```sql
assets (id, name, category, currency, symbol, fund_provider, tag,
        risk_level, note, current_price, last_price_update, created_at)

transactions (id, asset_id FK, type, quantity, price, amount, date,
              note, created_at)

asset_price_snapshots (id, asset_id FK, price, date)
  UNIQUE (asset_id, date)

exchange_rate_snapshots (id, base_currency, target_currency, rate, date)
  UNIQUE (base_currency, target_currency, date)
```

Enums are enforced via `CHECK` constraints. RLS policy is "authenticated users see everything" — this is a shared-household app, not a multi-tenant product.

All computed values (market value, total cost, gain/loss, balance) are derived at render time from transactions via `computeHolding()`. There are no denormalized summary columns.

## Conventions

- **Commit style**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `perf:`, `docs:`, `style:`). Subject imperative, ≤50 chars. Body wraps at 72. Separate subject from body with a blank line.
- **Color convention**: Asian finance — red = gain, green = loss. Use `gainLossTextClass()` from `lib/currency.ts`; never hardcode colors. Risk levels use a separate palette (green / yellow / orange) so `高风险` doesn't collide with red-means-gain.
- **Segmented toggles**: use HeroUI `ToggleButtonGroup`, not `Tabs`. Tabs are for navigation only (see `BottomTabBar`). The transaction type picker, currency picker, import mode picker, and time range picker all use `ToggleButtonGroup`.
- **Confirmations**: `useConfirmDialog()` + `<ConfirmDialog />`, never `window.confirm()`. Toasts: `toast.success/warning/danger`, never `alert()`.
- **Date handling**: `src/lib/date.ts` helpers (`todayLocal` / `todayUTC` / `todayTokyoCompact`). Never inline `new Date().toISOString().split("T")[0]` — the choice of UTC vs. local matters and should be explicit.
- **Holding math**: exactly one function — `computeHolding(asset, transactions)` — returns everything needed. Do not inline reducers.
- **HeroUI components**: imported directly from `@heroui/react`, never behind a local wrapper. The one exception is `NativeSelect`, which is intentionally a plain `<select>` because iOS's native wheel picker is a better mobile UX than any JS component.

## Deployment

Push to `main` on GitHub → Vercel picks it up → build & deploy in ~30s. Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are set in the Vercel project settings.

## License

MIT. See `AGENTS.md` for project context and `CLAUDE.md` / `HEROUI.md` for codebase conventions when working with AI assistants.
