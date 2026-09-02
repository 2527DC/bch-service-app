// Offset-table check for PagedList's getItemHeight path (plan W3 / A1).
//
// Standalone — there is no test runner in this repo. Run from the project root:
//     node doc/checks/paged-offsets.js
//
// Mirrors the cumulative-offset arithmetic in src/components/PagedList.tsx against the
// Deliveries shape (40px group headers among 92+8px rows) and asserts the invariant that
// every row's offset equals the sum of all preceding heights. Also probes the cases that
// fail silently: an index past the end, and an empty list — both must clamp, never NaN,
// because a NaN offset poisons every row below it.

// Mirror of PagedList's offset table + getItemLayout, tested against Deliveries' shape.
const HEADER_H = 40, ROW_H = 92, GAP = 8;
const h = (e) => (e.kind === "header" ? HEADER_H : ROW_H + GAP);

function build(data) {
  const out = new Array(data.length + 1);
  out[0] = 0;
  for (let i = 0; i < data.length; i++) out[i + 1] = out[i] + h(data[i], i);
  return out;
}
function layout(offsets, index) {
  const start = offsets[index] ?? offsets[offsets.length - 1] ?? 0;
  const end = offsets[index + 1] ?? start;
  return { length: end - start, offset: start, index };
}

// A realistic grouped stream: header, 3 rows, header, 2 rows
const data = [
  { kind: "header" }, { kind: "row" }, { kind: "row" }, { kind: "row" },
  { kind: "header" }, { kind: "row" }, { kind: "row" },
];
const offs = build(data);
console.log("offsets:", offs.join(","));
data.forEach((_, i) => {
  const l = layout(offs, i);
  console.log(`  i=${i} ${data[i].kind.padEnd(6)} offset=${String(l.offset).padStart(4)} length=${l.length}`);
});

// INVARIANT: every row's offset must equal the sum of all preceding heights.
let acc = 0, ok = true;
data.forEach((d, i) => {
  const l = layout(offs, i);
  if (l.offset !== acc) { console.log(`MISMATCH at ${i}: ${l.offset} != ${acc}`); ok = false; }
  if (l.length !== h(d)) { console.log(`BAD LENGTH at ${i}`); ok = false; }
  acc += h(d);
});
console.log("contiguous+exact:", ok, "| total content height:", acc, "== last offset:", offs[offs.length-1]);

// Out-of-range probes (VirtualizedList does this while settling)
console.log("i=7 (==len):", JSON.stringify(layout(offs, 7)));
console.log("i=99 (past end):", JSON.stringify(layout(offs, 99)));
console.log("empty list:", JSON.stringify(layout(build([]), 0)));
