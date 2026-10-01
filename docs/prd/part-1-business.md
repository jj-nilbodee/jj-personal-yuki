# Personal Finance Assistant — PRD

### Part 1: Business & Product Requirements

_Status: Locked. Technical requirements to follow in Part 2._

---

## 1. Product Overview

**Vision:** A single personal finance workspace that starts with day-to-day money tracking and grows into a full planning tool — tax, debt, and investments — tailored to living in Thailand.

**Problem statement:** Managing personal finances today means juggling a banking app, a separate spreadsheet, manual once-a-year tax calculations, and no unified view of debt vs. savings vs. investment goals. There's no single place that understands both the numbers and Thailand-specific rules (PIT brackets, deductions, THB-denominated loans).

**Primary users (v1):** The product owner, plus a small circle of friends/family testing later. Low volume, high trust environment — no need for enterprise-grade multi-tenant infrastructure, but real financial data still demands real privacy discipline.

**Pace & constraints:**

- Weekend-project cadence — MVP soon, bias toward simplicity and existing tools over building from scratch.
- Small ongoing cost is acceptable (a few USD/month) — e.g., a paid OCR/vision API is fine if it meaningfully improves accuracy over free alternatives.

---

## 2. Phased Scope

| Phase | Module | Core Job |
| --- | --- | --- |
| 1 (MVP) | Expense Tracker | Capture and categorize spending/income |
| 2 | Tax Planner | Estimate Thai PIT liability, surface deduction opportunities |
| 3 | Loan Repayment Planner | Model payoff schedules, compare strategies |
| 4 | Investment Planner | Track holdings/goals, model growth scenarios |

Each phase is usable stand-alone but shares one data model (transactions, accounts, categories) so later modules don't require re-entering history.

---

## 3. MVP Definition — Phase 1: Expense Tracker

**Success metric:** The product owner uses it daily for several weeks and stops needing the spreadsheet. MVP must win on speed and clarity of entry, not breadth of features.

**Data entry methods, in priority order:**

1. **Manual entry** — always available, fastest to ship, reliable fallback.
2. **Slip/receipt image OCR** — photo of a Thai bank transfer slip or receipt auto-extracts amount, date, merchant/recipient, reference number, and **auto-suggests a category based on merchant name — always user-editable before saving.**
3. **Bank sync** — deferred (see Section 5). Major aggregators (Plaid, Tink, MX, etc.) have almost no direct coverage of Thai banks, so this isn't a realistic MVP dependency.

**Core features:**

- Add/edit/delete transactions (amount, date, category, account, note, optional photo)
- Slip/receipt OCR → auto-fill fields + auto-suggest category → editable before save
- Categories: custom + smart defaults (food, transport, rent, utilities, etc.)
- Multi-account support (cash, each bank account, credit card)
- Recurring transactions (rent, subscriptions)
- Dashboard: spend by category/time, income vs. expense, trends
- **Per-user data isolation** — architecture supports multiple isolated users from day one, even though active multi-user adoption isn't required for MVP success

**Explicitly deferred from MVP:**

- Household/shared expense splitting (e.g. splitting rent) — revisit post-MVP once core tracker is stable and there's real demand from friends/family testers

---

## 4. Phase 2 — Tax Planner

- Auto-populate assessable income from tracked income transactions
- Deduction/allowance tracker: personal allowance, spouse, per-child, insurance premiums, SSF/RMF/provident fund contributions, donations
- Live estimated tax liability using Thailand's 8-bracket progressive structure (0–35%, first THB 150,000 exempt)
- "What-if" scenarios (e.g. "If I contribute another THB 50,000 to SSF, how much tax do I save?")
- Filing deadline reminders (PND 90/91, typically end of March / early April for e-filing)

**Design constraint:** Thai tax rules change (deduction ceilings, special rates for visa categories like LTR). Tax rates/allowances must be config-driven data, not hardcoded, so updates don't require redeployment.

---

## 5. Phase 3 — Loan Repayment Planner

- Track loan(s): principal, rate, term, monthly payment
- Amortization schedule visualization
- Compare payoff strategies (extra payments, snowball vs. avalanche across multiple loans)
- Pulls "cash available for extra repayment" from real expense-tracker data

**Bank sync note:** Revisit as a stretch goal here or later. Given near-zero Thai coverage from standard aggregators, the realistic paths are (a) manual CSV/statement import, or (b) direct integration with one specific bank's own API/export, if available.

---

## 6. Phase 4 — Investment Planner

- Track holdings (manual entry to start — value, quantity, cost basis)
- Goal-based views (retirement, house down payment, etc.)
- Simple, assumption-based growth projections (no real-time market data initially)

---

## 7. Cross-Cutting Requirements

- **Privacy & data handling:** Real financial data for multiple people demands Thailand PDPA-conscious handling — consent, data minimization, no sharing without clear purpose — even for a personal project.
- **Shared data model:** One transaction/account/category schema across all four modules from day one, so later phases don't require re-architecting.
- **Config-driven rules:** Tax and loan logic should be editable data, not hardcoded, given how often Thai tax rules shift.
- **Cost discipline:** OCR/vision API choice should fit within a few USD/month at personal-project usage volume.

---

## 8. Explicitly Out of Scope (all phases, for now)

- Real-time investment market data / brokerage integration
- Automated tax filing submission
- Multi-currency / non-Thai tax jurisdictions
- Household/shared accounts (deferred, see Section 3)

---

## 9. Open Items Carried Into Technical Requirements

- Access platform: mobile web / installable PWA / native app — undecided
- OCR implementation approach: free/open-source vs. small-cost paid vision API
- Bank sync feasibility: no viable major-aggregator path found for Thailand; direct bank integration or statement import to be evaluated per-bank
