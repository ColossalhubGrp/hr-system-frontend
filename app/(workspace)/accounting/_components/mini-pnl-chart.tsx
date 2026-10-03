import type { OverviewData } from "../_lib/overview-data";

function fmtAxis(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return n.toFixed(0);
}

/**
 * 12-month revenue vs expenses mini bar chart. Pure inline SVG so it
 * renders in a Server Component — no runtime chart dep. Revenue is
 * primary (brand purple), expenses rose, net plotted as a line on
 * top so you see the margin at a glance.
 */
export function MiniPnlChart({ data }: { data: OverviewData }) {
  const months = data.monthly;
  if (months.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        No posted invoices in the last 12 months.
      </section>
    );
  }

  const W = 760;
  const H = 180;
  const PAD_L = 36;
  const PAD_R = 8;
  const PAD_T = 16;
  const PAD_B = 24;

  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxAbs = Math.max(
    1,
    ...months.map((m) => Math.max(m.revenue, m.expenses, Math.abs(m.revenue - m.expenses))),
  );
  const n = months.length;
  const slot = chartW / n;
  const gap = Math.max(2, slot * 0.1);
  const barW = Math.max(3, (slot - gap) / 2 - 1);

  const toY = (v: number) => PAD_T + chartH - (v / maxAbs) * chartH;
  const baselineY = PAD_T + chartH;

  // Net-income line (revenue − expenses) as path through month centres.
  const netPath = months.map((m, i) => {
    const x = PAD_L + slot * i + slot / 2;
    const net = m.revenue - m.expenses;
    // net can be negative — allow line to dip below baseline (clamp at bottom pad)
    const yRaw = baselineY - (net / maxAbs) * chartH;
    const y = Math.max(PAD_T, Math.min(baselineY, yRaw));
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const gridTicks = [0.25, 0.5, 0.75, 1].map((t) => ({
    value: maxAbs * t,
    y: PAD_T + chartH * (1 - t),
  }));

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">
            Revenue vs expenses · last 12 months
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Submitted invoice totals, bucketed by posting date. Net margin shown as the overlay line.
          </p>
        </div>
        <ul className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
            Revenue
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" />
            Expenses
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 bg-emerald-500" />
            Net
          </li>
        </ul>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full">
        {/* grid */}
        {gridTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={t.y} y2={t.y}
                  className="stroke-border" strokeDasharray="2 3" strokeWidth="0.5" />
            <text x={PAD_L - 4} y={t.y + 3} textAnchor="end"
                  className="fill-muted-foreground text-[9px]">{fmtAxis(t.value)}</text>
          </g>
        ))}

        {/* baseline */}
        <line x1={PAD_L} x2={W - PAD_R} y1={baselineY} y2={baselineY}
              className="stroke-border" strokeWidth="0.8" />

        {/* bars */}
        {months.map((m, i) => {
          const xBase = PAD_L + slot * i + gap / 2;
          const revH = baselineY - toY(m.revenue);
          const expH = baselineY - toY(m.expenses);
          return (
            <g key={i}>
              <rect x={xBase} y={toY(m.revenue)} width={barW} height={revH} className="fill-primary">
                <title>{m.monthLabel} · Revenue ${m.revenue.toFixed(0)}</title>
              </rect>
              <rect x={xBase + barW + 1} y={toY(m.expenses)} width={barW} height={expH} className="fill-rose-400">
                <title>{m.monthLabel} · Expenses ${m.expenses.toFixed(0)}</title>
              </rect>
              <text x={xBase + barW} y={H - 6} textAnchor="middle"
                    className="fill-muted-foreground text-[9px]">{m.monthLabel}</text>
            </g>
          );
        })}

        {/* net line */}
        <path d={netPath} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className="stroke-emerald-500" />
        {/* net dots */}
        {months.map((m, i) => {
          const x = PAD_L + slot * i + slot / 2;
          const net = m.revenue - m.expenses;
          const yRaw = baselineY - (net / maxAbs) * chartH;
          const y = Math.max(PAD_T, Math.min(baselineY, yRaw));
          return (
            <circle key={i} cx={x} cy={y} r="2" className="fill-emerald-500">
              <title>{m.monthLabel} · Net ${net.toFixed(0)}</title>
            </circle>
          );
        })}
      </svg>
    </section>
  );
}
