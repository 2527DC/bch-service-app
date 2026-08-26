# BCH Service App — Agent Rules

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
- State is two zustand stores — screens read these, never fetch:
  - `src/store/session.ts` — `user`, `hydrated`, `login`, `logout` (AsyncStorage-backed)
  - `src/store/data.ts` — `jobs`, `prices`, `incentives`, `assemblies`, plus every
    mutation (`updateJobStatus`, `saveNotes`, `savePrice`, …), `loading`/`refreshing`/
    `error`, and `showToast`
- Subscribe with a **selector**, one field per call: `useData((s) => s.jobs)`.
  Never `useData()` unselected — it re-renders the screen on every store change.

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
`AppHeader`, `BottomTabBar`, and `src/components/job/*` (`JobCard`, `JobNotes`,
`JobPhotos`, `PhotoViewer`, `DueBadge`).

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
