import { useMemo } from 'react';
import { formatAngle, formatSI } from '../../domain/format';
import type { CircuitAnalysis, Phasor } from '../../domain/types';
import { useTheme } from '../../hooks/useTheme';
import { plotScale } from '../../lib/plotScale';
import { phasorColor, plotPalette } from './palette';

interface PhasorPlotProps {
  analysis: CircuitAnalysis;
  decimals: number;
}

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 420;
const ORIGIN_X = 280;
const ORIGIN_Y = 198;
const MAX_RADIUS = 150;
const DIVISIONS = 5;

type LabelAnchor = 'start' | 'middle' | 'end';

interface LabelRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface LabelLayout {
  x: number;
  y: number;
  anchor: LabelAnchor;
  width: number;
}

function labelWidth(symbol: string, magnitude: string): number {
  return Math.max(symbol.length * 6.8, magnitude.length * 5.4) + 4;
}

function labelRect(x: number, y: number, anchor: LabelAnchor, width: number): LabelRect {
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  return { left, right: left + width, top: y - 9, bottom: y + 17 };
}

function overlaps(a: LabelRect, b: LabelRect): boolean {
  const padding = 2;
  return (
    a.left < b.right + padding &&
    a.right + padding > b.left &&
    a.top < b.bottom + padding &&
    a.bottom + padding > b.top
  );
}

function layoutLabels(
  vectors: Phasor[],
  pixelScale: number,
  unit: string,
  decimals: number,
): Map<string, LabelLayout> {
  const placed: LabelRect[] = [];
  const layouts = new Map<string, LabelLayout>();
  const ordered = [...vectors]
    .filter((vector) => vector.magnitude > 0)
    .sort((a, b) => {
      const aTotal = a.key === 'u' || a.key === 'i';
      const bTotal = b.key === 'u' || b.key === 'i';
      if (aTotal !== bTotal) return aTotal ? -1 : 1;
      return b.magnitude - a.magnitude;
    });

  for (const vector of ordered) {
    const x = ORIGIN_X + vector.re * pixelScale;
    const y = ORIGIN_Y - vector.im * pixelScale;
    const magnitude = formatSI(vector.magnitude, unit, decimals);
    const width = labelWidth(vector.symbol, magnitude);
    const cos = vector.re / vector.magnitude;
    const sin = vector.im / vector.magnitude;

    const sideOrder: LabelAnchor[] =
      cos > 0.18 ? ['start', 'middle', 'end'] : cos < -0.18 ? ['end', 'middle', 'start'] : ['middle', 'start', 'end'];
    const verticalOrder = sin < -0.15 ? [20, -14] : [-14, 20];
    const candidates: Array<{ x: number; y: number; anchor: LabelAnchor; box: LabelRect }> = [];

    for (const anchor of sideOrder) {
      for (const dy of verticalOrder) {
        const candidateX = x + (anchor === 'start' ? 11 : anchor === 'end' ? -11 : 0);
        const candidateY = y + dy;
        const box = labelRect(candidateX, candidateY, anchor, width);
        candidates.push({ x: candidateX, y: candidateY, anchor, box });
      }
    }

    // If everything close to the tip is occupied, step a little further out.
    for (const anchor of sideOrder) {
      for (const dy of verticalOrder) {
        const candidateX = x + (anchor === 'start' ? 19 : anchor === 'end' ? -19 : 0);
        const candidateY = y + dy + (dy < 0 ? -10 : 10);
        const box = labelRect(candidateX, candidateY, anchor, width);
        candidates.push({ x: candidateX, y: candidateY, anchor, box });
      }
    }

    const inBounds = (box: LabelRect) =>
      box.left >= 8 && box.right <= VIEW_WIDTH - 8 && box.top >= 8 && box.bottom <= VIEW_HEIGHT - 22;
    const score = (box: LabelRect) => {
      let value = 0;
      if (!inBounds(box)) value += 1000;
      for (const other of placed) {
        if (overlaps(box, other)) value += 100;
      }
      return value;
    };

    const free = candidates.find((candidate) => inBounds(candidate.box) && !placed.some((box) => overlaps(candidate.box, box)));
    const chosen = free ?? candidates.reduce((best, candidate) => (score(candidate.box) < score(best.box) ? candidate : best), candidates[0]);

    if (!chosen) continue;
    placed.push(chosen.box);
    layouts.set(vector.key, {
      x: chosen.x,
      y: chosen.y,
      anchor: chosen.anchor,
      width,
    });
  }

  return layouts;
}

