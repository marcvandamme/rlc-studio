import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from 'chart.js';
import { Activity, AlertCircle, Gauge } from 'lucide-react';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { formatAxisFrequency, formatSI } from '../../domain/format';
import type { SweepPoint } from '../../domain/types';
import type { SweepMode } from '../../domain/sweep';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/cn';
import { SegmentedControl } from '../ui/SegmentedControl';
import { plotPalette } from './palette';

ChartJS.register(LineElement, PointElement, LinearScale, LogarithmicScale, Tooltip, Filler, Legend);

export type SweepMetric = 'impedance' | 'current';

interface FrequencyPlotProps {
  points: SweepPoint[];
  rangeStart: number;
  rangeEnd: number;
  rangeError: string | null;
  mode: SweepMode;
  startInput: string;
  endInput: string;
  autoStart: number;
  autoEnd: number;
  metric: SweepMetric;
  decimals: number;
  resonanceFrequency: number | null;
  operatingFrequency: number;
  topology: 'series' | 'parallel';
  hasResistance: boolean;
  onModeChange: (mode: SweepMode) => void;
  onStartInputChange: (value: string) => void;
  onEndInputChange: (value: string) => void;
  onMetricChange: (metric: SweepMetric) => void;
}

export function FrequencyPlot({
  points,
  rangeStart,
  rangeEnd,
  rangeError,
  mode,
  startInput,
  endInput,
  autoStart,
  autoEnd,
  metric,
  decimals,
  resonanceFrequency,
  operatingFrequency,
  topology,
  hasResistance,
  onModeChange,
  onStartInputChange,
  onEndInputChange,
  onMetricChange,
}: FrequencyPlotProps) {
  const { theme } = useTheme();
  const palette = useMemo(() => plotPalette(theme), [theme]);

  const unit = metric === 'impedance' ? 'Ω' : 'A';
  const metricLabel = metric === 'impedance' ? 'Impedance |Z|' : 'Current I';

  const data = useMemo(() => {
    const mapped = points.map((point) => {
      const value = metric === 'impedance' ? point.impedance : point.current;
      return { x: point.frequency, y: Number.isFinite(value) ? value : null };
    });
    return {
      datasets: [
        {
          label: metricLabel,
          data: mapped,
          borderColor: palette.accent,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: palette.accent,
          pointHoverBorderColor: palette.surface,
          fill: true,
          backgroundColor: (context: { chart: ChartJS }) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return palette.accentSoft;
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, palette.accentSoft);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            return gradient;
          },
          tension: 0.18,
          spanGaps: false,
        },
      ],
    };
  }, [points, metric, metricLabel, palette]);

  const markerPlugin = useMemo<Plugin<'line'>>(() => {
    return {
      id: 'rlc-frequency-markers',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        const xScale = chart.scales.x;
        if (!xScale || !chartArea) return;

        const drawMarker = (
          frequency: number,
          color: string,
          label: string,
          dashed: number[],
        ) => {
          const x = xScale.getPixelForValue(frequency);
          if (!Number.isFinite(x) || x < chartArea.left || x > chartArea.right) return;

          ctx.save();
          ctx.setLineDash(dashed);
          ctx.lineWidth = 1;
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top + 2);
          ctx.lineTo(x, chartArea.bottom - 2);
          ctx.stroke();
          ctx.setLineDash([]);

          const alignRight = x > chartArea.left + (chartArea.right - chartArea.left) * 0.66;
          ctx.font = '500 10px Inter, system-ui, sans-serif';
          ctx.fillStyle = color;
          ctx.textAlign = alignRight ? 'right' : 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(label, x + (alignRight ? -6 : 6), chartArea.top + 6);
          ctx.restore();
        };

        if (resonanceFrequency && Number.isFinite(resonanceFrequency)) {
          drawMarker(resonanceFrequency, palette.resonant, 'f₀', [4, 4]);
        }
        drawMarker(operatingFrequency, palette.muted, 'f', [2, 4]);
      },
    };
  }, [palette, resonanceFrequency, operatingFrequency]);

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 180 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme === 'dark' ? '#111b2b' : '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          borderColor: theme === 'dark' ? '#334155' : '#1e293b',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const frequency = items[0]?.parsed.x;
              return frequency === undefined ? '' : `f = ${formatSI(frequency, 'Hz', decimals)}`;
            },
            label: (item) => {
              const value = item.parsed.y;
              return value === null || value === undefined
                ? `${metricLabel}: ideal limit`
                : `${metricLabel} = ${formatSI(value, unit, decimals)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'logarithmic',
          min: rangeStart,
          max: rangeEnd,
          grid: { color: palette.grid, drawTicks: false },
          border: { color: palette.grid },
          ticks: {
            color: palette.muted,
            maxTicksLimit: 7,
            padding: 8,
            font: { family: 'JetBrains Mono Variable, monospace', size: 10 },
            callback: (value) => formatAxisFrequency(Number(value), Math.min(decimals, 2)),
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: palette.grid, drawTicks: false },
          border: { color: palette.grid },
          ticks: {
            color: palette.muted,
            maxTicksLimit: 6,
            padding: 8,
            font: { family: 'JetBrains Mono Variable, monospace', size: 10 },
            callback: (value) => formatSI(Number(value), unit, Math.min(decimals, 2)),
          },
        },
      },
    }),
    [theme, palette, rangeStart, rangeEnd, metricLabel, unit, decimals],
  );

  const idealLimit =
    topology === 'series' && !hasResistance
      ? 'R = 0 Ω: the series current approaches infinity at resonance.'
      : topology === 'parallel' && !hasResistance
        ? 'R not fitted: the ideal parallel tank impedance approaches infinity at resonance.'
        : null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Frequency response</span>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {metric === 'impedance' ? 'Impedance magnitude' : 'Line current magnitude'} over a
            selected logarithmic frequency span.
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Frequency response metric"
          value={metric}
          onChange={onMetricChange}
          options={[
            { value: 'impedance', label: '|Z|', icon: <Gauge className="h-3 w-3" /> },
            { value: 'current', label: 'I', icon: <Activity className="h-3 w-3" /> },
          ]}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <SegmentedControl
          ariaLabel="Sweep range mode"
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'manual', label: 'Manual' },
          ]}
          className="shrink-0"
        />
        {mode === 'auto' ? (
          <p className="pb-1.5 font-mono text-[10px] text-muted">
            {formatSI(autoStart, 'Hz', decimals)} → {formatSI(autoEnd, 'Hz', decimals)}
          </p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
            <label className="min-w-[110px] flex-1">
              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">From</span>
              <div className="relative">
                <input
                  type="text"
                  value={startInput}
                  onChange={(event) => onStartInputChange(event.target.value)}
                  className={cn('field-input h-8 pr-9 text-xs', rangeError && 'field-input-error')}
                  placeholder="20"
                  aria-label="Sweep start frequency"
                  spellCheck={false}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[9px] text-faint">Hz</span>
              </div>
            </label>
            <label className="min-w-[110px] flex-1">
              <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">To</span>
              <div className="relative">
                <input
                  type="text"
                  value={endInput}
                  onChange={(event) => onEndInputChange(event.target.value)}
                  className={cn('field-input h-8 pr-9 text-xs', rangeError && 'field-input-error')}
                  placeholder="20k"
                  aria-label="Sweep end frequency"
                  spellCheck={false}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[9px] text-faint">Hz</span>
              </div>
            </label>
          </div>
        )}
      </div>

      {rangeError ? (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-rose-400/10 px-2.5 py-2 text-[10.5px] text-rose-700 dark:text-rose-300">
          <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          <span>{rangeError}</span>
        </div>
      ) : null}

      <div className="relative h-[280px] min-h-[240px] w-full">
        {points.length > 0 ? (
          <Line data={data} options={options} plugins={[markerPlugin]} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-line bg-raised/50 text-xs text-muted">
            Enter a valid frequency range to draw the response.
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: palette.accent }} />
            {metricLabel}
          </span>
          {resonanceFrequency !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-px border-l border-dashed" style={{ borderColor: palette.resonant }} />
              f₀ = {formatSI(resonanceFrequency, 'Hz', decimals)}
            </span>
          ) : null}
        </div>
        <span className="font-mono">log f axis</span>
      </div>
      {idealLimit ? <p className="mt-2 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">{idealLimit}</p> : null}
    </div>
  );
}
