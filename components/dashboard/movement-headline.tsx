import type { Movement } from "@/lib/frappe/exec-snapshot";

/**
 * The attributed movement panel — one computed sentence about what
 * moved and why, the first thing the owner reads. Navy ground,
 * turquoise speaks on it (brand 6.2); every figure comes from the
 * records named in the provenance line.
 */
export function MovementHeadline({ movement }: { movement: Movement }) {
  return (
    <section
      aria-label="This month's movement"
      className="rounded-card border border-ink-700 bg-ink-800 px-6 py-5 text-white"
    >
      <p className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">
        {movement.headline}
      </p>
      {movement.parts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {movement.parts.map((p) => (
            <li
              key={`${p.label}-${p.detail}`}
              className="inline-flex items-baseline gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm"
            >
              <span className="font-bold tabular-nums text-mint-300">{p.label}</span>
              <span className="text-white/80">{p.detail}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-white/50">{movement.basis}</p>
    </section>
  );
}
