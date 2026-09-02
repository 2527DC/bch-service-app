# Listing screens redesign — Stock, Inbound, Deliveries, Transfers

**Status:** PENDING — ready to start, no hard blockers
**Created:** 2026-09-02
**Revised:** 2026-09-02 — Stitch designs received. **Read §13 first.** It supersedes
D1, D2, D5, D6, D7 and workstreams B and C. §§1–12 are kept for the reasoning, not as
the current plan.
**Scope:** `app/(app)/stock/index.tsx`, `app/(app)/inbound/index.tsx`,
`app/(app)/deliveries/index.tsx`, `app/(app)/transfers/index.tsx`,
`src/components/stock/FilterSheet.tsx`, `src/components/PagedList.tsx`,
~~plus a new `src/components/stock/ListRow.tsx`~~ → per §13: a new
`app/(app)/filters.tsx` route, six primitives in `src/components/stock/`, and
**`src/services/paged.ts` + `src/services/mockApi.stock.ts`** (§13.8 — the redesign is
not presentation-only).

---

## 1. Why this exists

The Stock Management screens shipped in `792e883` with a note in the commit that they are
"not proper yet". This plan turns that into specific work.

Named problems, from review on device (D8):

- **Rows are too cramped.** Text bottoms out at 10–11px, elements fight for the same
  space, nothing breathes.
- **The four screens don't match.** They read as built by different people — four row
  heights, badges here and icon tiles there, two filter idioms.

Four Stitch screens were supplied as reference (project `16632412348696695179`): stock
listing `8491eb…`, inward listing `09a4e5…`, delivery & dispatch `02223b…`, filter panel
`18a74b…`. ~~They are not readable over plain HTTP — `stitch.withgoogle.com` is
login-gated.~~ **Retrieved 2026-09-02 over the Stitch MCP; they are in `doc/stitch/`.
See §13.**

---

## 2. Decisions taken

| # | Decision | Consequence |
|---|---|---|
| ~~**D1**~~ | ~~**Direction only.**~~ **SUPERSEDED by R1 (§13.2)** — the designs arrived and are now reproduced, not merely consulted. | — |
| **D2** | **Pills stay, sheet is added.** Pills keep the two or three highest-traffic filters; the rest plus sort move to the shared sheet. | Costs one row of chrome; keeps the shop-floor path at one tap. |
| **D3** | **Grouping follows the sort** on Deliveries. RUN → status, AREA → area, RECENT → date bucket. | Needs a group resolver per sort (§6 C3) and variable-height list support (§4). |
| **D4** | **Scope is four screens**: Stock, Inbound, Deliveries, Transfers. | `product-types` and `stock-audit` are out of scope; they keep their current look. |
| **D5** | **Denser — more rows per screen.** Target ~72px card (from 96/100/92/104), ~9 rows visible instead of ~6. | Forces the field cuts in D7. Two text lines per row, not three. |
| **D6** | **One row system.** All four lists share one height, one anatomy, one component; only the content differs. | New `ListRow` with a fixed slot API (§5). Directly answers "screens don't match". |
| **D7** | **Stock row keeps** product name, stock count + health, SKU, selling price. | Everything unpicked moves to the detail screen — specifically the `brand · category · size` line (`filedUnder`, `stock/index.tsx:73-76`). |
| **D8** | Problems named: cramped, and inconsistent between screens. | Both are addressed structurally by D5 + D6 rather than screen by screen. |

### The tension in D5 + D7, and how it resolves

Denser rows and keeping four fields pull against each other. They reconcile because the
field that dies is the one **not** on the D7 list: `brand · category · size`. That frees a
whole line, and the remaining four fields fit two lines instead of three:

```
BEFORE (96px, 3 left lines + 3 right)     AFTER (72px, 2 lines)
+-------------------------------------+   +-------------------------------------+
| Hero 26T MTB Sprint                 |   | Hero 26T MTB Sprint            12   |
| Hero · MTB · 26"          <- dies   |   | SKU-99213 · ₹8,499            Low   |
| SKU-99213                      12   |   +-------------------------------------+
|                               Low   |
|                            ₹8,499   |
+-------------------------------------+
```

**Cost, stated plainly:** the product name drops from 2 lines to 1 and will truncate on
long names. That is the price of ~9 rows per screen instead of ~6. See §11 Q1.

---

## 3. Current state (audit)

All four lists are already on the paging stack (`createPagedResource` → `usePagedList` →
`PagedList`), so **none of this work touches data fetching**. It is presentation only.

| Screen | Row height | Chrome | `getItemLayout`? |
|---|---|---|---|
| `stock` | `CARD_H 96 + GAP 8` | Search, 3 type segments, Filter button, active chip | yes |
| `inbound` | `CARD_H 100 + GAP 8` | Search + `Pills` (5, faceted) | yes |
| `deliveries` | `ROW_H 92`, `HEADER_H 40` | Search + `Pills` (5, faceted) | **no** — mixed heights |
| `transfers` | `CARD_H 104 + GAP 8` | Search + `Pills` (3, faceted) | **only while collapsed** |

Problems found in the code, independent of any design:

1. **Four row heights for four parallel lists** — 96 / 100 / 92 / 104. Drift, not intent.
   Fixed by D6.
2. **Two filter idioms.** Stock uses the sheet; the other three use inline pills only.
3. **`FilterSheet` is not reusable.** Props hardcoded to `health` + `sort`
   (`FilterSheet.tsx:24-40`). The `FilterGroup` type is exported but never used — the
   generic design was started and abandoned.
4. **No explicit close button on the sheet.** Exits today are backdrop tap, Android back,
   Reset, or Show results. There is no ✕. This is the stated gap.
5. **Two screens lose `getItemLayout`** — Deliveries always (headers 40, rows 92),
   Transfers whenever a row expands (`transfers/index.tsx:282`). Both then show blank
   cells on a fast fling, the exact failure `itemHeight` exists to prevent.
6. **Stock type segments truncate at 3** (`.slice(0, 3)`) with no overflow affordance.
7. **Sorts exist but are unreachable.** Every collection defines them; every screen
   hardcodes one. Inbound `RECENT | EXPECTED | VALUE` → `"RECENT"`; Deliveries
   `RUN | RECENT | AREA` → `"RUN"`; Transfers `RECENT | SIZE` → `"RECENT"`. Only Stock
   exposes its sort. The sheet has real content waiting for it.
8. **A filter is defined but never offered.** `DeliveryFilter` includes `ON_ROAD`
   (`mockApi.stock.ts:606`); the screen's `FILTERS` array omits it.
9. **`startOfTodayMs()` uses a bare `new Date()`** (`mockApi.stock.ts:611-615`), so the
   Deliveries `TODAY` filter and its facet count run on **device local time, not IST** — a
   direct AGENTS.md §6 violation, with `getStartOfTodayIST` already available in
   `src/lib/timezone.ts`. A phone in the wrong timezone silently shows the wrong run board.

