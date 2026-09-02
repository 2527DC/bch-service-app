// Brute-force oracle for createPagedResource's composite filtering (plan §13.8 G1).
//
// There is no test runner in this repo, so this is a standalone script. Run from the
// PROJECT ROOT so the relative read and node_modules both resolve:
//
//     node doc/checks/paged-composite.js
//
// It transpiles the real src/services/paged.ts and cross-checks every result and every
// facet against an independent filter/count, across each combination of search x chip x
// group selection. The group-facet semantics are the subtle part: a group's counts are
// taken with every OTHER control still applied, so each number answers "if I changed
// only this one control". Re-run it after touching resolve().
const ts = require("typescript"), fs = require("fs");
const src = fs.readFileSync("src/services/paged.ts", "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function("exports", "module", "require", js)(m.exports, m, require);
const { createPagedResource } = m.exports;

const STATUS = ["PENDING", "SCHEDULED", "DELIVERED"];
const rows = [];
for (let i = 0; i < 400; i++) {
  rows.push({ id: "r" + i, name: "cust " + (i % 7), status: STATUS[i % 3], outstation: i % 4 === 0, day: i % 5 });
}

const chips = { OPEN: (r) => r.status !== "DELIVERED", DONE: (r) => r.status === "DELIVERED" };
const groups = {
  status:   { PENDING: r => r.status==="PENDING", SCHEDULED: r => r.status==="SCHEDULED", DELIVERED: r => r.status==="DELIVERED" },
  dispatch: { LOCAL: r => !r.outstation, OUTSTATION: r => r.outstation },
  timeline: { TODAY: r => r.day===0, WEEK: r => r.day<5 },
};

const res = createPagedResource({
  rows: () => rows, idOf: r => r.id, searchText: r => r.name,
  filters: chips, filterGroups: groups,
  sorts: { ID: (a,b) => a.id.localeCompare(b.id) }, defaultSort: "ID", pageSize: 1000,
});

const gk = Object.keys(groups);
const passSearch = (r,q) => !q || r.name.toLowerCase().includes(q.toLowerCase());
const passChip = (r,f) => f==="ALL" || chips[f](r);
const passGroup = (r,g,sel) => { const o = sel[g]; return !o || o==="ALL" ? true : (groups[g][o] ? groups[g][o](r) : true); };
const passAllGroups = (r,sel) => gk.every(g => passGroup(r,g,sel));

let fails = 0, checks = 0;
const check = (label, got, want) => { checks++; if (got !== want) { if (fails < 8) console.log(`  FAIL ${label}: got ${got} want ${want}`); fails++; } };

const selections = [
  {}, { status: "PENDING" }, { status: "PENDING", dispatch: "OUTSTATION" },
  { status: "SCHEDULED", dispatch: "LOCAL", timeline: "TODAY" },
  { status: "ALL", dispatch: "OUTSTATION" },
  { status: "DELIVERED", dispatch: "OUTSTATION", timeline: "TODAY" },
  { status: "BOGUS_KEY" },
];

for (const q of ["", "cust 3"]) for (const f of ["ALL","OPEN","DONE"]) for (const sel of selections) {
  const page = res.query({ q, filter: f, filters: sel, limit: 1000 });
  const label = `q="${q}" chip=${f} sel=${JSON.stringify(sel)}`;

  const want = rows.filter(r => passSearch(r,q) && passChip(r,f) && passAllGroups(r,sel));
  check(label+" total", page.total, want.length);
  const wantPage = [...want].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,100);
  check(label+" items", page.items.map(r=>r.id).join(), wantPage.map(r=>r.id).join());

  check(label+" facet.ALL", page.facets.ALL, rows.filter(r=>passSearch(r,q)&&passAllGroups(r,sel)).length);
  for (const c of Object.keys(chips))
    check(label+` facet.${c}`, page.facets[c], rows.filter(r=>passSearch(r,q)&&passAllGroups(r,sel)&&chips[c](r)).length);

  for (const g of gk) {
    const others = r => gk.filter(x=>x!==g).every(x => passGroup(r,x,sel));
    const bucketBase = r => passSearch(r,q) && passChip(r,f) && others(r);
    check(label+` gf.${g}.ALL`, page.groupFacets[g].ALL, rows.filter(bucketBase).length);
    for (const o of Object.keys(groups[g]))
      check(label+` gf.${g}.${o}`, page.groupFacets[g][o], rows.filter(r=>bucketBase(r)&&groups[g][o](r)).length);
  }
}

// A collection with NO groups must behave exactly as before, and expose no groupFacets.
const plain = createPagedResource({
  rows: () => rows, idOf: r => r.id, searchText: r => r.name,
  filters: chips, sorts: { ID: (a,b)=>a.id.localeCompare(b.id) }, defaultSort: "ID", pageSize: 1000,
});
const p = plain.query({ filter: "OPEN", limit: 1000 });
check("no-groups total", p.total, rows.filter(r=>chips.OPEN(r)).length);
check("no-groups facet.ALL", p.facets.ALL, rows.length);
check("no-groups groupFacets absent", p.groupFacets, undefined);
check("no-groups ignores stray filters", plain.query({ filters: { status: "PENDING" }, limit: 1000 }).total, rows.length);

// Memo must not serve one selection's page for another.
const a = res.query({ filters: { status: "PENDING" }, limit: 1000 }).total;
const b = res.query({ filters: { status: "DELIVERED" }, limit: 1000 }).total;
const a2 = res.query({ filters: { status: "PENDING" }, limit: 1000 }).total;
check("memo distinguishes selections", a !== b, true);
check("memo returns same for repeat", a2, a);

console.log(`${checks} checks, ${fails} failures`);
console.log(fails === 0 ? "composite filtering: ALL CHECKS PASS" : "composite filtering: FAILURES");
