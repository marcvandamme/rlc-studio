import {
  Check,
  ChevronDown,
  CircuitBoard,
  Copy,
  FileDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircuitControls } from './components/inputs/CircuitControls';
import { Footer } from './components/layout/Footer';
import { Header, type AppTab } from './components/layout/Header';
import { FrequencyPlot } from './components/plots/FrequencyPlot';
import { PhasorPlot } from './components/plots/PhasorPlot';
import { CalculationSteps } from './components/results/CalculationSteps';
import { CompensationPanel } from './components/results/CompensationPanel';
import { SummaryBar } from './components/results/SummaryBar';
import { NotesPanel, ValidationPanel } from './components/results/ValidationPanel';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { Toast, type ToastData } from './components/ui/Toast';
import { DEFAULT_INPUTS, PRESETS } from './config/presets';
import { computeCompensation, computeSweep, parseAndAnalyze } from './domain/rlc';
import { buildReportText } from './domain/report';
import { formatInputNumber, resolveSweepRange, type SweepMode } from './domain/sweep';
import type { RawCircuitInputs } from './domain/types';
import { parseDecimal } from './domain/units';
import { useStoredState } from './hooks/useStoredState';
import type { SweepMetric } from './components/plots/FrequencyPlot';
import { copyText } from './lib/clipboard';
import { exportPdfReport } from './lib/pdf';
import { TheoryPage } from './pages/TheoryPage';