---

## 4. Workstream A — variable-height support in `PagedList`

`PagedList` builds `getItemLayout` by arithmetic on one `itemHeight`
(`PagedList.tsx:196-200`), so it serves uniform lists only. D3 makes Deliveries
permanently mixed-height, and Transfers is mixed whenever a row expands.

- [ ] **A1.** Add an optional `getItemHeight?: (item: T, index: number) => number`. When
      present, build a cumulative offset table with `useMemo` keyed on `data` and serve
      `getItemLayout` from it. Keep `itemHeight` as the fast path — uniform lists should
      not pay for a table.
- [ ] **A2.** The two props are mutually exclusive; document that beside the existing
      `itemHeight` prop comment.
- [ ] **A3.** Adopt on Deliveries (`ROW_H` rows, `HEADER_H` headers) and Transfers.

---

## 5. Workstream B — the shared `ListRow` (D6)

> **SUPERSEDED by §13.3.** The three designs have three different card anatomies; a single
> slot API cannot express them. Replaced by a set of shared primitives. Kept below for the
> height-budget method, which §13 still uses.

The centrepiece. One component, four screens, one height.

### B1. Anatomy

```
CARD_H 72 + GAP 6 = ITEM_H 78
+----------------------------------------------------------+
| [tile]   Title ..............................    Value    |   18px
|   40      meta · meta ......................    [status]  |   14px
+----------------------------------------------------------+
   ^        ^ flex-1 min-w-0                      ^ w-[84px] items-end
   optional
```

### B2. Height budget

Worked, not eyeballed — `getItemLayout` is arithmetic on `ITEM_H`, so a row that renders
taller than it declares puts every offset below it out and shows blank cells on a fling.

| Part | px |
|---|---|
| padding top + bottom (`py-3.5`) | 28 |
| title line (15px text, 18px leading) | 18 |
| gap | 2 |
| meta line (11.5px text, 14px leading) | 14 |
| **total** | **62** of 72 |

10px of slack, deliberately — a 15px system font renders taller on some Android
densities, and slack is cheap while overflow is not.

### B3. Slot API

```ts
type ListRowProps = {
  tile?: { icon: LucideIcon; tone: Tone };  // omit -> no leading tile
  accent?: Tone;                            // left border, omit -> none
  title: string;                            // numberOfLines={1}
  meta?: string;                            // numberOfLines={1}, " · " joined by caller
  value?: string;                           // right column, top
  valueTone?: Tone;
  status?: { label: string; tone: Tone };   // right column, bottom
  trailing?: React.ReactNode;               // chevron, etc.
  onPress: () => void;
};
```

- `React.memo` with an explicit comparator, as every row here already is.
- Every text gets `numberOfLines`. Nothing in the row is free to wrap.
- Both the `h-[72px]` class and `CARD_H` must be edited together — Tailwind extracts
  arbitrary values from literal source text, so the class cannot be built from the
  constant.

### B4. Per-screen mapping

| Screen | tile | title | meta | value | status |
|---|---|---|---|---|---|
| Stock | see §11 Q2 | product name | `SKU · ₹price` | `currentStock` | health |
| Inbound | `ArrowDownCircle`, status tone | `brand · billNo` | `shipmentNo · ₹amount` | `received/total` | status (+ overdue) |
| Deliveries | `Truck` / `Plane` if outstation | `customerName` | `invoiceNo · area`, or flag reason | date or "Today" | status |
| Transfers | swap icon, status tone | `orderNo` | `raisedBy · N items` | — | status |

Fields dropped from rows to detail screens: Stock's `brand · category · size` (D7);
Inbound's line count; Deliveries' outstation suffix (the `Plane` tile already says it).

---

## 6. Workstream C — generic FilterSheet + close button

> **SUPERSEDED by §13.4.** The design is a full-screen filter route, not a bottom sheet.
> C1's group-driven props survive verbatim; C2's ✕ survives and moves to the header;
> C3's chrome (grab handle, split footer, result count) is dropped.

### C1. Make `FilterSheet` group-driven

```ts
type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  groups: FilterGroup<string>[];      // [{ key: "health", title: "Stock level", options }]
  value: Record<string, string>;      // { health: "LOW_STOCK", sort: "NAME" }
  defaults: Record<string, string>;   // drives Reset and the active-count badge
  onApply: (next: Record<string, string>) => void;
  resultCount?: number;               // for the primary button label
};
```

- Keep draft-then-Apply — it is correct, and it stops four round trips while someone makes
  up their mind (`FilterSheet.tsx:5-8`).
- `onReset` folds into `defaults`: Reset sets the draft to `defaults` and does **not**
  close. Today Reset closes immediately, so you never see what you reset to.
- Derive the active count from `value` vs `defaults` via `activeFilterCount(value,
  defaults)`, replacing the hand-counted expression at `stock/index.tsx:213`.

### C2. Close affordance (the stated requirement)

- **✕ button in the sheet header**, right-aligned, opposite the "Filter & sort" title.
  `lucide-react-native`'s `X`, size 20, `NEUTRAL[500]` (AGENTS.md §5).
- Hit target `min-h-[56px] min-w-[56px]` per AGENTS.md §8 — the glyph stays 20px, the
  touch area does not.
- `accessibilityRole="button"`, `accessibilityLabel="Close filters"`.
- Every existing exit stays: backdrop `Pressable`, `onRequestClose` (Android back). The ✕
  is an addition, not a replacement.
- ✕ **discards** the draft, same as a backdrop dismiss. Only "Show results" commits.

### C3. Sheet chrome

- Keep the grab handle; it is what makes the sheet read as a sheet.
- Footer stays Reset (`w-28`) + Show results (`flex-1`), both `min-h-[54px]`.
- Primary button shows the count when facets are known — "Show 1,284 results".

### C4. Adopt on all four screens (per D2: pills stay)

| Screen | Pills (stay) | Sheet holds |
|---|---|---|
| `stock` | type segments | stock level, sort, product-type overflow |
| `inbound` | In transit, Overdue, All | Partial, Received, sort (`RECENT`/`EXPECTED`/`VALUE`) |
| `deliveries` | Today, Open, Flagged | All, Done, **`ON_ROAD`** (item 8), sort (`RUN`/`RECENT`/`AREA`) |
| `transfers` | Pending, Approved | Rejected, sort (`RECENT`/`SIZE`) |

---

## 7. Workstream D — per-screen adoption

- [ ] **D-a. Stock** — port to `ListRow`; drop `filedUnder`; keep the health left border.
- [ ] **D-b. Inbound** — port; fold the pre-booked badge into meta or drop to detail.
- [ ] **D-c. Deliveries** — port, **and** grouping-follows-sort (D3). Replace the fixed
      `GROUP_TITLE` map with a resolver per sort:
      | sort | group key | header title |
      |---|---|---|
      | `RUN` | `d.status` | existing `GROUP_TITLE` map |
      | `AREA` | `d.customerArea ?? null` | the area name, or "No area" |
      | `RECENT` | IST date bucket of `d.invoiceDate` | "Today" / "Yesterday" / "Earlier" |
      Grouping stays a property of the **order** — the header is inserted when the key
      changes as the sorted stream goes past, so it pages. Do not fetch to bucket. Date
      buckets use `isToday` / `getStartOfTodayIST` from `src/lib/timezone.ts`.
