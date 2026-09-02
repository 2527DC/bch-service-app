# Stitch reference — project `16632412348696695179`

"Professional Logistics Listing App", design system **Precision Logic**.
Pulled 2026-09-02 over the Stitch MCP (`mcp__stitch__*`).

| File | Screen | Stitch id |
|---|---|---|
| `stock.png` / `stock.html` | Stock Inventory | `8491eb597c2e4cd7a91edaa421e447f9` |
| `inward.png` / `inward.html` | Inwards Tracking | `09a4e5cd5b6d466db63c8eb40b9bc7b7` |
| `delivery.png` / `delivery.html` | Deliveries & Dispatch | `02223bc84cfa4fabb68e1ad929fe5439` |
| `filter.png` / `filter.html` | Filter Options | `18a74b4270ed413e8e8f7acafea3c2c1` |

There is **no Transfers screen** in the project. Transfers must be derived from the language.

## Retrieval notes

- `mcp__stitch__download_assets` reports success but writes nothing to the host
  filesystem — it resolves `outputDir` inside the MCP server's own sandbox. Ignore it.
- The working route is `list_screens` → `screenshot.downloadUrl` and
  `htmlCode.downloadUrl`, fetched with `curl`. Append `=s1400` to the
  `lh3.googleusercontent.com` screenshot URL or you get a 226px-wide thumbnail.

## Design tokens, mapped to this repo

| Stitch token | Value | Repo equivalent |
|---|---|---|
| `secondary` | `#2563eb` | `brand-600` — **exact match**, no change needed |
| `primary-container` | `#1e293b` | `slate-800` — new; selected-chip fill |
| `surface` / `background` | `#f8f9ff` | new; page ground (currently `gray-50`) |
| `surface-container-lowest` | `#ffffff` | `white` — card ground |
| `outline-variant` | `#c5c6cd` | ≈ `gray-200` — 1px card border |
| `error` / `error-container` | `#ba1a1a` / `#ffdad6` | `red-600` / `red-100` |
| radius `lg` / `xl` | 4px / 8px | **much tighter than the app's `rounded-2xl` (16px)** |
| body font | Hanken Grotesk | system font today; adopting it is optional |

Note the roundness: the design is a 4/8px system. The app is currently on 16px
(`rounded-2xl`) everywhere. That single value is most of why the two look unrelated.
