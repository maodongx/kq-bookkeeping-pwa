# KQ Bookkeeping — Project Context

## Overview

Personal multi-currency bookkeeping PWA for 2 users (husband + wife). Tracks assets, transactions, market prices, and exchange rates across USD/JPY/CNY.

## History

This project started as a **native iOS app** (SwiftUI + SwiftData) but was pivoted to a **PWA** because:
- Apple Developer Program costs $99/year for TestFlight distribution
- Free Xcode signing expires every 7 days (unacceptable for daily use)
- PWA gives both users instant access via URL with no App Store involvement
- Cross-platform (works on any phone/browser)

The Swift version (private archive: `github.com/maodongx/kq_bookkeeping_iosapp`) implemented:
- Asset tracking (US stocks, JP funds, bank deposits, cash)
- Transaction CRUD (buy/sell/deposit/withdraw/adjustment)
- Multi-currency support (USD, JPY, CNY)
- Live price fetching (Yahoo Finance for US stocks, MUFG/Rakuten for JP funds)
- Exchange rate service (open.er-api.com)
- Cross-currency net worth dashboard with Swift Charts (pie, line, bar)
- JSON export/import for data portability
- Chinese UI (总览/资产/分析/记账/设置)

## Architecture Decisions

### Stack
- **Framework**: Next.js (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Database**: Supabase free tier (PostgreSQL)
- **Auth**: Supabase Auth (email + password, 2 accounts)
- **Hosting**: Vercel (free, auto-deploy from GitHub)
- **CI/CD**: Push to GitHub → Vercel auto-deploys
- **Cost**: $0 total

### Why these choices
- **Supabase over Firebase**: PostgreSQL is better for relational bookkeeping data (assets → transactions). Firebase Firestore is NoSQL — bad fit for joins/aggregations.
- **Supabase over Google Sheets**: Sheets API is slow (300ms+), rate-limited, and OAuth is fragile. Supabase gives real-time sync + proper auth.
- **Supabase over PocketBase**: No server to manage. Free tier is sufficient for 2 users.
- **Next.js over SvelteKit**: Larger ecosystem, better Vercel integration, more career-transferable skills.
- **Email+password auth over PIN/token**: User wants real access control — nobody else should see financial data. Sessions last 30 days (minimal re-login friction).

### Data model (from Swift version, to be ported)
- **Asset**: id, name, category, currency, symbol, fundProvider, note, currentPrice, lastPriceUpdate, createdAt
- **Transaction**: id, assetId, type, quantity, price, amount, date, note
- **AssetPriceSnapshot**: id, assetId, price, date
- **ExchangeRateSnapshot**: id, baseCurrency, targetCurrency, rate, date

### Asset categories
- `usStock` — US stocks (USD, Yahoo Finance prices)
- `jpFund` — Japanese funds (JPY, MUFG/Rakuten prices)
- `bankDeposit` — Bank deposits
- `cash` — Cash
- `other` — Other assets

### Currencies
- USD (美元, $)
- JPY (日元, ¥)
- CNY (人民币, ¥)

### Transaction types
- `buy` / `sell` — for stocks/funds
- `deposit` / `withdraw` — for bank/cash
- `adjustment` — manual correction

### UI language
Chinese (Simplified). Tab labels: 总览 / 资产 / 分析 / 记账 / 设置

### Finance convention
Red = gain (up), Green = loss (down) — Asian market convention.

## Development Environment

### Node.js
- Version: 20 (pinned in `.node-version`)
- Must use `/opt/homebrew/opt/node@20/bin` or configure version manager
- Run: `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"` before working

### npm registry
- Project uses **public npm** (`registry.npmjs.org`) via `.npmrc`
- Global npm config points to Amazon CodeArtifact — the `.npmrc` override is critical
- **Never remove `.npmrc`** or installs will fail against the internal registry

### Git identity
- Name: `Maodongx`
- Email: `277767465+maodongx@users.noreply.github.com`
- Enforced by `~/.gitconfig` `includeIf` rule for `/Volumes/workplace/personal/`
- **Never use `@amazon.com` email** in commits for this project

### Amazon isolation rules
- No Amazon internal package names, imports, or references
- No `@amazon.com` email in git history
- No CodeArtifact registry in committed files
- No internal tool references (brazil, cr, odin, midway, etc.)
- Audit before every push: `git log --all --pretty=format:"%ae" | sort -u`

## Supabase setup (TODO)

- [ ] Create Supabase project
- [ ] Set up database schema (assets, transactions, price_snapshots, exchange_rates)
- [ ] Enable Row-Level Security
- [ ] Create 2 user accounts (email+password)
- [ ] Add Supabase env vars to Vercel
- [ ] Set up GitHub Actions ping to prevent 7-day idle pause

## Features roadmap

### Phase 1: Core CRUD
- [ ] Auth (login/logout, session persistence)
- [ ] Asset list (grouped by category)
- [ ] Add/edit/delete assets
- [ ] Add/edit/delete transactions
- [ ] Dashboard with net worth summary

### Phase 2: Prices & FX
- [ ] Price fetching (Yahoo Finance, MUFG, Rakuten)
- [ ] Exchange rate fetching (open.er-api.com)
- [ ] Cross-currency net worth calculation
- [ ] Auto-refresh prices

### Phase 3: Charts & Analysis
- [ ] Asset allocation pie chart
- [ ] Net worth line chart (historical)
- [ ] Gain/loss bar chart
- [ ] Time range picker

### Phase 4: Data management
- [ ] JSON export/import
- [ ] Settings page (default currency, etc.)

### Phase 5: PWA
- [ ] Service worker for offline support
- [ ] App manifest (icons, theme)
- [ ] "Add to Home Screen" prompt

## File structure (planned)

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx          # Tab bar
│   │   ├── page.tsx            # Dashboard (总览)
│   │   ├── assets/             # Asset CRUD
│   │   ├── charts/             # Analysis
│   │   └── settings/           # Settings
│   ├── layout.tsx              # Root layout + auth provider
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn components
│   └── charts/                 # Recharts wrappers
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Auth middleware
│   ├── types.ts                # TypeScript interfaces
│   ├── currency.ts             # Formatter + constants
│   └── price-service.ts        # Price/FX fetching
└── public/
    ├── manifest.json           # PWA manifest
    └── icons/
```