- [ ] **D-d. Transfers** — port; expand behaviour per §11 Q3.

---

## 8. Workstream E — consistency and correctness

- [ ] **E1. Fix `startOfTodayMs()`** (audit item 9) — swap the bare `new Date()` at
      `mockApi.stock.ts:611` for `getStartOfTodayIST()`. Small, independent, and it is a
      real wrong-data bug, not a style nit. **Do this first.**
- [ ] **E2.** Stock type segments: replace `.slice(0, 3)` with a horizontal `ScrollView`,
      or move types into the sheet as a group and drop the segments.
- [ ] **E3.** Extract `activeFilterCount(value, defaults)` into `src/lib/stock-constants.ts`.
- [ ] **E4.** The 300ms debounce + `resetKey` block is copy-pasted in all four screens.
      Fold it into a `useDebouncedSearch()` hook in `src/lib/`.
- [ ] **E5.** Expose `ON_ROAD` on Deliveries (audit item 8) — lands with C4.

---

## 9. Order of work

> **SUPERSEDED by §13.5** (W0–W9). E1 is still step one.

1. **E1** — the IST bug. Independent, small, currently serving wrong data.
2. **A1–A3** — `PagedList` variable heights. Prerequisite for D-c and D-d.
3. **B1–B4** — `ListRow`. Everything downstream depends on its height and slots.
4. **C1–C3** — generic `FilterSheet` + ✕ close.
5. **D-a → D-b → D-c → D-d** — one screen at a time, Stock first (smallest diff, already
   wired to the sheet). **C4, E3, E5** land alongside.
6. **E2, E4** — cleanup.

Each numbered step is independently shippable and verifiable. Do not start the next before
`npx tsc --noEmit` is clean on the current one.

---

## 10. Definition of done

- [ ] `npx tsc --noEmit` clean (~2 min on this repo, give it a real timeout)
- [ ] All four states verified per screen: loading, empty, error, populated
- [ ] Filter sheet: opens on tap; closes via ✕, backdrop, and Android back; ✕ and backdrop
      discard the draft; only "Show results" commits
- [ ] Fast-fling test on all four lists — no blank cells, including Deliveries grouped and
      Transfers expanded
- [ ] Deliveries: switching sort re-groups correctly and grouping still pages (scroll past
      page 1, confirm page 2 continues the group page 1 ended in)
- [ ] Row count check: ~9 rows visible on a 6.1" screen, up from ~6 (D5)
- [ ] Longest product name in the catalogue checked for truncation on the 1-line title
- [ ] Typing in search does not dismiss the keyboard on any screen
- [ ] Roles checked: `MECHANIC`, `SUPERVISOR`, `MANAGER` — `NoAccess` path intact
- [ ] No new raw hex, no new inline status emoji, no bare `new Date()`

---

## 11. Open questions

- **Q1. Name truncation.** D5 cuts the title to one line, so "Hero Sprint 26T MTB Disc
  Brake Black" truncates. Acceptable, or should the title get 2 lines and the row grow to
  ~84px (≈8 rows per screen instead of 9)?
- **Q2. Stock's leading tile.** D6's row system has a tile slot, but Stock has no natural
  icon — it currently signals health with a coloured **left border**, which costs no
  horizontal space. Give Stock a tile anyway (consistency), or leave the slot empty and
  keep the border (information density)?
- **Q3. Transfers expand.** A row that expands in place contradicts one fixed height.
  Keep expand (Transfers becomes the one variable-height list, served by A1), or drop it
  and push the detail to a screen?

## 12. Blockers

**None hard.**

| # | Item | Status |
|---|---|---|
| 1 | Stitch screens not readable over HTTP | **CLOSED 2026-09-02.** Pulled over the Stitch MCP into `doc/stitch/`. D1 revisited → **R1**, §13. Note `download_assets` silently writes nothing to the host; use the `downloadUrl`s from `list_screens` instead. |
| 2 | `PagedList` is uniform-height only | Addressed by Workstream A, in scope. |

---

# 13. Designs received — plan revision

**Added 2026-09-02.** The Stitch MCP link landed (§12 blocker 1 is **closed**). All four
screens are now in `doc/stitch/` as PNG + generated HTML; see `doc/stitch/README.md` for
the token mapping and retrieval notes.

D1 said "revisit once the MCP link lands — this was chosen while the designs were unseen."
This is that revisit. **The designs contradict the core of §2.** What follows supersedes
the decisions it names; everything not named stands.

## 13.1 What the designs actually are

Measured from the generated CSS, in device px on a 390×884 viewport:

| Screen | Card height | Rows visible | vs. plan (§2 D5: 72px, ~9 rows) |
|---|---|---|---|
| Stock | **112** (1-line name) / **140** (2-line) | ~4.6 | 2× taller |
| Inwards | **155** + a 225px KPI block above the list | ~2.8 | 2× taller |
| Deliveries | **~170–196** + a 68px stat strip | ~3 | 2.7× taller |

The design is **not dense**. It is a generous, card-per-record layout that shows three to
four records at a time. §2 D5 — "denser, ~9 rows instead of ~6" — is the opposite of the
supplied direction, and D7's field cuts were made to pay for a density the design does not
ask for. Stock's card in fact *keeps* `brand · category` (D7 dropped it) and *adds* cost
price alongside selling price.

## 13.2 Revised decisions

