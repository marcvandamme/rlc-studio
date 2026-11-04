import type { RawCircuitInputs, Topology } from '../domain/types';

export interface CircuitPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  inputs: RawCircuitInputs;
}

export const DEFAULT_INPUTS: RawCircuitInputs = {
  topology: 'series',
  frequency: '50',
  resistance: '100',
  inductance: '100m',
  capacitance: '10u',
  voltage: '230',
  current: '',
  xlOverride: '',
  xcOverride: '',
  zKnown: '',
};

export const PRESETS: CircuitPreset[] = [
  {
    id: 'series-rlc',
    name: 'Series RLC at 50 Hz',
    description: 'A general series network below resonance — a good starting point.',
    badge: 'Series',
    inputs: { ...DEFAULT_INPUTS },
  },
  {
    id: 'series-resonance',
    name: 'Series resonance',
    description: 'L and C tuned to 159.15 Hz, with a moderate quality factor.',
    badge: 'Resonance',
    inputs: {
      ...DEFAULT_INPUTS,
      topology: 'series',
      frequency: '159.15494309189532',
      resistance: '10',
      inductance: '100m',
      capacitance: '10u',
      voltage: '100',
    },
  },
  {
    id: 'parallel-inductive',
    name: 'Parallel inductive load',
    description: 'A 50 Hz parallel R–L–C load with a lagging power factor.',
    badge: 'Power factor',
    inputs: {
      ...DEFAULT_INPUTS,
      topology: 'parallel',
      frequency: '50',
      resistance: '100',
      inductance: '100m',
      capacitance: '10u',
      voltage: '230',
    },
  },
  {
    id: 'parallel-resonance',
    name: 'Parallel tank at resonance',
    description: 'A high-impedance parallel tank driven at its resonant frequency.',
    badge: 'Resonance',
    inputs: {
      ...DEFAULT_INPUTS,
      topology: 'parallel',
      frequency: '159.15494309189532',
      resistance: '1000',
      inductance: '100m',
      capacitance: '10u',
      voltage: '100',
    },
  },
  {
    id: 'rc-leading',
    name: 'Series RC — leading',
    description: 'A capacitive network with no inductor and a leading current.',
    badge: 'Capacitive',
    inputs: {
      ...DEFAULT_INPUTS,
      topology: 'series',
      frequency: '60',
      resistance: '220',
      inductance: '',
      capacitance: '22u',
      voltage: '120',
    },
  },
  {
    id: 'reactance-entry',
    name: 'Direct reactance entry',
    description: 'Uses X_L = 80 Ω and X_C = 120 Ω directly, without L or C.',
    badge: 'Advanced',
    inputs: {
      ...DEFAULT_INPUTS,
      topology: 'series',
      frequency: '50',
      resistance: '50',
      inductance: '',
      capacitance: '',
      voltage: '100',
      xlOverride: '80L',
      xcOverride: '120C',
    },
  },
];

export const TOPOLOGY_LABELS: Record<Topology, string> = {
  series: 'Series',
  parallel: 'Parallel',
};