function arcPath(radius: number, angleDeg: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const startX = ORIGIN_X + radius;
  const startY = ORIGIN_Y;
  const endX = ORIGIN_X + radius * Math.cos(rad);
  const endY = ORIGIN_Y - radius * Math.sin(rad);
  const sweep = angleDeg >= 0 ? 0 : 1;
  const largeArc = Math.abs(angleDeg) > 180 ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
}

export function PhasorPlot({ analysis, decimals }: PhasorPlotProps) {
  const { theme } = useTheme();
  const palette = useMemo(() => plotPalette(theme), [theme]);

  const allVectors = useMemo(
    () => [...analysis.phasors.vectors, analysis.phasors.total],
    [analysis.phasors],
  );
  const largest = allVectors.reduce((maximum, vector) => Math.max(maximum, vector.magnitude), 0);
  const { step, max: scaleMax } = plotScale(largest, DIVISIONS);
  const pixelScale = MAX_RADIUS / scaleMax;
  const unit = analysis.phasors.unit;
  const labels = useMemo(
    () => layoutLabels(allVectors, pixelScale, unit, decimals),
    [allVectors, pixelScale, unit, decimals],
  );

  const gridValues = Array.from({ length: DIVISIONS * 2 + 1 }, (_, index) => (index - DIVISIONS) * step);
  const totalAngle = analysis.phasors.total.angleDeg;
  const showArc = Math.abs(totalAngle) > 2 && Math.abs(totalAngle) < 178;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="eyebrow">
            {analysis.phasors.kind === 'voltage' ? 'Voltage phasors' : 'Current phasors'}
          </span>
          <span className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] font-medium text-muted">
            {unit}
          </span>
        </div>
        <p className="text-[10px] text-faint">U reference at 0° · +Imaginary up</p>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`${analysis.phasors.kind} phasor diagram for a ${analysis.topology} RLC circuit`}
        className="h-auto w-full select-none"
      >
        <title>{`${analysis.phasors.kind === 'voltage' ? 'Voltage' : 'Current'} phasor diagram`}</title>
        <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={palette.surface} rx="12" />

        {gridValues.map((value) => {
          const x = ORIGIN_X + value * pixelScale;
          const y = ORIGIN_Y - value * pixelScale;
          const isAxis = value === 0;
          return (
            <g key={`grid-${value}`}>
              <line
                x1={x}
                y1={ORIGIN_Y - MAX_RADIUS}
                x2={x}
                y2={ORIGIN_Y + MAX_RADIUS}
                stroke={isAxis ? palette.axis : palette.grid}
                strokeWidth={isAxis ? 1.2 : 0.8}
                strokeDasharray={isAxis ? undefined : '2 4'}
              />
              <line
                x1={ORIGIN_X - MAX_RADIUS}
                y1={y}
                x2={ORIGIN_X + MAX_RADIUS}
                y2={y}
                stroke={isAxis ? palette.axis : palette.grid}
                strokeWidth={isAxis ? 1.2 : 0.8}
                strokeDasharray={isAxis ? undefined : '2 4'}
              />
            </g>
          );
        })}

        <text x={ORIGIN_X + MAX_RADIUS + 9} y={ORIGIN_Y + 3.5} fontSize="10" fill={palette.muted}>
          Re
        </text>
        <text x={ORIGIN_X - 4} y={ORIGIN_Y - MAX_RADIUS - 8} fontSize="10" fill={palette.muted} textAnchor="middle">
          Im
        </text>

        <text x={ORIGIN_X + MAX_RADIUS} y={ORIGIN_Y + 16} fontSize="8.5" fill={palette.faint} textAnchor="middle">
          {formatSI(scaleMax, unit, Math.min(decimals, 2))}
        </text>
        <text x={ORIGIN_X - MAX_RADIUS} y={ORIGIN_Y + 16} fontSize="8.5" fill={palette.faint} textAnchor="middle">
          {formatSI(-scaleMax, unit, Math.min(decimals, 2))}
        </text>
        <text x={ORIGIN_X + 6} y={ORIGIN_Y + MAX_RADIUS + 14} fontSize="8.5" fill={palette.faint} textAnchor="middle">
          {formatSI(-scaleMax, unit, Math.min(decimals, 2))}
        </text>
        <text x={ORIGIN_X + 6} y={ORIGIN_Y - MAX_RADIUS - 10} fontSize="8.5" fill={palette.faint} textAnchor="middle">
          {formatSI(scaleMax, unit, Math.min(decimals, 2))}
        </text>

        {showArc ? (
          <>
            <path
              d={arcPath(62, totalAngle)}
              fill="none"
              stroke={palette.total}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
            <text
              x={ORIGIN_X + 77 * Math.cos((totalAngle * Math.PI) / 360)}
              y={ORIGIN_Y - 77 * Math.sin((totalAngle * Math.PI) / 360) + 3}
              fontSize="10"
              fontStyle="italic"
              fill={palette.total}
              textAnchor="middle"
            >
              φ
            </text>
          </>
        ) : null}

        <defs>
          {(['resistance', 'inductance', 'capacitance', 'total'] as const).map((colorKey) => (
            <marker
              key={colorKey}
              id={`phasor-arrow-${colorKey}`}
              viewBox="0 0 10 10"
              refX="8.2"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={phasorColor(palette, colorKey)} />
            </marker>
          ))}
        </defs>

        {allVectors.map((vector) => {
          if (vector.magnitude === 0) return null;
          const x = ORIGIN_X + vector.re * pixelScale;
          const y = ORIGIN_Y - vector.im * pixelScale;
          const color = phasorColor(palette, vector.color);
          const isTotal = vector.key === 'u' || vector.key === 'i';
          const magnitudeLabel = formatSI(vector.magnitude, unit, decimals);
          const angleLabel = formatAngle(vector.angleDeg, decimals);
          const layout = labels.get(vector.key);
          const labelX = layout?.x ?? x + 11;
          const labelY = layout?.y ?? y - 14;
          const anchor = layout?.anchor ?? 'start';

          return (
            <g key={vector.key}>
              <title>{`${vector.label} ${vector.symbol}: ${magnitudeLabel} at ${angleLabel}`}</title>
              <line
                x1={ORIGIN_X}
                y1={ORIGIN_Y}
                x2={x}
                y2={y}
                stroke={color}
                strokeWidth={isTotal ? 2.8 : 2.1}
                strokeLinecap="round"
                markerEnd={`url(#phasor-arrow-${vector.color})`}
                opacity={isTotal ? 1 : 0.92}
              />
              <circle cx={x} cy={y} r={isTotal ? 2.8 : 2.1} fill={color} />
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                fill={color}
                fontSize="11"
                fontWeight="600"
                paintOrder="stroke"
                stroke={palette.surface}
                strokeWidth="4"
                strokeLinejoin="round"
              >
                <tspan fontStyle="italic">{vector.symbol}</tspan>
                <tspan x={labelX} dy="12" fontSize="9.5" fontWeight="500">
                  {magnitudeLabel}
                </tspan>
              </text>
            </g>
          );
        })}

        <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="3" fill={palette.text} />
        <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="6" fill="none" stroke={palette.axis} strokeWidth="1" />

        <text x={18} y={VIEW_HEIGHT - 14} fontSize="9" fill={palette.faint}>
          1 grid = {formatSI(step, unit, Math.min(decimals, 2))}
        </text>
        <text x={VIEW_WIDTH - 18} y={VIEW_HEIGHT - 14} fontSize="9" fill={palette.faint} textAnchor="end">
          {analysis.topology === 'series' ? 'Series voltage triangle' : 'Parallel current triangle'}
        </text>
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {allVectors.map((vector) => {
          const color = phasorColor(palette, vector.color);
          const isTotal = vector.key === 'u' || vector.key === 'i';
          return (
            <div
              key={vector.key}
              className={
                isTotal
                  ? 'rounded-xl border border-line bg-raised px-2.5 py-2'
                  : 'rounded-xl border border-transparent px-2.5 py-2'
              }
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                <span className="font-mono text-[10px] font-semibold" style={{ color }}>
                  {vector.symbol}
                </span>
              </div>
              <p className="value-mono mt-1 text-[11px] font-semibold text-ink">
                {formatSI(vector.magnitude, unit, decimals)}
              </p>
              <p className="text-[9.5px] text-faint">{formatAngle(vector.angleDeg, decimals)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
