function day(tsMs) {
  const d = new Date(tsMs);
  return d.toISOString().slice(0, 10);
}

export async function deriveAccountTotals(tradesJson, lastHourlyMarker) {
  const rows = Array.isArray(tradesJson?.trades) ? tradesJson.trades : [];
  const byModel = new Map();
  for (const t of rows) {
    const id = String(t.model_id || 'default');
    const exitTime = Number(t.exit_time || 0) * 1000 || Date.parse(String(t.exit_human_time || '')) || 0;
    const pnl = Number(t.realized_net_pnl || t.realized_gross_pnl || 0);
    if (!byModel.has(id)) byModel.set(id, new Map());
    const dm = byModel.get(id);
    const dkey = day(exitTime);
    dm.set(dkey, (dm.get(dkey) || 0) + pnl);
  }
  const out = [];
  for (const [id, dm] of byModel) {
    let eq = 10000; // seed
    const days = Array.from(dm.keys()).sort();
    for (const k of days) {
      eq += dm.get(k) || 0;
      const ts = Date.parse(k + 'T00:00:00Z');
      const marker = Math.floor(ts / 3600_000); // hourly marker
      if (lastHourlyMarker != null && marker <= lastHourlyMarker) continue;
      out.push({ model_id: id, timestamp: Math.floor(ts / 1000), dollar_equity: eq, since_inception_hourly_marker: marker });
    }
  }
  return out;
}

export async function deriveLeaderboard(tradesJson) {
  const rows = Array.isArray(tradesJson?.trades) ? tradesJson.trades : [];
  const agg = new Map();
  for (const t of rows) {
    const id = String(t.model_id || 'default');
    const pnl = Number(t.realized_net_pnl || t.realized_gross_pnl || 0);
    const prev = agg.get(id) || { id, equity: 10000, num_trades: 0, wins: 0, losses: 0 };
    prev.equity += pnl;
    prev.num_trades += 1;
    if (pnl >= 0) prev.wins += 1; else prev.losses += 1;
    agg.set(id, prev);
  }
  const out = [];
  for (const [id, a] of agg) {
    out.push({ id, equity: a.equity, num_trades: a.num_trades, num_wins: a.wins, num_losses: a.losses });
  }
  return out;
}

export async function deriveSinceInception(tradesJson) {
  const rows = Array.isArray(tradesJson?.trades) ? tradesJson.trades : [];
  const firstByModel = new Map();
  const countByModel = new Map();
  const pnlByModel = new Map();
  for (const t of rows) {
    const id = String(t.model_id || 'default');
    const ts = Number(t.entry_time || 0) * 1000 || Date.parse(String(t.entry_human_time || '')) || Date.now();
    if (!firstByModel.has(id) || ts < firstByModel.get(id)) firstByModel.set(id, ts);
    countByModel.set(id, (countByModel.get(id) || 0) + 1);
    pnlByModel.set(id, (pnlByModel.get(id) || 0) + Number(t.realized_net_pnl || t.realized_gross_pnl || 0));
  }
  const sinceInceptionValues = [];
  for (const [id, ts] of firstByModel) {
    const nav = 10000 + (pnlByModel.get(id) || 0);
    sinceInceptionValues.push({ id, model_id: id, nav_since_inception: nav, inception_date: Math.floor(ts / 1000), num_invocations: countByModel.get(id) || 0 });
  }
  return { serverTime: Date.now(), sinceInceptionValues };
}


