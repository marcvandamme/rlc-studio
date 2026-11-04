import {
  ChevronDown,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  formatSI,
} from '../../domain/format';
import { parseReactance, parseSI } from '../../domain/units';
import type { RawCircuitInputs, ValidationIssue } from '../../domain/types';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { TopologySelector } from './TopologySelector';

interface CircuitControlsProps {
  inputs: RawCircuitInputs;
  onChange: (patch: Partial<RawCircuitInputs>) => void;
  issues: ValidationIssue[];
  decimals: number;
  onReset: () => void;
}

function findIssue(issues: ValidationIssue[], field: ValidationIssue['field']) {
  const fieldIssues = issues.filter((item) => item.field === field);
  return {
    error: fieldIssues.find((item) => item.severity === 'error')?.message,
    warning: fieldIssues.find((item) => item.severity === 'warning')?.message,
  };
}

export function CircuitControls({
  inputs,
  onChange,
  issues,
  decimals,
  onReset,
}: CircuitControlsProps) {
  const frequencyIssue = findIssue(issues, 'frequency');
  const resistanceIssue = findIssue(issues, 'resistance');
  const inductanceIssue = findIssue(issues, 'inductance');
  const capacitanceIssue = findIssue(issues, 'capacitance');
  const voltageIssue = findIssue(issues, 'voltage');
  const currentIssue = findIssue(issues, 'current');
  const xlIssue = findIssue(issues, 'xlOverride');
  const xcIssue = findIssue(issues, 'xcOverride');
  const zIssue = findIssue(issues, 'zKnown');
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const hasOverrides =
    inputs.xlOverride.trim() !== '' ||
    inputs.xcOverride.trim() !== '' ||
    inputs.zKnown.trim() !== '';

  // Presets such as "Direct reactance entry" load hidden overrides. Reveal them
  // whenever an override value changes, but still let the user collapse the panel.
  useEffect(() => {
    if (hasOverrides && advancedRef.current) advancedRef.current.open = true;
  }, [inputs.xlOverride, inputs.xcOverride, inputs.zKnown, hasOverrides]);

  const preview = (
    raw: string,
    quantity: Parameters<typeof parseSI>[1],
    unit: string,
  ): string | undefined => {
    if (raw.trim() === '') return undefined;
    const result = parseSI(raw, quantity);
    if (!result.ok || result.value === null) return undefined;
    return `Parsed: ${formatSI(result.value, unit, decimals)}`;
  };

  const previewReactance = (raw: string, symbol: 'L' | 'C' | 'Z'): string | undefined => {
    if (raw.trim() === '') return undefined;
    const result = parseReactance(raw, symbol);
    if (!result.ok || result.value === null) return undefined;
    return `Parsed: ${formatSI(result.value, 'Ω', decimals)}`;
  };

  return (
    <aside className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Circuit setup</p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-ink">Build the network</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={onReset}
          title="Reset to the default example"
        >
          Reset
        </Button>
      </div>

      <div className="mt-4">
        <TopologySelector value={inputs.topology} onChange={(topology) => onChange({ topology })} />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Frequency</p>
          <span className="font-mono text-[9px] text-faint">AC · sine</span>
        </div>
        <Field
          label="Operating frequency"
          symbol="f"
          value={inputs.frequency}
          onChange={(frequency) => onChange({ frequency })}
          unit="Hz"
          placeholder="50"
          hint={preview(inputs.frequency, 'frequency', 'Hz') ?? 'Must be greater than 0 Hz.'}
          error={frequencyIssue.error}
          warning={frequencyIssue.warning}
        />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Components</p>
          <span className="font-mono text-[9px] text-faint">R · L · C</span>
        </div>
        <div className="space-y-3">
          <Field
            label="Resistance"
            symbol="R"
            value={inputs.resistance}
            onChange={(resistance) => onChange({ resistance })}
            unit="Ω"
            placeholder="100"
            hint={preview(inputs.resistance, 'resistance', 'Ω') ?? 'Optional; leave empty for ideal LC.'}
            error={resistanceIssue.error}
            warning={resistanceIssue.warning}
          />
          <Field
            label="Inductance"
            symbol="L"
            value={inputs.inductance}
            onChange={(inductance) => onChange({ inductance })}
            unit="H"
            placeholder="100m"
            hint={preview(inputs.inductance, 'inductance', 'H') ?? 'Optional; 100m = 100 mH.'}
            error={inductanceIssue.error}
            warning={inductanceIssue.warning}
          />
          <Field
            label="Capacitance"
            symbol="C"
            value={inputs.capacitance}
            onChange={(capacitance) => onChange({ capacitance })}
            unit="F"
            placeholder="10u"
            hint={preview(inputs.capacitance, 'capacitance', 'F') ?? 'Optional; 10u = 10 µF.'}
            error={capacitanceIssue.error}
            warning={capacitanceIssue.warning}
          />
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Source</p>
          <span className="font-mono text-[9px] text-faint">RMS</span>
        </div>
        <div className="space-y-3">
          <Field
            label="Source voltage"
            symbol="U"
            value={inputs.voltage}
            onChange={(voltage) => onChange({ voltage })}
            unit="V"
            placeholder="230"
            hint={preview(inputs.voltage, 'voltage', 'V') ?? 'Optional if a current is supplied.'}
            error={voltageIssue.error}
            warning={voltageIssue.warning}
          />
          <Field
            label="Source current"
            symbol="I"
            value={inputs.current}
            onChange={(current) => onChange({ current })}
            unit="A"
            placeholder="leave blank"
            hint={preview(inputs.current, 'current', 'A') ?? 'Optional. Leave blank unless you know the current.'}
            error={currentIssue.error}
            warning={currentIssue.warning}
          />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-raised/70 px-3 py-2.5">
          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[10.5px] leading-relaxed text-muted">
            Enter <span className="font-mono font-semibold text-ink">U</span>,{' '}
            <span className="font-mono font-semibold text-ink">I</span>, or both. If both are
            supplied, U/I must agree with the calculated |Z| within 2%; clear one value to resolve a
            contradiction.
          </p>
        </div>
      </div>

      <details ref={advancedRef} className="group mt-4 border-t border-line pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Advanced overrides
            <span className="rounded-full border border-line bg-raised px-1.5 py-0.5 text-[8px] font-medium normal-case tracking-normal text-muted">
              optional
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-faint transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-3 space-y-3">
          <Field
            label="Inductive reactance override"
            symbol="X_L"
            value={inputs.xlOverride}
            onChange={(xlOverride) => onChange({ xlOverride })}
            unit="Ω"
            placeholder="e.g. 80L"
            hint={previewReactance(inputs.xlOverride, 'L') ?? 'Direct X_L in ohms; suffix L is optional.'}
            error={xlIssue.error}
            warning={xlIssue.warning}
          />
          <Field
            label="Capacitive reactance override"
            symbol="X_C"
            value={inputs.xcOverride}
            onChange={(xcOverride) => onChange({ xcOverride })}
            unit="Ω"
            placeholder="e.g. 120C"
            hint={previewReactance(inputs.xcOverride, 'C') ?? 'Direct X_C in ohms; suffix C is optional.'}
            error={xcIssue.error}
            warning={xcIssue.warning}
          />
          <Field
            label="Known impedance check"
            symbol="|Z|"
            value={inputs.zKnown}
            onChange={(zKnown) => onChange({ zKnown })}
            unit="Ω"
            placeholder="e.g. 100Z"
            hint={previewReactance(inputs.zKnown, 'Z') ?? 'Cross-checks the computed |Z|; not used as a result.'}
            error={zIssue.error}
            warning={zIssue.warning}
          />
          <div className="flex items-start gap-2 rounded-xl border border-dashed border-line px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
            <p className="text-[10px] leading-relaxed text-muted">
              A value ending in <span className="font-mono font-semibold text-ink">L</span>,{' '}
              <span className="font-mono font-semibold text-ink">C</span> or{' '}
              <span className="font-mono font-semibold text-ink">Z</span> is read directly as an
              ohm value: <span className="font-mono">50L</span> = 50 Ω. L or C is re-derived for
              resonance when an override is used.
            </p>
          </div>
        </div>
      </details>

      <div className="mt-4 rounded-2xl border border-line bg-raised/60 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          <Sparkles className="h-3 w-3 text-accent" aria-hidden />
          Smart unit input
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[
            ['M', '× 10⁶'],
            ['k', '× 10³'],
            ['m', '× 10⁻³'],
            ['u / µ', '× 10⁻⁶'],
            ['n', '× 10⁻⁹'],
            ['p', '× 10⁻¹²'],
          ].map(([prefix, value]) => (
            <div key={prefix} className="rounded-lg border border-line bg-surface px-1.5 py-1">
              <p className="font-mono text-[10px] font-semibold text-ink">{prefix}</p>
              <p className="font-mono text-[8px] text-faint">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9.5px] leading-relaxed text-faint">
          Prefixes are case-sensitive: <span className="font-mono text-muted">m</span> is milli,{' '}
          <span className="font-mono text-muted">M</span> is mega. Examples: 4.7k, 100mH, 2.2µF,
          159.15Hz, 50L.
        </p>
      </div>
    </aside>
  );
}
