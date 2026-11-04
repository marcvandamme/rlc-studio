/** Shared domain types for the RLC calculation engine. */

export type Topology = 'series' | 'parallel';

export type CircuitState = 'inductive' | 'capacitive' | 'resonant' | 'resistive';

export interface Complex {
  re: number;
  im: number;
}

export interface Phasor {
  key: string;
  label: string;
  symbol: string;
  re: number;
  im: number;
  magnitude: number;
  angleDeg: number;
  /** Tailwind-friendly palette token, consumed by the SVG plot. */
  color: 'resistance' | 'inductance' | 'capacitance' | 'total';
}

export interface CircuitComponents {
  /** Effective values after applying direct-reactance overrides. */
  resistance: number | null;
  inductance: number | null;
  capacitance: number | null;
  inductiveReactance: number | null;
  capacitiveReactance: number | null;
  inductanceFromReactance: boolean;
  capacitanceFromReactance: boolean;
}

export interface ImpedanceInfo {
  re: number;
  im: number;
  magnitude: number;
  /** Impedance phase angle in degrees. Positive = inductive. */
  angleDeg: number;
}

export interface SourceInfo {
  voltage: number;
  current: number;
  drive: 'voltage' | 'current' | 'voltage+current';
  /** Current phasor angle relative to the voltage reference (degrees). */
  currentAngleDeg: number;
}

export interface BranchCurrents {
  r: number | null;
  l: number | null;
  c: number | null;
}

export interface ComponentVoltages {
  r: number | null;
  l: number | null;
  c: number | null;
}

export interface PowerInfo {
  active: number;
  reactive: number;
  apparent: number;
  /** Power factor 0..1, or null when it is undefined (e.g. zero current). */
  factor: number | null;
  /** Positive = inductive / lagging; negative = capacitive / leading. */
  phaseDeg: number;
  nature: 'lagging' | 'leading' | 'unity' | 'undefined';
}

export interface ResonanceInfo {
  frequency: number;
  qFactor: number;
  bandwidth: number;
  characteristicImpedance: number;
  /** f / f0 */
  frequencyRatio: number;
  dampingRatio: number;
}

export interface PhasorSet {
  kind: 'voltage' | 'current';
  unit: 'V' | 'A';
  vectors: Phasor[];
  total: Phasor;
}

export interface CircuitAnalysis {
  topology: Topology;
  frequency: number;
  angularFrequency: number;
  components: CircuitComponents;
  impedance: ImpedanceInfo;
  source: SourceInfo;
  branchCurrents: BranchCurrents | null;
  componentVoltages: ComponentVoltages | null;
  powers: PowerInfo;
  resonance: ResonanceInfo | null;
  state: CircuitState;
  /** True when both L and C are present and the circuit is within the resonance band. */
  atResonance: boolean;
  phasors: PhasorSet;
  notes: string[];
}

export type IssueField =
  | 'frequency'
  | 'resistance'
  | 'inductance'
  | 'capacitance'
  | 'voltage'
  | 'current'
  | 'xlOverride'
  | 'xcOverride'
  | 'zKnown'
  | 'targetPf'
  | 'circuit';

export interface ValidationIssue {
  field: IssueField;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface RawCircuitInputs {
  topology: Topology;
  frequency: string;
  resistance: string;
  inductance: string;
  capacitance: string;
  voltage: string;
  current: string;
  xlOverride: string;
  xcOverride: string;
  zKnown: string;
}

export interface NumericCircuitInput {
  topology: Topology;
  frequency: number | null;
  resistance: number | null;
  inductance: number | null;
  capacitance: number | null;
  voltage: number | null;
  current: number | null;
  xlOverride: number | null;
  xcOverride: number | null;
  zKnown: number | null;
}

export interface AnalysisOutcome {
  analysis: CircuitAnalysis | null;
  issues: ValidationIssue[];
}

export interface SweepPoint {
  frequency: number;
  impedance: number;
  current: number;
  inductiveReactance: number;
  capacitiveReactance: number;
}

export interface CompensationResult {
  available: boolean;
  reason: string | null;
  targetPf: number;
  targetPhaseDeg: number;
  reactivePowerToCorrect: number;
  capacitance: number;
  capacitanceMicro: number;
  currentBefore: number;
  currentAfter: number;
  currentReduction: number;
}
