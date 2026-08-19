const KEY = process.env.KEY;
const URL = process.env.URL || "https://removeclaudewatermark-com.vercel.app/api/v1/rewrite";

const sample = "The quarterly report confirms that our revenue grew by 14.2 percent in the third quarter, while operating costs stayed flat. The board will discuss the expansion plan for Europe at the next meeting in Berlin on March 5th.";

async function one() {
  const start = Date.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ text: sample }),
  });
  const ms = Date.now() - start;
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ms, error: body.error || null };
}

async function main() {
  const waves = Number(process.env.WAVES || 8);
  const concurrency = Number(process.env.CONCURRENCY || 12);
  const results = [];
  for (let w = 0; w < waves; w++) {
    const batch = Array.from({ length: concurrency }, () => one());
    const done = await Promise.allSettled(batch);
    for (const d of done) {
      if (d.status === "fulfilled") results.push(d.value);
      else results.push({ status: "rejected", ms: -1, error: String(d.reason) });
    }
    console.log(`wave ${w + 1}/${waves} done (total ${results.length})`);
  }
  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const ok = results.filter((r) => r.status === 200);
  const ms = ok.map((r) => r.ms).sort((a, b) => a - b);
  const p = (q) => ms[Math.floor((q / 100) * ms.length)] ?? -1;
  const errors = results.filter((r) => r.status !== 200 && r.status !== 429).slice(0, 5);
  console.log("\n=== STRESS RESULT ===");
  console.log("total:", results.length, "| statuses:", JSON.stringify(byStatus));
  console.log(`latency (200s only): p50=${p(50)}ms p95=${p(95)}ms p99=${p(99)}ms max=${ms[ms.length - 1] ?? -1}ms`);
  console.log("non-200/429 responses:", JSON.stringify(errors, null, 2));
}

main();
