# Bharath Cycle Hub — Agent Rules

## 0. Before writing any code

**Expo has changed.** Do not write Expo/React Native code from memory.

1. The **official Expo skills plugin** (`expo@claude-plugins-official`, source `github.com/expo/skills`)
   is enabled in `.claude/settings.json`. Use it. The relevant skills:
   - `expo-router` — navigation: stacks, tabs, drawers, modals, headers
   - `expo-native-ui` — styling, controls, icons, visual effects
   - `expo-design-system` — theme tokens, reusable components
   - `expo-animation` — Reanimated, Gesture Handler, haptics
   - `expo-upgrade` — SDK bumps and dependency conflicts
2. If a skill is unavailable, read the exact versioned docs at
   <https://docs.expo.dev/versions/v54.0.0/> — **v54, not "latest"**.
3. ⚠️ The `expo-tailwind-setup` skill targets **NativeWind v5 + Tailwind v4**.
   This project is on **NativeWind 4.2.6 + Tailwind 3.4**. Do not follow that skill's
   setup instructions here; they will break the build.

**Install deps with `npx expo install <pkg>`, never bare `npm install`** — it pins to
SDK 54-compatible versions.

## 1. Stack

Expo SDK 54 · expo-router 6 (typed routes on) · React 19.1 / RN 0.81 · New Architecture enabled
· NativeWind 4.2 · zustand 5 · TypeScript strict · lucide-react-native + @expo/vector-icons

## 2. Architecture — mock-first

This is a **UI port of a PWA against a mock backend**. There is no network.

- All I/O goes through `src/services/mockApi.ts`. Every call sleeps 250–500ms
  (`simulate()`) so spinners and skeletons actually get exercised. New data access
  gets a `mockApi` function first — screens never touch `src/mock/*` directly.
- Seed data lives in `src/mock/*.ts`; shapes in `src/mock/types.ts` deliberately
  **mirror the PWA's Prisma models** so screen code stays byte-for-byte comparable.
  Do not "improve" a type's shape without a reason.
- State is three zustand stores — screens read these, never fetch:
  - `src/store/session.ts` — `user`, `hydrated`, `login`, `logout`, `hasPermission`
    (AsyncStorage-backed)
  - `src/store/data.ts` — `jobs`, `prices`, `incentives`, `assemblies`, plus every
    mutation (`updateJobStatus`, `saveNotes`, `savePrice`, …), `loading`/`refreshing`/
    `error`, and `showToast`
  - `src/store/stock.ts` — the Stock Management module: `summary`, `productTypes`,
    `stockCounts`, `inbound`, `deliveries`, `transfers`, `warehouses`, the open
    product `detail`, and that module's mutations
- Subscribe with a **selector**, one field per call: `useData((s) => s.jobs)`.
  Never `useData()` unselected — it re-renders the screen on every store change.

### Big collections do NOT go in a store

A store holds small, shared things. **Anything that grows without bound is paged into the
screen that shows it** — a store slice re-renders every subscriber on any write and keeps
the whole collection alive for the session. Current sizes in the mock: ~10k products, 4k
deliveries, 1.2k transfers, 600 shipments, and count sheets of 2k+ lines.

**Three pieces. Use all three; do not hand-roll a list.**

1. `src/services/paged.ts` — `createPagedResource`. A collection declares how to search
   it, what its chips mean and how it sorts; it gets facet counts, memoisation and cursor
   paging for free. Adding the next collection is a config object, not a file.
   Facet counts are taken **before** the chip filter, so a chip always says how many rows
   it *would* give you. Every mutation must call the resource's `invalidate()`.
2. `src/lib/usePagedList.ts` — the consuming hook. Handles the four things that break
   infinite lists: stale responses when the query changes mid-flight, `onEndReached`
   firing repeatedly, the end of the list, and duplicate keys on append. Put **everything
   the query depends on** in `resetKey` — including `useStock`'s `revision`, or a write
   will leave the list it was made from showing the old row.
3. `src/components/PagedList.tsx` — the virtualized `FlatList` wrapper: footer loader,
   pull-to-refresh, all four states, and the windowing settings.

**Rules that are not optional:**

- Pass `itemHeight` and the list supplies `getItemLayout`, which is what removes blank
  cells during a fast fling. That means **rows are fixed-height by design** — set an
  explicit height and `numberOfLines` on every text. Omit `itemHeight` only when rows
  genuinely vary (an expanded card, mixed headers); a wrong height is worse than none.
- `ListHeaderComponent` takes an **element, not a function component**. A new component
  type each render remounts the header and closes the keyboard on every keystroke.
- Only the FIRST load may replace the screen (`initialLoad`). After that, loading, empty
  and error render *inside* the list — same reason.
- Row components are `React.memo` with an explicit comparator, and every callback passed
  to a row is `useCallback`.
- Search is debounced (300ms) into a separate state; the raw input never hits the query.
- **Grouped and paged**: do not fetch everything to bucket it. Sort server-side into the
  group order and insert a header when the value changes as the stream goes by — see
  `deliveries/index.tsx`. Grouping is then a property of the order, and it pages.

**Endpoint side.** `queryProducts` / `queryDeliveries` / `queryInbound` / `queryTransfers`
/ `queryStockCounts` / `queryCountItems` return a page; `searchProducts` is a capped
type-ahead for pickers; `getStockSummary` returns every hub counter in one call so the hub
never pulls rows to count them. List rows never carry their children — a count row carries
a fraction, not its 2,000 lines (`StockCountSummaryRow`).