| # | Supersedes | Decision |
|---|---|---|
| **R1** | D1 | **Fidelity, not direction.** The designs are reproduced. Deviations are listed in 13.6 and each has a stated reason. |
| **R2** | D5 | **Density target is dropped.** Cards are ~112–196px. ~3–4 rows visible is the intent, not a defect. |
| **R3** | D6 | **One design *language*, not one row component.** The three screens share accent bar, badge, border, radius and spacing — they do **not** share an anatomy. `ListRow`'s fixed slot API cannot express all three. See 13.3. |
| **R4** | D7 | **Stock keeps `brand · category`** and gains cost price. Nothing is cut. |
| **R5** | D2, C1–C3 | **The filter is a full screen, not a bottom sheet.** ✕ left, "Filters" centred, RESET right, sticky "Apply N Filters" footer. ⚠️ **Amended in W5:** delivered as a full-screen `Modal` (`src/components/stock/FilterScreen.tsx`), **not** the `app/(app)/filters.tsx` route this row originally specified — the authed shell renders `<Slot />`, not a Stack, so no route under `(app)` can be presented modally; it would draw inside `AppHeader` and `BottomTabBar`, the one thing this screen must cover. Converting the shell to a Stack is exactly the navigation redesign **R8** rules out. The Modal gives the same UI and keeps Android back via `onRequestClose`. |
| **R6** | new | **Screens get a KPI header.** Inwards a 2×2 stat grid, Deliveries a 2-up stat strip. ⚠️ **Correction:** an earlier draft of this row said `getStockSummary` already returns these counters. It does not — see §13.8. `StockSummary` must be extended. |
| **R7** | new | **Radius drops from 16px to 8px, app-wide** (`rounded-2xl` → `rounded-lg`). This is the single largest visual delta and it is why the current build does not read like the design. Confirmed app-wide, so it reaches the job, LMS and Academy screens too — see W1. |
| **R8** | new | **Only the listing cards and the filter come from Stitch.** Navigation is not redesigned: the bottom tab bar keeps its current set, `ScreenHeader` keeps its back chevron, and the drawer is untouched. Search stays on every listing screen including Inwards. |
| **R9** | new | **`paged.ts` gains real composite filtering** — filter groups, AND-ed across groups, with honest per-group facets. The redesign is therefore **not** presentation-only. See §13.8 G1 and W3.5. |
| **R10** | new | **The filter maps onto the real data model, not the drawing.** Drop "Packed"; add the three statuses the design omits (VERIFIED, WALK_OUT, PREBOOKED); split Dispatch into what it actually is — an `isOutstation` toggle. `mock/types.ts` is **not** changed (AGENTS.md §2: it mirrors the PWA's Prisma models). |
| **R11** | new | **No per-row action on Stock.** The design's trailing `visibility_off` / `more_vert` icons are mock decoration — inconsistent across the four rows. The row is already tappable to detail, and dropping them buys back space for the right rail. |

### The one thing that survives from §2

**D8 stands, and is still the point.** "Cramped" and "the four screens don't match" are
both real. The designs fix them the other way round from D5/D6: not by tightening and
unifying rows, but by **giving each record room** and unifying the *language* around it.
The 10–11px text that D8 named goes away because the design's smallest type is 12px.

## 13.3 Why `ListRow` (B1–B4) does not survive

The three anatomies are genuinely different, not variations:

- **Stock** — two columns. Left: title, a dotted meta run, a price line. Right rail: a
  24px stock number, a soft badge under it, a trailing overflow/visibility icon.
- **Inwards** — one column with a **horizontal rule**, and a KV footer row
  (`Billed / 31 Aug` · `Items / 50 items`) with an outlined age pill on the right.
- **Deliveries** — **stacked label-over-value**: `INVOICE` / `INV/25/022579`,
  `CUSTOMER` / `JAYANTHI`, `ITEMS` / the item names wrapping to two lines.

A slot API wide enough to cover all three is a `View` with extra steps. **Replace B1–B4**
with a shared *primitive* set instead — the parts that actually repeat:

```
src/components/stock/
  RecordCard.tsx    // white, rounded-lg, 1px outline, optional 4px left accent bar
  StatusBadge.tsx   // soft-fill: tone bg + bold tone text, 10px uppercase tracking-wider
  MetaRun.tsx       // dot-separated inline meta, first token optionally brand-600
  DataLabel.tsx     // 12px/700/0.05em uppercase section + field label
  StatTile.tsx      // KPI tile: big tone-coloured number, label, sub-caption
  StatGrid.tsx      // 2-up / 2x2 wrapper for StatTile
```

`Badge` in `src/components/stock/index.tsx` is currently a bordered pill; the design's
badge is a **borderless soft fill**. Change `Badge` in place rather than adding a second
one — every stock screen already imports it, so they all move together.
`TONE` in `src/lib/stock-constants.ts` already has the `bg`/`text` pairs this needs.

## 13.4 Filter screen (supersedes C1–C3)

`app/(app)/filters.tsx`, presented with `presentation: "modal"`. Group-driven exactly as
C1 specified, so **C1's `FilterSheetProps` shape carries over unchanged** — only the
container changes. Three control renderers, picked per group by a `render` field:

| `render` | Used for | Look |
|---|---|---|
| `"grid"` | Status | 2-col bordered buttons, icon + label + `(count)`. Selected = `bg-slate-800` + white. |
| `"pills"` | Timeline | wrapping `rounded-full` chips |
| `"cards"` | Dispatch type | full-width radio cards, title + description; selected = `border-2 border-brand-600` + `bg-brand-50` |

- **✕ closes and discards** (C2's requirement — now the header's left slot, `X` size 20).
  Hit target stays `min-h-[56px] min-w-[56px]`.
- **RESET moves to the header** (right, `brand-600`, uppercase `data-label`). It sets the
  draft to `defaults` and does not close — C1's correction still applies.
- **Footer is one full-width primary button**, `bg-brand-600`, filter icon + **"Apply 3
  Filters"** — the design counts *active filters*, not results. This drops C3's
  "Show 1,284 results" and with it the need to thread `resultCount`; `activeFilterCount`
  (E3) becomes the button's label source instead of a badge's.
- Draft-then-Apply is unchanged and still correct.

Being a route rather than a `Modal` also gets Android back for free and removes the
`statusBarTranslucent` fiddle.

## 13.5 Revised workstreams

Order matters; each step ends with a clean `npx tsc --noEmit`.

- [x] **W0 — DONE 2026-09-02.** E1 named one bare `new Date()`; there were **three**, and
      all are fixed. `tsc` clean.
      1. `isTodayRun` (was `startOfTodayMs`, line 611) — the named bug. Now `isToday()`
         from `src/lib/timezone.ts`; the helper is deleted, not patched. Drives the
         Deliveries TODAY chip **and its facet count**.
      2. `yyyymm()` (line 89) — built document numbers (`IB-202609-0001`) from the device
         clock, so anyone west of IST stamped the **previous month** for the first 5.5h of
         every 1st. Now `getTodayIST()`.
      3. `getStockSummary`'s `inboundOverdue` — used a rolling `now − 24h` while the
         Inbound screen's own `isOverdue()` uses `getStartOfTodayIST()`. The hub badge and
         the list it opened could disagree at the day boundary. Both now mean the same day.
      `nowIso()` keeps its bare `new Date()` deliberately — it is an instant, not a
      business date, and UTC is correct there.
- [x] **W1 — DONE 2026-09-02.** `tsc` clean.
      - **Tokens:** `surface` `#f8f9ff` (page ground) and `ink` `#1e293b` (selected /
        inverted fill, replacing `bg-gray-800`) added to `tailwind.config.js` and
        `src/lib/theme.ts` as `SURFACE` / `INK`. The design's accent needed no work —
        its `secondary` is `#2563eb`, already `brand-600`. Tokens are **declared here and
        adopted per screen in W4–W8**; blanket-replacing 58 `bg-gray-50` sites would have
        hit input fills and row grounds, not just page grounds.
      - **Radius (R7):** `rounded-2xl` (16px) **and** `rounded-xl` (12px) → `rounded-lg`
        (8px), 160 sites across 37 files. R7 named only `2xl`, but leaving 88 `xl` at 12px
        would have kept the very inconsistency R7 exists to remove; one container radius
        was the point. Now 172 `rounded-lg`, 92 `rounded-full`.
      - **Deliberately NOT swept:** the four `rounded-t-3xl` bottom sheets (DatePicker,
        MonthPicker, stock-audit, FilterSheet) — a 24px top corner is what makes a sheet
        read as a sheet — and the ten `rounded-3xl` brand/LMS surfaces. Non-sheet
        directional corners (`rounded-t-2xl`, `rounded-b-xl` in prices/manager/rank) were
        swept to `-lg` so grouped-list corners still match their cards.
      - **Verified the sweep could not over-reach:** `rounded-2xl` does not match
        `rounded-t-2xl`, `rounded-xl` does not match `rounded-t-xl` or `rounded-3xl`.
      - **Not done:** Hanken Grotesk. It was optional, and it is a real layout risk —
        every fixed row height in W3/W4 is budgeted against the current font's metrics.
        If it is wanted, load it **before** W3, not after.
      - **Needs a look:** the sweep reached the job screens, LMS and Academy, which are
        outside the D4 scope. Nothing failed typecheck, but it is a visual change there.
- [x] **W2 — DONE 2026-09-02.** `tsc` clean. Five new files in `src/components/stock/`,
      all re-exported from `index.tsx`:
      `StatusBadge` · `RecordCard` · `MetaRun` · `DataLabel` · `StatTile` · `StatGrid`.
      - **`StatusBadge.tsx` IS the `Badge` change** — §13.3 listed both, but a separate
        `StatusBadge` alongside a rewritten `Badge` would have been two implementations of
        one thing. Instead the badge moved into its own design-named file and `index.tsx`
        re-exports it **as `Badge`**, so all six screens already importing `Badge` move
        together with zero import churn. Five files, not six, on purpose.
      - **`RecordCard` takes no `height` prop.** Height stays a literal `h-[NNpx]` in the
        caller's `className`, edited together with its `CARD_H` — the convention already
        on every row in this module, and required because Tailwind extracts arbitrary
        values from literal source text. A numeric prop would also have put two writers on
        one prop: `PressScale` maps `className` onto `style` via `cssInterop`, and nothing
        else in the repo passes it both.
      - **`MetaRun` renders one `<Text numberOfLines={1}>`** with nested `<Text>` for the
        accented token, not a flex row of Views. A View row cannot ellipsize as a unit — it
        clips mid-element and strands a separator. **Deviation:** the mock draws the
        separator as a 4px circle View; a View inside a Text is unreliable cross-platform,
        so this uses a middot. Indistinguishable at 11px.
      - **`StatGrid` chunks into explicit rows** rather than `flex-wrap` + percentage
        basis: `flex-1` inside a wrapping row sizes row 2 against different remaining
        space, so a 2x2 of bordered tiles comes out visibly uneven. Short final rows are
        padded with empty flex children.
      - **`StatTile` carries a warning in its header** that it must be fed from
        `getStockSummary`, never from a page's facets — facets are search-scoped, so the
        tiles would tick down as someone types (§13.8 G3).

      **Known transitional cost — the price of changing `Badge` in place.** The soft-fill
      badge is uppercase, and uppercasing widens a label. The screens that have *not* been
      rebuilt yet (inbound, transfers, count sheets) budget fixed-width columns against the
      old 9px sentence-case badge, so a long label like "Partially received" now runs
      wider there. Mitigated by keeping `small` at 9.5px for exactly those callers; the new
      cards from W4 on do not pass `small` and get the design's 10px. It resolves fully as
      each screen lands. **Do not "fix" it by shortening labels here** — status vocabulary
      belongs to R10 in W5.

      **Not adopted yet, by design:** `Pills` still uses `bg-gray-800` rather than the new
      `bg-ink`, and no screen consumes these primitives. W2 builds the vocabulary; W4–W8
      spend it.
- [x] **W3 — DONE 2026-09-02.** `tsc` clean.
      - **A1.** `PagedList` takes `getItemHeight?: (item, index) => number`. It builds a
        cumulative offset table in `useMemo` and serves `getItemLayout` from it in O(1).
        Summing inside `getItemLayout` instead would be O(n²) over a fling — the same jank,
        moved from a blank cell to the CPU. `itemHeight` stays the fast path and **wins if
        both are passed**. The `useMemo` sits above the component's early returns, which is
        required: this component returns early for the first-load states and hooks cannot
        follow a conditional return.
      - **Verified, not assumed.** The offset math was run against a realistic grouped
        stream (header, 3 rows, header, 2 rows): offsets contiguous, every length exact,
        total = last offset. Out-of-range probes (`index == len`, `index = 99`, empty list)
        return clamped values rather than `NaN` — a `NaN` there poisons every offset after
        it, so `getItemLayout` clamps deliberately.
      - **A2.** Mutual exclusivity documented on both props, plus the two requirements that
        actually bite: `getItemHeight` must be `useCallback`-stable (or the table rebuilds
        every render) and **exact, not approximate** (every offset is a running sum).
      - **A3 — Deliveries adopted.** `getEntryHeight` returns `HEADER_H` (40, no margin) or
        `ROW_H + GAP` (100). Both are hard-set in the markup — `h-[92px] mb-2` and an
        explicit header height — so neither is content-driven. **This list previously had
        no `getItemLayout` at all**, so it is the real win of W3.
      - **A3 — Transfers NOT adopted, and the plan was wrong to assume it would be.**
        `getItemHeight` is a pure function of the ITEM; an expanded transfer card's height
        also depends on `rejecting`, which is local `useState` inside the card — tapping
        Reject grows it by a TextInput and a second button row. A height function cannot
        see that, so it would report the card short and displace every row below it.
        Transfers keeps disabling `getItemLayout` while a card is open, which was already
        correct. The limit is now documented in both files.
        → **This retires W8's claim that "Q3 is moot because variable height is the norm
        after W3."** Keeping the expand is still fine, but it is fine because measuring is
        correct there, not because `getItemHeight` covers it.
      - **Still ahead for W4:** Stock's 112-vs-140px card is the case `getItemHeight` was
        actually built for — it IS predictable from the item (does the name wrap), via a
        character-count heuristic. Budget for getting that heuristic wrong once.
- [x] **W3.5 — DONE 2026-09-02.** `tsc` clean. **G1 and G3 both closed.**
      - **Purely additive.** `filterGroups` is optional on `ResourceConfig`; a collection
        that declares none takes the identical code path it did before and pays nothing.
        `groupFacets` is omitted from the result entirely in that case. No existing caller
        changed, and none had to.
      - **`PageQuery.filters`** is `{ groupKey: optionKey }`, AND-ed across groups. Absent
        or `"ALL"` means unconstrained, so `{}` behaves like no filter. An **unknown option
        key is ignored rather than matching nothing** — a stale key from a saved filter
        should not silently empty a list.
      - **The memo key includes the selection**, built from `groupKeys` in fixed order
        rather than from the caller's object, so two equal selections cannot produce two
        keys. Without this, changing only a group would hit the previous selection's entry
        and serve its page — the exact bug §13.8 G1 warned about.
      - **Facet semantics, made precise.** Every facet answers *"if I changed only this one
        control, how many rows would I get."* So a group's options are counted with every
        other group, the chip and the search still applied; the chip's own facets are
        counted with the groups applied but the chip free. Done in **one pass**, not one
        pass per group: for each row, count how many groups it fails — 0 means countable
        everywhere, 1 means countable only in the group it fails, 2+ means nowhere.
      - **Verified against a brute-force oracle, not by inspection.**
        `doc/checks/paged-composite.js` transpiles the real `paged.ts` and cross-checks
        every result and every facet against an independent count, across each combination
        of search × chip × group selection — **636 checks, 0 failures** — plus the
        no-groups regression path and the memo. Run it from the project root after touching
        `resolve()`. (There is no test runner in this repo, hence a standalone script.)
      - **G3 — `StockSummary` extended by seven fields**, inside the existing single scan.
        Note the Inwards tiles show **units** as the headline with the bill count as the
        caption ("50 / In Transit / 1 bills"), so units and bills are counted separately —
        the pre-existing `inboundInTransit` is the bill count. Added:
        `inboundInTransitUnits`, `inboundThisWeekBills`, `inboundThisWeekUnits`,
        `inboundPrebookedUnits`, `inboundDeliveredThisMonthUnits`, `deliveriesPending`,
        `deliveriesScheduled`. Overdue and "this week" are exclusive — an already-late
        shipment belongs to overdue, not to the upcoming week. Month start is built from
        the IST calendar date; boundary-checked across year and month rollovers.
      - **Not yet wired.** No collection declares `filterGroups` and no screen reads
        `groupFacets` or the new counters. Deliveries declares its groups in **W5**, where
        R10 maps them onto the real status model.
- [x] **W4 — DONE 2026-09-02.** Two-column card on `RecordCard`: name (2 lines) →
      `MetaRun` of SKU + brand in `brand-600` + category → price with struck cost; right
      rail is the 24px tone-tinted stock number over a soft-fill `Badge`. No trailing icon
      (R11). Health pills are now a scrolling row of five, faceted (**closes E2**);
      product type moved into the filter screen.
      - **`CARD_H_1 = 112` / `CARD_H_2 = 140`**, `GAP = 8`. The wrap guess is
        `nameLines(name) = name.length > 22 ? 2 : 1`, derived from the 226px the name
        actually gets (390 − margins − accent − the 84px right rail) at ~10.2px/char for
        17px bold uppercase.
      - **The important structural bit:** `nameLines()` is the *single source* — the
        literal `h-[…]` class and `getItemHeight` both call it, so they cannot disagree.
        A mis-predicted wrap is therefore cosmetic (a snug or airy card) and can never
        displace an offset, which is the failure that actually matters.
      - **Known limit:** `nameLines` is width-blind (assumes ~390pt). Making it
        `useWindowDimensions`-aware would churn `getItemHeight`'s identity and the row
        memo every rotation. On a 360pt device the odd card reads snug. Documented in file.
- [x] **W5 — shared pieces DONE 2026-09-02**; per-screen adoption lands with W4/W6/W7/W8.
      - **`src/components/stock/FilterScreen.tsx`** — full-screen `Modal`, not a route. See
        the amendment on **R5** for why. Generic and group-driven exactly as C1 specified,
        with three renderers picked per group: `grid` (2-col bordered buttons + counts,
        selected = `bg-ink`), `pills` (wrapping rounded-full), `cards` (radio rows with a
        description, selected = `border-2 border-brand-600` + `bg-brand-50`).
        ✕ and Android back **discard** the draft; only Apply commits; Reset returns the
        draft to `defaults` **without closing**. Footer counts ACTIVE FILTERS, not results,
        so no `resultCount` is threaded anywhere.
      - **`activeFilterCount(value, defaults)`** in `stock-constants.ts` (**E3**). Counted
        against defaults, so a control resting on its default reads as no filter.
      - **`useDebouncedSearch()`** in `src/lib/` (**E4**, pulled forward from W9) — the
        300ms block was copy-pasted in all four screens.
      - **`DELIVERY_FILTER_GROUPS`** in `mockApi.stock.ts`, wired into `deliveryResource`
        via the W3.5 `filterGroups`. Mapped per **R10**: "Packed" dropped; VERIFIED,
        WALK_OUT and PREBOOKED added (a third of the board was otherwise unreachable from
        the filter); Dispatch is the `isOutstation` boolean, not a three-way mixing a
        status with a geography flag. Timeline predicates are built on
        `getStartOfTodayIST`/`isToday`, and judge a delivery on the date it is **promised**
        for (`scheduledDate ?? deliveredAt ?? invoiceDate`) — filtering a run board on
        invoice date answers the wrong question.
      - **"Custom" timeline is NOT implemented.** The design offers it; it needs a
        date-range picker wired to the query, which is its own piece of work. The four
        presets (Today / 3 Days / This Week / This Month) cover the run board. **Open.**
      - **A third instance of the rolling-24h bug, found and fixed:** `inboundOverdue` at
        `mockApi.stock.ts:586` — the OVERDUE *chip predicate* — used `Date.now() - 24h`.
        With W0's two fixes that made **three** different definitions of "overdue" across
        the chip, the row badge and the hub counter, so one shipment could be described
        three ways. All three now mean "before the start of the IST business day".
- [x] **W6 — DONE 2026-09-02.** 2×2 `StatGrid` of full `StatTile`s (In Transit / This Week
      / Pre-booked / Delivered) fed from `getStockSummary`, units as the headline and bills
      as the caption. Card is brand title + `Badge`, `MetaRun` of bill + shipment no., a
      hairline divider, then a footer of two label-above-value columns and an outlined
      `Clock` age pill. Search **kept** (R8/Q4). Pills cut to In transit / Overdue / All,
      the rest plus sort into the filter screen; `sort` is now wired into `queryInbound`
      instead of being hardcoded.
      - **`CARD_H = 148`**, `ITEM_H = 156`. Budget sums to 140 — 8px of deliberate slack,
        because rendering *shorter* than declared is harmless and taller breaks every
        offset below.
      - `KV` was **not** reused: it lays out `justify-between` horizontally and the design
        needs label above value.
      - **Two judgement calls kept as-is:** the `Badge` stays on the *status* tone while
        only the accent bar and age pill carry lateness (a red badge reading "In transit"
        contradicts itself); and the age pill counts days since the **bill date**, green on
        a delivered shipment. The mock's "5 days" is ambiguous about what it counts from —
        swap `billDate` for `expectedDeliveryDate` in `agePill` if it should be
        days-remaining.
- [x] **W7 — DONE 2026-09-02.** The largest screen. 2-up `StatGrid` of **compact**
      `StatTile`s (Pending / Scheduled). Card is stacked label-over-value per the design —
      `DataLabel` INVOICE / CUSTOMER / ITEMS — with the status badge top-right; a flagged
      invoice swaps the ITEMS block for a red FLAGGED block of the same two-line budget, so
      the height is unchanged.
      - **`CARD_H = 188`**, `HEADER_H = 40`, `GAP = 8`. Every text carries an **explicit
        leading** so the sum is deterministic rather than platform-dependent — the right
        instinct for a card whose height feeds `getItemHeight`.
      - **D3 delivered.** `grouperFor(sort)` returns `{ keyOf, titleOf, toneOf }`;
        `withGroupHeaders` inserts a header whenever `keyOf` changes as the sorted stream
        goes past, so grouping stays a property of the ORDER and still pages.
        RUN → status, AREA → area (or "No area"), RECENT → IST Today/Yesterday/Earlier.
      - **A subtlety worth keeping:** the grouper is rebuilt with the entries rather than
        memoised on `sort` alone, because the RECENT buckets close over today's IST
        midnight — a board left open past midnight re-buckets instead of labelling
        yesterday's invoices "Today".
      - **Composite filters wired** — the payoff of W3.5. Four groups (status grid with
        `groupFacets` counts, timeline pills, dispatch cards, sort cards) AND-ed through
        `PageQuery.filters`. The **`ON_ROAD` chip is now offered** (**closes E5**) —
        defined in `DeliveryFilter` since day one and never surfaced.
      - `sort` has no "ALL" option: it is a choice of order, not a narrowing, and `"RUN"`
        is what unconstrained means for it.
- [x] **W8 — DONE 2026-09-02.** No Stitch design exists; derived from the Inwards card as
      planned. Title + `Badge`, `MetaRun` of raisedBy · N items · age, hairline divider,
      footer showing the route `from → to` with the expand chevron.
      - **`CARD_H = 150`**, `GAP = 10`. Budget sums to ~139, taken up to 150 so a taller
        Android line height cannot clip the rule; the slack is absorbed by an explicit
        `flex-1` spacer that pins the footer to the foot of the card.
      - **`itemHeight={expandedId === null ? ITEM_H : undefined}` kept** — no
        `getItemHeight`, exactly as W3 concluded. The expanded card carries no height class.
      - **The press target moved INSIDE the card.** The expanded body holds a TextInput and
        two buttons; a card-level Pressable makes the card fight its own children for the
        touch.
      - Expand-in-place, approve `Alert`, reject-with-note, `busy` gating, haptics and the
        `can("transfers","approve"/"create")` gates all preserved.

- **Cross-screen fixes made centrally after the screens landed:**
  - **`PagedList` still painted `bg-gray-50`** in all three of its states, so the list body
    sat on a different ground from the new `bg-surface` headers. Moved to the token.
  - **`Pills`' selected fill** `bg-gray-800` → `bg-ink`.
  - **The badge-count default was backwards on two screens.** Inbound opens on IN_TRANSIT
    and Transfers on PENDING, and counting against *those* meant tapping the "All" chip lit
    the filter badge — i.e. broadening the view reported a filter. `FILTER_DEFAULTS` is now
    the **neutral** value on both, so the badge answers "is this list narrowed?" and Reset
    means "show me everything" rather than "put it back how it opened".
  - **Transfers' "Rejected" filter relabelled "Rejected / cancelled"** — the resource's
    `REJECTED` predicate also matches `CANCELLED`, so the count was reporting more than its
    label claimed. Pre-existing; the label now matches what the number counts.
  - `ON_BRAND` added to `theme.ts` for the one icon `color` that needed white
    (AGENTS.md §4 forbids an inline hex).
  - **`FilterSheet.tsx` deleted** — dead once all four screens moved to `FilterScreen`.
- [x] **W9 — DONE 2026-09-02.** **E4** shipped in W5 as `src/lib/useDebouncedSearch.ts` and
      is adopted by all four screens; the copy-pasted 300ms block is gone. The bottom tab
      bar stayed **out of scope** per R8 — the designs show a different set
      (Dashboard · Stock · Inwards · Deliveries), which is noted and deliberately not acted
      on.

---

## 13.9 Status — all workstreams complete

W0 · W1 · W2 · W3 · W3.5 · W4 · W5 · W6 · W7 · W8 · W9 — **all done, `tsc` clean.**
Audit items E1–E5 all closed. R1–R11 all honoured, with two amendments recorded in place
(R5's route → Modal, and W3's finding that `getItemHeight` cannot serve Transfers).

**Deliberately not done, each with its reason stated above:**

| # | Item | Why |
|---|---|---|
| 1 | Hanken Grotesk | Optional, and a font swap re-opens every height budget in W3/W4/W6/W7/W8. If wanted, it lands FIRST and the budgets are re-checked. |
| 2 | The "Custom" timeline option | Needs a date-range picker wired to the query — its own piece of work. The four presets cover the run board. |
| 3 | Bottom tab bar | Out of scope (R8). |
| 4 | `product-types`, `stock-audit` | Out of scope (D4), though both inherit W1's radius and W2's badge. |

**Not verifiable from here — needs a device:**

- The four-state pass (loading / empty / error / populated) per screen, and the three roles.
- **The fast-fling test.** Every height budget is arithmetic that has been cross-checked
  against its literal class, but only a real fling proves no blank cells — especially
  Stock, whose height depends on a *predicted* line wrap, and Deliveries grouped.
- Whether Stock's `NAME_CHARS_PER_LINE = 22` is right in practice. It is one constant, and
  a wrong guess is cosmetic by construction (see W4).
- W1's radius sweep reached the job screens, LMS and Academy — outside D4's scope and
  still unlooked-at.

## 13.6 Deviations from the design, with reasons

1. **Icons stay `lucide-react-native`.** The designs use Material Symbols. AGENTS.md §5
   fixes in-screen icons to lucide; the shapes map 1:1 (`filter_list`→`SlidersHorizontal`,
   `local_shipping`→`Truck`, `inventory_2`→`Package`).
2. **Header keeps the back chevron.** The designs show a hamburger; these are drill-down
   routes under `stock-management`, and `ScreenHeader` already resolves back correctly.
3. **No hover states.** They are in the generated HTML because it is a web mock.
4. **Desktop sidebar/nav in the HTML is ignored** — `deviceType` is MOBILE; that markup is
   Stitch boilerplate.

## 13.7 Open questions, revised

- **Q1 is closed** — the design wraps the product name to 2 lines. No truncation debate.
- **Q2 is closed** — Stock has no leading tile in the design. The coloured left accent bar
  is the health signal, exactly as today.
- **Q3 is closed** — see W8, keep the expand.
- **Q4 — closed.** Search **stays** on Inwards. The design's missing search bar is an
  artifact of the mock holding one shipment (R8).
- **Q5 — closed.** The bottom tab bar is **out of scope**. Only the listing cards and the
  filter are taken from Stitch (R8). Flag the Dashboard/Stock/Inwards/Deliveries mismatch
  in review notes; do not act on it.
- **Q6 — closed.** Radius goes **app-wide** (R7).
- **Q7 — closed.** Build composite filtering properly in `paged.ts` (**R9**, W3.5).
- **Q8 — closed.** Map onto the real model; do not touch `mock/types.ts` (**R10**).
- **Q9 — closed.** Drop the trailing row icons (**R11**).

**No open questions remain. §13 is the plan of record.**

## 13.8 The designs are NOT presentation-only — three data-layer gaps

§3 opened with "none of this work touches data fetching. It is presentation only." That
was true of the plan in §§4–8. **It is not true of the Stitch filter screen or the KPI
headers.** Verified against `paged.ts` and `mockApi.stock.ts` on 2026-09-02.

### G1. The paging engine is single-filter; the design applies three at once

`PageQuery` (`paged.ts:27-37`) carries **one** chip plus one opaque `scopeId`:

```ts
filter?: F | "ALL";        // one chip
scopeId?: string | null;   // one second axis
```

and `ResourceConfig.filters` is `Record<F, (row) => boolean>` — a flat list of mutually
exclusive predicates. The Stitch filter screen has **three independent groups** (Status,
Timeline, Dispatch type) and its button reads **"Apply 3 Filters"**. There is no way to
express that today, on any of the six collections that share this engine.

Making it composite means, in `paged.ts`:

- `PageQuery.filters?: Partial<Record<GroupKey, string>>` alongside the existing `filter`,
  kept for the chip rows that stay.
- `ResourceConfig.filterGroups?: Record<GroupKey, Record<OptionKey, (row) => boolean>>`,
  AND-ed across groups, OR-ed within a group if an option is ever multi-select.
- **Facets get harder.** Today's guarantee is "counts are taken BEFORE the chip filter, so
  a chip always says how many rows it would give you." With N groups the honest
  equivalent is per-group counts taken with *the other groups applied but this one not* —
  N passes, not one. Cheapest correct approach: one pass that accumulates all groups'
  counters, skipping only the group being counted.
- The memo key must include the whole group map, or a second group silently serves the
  first one's page.

This is the largest single piece of work in the redesign, it is in the shared engine, and
it was invisible until the designs arrived. **Sequence it as W3.5 — after `PagedList`
variable heights, before the filter screen (W5).**

### G2. Three of the design's filter options do not exist in the domain

| Design control | App reality |
|---|---|
| STATUS → **"Packed"** | Not a `DeliveryStatus`. The eight are PENDING, VERIFIED, WALK_OUT, SCHEDULED, OUT_FOR_DELIVERY, DELIVERED, FLAGGED, PREBOOKED. |
| STATUS → omits VERIFIED, WALK_OUT, PREBOOKED | Three real statuses the design has no control for. |
| TIMELINE → Today / 3 Days / This Week / This Month / **Custom** | Only `TODAY` exists (`DeliveryFilter`). No date-range query, no custom range, no date picker wired to a query. |
| DISPATCH TYPE → Walk-out / Bangalore / Outstation | Conflates two fields: `WALK_OUT` is a **status**, while Bangalore/Outstation is the `isOutstation` **boolean**. As drawn, the three options are not one axis. |

The design was drawn against an idealised logistics app, not against this data model.
Resolution is Q7.

### G3. `StockSummary` does not have the KPI numbers

`StockSummary` (`mockApi.stock.ts:233-245`) returns eleven integers:
`activeCount, lowCount, outCount, totalCount, pendingTransfers, inboundInTransit,
inboundOverdue, deliveriesToday, deliveriesFlagged, openCounts, countsToApprove`.

The designs want:

| Screen | Tiles | Available? |
|---|---|---|
| Inwards | In Transit · This Week · Pre-booked · Delivered This Month | only `inboundInTransit` |
| Deliveries | Pending · Scheduled | neither |

Extending it is cheap — it is already one scan producing integers, and adding six more
counters costs nothing measurable. Do that rather than inventing a second endpoint.

**Do not source these from `PageResult.facets`.** Facets are scoped to the current search,
so the tiles would change as someone types. The design's tiles read as global counters.

## 13.10 Device pass 1 (2026-09-02) — every card was flat; one root cause

Screenshots in `doc/implementation/pending/asset/` (iPhone, MANAGER). Stock cards, Delivery
cards, Inbound cards, the hub's KPI tiles and section rows, the active filter chip, the
Filter button and the count sheet's rows all rendered with no background, border, padding,
height or flex-direction. Rows overflowed their `itemHeight` and painted over each other.

**Root cause — `src/components/PressScale.tsx`, not the screens.** Every broken element is
a `PressScale`; every plain `View` was fine. `8cc503a` registered BOTH `PressScale` and its
inner `Animated.createAnimatedComponent(Pressable)` with `cssInterop`. The inner interop
wrapper folds the inline `style` array `[animStyle, staticStyle]` into one object
(`assignToTarget` → `Object.assign`), so Reanimated's animated handle — which carries
`viewDescriptors` — is spread together with the resolved classes. Reanimated's
`PropsFilter` identifies an animated style by `viewDescriptors`, treats the merged object
as the handle and applies only `initial.value` (the scale transform). Every static style is
discarded. The press animation kept working, which is why it read as a layout bug.

**Fix.** Only the outer `PressScale` is registered. `className` arrives already resolved as
`style`; the animated Pressable receives `[animStyle, style]` un-wrapped, the array shape
Reanimated expects. The rule is recorded in AGENTS.md §4.

**Alignment fixes in the same pass**

- Count sheet rows (`stock-audit/[id].tsx`) → `RecordCard`, accent by variance (red short,
  amber over, green agrees). The three figure columns are 52px with one-line labels:
  "COUNTED" at 9.5px was wider than the old 48px column and wrapped to "COUNTE / D" even
  where the row's own styles applied. A locked sheet renders a plain View, not a disabled
  Pressable.
- Count list rows (`stock-audit/index.tsx`) → `RecordCard`; overdue is the red accent, not a
  red border. Full-size badge — the 116px card has the room.
- Hub (`stock-management/index.tsx`): KPI strip on `StatGrid columns={3}` instead of
  `flex-wrap`, labels may take two lines with a tile min-height so the rows stay level;
  section rows on `RecordCard`; ground is `surface` like the listing screens.
- `stock-audit` headers on `surface` — they sat on `gray-50` above a `surface` list.

**Same bug, not touched (outside D4):** `src/components/job/DueBadge.tsx` puts a
`className` on `Animated.View`, which is not registered with the interop at all, so the
overdue banner's red fill never applies. Move the className to a wrapping `View`.

**Still needs a device:** the fling test and the four-state pass from §13.9 are unchanged.