export function App() {
  const [tab, setTab] = useState<AppTab>('calculator');
  const [precision, setPrecision] = useStoredState<number>('rlc-studio:precision', 3);
  const [inputs, setInputs] = useStoredState<RawCircuitInputs>('rlc-studio:inputs', DEFAULT_INPUTS);
  const [presetId, setPresetId] = useStoredState<string>('rlc-studio:preset', 'series-rlc');
  const [targetInput, setTargetInput] = useStoredState<string>('rlc-studio:target-pf', '0.95');
  const [sweepMode, setSweepMode] = useStoredState<SweepMode>('rlc-studio:sweep-mode', 'auto');
  const [sweepStart, setSweepStart] = useStoredState<string>('rlc-studio:sweep-start', '');
  const [sweepEnd, setSweepEnd] = useStoredState<string>('rlc-studio:sweep-end', '');
  const [sweepMetric, setSweepMetric] = useStoredState<SweepMetric>('rlc-studio:sweep-metric', 'impedance');

  const [toast, setToast] = useState<ToastData | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const outcome = useMemo(() => parseAndAnalyze(inputs), [inputs]);
  const analysis = outcome.analysis;

  const target = useMemo(() => {
    const parsed = parseDecimal(targetInput);
    if (!parsed.ok) return { value: null, error: parsed.error };
    if (parsed.value === null) return { value: null, error: 'Enter a target power factor.' };
    if (parsed.value <= 0 || parsed.value > 1) {
      return { value: null, error: 'The target must be greater than 0 and at most 1.00.' };
    }
    return { value: parsed.value, error: null };
  }, [targetInput]);

  const compensation = useMemo(
    () => computeCompensation(analysis, target.value),
    [analysis, target.value],
  );

  const sweep = useMemo(() => {
    if (!analysis) return null;
    const range = resolveSweepRange(analysis, sweepMode, sweepStart, sweepEnd);
    const points = computeSweep(analysis, range.start, range.end, 360);
    return { ...range, points };
  }, [analysis, sweepMode, sweepStart, sweepEnd]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const showToast = useCallback((message: string, tone: ToastData['tone']) => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const updateInputs = useCallback(
    (patch: Partial<RawCircuitInputs>) => {
      setInputs((current) => ({ ...current, ...patch }));
      setPresetId('custom');
      setCopied(false);
    },
    [setInputs, setPresetId],
  );

  const loadPreset = useCallback(
    (id: string) => {
      const preset = PRESETS.find((item) => item.id === id);
      if (!preset) return;
      setInputs({ ...preset.inputs });
      setPresetId(preset.id);
      setTab('calculator');
      setCopied(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setInputs, setPresetId],
  );

  const handleReset = useCallback(() => {
    setInputs({ ...DEFAULT_INPUTS });
    setPresetId('series-rlc');
    setCopied(false);
    showToast('Circuit reset to the default series RLC example.', 'info');
  }, [setInputs, setPresetId, showToast]);

  const handleTabChange = useCallback((next: AppTab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSweepModeChange = useCallback(
    (mode: SweepMode) => {
      if (mode === 'manual' && analysis) {
        const suggested = resolveSweepRange(analysis, 'auto', '', '');
        if (!sweepStart.trim()) setSweepStart(formatInputNumber(suggested.start));
        if (!sweepEnd.trim()) setSweepEnd(formatInputNumber(suggested.end));
      }
      setSweepMode(mode);
    },
    [analysis, sweepStart, sweepEnd, setSweepMode, setSweepStart, setSweepEnd],
  );

  const handleCopy = useCallback(async () => {
    if (!analysis) return;
    const text = buildReportText({
      analysis,
      issues: outcome.issues,
      compensation,
      targetPf: target.value,
      decimals: precision,
    });
    const success = await copyText(text);
    if (success) {
      setCopied(true);
      showToast('Formatted calculation report copied to the clipboard.', 'success');
    } else {
      showToast('The clipboard is unavailable in this browser context.', 'error');
    }
  }, [analysis, outcome.issues, compensation, target.value, precision, showToast]);

  const handleExport = useCallback(async () => {
    if (!analysis || !sweep) return;
    setPdfBusy(true);
    try {
      await exportPdfReport({
        analysis,
        issues: outcome.issues,
        compensation,
        targetPf: target.value,
        decimals: precision,
        sweepPoints: sweep.points,
        sweepMetric,
        sweepStart: sweep.start,
        sweepEnd: sweep.end,
      });
      showToast('PDF report downloaded with phasor and frequency-response charts.', 'success');
    } catch (error) {
      console.error(error);
      showToast('The PDF could not be generated. Please try again.', 'error');
    } finally {
      setPdfBusy(false);
    }
  }, [
    analysis,
    sweep,
    outcome.issues,
    compensation,
    target.value,
    precision,
    sweepMetric,
    showToast,
  ]);

  const selectValue = PRESETS.some((preset) => preset.id === presetId) ? presetId : 'custom';

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        tab={tab}
        onTabChange={handleTabChange}
        precision={precision}
        onPrecisionChange={setPrecision}
      />

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-12 pt-5 lg:px-8">
        {tab === 'theory' ? (
          <TheoryPage onTryExample={loadPreset} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent" dot>
                    Live calculation
                  </Badge>
                  <Badge tone="neutral">5-step method</Badge>
                  <span className="hidden text-[10px] text-faint sm:inline">
                    RMS phasors · ideal components
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  AC circuit workbench
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                  Solve, inspect and export series or parallel RLC networks — from reactance to
                  resonance, with a phasor diagram and frequency response.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="relative inline-flex h-10 items-center rounded-xl border border-line bg-surface pl-2.5 pr-1 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                  <select
                    value={selectValue}
                    onChange={(event) => {
                      if (event.target.value !== 'custom') loadPreset(event.target.value);
                    }}
                    aria-label="Load example circuit"
                    className="h-full min-w-[150px] cursor-pointer appearance-none bg-transparent pl-2 pr-7 text-[11px] font-semibold text-ink outline-none"
                  >
                    {PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                    {selectValue === 'custom' ? (
                      <option value="custom" disabled>
                        Custom circuit
                      </option>
                    ) : null}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-faint"
                    aria-hidden
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={!analysis}
                  icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  title="Copy a formatted calculation report"
                >
                  {copied ? 'Copied' : 'Copy results'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExport}
                  disabled={!analysis || pdfBusy}
                  icon={
                    pdfBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )
                  }
                  title="Export the report and charts as a PDF"
                >
                  {pdfBusy ? 'Preparing…' : 'Export PDF'}
                </Button>
              </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-92px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1.5 xl:[scrollbar-gutter:stable]">
                <CircuitControls
                  inputs={inputs}
                  onChange={updateInputs}
                  issues={outcome.issues}
                  decimals={precision}
                  onReset={handleReset}
                />
              </div>

              <div className="min-w-0 space-y-4">
                <ValidationPanel outcome={outcome} />

                {analysis ? (
                  <>
                    <SummaryBar analysis={analysis} decimals={precision} />

                    <CalculationSteps analysis={analysis} decimals={precision} />

                    <div className="flex items-end justify-between gap-3 pt-1">
                      <div>
                        <h2 className="text-sm font-semibold tracking-tight text-ink">
                          Visual analysis
                        </h2>
                        <p className="mt-0.5 text-xs text-muted">
                          The same solution in the complex plane and across frequency.
                        </p>
                      </div>
                      <Badge tone="neutral">Interactive</Badge>
                    </div>

                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                      <article className="card min-w-0 p-5">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="eyebrow">Phasor diagram</p>
                            <h3 className="mt-1 text-sm font-semibold tracking-tight text-ink">
                              {analysis.phasors.kind === 'voltage' ? 'Voltage vector triangle' : 'Current vector triangle'}
                            </h3>
                            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                              {analysis.topology === 'series'
                                ? 'Component voltages sum to the source voltage.'
                                : 'Branch currents sum to the line current.'}
                            </p>
                          </div>
                          <Badge tone="neutral">{analysis.phasors.kind === 'voltage' ? 'V' : 'A'}</Badge>
                        </div>
                        <PhasorPlot analysis={analysis} decimals={precision} />
                      </article>

                      <article className="card min-w-0 p-5">
                        {sweep ? (
                          <FrequencyPlot
                            points={sweep.points}
                            rangeStart={sweep.start}
                            rangeEnd={sweep.end}
                            rangeError={sweep.error}
                            mode={sweepMode}
                            startInput={sweepStart}
                            endInput={sweepEnd}
                            autoStart={sweep.autoStart}
                            autoEnd={sweep.autoEnd}
                            metric={sweepMetric}
                            decimals={precision}
                            resonanceFrequency={analysis.resonance?.frequency ?? null}
                            operatingFrequency={analysis.frequency}
                            topology={analysis.topology}
                            hasResistance={analysis.components.resistance !== null}
                            onModeChange={handleSweepModeChange}
                            onStartInputChange={setSweepStart}
                            onEndInputChange={setSweepEnd}
                            onMetricChange={setSweepMetric}
                          />
                        ) : null}
                      </article>
                    </div>

                    <CompensationPanel
                      analysis={analysis}
                      result={compensation}
                      targetInput={targetInput}
                      onTargetInputChange={setTargetInput}
                      targetError={target.error}
                      decimals={precision}
                    />

                    <NotesPanel notes={analysis.notes} />

                    <p className="px-1 text-[10px] leading-relaxed text-faint">
                      Result values use {precision} decimal place{precision === 1 ? '' : 's'};
                      chart axis ticks are rounded for readability.
                      Calculations assume sinusoidal steady state, ideal components and RMS
                      magnitudes. Phasors are referenced to the source voltage at 0°.
                    </p>
                  </>
                ) : (
                  <EmptyState onReset={handleReset} onLoadExample={() => loadPreset('series-rlc')} />
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function EmptyState({ onReset, onLoadExample }: { onReset: () => void; onLoadExample: () => void }) {
  return (
    <div className="card flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raised text-muted">
        <CircuitBoard className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">The circuit is incomplete</h3>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">
        Fix the highlighted inputs or load an example. The calculation engine stops at the first
        invalid value instead of showing physically meaningless results.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onReset} size="sm">
          Reset to default
        </Button>
        <Button variant="primary" onClick={onLoadExample} size="sm">
          Load series RLC example
        </Button>
      </div>
      <div className="mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-raised/60 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-ink">Unit-aware inputs</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            Try 100mH, 10uF, 4.7k or 159.15Hz. Uppercase M is mega; lowercase m is milli.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-raised/60 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-ink">Use U or I</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
            Give one source value. If both are entered, they must match the calculated impedance.
          </p>
        </div>
      </div>
    </div>
  );
}
