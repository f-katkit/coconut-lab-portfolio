const { makeSeries, scan, pick, EVENT } = require("../docs/demo.js");

let fail = false;
for (const kind of ["visits", "latency"]) {
  let ok = 0, early = 0, miss = 0;
  const N = 400;
  for (let s = 1; s <= N; s++) {
    const r = scan(makeSeries(s, kind));
    if (!r) miss++;
    else if (r.day < EVENT) early++;
    else if (r.day === EVENT) ok++;
    else miss++;
  }
  console.log(kind, { N, ok, early, miss, rate: ok / N });
  if (ok / N < 0.9) fail = true;

  let pickFail = 0;
  for (let s = 1; s <= 500; s++) if (!pick(s * 7, kind)) pickFail++;
  console.log(kind, { pickFail });
  if (pickFail) fail = true;
}
process.exit(fail ? 1 : 0);
