import type { GoalStats } from "@savings/shared";
import { apiFetch } from "../lib/api";
import { formatMoney } from "../lib/money";
import { AdviceButton } from "./advice-button";

async function getStats(goalId: string): Promise<GoalStats | null> {
  try {
    const res = await apiFetch(`/goals/${goalId}/stats`);
    if (!res.ok) return null;
    return (await res.json()) as GoalStats;
  } catch {
    return null;
  }
}

const W = 600;
const H = 160;
const PAD = { top: 10, right: 12, bottom: 22, left: 12 };

/** Gráfico de linha em SVG puro (sem biblioteca): saldo acumulado, meta e projeção. */
function Chart({ stats }: { stats: GoalStats }) {
  const pts = stats.history.map((h) => ({
    t: new Date(h.date).getTime(),
    v: h.cumulativeCents,
  }));
  if (pts.length === 0) return null;

  const now = Date.now();
  const projected = stats.projectedDate
    ? new Date(stats.projectedDate).getTime()
    : undefined;
  const t0 = pts[0].t;
  const t1 = Math.max(now, projected ?? now, pts[pts.length - 1].t);
  const span = Math.max(1, t1 - t0);
  const vMax = Math.max(stats.targetAmountCents, ...pts.map((p) => p.v));

  const x = (t: number) =>
    PAD.left + ((t - t0) / span) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + (1 - v / vMax) * (H - PAD.top - PAD.bottom);

  // Linha em degraus: o saldo fica parado até o próximo aporte e chega até hoje.
  const steps: string[] = [`${x(pts[0].t)},${y(0)}`];
  let prev = 0;
  for (const p of pts) {
    steps.push(`${x(p.t)},${y(prev)}`, `${x(p.t)},${y(p.v)}`);
    prev = p.v;
  }
  steps.push(`${x(now)},${y(prev)}`);

  const last = pts[pts.length - 1];
  const fmt = (t: number) => new Date(t).toLocaleDateString("pt-BR");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Evolução do saldo da meta"
      className="mt-3 w-full"
    >
      {/* meta */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(stats.targetAmountCents)}
        y2={y(stats.targetAmountCents)}
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeDasharray="4 4"
      />
      {/* projeção */}
      {projected && (
        <line
          x1={x(now)}
          y1={y(last.v)}
          x2={x(projected)}
          y2={y(stats.targetAmountCents)}
          stroke="#16a34a"
          strokeDasharray="5 4"
        />
      )}
      {/* saldo */}
      <polyline
        points={steps.join(" ")}
        fill="none"
        stroke="#16a34a"
        strokeWidth={2}
      />
      {pts.map((p) => (
        <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={3} fill="#16a34a" />
      ))}
      <text
        x={PAD.left}
        y={H - 6}
        fontSize={10}
        fill="currentColor"
        fillOpacity={0.6}
      >
        {fmt(t0)}
      </text>
      <text
        x={W - PAD.right}
        y={H - 6}
        fontSize={10}
        textAnchor="end"
        fill="currentColor"
        fillOpacity={0.6}
      >
        {fmt(t1)}
      </text>
    </svg>
  );
}

/** Barras: quanto foi guardado em cada mês. Meses sem aporte aparecem vazios. */
function MonthlyBars({ stats }: { stats: GoalStats }) {
  const data = stats.monthly.slice(-12);
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((m) => m.amountCents));
  const BH = 110;
  const slot = W / data.length;
  const bw = Math.min(40, slot * 0.6);
  const label = (m: string) => {
    const [y, mo] = m.split("-");
    return `${mo}/${y.slice(2)}`;
  };

  return (
    <div className="mt-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Aportes por mês
      </p>
      <svg
        viewBox={`0 0 ${W} ${BH + 34}`}
        role="img"
        aria-label="Aportes por mês"
        className="w-full"
      >
        <line
          x1={0}
          x2={W}
          y1={BH + 14}
          y2={BH + 14}
          stroke="currentColor"
          strokeOpacity={0.25}
        />
        {data.map((m, i) => {
          const h = (m.amountCents / max) * BH;
          const cx = slot * i + slot / 2;
          return (
            <g key={m.month}>
              <title>{`${label(m.month)}: ${formatMoney(m.amountCents, stats.currency)}`}</title>
              <rect
                x={cx - bw / 2}
                y={BH + 14 - h}
                width={bw}
                height={h}
                rx={3}
                fill="#16a34a"
              />
              {m.amountCents > 0 && (
                <text
                  x={cx}
                  y={BH + 14 - h - 4}
                  fontSize={9}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  {formatMoney(m.amountCents, stats.currency)}
                </text>
              )}
              <text
                x={cx}
                y={BH + 28}
                fontSize={10}
                textAnchor="middle"
                fill="currentColor"
                fillOpacity={0.6}
              >
                {label(m.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

/** Métricas e gráfico de uma meta. Acessa dados de runtime: usar dentro de <Suspense>. */
export async function GoalStatsPanel({ goalId }: { goalId: string }) {
  const stats = await getStats(goalId);
  if (!stats || stats.depositCount === 0) return null;

  const status = stats.reached
    ? "Meta atingida"
    : stats.onTrack === undefined
      ? "Sem data-alvo"
      : stats.onTrack
        ? "No prazo"
        : "Atrasada";

  return (
    <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="Aportes" value={String(stats.depositCount)} />
        <Metric
          label="Ritmo por mês"
          value={formatMoney(stats.monthlyPaceCents, stats.currency)}
        />
        <Metric
          label="Previsão"
          value={
            stats.projectedDate
              ? new Date(stats.projectedDate).toLocaleDateString("pt-BR")
              : stats.reached
                ? "Já atingida"
                : "—"
          }
        />
        <Metric label="Situação" value={status} />
        {stats.requiredMonthlyCents !== undefined && (
          <Metric
            label="Guardar por mês"
            value={formatMoney(stats.requiredMonthlyCents, stats.currency)}
          />
        )}
      </div>
      <Chart stats={stats} />
      <MonthlyBars stats={stats} />
      <AdviceButton goalId={stats.goalId} />
    </div>
  );
}