**Mock data at real scale.** `src/mock/stock-catalog.ts` and `src/mock/stock-volume.ts`
generate from a **seeded** PRNG, so the same SKU has the same stock on every reload and a
screenshot stays reproducible. The hand-written fixtures in `stock.ts` stay at the front of
every collection — they are what demos show.

> Not yet converted: the workshop job screens (`mechanic`, `supervisor`, `history`) still
> map over a store array. They are the next adopters if job volume grows.

## 3. Routing

- File-based, `app/` directory. `app/(app)/` is the authed group; its `_layout.tsx`
  is the auth gate (`<Redirect href="/login" />` when there is no user) and the shell.
- Typed routes are **on** (`experiments.typedRoutes`). A new file under `app/(app)/`
  is automatically a route — no manual registration.
- Navigate with `useRouter()`; `router.navigate` for tabs/drawer (no history stacking),
  `router.push` for drill-downs, `router.replace` for auth transitions.

## 4. Styling

- **NativeWind `className` only.** The `style` prop is reserved for three things:
  safe-area insets, Reanimated animated styles, and `contentContainerStyle`.
- **Brand accent is `brand-*`** (`#2563eb` at `brand-600`), defined in
  `tailwind.config.js` → `theme.extend.colors.brand`. Never write a raw
  `bg-blue-600` / `text-blue-600` to mean "our accent".
- For colors needed **outside** a className — an icon's `color` prop, a Reanimated
  style, a native tint — import from `src/lib/theme.ts` (`BRAND`, `ACTIVE_TINT`,
  `INACTIVE_TINT`). Never hardcode a hex inline.
- Status colors, job-type colors, and their emoji are centralized in
  `src/lib/constants.ts` (`JOB_STATUS`, `JOB_TYPE`, `BIKE_CATEGORIES`). Read from
  there — never inline a status color or emoji in a screen.

## 5. Icons

- **Navigation chrome** (bottom tab bar, drawer rows, header buttons) — `Ionicons`
  from `@expo/vector-icons`, using its outline/filled pairs: `*-outline` when
  inactive, solid when active, tinted `INACTIVE_TINT` / `ACTIVE_TINT`.
  This outline→filled swap is the native iOS/Android pattern and is what makes the
  bar read as a real app.
- **In-screen content** (list rows, cards, empty states, buttons) — `lucide-react-native`,
  matching `manager.tsx` / `login.tsx` / `SearchBar.tsx`. Size 18–22, explicit `color`.
- **Emoji are data, not UI.** A user's `emoji`, a status emoji, a bike-category emoji —
  those come from the data/constants and render in `<Text>`. Do **not** use emoji as
  interface icons (nav, buttons, affordances).

## 6. Dates & money

- Business dates are **IST**. Use `src/lib/timezone.ts` — `getTodayIST`,
  `getStartOfTodayIST`, `getEndOfTodayIST`, `isToday`, `formatIST`, `shiftTodayIST`.
  Never a bare `new Date()` for anything the shop floor sees.
- Display via `src/lib/format.ts` — `formatINR`, `formatDayMonth`, `formatTime`,
  `timeSince`, `fmtTat`. Money is ₹ integers; never `toFixed(2)` a rupee amount.

## 7. Shared components — reuse before building

`PressScale` (the `active:scale-95` replacement — use for every tappable card/button),
`BouncingEmoji` (full-screen loading), `EmptyState`, `ErrorBanner`, `Toast`,
`SearchBar`, `StatusFilter`, `DatePickerField`, `MonthPickerField`, `PartsSelector`,
`AppHeader`, `BottomTabBar`, `PagedList` (every long list), and
`src/components/job/*` (`JobCard`, `JobNotes`, `JobPhotos`, `PhotoViewer`, `DueBadge`).

Stock Management adds `src/components/stock/*` — `ScreenHeader`, `Badge`, `Card`, `KV`,
`Pills`, `SectionTitle`, `ActionButton`, `Stepper`, `NoAccess` and `FilterSheet`. Its
status tones live in `src/lib/stock-constants.ts` (`TONE`, `stockHealth`); a stock screen
names a tone, never a colour.

## 8. Interaction

- Touch targets ≥ 56px tall — this is used one-handed, in a workshop, often with
  gloves. `min-h-[56px]` on nav and primary actions.
- Destructive actions go through `Alert.alert` with a `style: "destructive"` confirm.
- Confirm success with `showToast(...)`, not a blocking dialog.
- Haptics on meaningful commits only (`expo-haptics`), never on plain navigation.
- Lists that show server-ish data get `RefreshControl` wired to `refreshing` + `refresh`.
  Screens that must stay live call `useAutoRefresh()` (60s poll, pauses when
  unfocused, re-fires on app foreground) — there is no manual refresh button.

## 9. Definition of done

- `npx tsc --noEmit` is clean. It takes ~2 min on this repo; give it a real timeout.
- New screens handle all four states: loading, empty, error, populated.
- Role behavior verified for all three roles — `MECHANIC`, `SUPERVISOR`, `MANAGER`.
- No new raw hex colors, no new inline status emoji, no bare `new Date()`.
