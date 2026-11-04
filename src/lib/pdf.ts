import type { jsPDF as JsPdfDocument } from 'jspdf';
import {
  formatAngle,
  formatFixed,
  formatPF,
  formatSI,
} from '../domain/format';
import type {
  CircuitAnalysis,
  CompensationResult,
  SweepPoint,
  ValidationIssue,
} from '../domain/types';
import type { SweepMetric } from '../components/plots/FrequencyPlot';
import { plotScale } from './plotScale';

type RGB = [number, number, number];

const INK: RGB = [15, 23, 42];
const MUTED: RGB = [100, 116, 139];
const FAINT: RGB = [148, 163, 184];
const LINE: RGB = [226, 232, 240];
const SURFACE: RGB = [248, 250, 252];
const ACCENT: RGB = [13, 148, 136];
const IND: RGB = [180, 83, 9];
const CAP: RGB = [37, 99, 235];
const RES: RGB = [124, 58, 237];

const PAGE_WIDTH = 210;
const MARGIN = 16;
const CONTENT = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 281;

export interface PdfReportOptions {
  analysis: CircuitAnalysis;
  issues: ValidationIssue[];
  compensation: CompensationResult;
  targetPf: number | null;
  decimals: number;
  sweepPoints: SweepPoint[];
  sweepMetric: SweepMetric;
  sweepStart: number;
  sweepEnd: number;
}

function sanitize(value: string): string {
  return value
    .replace(/Ω/g, 'ohm')
    .replace(/[µμ]/g, 'u')
    .replace(/∞/g, 'infinite')
    .replace(/∠/g, ' at ')
    .replace(/−/g, '-')
    .replace(/φ/g, 'phi')
    .replace(/ω/g, 'omega')
    .replace(/₀/g, '0')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/√/g, 'sqrt')
    .replace(/°/g, ' deg')
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-');
}

function safe(text: string): string {
  return sanitize(String(text));
}

interface Cursor {
  doc: JsPdfDocument;
  y: number;
  page: number;
  generated: string;
}

function setFill(doc: JsPdfDocument, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setStroke(doc: JsPdfDocument, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: JsPdfDocument, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawPageHeader(ctx: Cursor) {
  const { doc } = ctx;
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RLC STUDIO', MARGIN, 12);
  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('AC circuit analysis report', MARGIN + 22, 12);
  setText(doc, FAINT);
  doc.text(ctx.generated, PAGE_WIDTH - MARGIN, 12, { align: 'right' });
  setStroke(doc, LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 15.5, PAGE_WIDTH - MARGIN, 15.5);
  ctx.y = 23;
}

function newPage(ctx: Cursor) {
  ctx.doc.addPage();
  ctx.page += 1;
  drawPageHeader(ctx);
}

function ensureSpace(ctx: Cursor, space: number) {
  if (ctx.y + space > BOTTOM) newPage(ctx);
}

function sectionTitle(ctx: Cursor, title: string, subtitle?: string, reserve = 0) {
  ensureSpace(ctx, (subtitle ? 17 : 13) + reserve);
  const { doc } = ctx;
  setFill(doc, ACCENT);
  doc.rect(MARGIN, ctx.y - 3.4, 2.2, 2.2, 'F');
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(safe(title), MARGIN + 5, ctx.y);
  if (subtitle) {
    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(safe(subtitle), MARGIN + 5, ctx.y + 4);
    ctx.y += 5.6;
  }
  ctx.y += 3.2;
  setStroke(doc, LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, ctx.y, PAGE_WIDTH - MARGIN, ctx.y);
  ctx.y += 4;
}

function paragraph(ctx: Cursor, text: string, options: { size?: number; color?: RGB; indent?: number; gap?: number } = {}) {
  const { doc } = ctx;
  const size = options.size ?? 8;
  const width = CONTENT - (options.indent ?? 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  setText(doc, options.color ?? MUTED);
  const lines = doc.splitTextToSize(safe(text), width) as string[];
  const lineHeight = size * 0.45 + 1.2;
  const height = lines.length * lineHeight;
  ensureSpace(ctx, height + (options.gap ?? 2));
  doc.text(lines, MARGIN + (options.indent ?? 0), ctx.y);
  ctx.y += height + (options.gap ?? 2);
}

interface KeyValue {
  label: string;
  value: string;
}

function keyValueGrid(ctx: Cursor, items: KeyValue[], columns = 2) {
  const { doc } = ctx;
  const cellWidth = CONTENT / columns;
  const rowHeight = 7.6;

  for (let index = 0; index < items.length; index += columns) {
    ensureSpace(ctx, rowHeight + 1);
    const row = items.slice(index, index + columns);
    row.forEach((item, column) => {
      const x = MARGIN + column * cellWidth;
      setText(doc, MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.text(safe(item.label), x, ctx.y + 3);
      setText(doc, INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.1);
      const value = doc.splitTextToSize(safe(item.value), cellWidth - 6)[0] as string;
      doc.text(value, x + cellWidth - 3, ctx.y + 3, { align: 'right' });
      setStroke(doc, LINE);
      doc.setLineWidth(0.15);
      doc.line(x, ctx.y + 5, x + cellWidth - 3, ctx.y + 5);
    });
    ctx.y += rowHeight;
  }
  ctx.y += 1;
}

function summaryBoxes(ctx: Cursor, analysis: CircuitAnalysis, decimals: number) {
  const { doc } = ctx;
  const gap = 1.5;
  const columns = 3;
  const boxWidth = (CONTENT - gap * (columns - 1)) / columns;
  const boxHeight = 17.8;
  const items = [
    {
      label: 'IMPEDANCE |Z|',
      value: formatSI(analysis.impedance.magnitude, 'Ω', decimals),
      sub: `angle ${formatAngle(analysis.impedance.angleDeg, decimals)}`,
    },
    {
      label: 'CURRENT I',
      value: formatSI(analysis.source.current, 'A', decimals),
      sub: `angle ${formatAngle(analysis.source.currentAngleDeg, decimals)} vs U`,
    },
    {
      label: 'VOLTAGE U',
      value: formatSI(analysis.source.voltage, 'V', decimals),
      sub: analysis.source.drive === 'current' ? 'derived from current source' : 'source voltage (RMS)',
    },
    {
      label: 'POWER FACTOR',
      value: formatPF(analysis.powers.factor, decimals),
      sub: analysis.powers.nature,
    },
    {
      label: 'PHASE phi',
      value: formatAngle(analysis.powers.phaseDeg, decimals),
      sub: 'positive = inductive',
    },
    {
      label: 'RESONANCE f0',
      value: analysis.resonance ? formatSI(analysis.resonance.frequency, 'Hz', decimals) : '-',
      sub: analysis.resonance
        ? `Q = ${Number.isFinite(analysis.resonance.qFactor) ? formatFixed(analysis.resonance.qFactor, decimals) : 'ideal'}`
        : 'requires L and C',
    },
  ];

  ensureSpace(ctx, 2 * boxHeight + gap + 5.5);
  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = MARGIN + column * (boxWidth + gap);
    const y = ctx.y + row * (boxHeight + gap);
    setFill(doc, SURFACE);
    setStroke(doc, LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'FD');
    setText(doc, MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    doc.text(item.label, x + 3.5, y + 4.7);
    setText(doc, INK);
    doc.setFontSize(11.5);
    doc.text(safe(item.value), x + 3.5, y + 11);
    setText(doc, FAINT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(safe(item.sub), x + 3.5, y + 15.1);
  });
  ctx.y += 2 * boxHeight + gap + 5.5;
}

function drawPhasor(ctx: Cursor, analysis: CircuitAnalysis, decimals: number) {
  const { doc } = ctx;
  const boxHeight = 80;
  sectionTitle(
    ctx,
    'Phasor diagram',
    'Reference: source voltage at 0 deg. Counter-clockwise angles are positive.',
    boxHeight + 6,
  );
  const boxY = ctx.y;
  const boxX = MARGIN;

  setFill(doc, SURFACE);
  setStroke(doc, LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, CONTENT, boxHeight, 2, 2, 'FD');

  const plotSize = 58;
  const plotX = boxX + 11;
  const plotY = boxY + 8;
  const originX = plotX + plotSize / 2;
  const originY = plotY + plotSize / 2;
  const radius = 26;
  const axisDecimals = Math.min(Math.max(decimals, 1), 2);

  const vectors = [...analysis.phasors.vectors, analysis.phasors.total];
  const largest = vectors.reduce((max, vector) => Math.max(max, vector.magnitude), 0);
  const { max: scaleMax } = plotScale(largest, 5, 1.15);
  const pixelsPerUnit = radius / scaleMax;
  const unit = analysis.phasors.unit;

  for (let index = -5; index <= 5; index += 1) {
    const x = originX + index * (radius / 5);
    const y = originY + index * (radius / 5);
    setStroke(doc, index === 0 ? [148, 163, 184] : LINE);
    doc.setLineWidth(index === 0 ? 0.25 : 0.15);
    doc.line(x, originY - radius, x, originY + radius);
    doc.line(originX - radius, y, originX + radius, y);
  }

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Re', originX + radius + 2.5, originY + 1);
  doc.text('Im', originX + 0.5, originY - radius - 2);
  setText(doc, FAINT);
  doc.setFontSize(5.5);
  doc.text(formatSI(scaleMax, unit, axisDecimals), originX + radius, originY + radius + 4, {
    align: 'right',
  });
  doc.text(formatSI(-scaleMax, unit, axisDecimals), originX - radius, originY + radius + 4);

  for (const vector of vectors) {
    if (vector.magnitude === 0) continue;
    const x = originX + vector.re * pixelsPerUnit;
    const y = originY - vector.im * pixelsPerUnit;
    const color = vector.key === 'u' || vector.key === 'i'
      ? RES
      : vector.color === 'resistance'
        ? ACCENT
        : vector.color === 'inductance'
          ? IND
          : CAP;
    setStroke(doc, color);
    doc.setLineWidth(vector.key === 'u' || vector.key === 'i' ? 0.75 : 0.55);
    doc.line(originX, originY, x, y);
    const angle = Math.atan2(y - originY, x - originX);
    const arrow = 2.2;
    setFill(doc, color);
    doc.triangle(
      x,
      y,
      x - arrow * Math.cos(angle - 0.38),
      y - arrow * Math.sin(angle - 0.38),
      x - arrow * Math.cos(angle + 0.38),
      y - arrow * Math.sin(angle + 0.38),
      'F',
    );

    const cos = vector.re / vector.magnitude;
    const sin = vector.im / vector.magnitude;
    const labelX = x + (cos < -0.35 ? -2.5 : cos > 0.35 ? 2.5 : 0);
    const labelY = y + (Math.abs(cos) <= 0.35 ? (sin >= 0 ? -2.8 : 5.2) : sin >= 0 ? -1.2 : 3.2);
    setText(doc, color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(safe(vector.symbol), labelX, labelY, { align: cos < -0.35 ? 'right' : cos > 0.35 ? 'left' : 'center' });
  }

  setFill(doc, INK);
  doc.circle(originX, originY, 0.8, 'F');

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const legendX = boxX + 92;
  let legendY = boxY + 11;
  const legend: Array<[RGB, string, string, string]> = [
    ...analysis.phasors.vectors.map(
      (vector): [RGB, string, string, string] => [
        vector.color === 'resistance' ? ACCENT : vector.color === 'inductance' ? IND : CAP,
        vector.symbol,
        formatSI(vector.magnitude, unit, decimals),
        formatAngle(vector.angleDeg, decimals),
      ],
    ),
    [RES, analysis.phasors.total.symbol, formatSI(analysis.phasors.total.magnitude, unit, decimals), formatAngle(analysis.phasors.total.angleDeg, decimals)],
  ];

  for (const [color, symbol, magnitude, angle] of legend) {
    setFill(doc, color);
    doc.rect(legendX, legendY - 2.2, 2.5, 2.5, 'F');
    setText(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(safe(symbol), legendX + 5, legendY);
    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`${safe(magnitude)}  /  ${safe(angle)}`, legendX + 5, legendY + 4.2);
    legendY += 9.6;
  }

  setText(doc, FAINT);
  doc.setFontSize(6.5);
  doc.text(
    safe(analysis.topology === 'series' ? 'Series voltage triangle' : 'Parallel current triangle'),
    legendX + 5,
    boxY + boxHeight - 7,
  );
  ctx.y = boxY + boxHeight + 6;
}

function drawFrequencyChart(
  ctx: Cursor,
  points: SweepPoint[],
  metric: SweepMetric,
  rangeStart: number,
  rangeEnd: number,
  decimals: number,
  resonanceFrequency: number | null,
) {
  const { doc } = ctx;
  const boxHeight = 80;
  const unit = metric === 'impedance' ? 'Ω' : 'A';
  const label = metric === 'impedance' ? 'Impedance |Z|' : 'Line current I';
  const axisDecimals = Math.min(Math.max(decimals, 1), 2);

  sectionTitle(
    ctx,
    'Frequency response',
    `${label} versus frequency on a logarithmic axis.`,
    boxHeight + 6,
  );
  const boxX = MARGIN;
  const boxY = ctx.y;

  setFill(doc, SURFACE);
  setStroke(doc, LINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, CONTENT, boxHeight, 2, 2, 'FD');

  const plotX = boxX + 15;
  const plotY = boxY + 7;
  const plotWidth = CONTENT - 22;
  const plotHeight = 52;
  const values = points
    .map((point) => (metric === 'impedance' ? point.impedance : point.current))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const maxValue = values.length > 0 ? Math.max(...values) : 1;
  const { max: yMax } = plotScale(maxValue, 4, 1.12);
  const logStart = Math.log10(rangeStart);
  const logEnd = Math.log10(rangeEnd);

  const xFor = (frequency: number) =>
    plotX + ((Math.log10(frequency) - logStart) / (logEnd - logStart)) * plotWidth;
  const yFor = (value: number) => plotY + plotHeight - (value / yMax) * plotHeight;

  for (let index = 0; index <= 4; index += 1) {
    const y = plotY + (plotHeight / 4) * index;
    setStroke(doc, LINE);
    doc.setLineWidth(0.15);
    doc.line(plotX, y, plotX + plotWidth, y);
    setText(doc, FAINT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.text(safe(formatSI(yMax * (1 - index / 4), unit, axisDecimals)), plotX - 2, y + 1, { align: 'right' });
  }

  for (let index = 0; index <= 4; index += 1) {
    const fraction = index / 4;
    const x = plotX + fraction * plotWidth;
    const frequency = 10 ** (logStart + fraction * (logEnd - logStart));
    setStroke(doc, LINE);
    doc.setLineWidth(0.15);
    doc.line(x, plotY, x, plotY + plotHeight);
    setText(doc, FAINT);
    doc.setFontSize(5.8);
    doc.text(safe(formatSI(frequency, 'Hz', axisDecimals)), x, plotY + plotHeight + 4, { align: 'center' });
  }

  if (resonanceFrequency && resonanceFrequency >= rangeStart && resonanceFrequency <= rangeEnd) {
    const x = xFor(resonanceFrequency);
    doc.setLineDashPattern([1, 1], 0);
    setStroke(doc, RES);
    doc.setLineWidth(0.3);
    doc.line(x, plotY, x, plotY + plotHeight);
    doc.setLineDashPattern([], 0);
    setText(doc, RES);
    doc.setFontSize(6);
    doc.text('f0', x + 1.5, plotY + 4);
  }

  setStroke(doc, ACCENT);
  doc.setLineWidth(0.65);
  let previous: { x: number; y: number } | null = null;
  for (const point of points) {
    const value = metric === 'impedance' ? point.impedance : point.current;
    if (!Number.isFinite(value) || value < 0) {
      previous = null;
      continue;
    }
    const current = { x: xFor(point.frequency), y: yFor(value) };
    if (previous) doc.line(previous.x, previous.y, current.x, current.y);
    previous = current;
  }

  setText(doc, MUTED);
  doc.setFontSize(6.5);
  doc.text('f (Hz)', plotX + plotWidth / 2, boxY + boxHeight - 6, { align: 'center' });
  setText(doc, ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.text(safe(label), plotX, plotY - 3);
  setText(doc, FAINT);
  doc.setFont('helvetica', 'normal');
  doc.text(
    safe(`${formatSI(rangeStart, 'Hz', decimals)}  to  ${formatSI(rangeEnd, 'Hz', decimals)}`),
    boxX + CONTENT - 5,
    boxY + boxHeight - 6,
    { align: 'right' },
  );

  ctx.y = boxY + boxHeight + 6;
}

export async function exportPdfReport(options: PdfReportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { analysis, issues, compensation, targetPf, decimals, sweepPoints } = options;
  const generated = new Date();
  const generatedLabel = generated.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const ctx: Cursor = {
    doc,
    y: 23,
    page: 1,
    generated: generatedLabel,
  };

  doc.setProperties({
    title: 'RLC Studio - AC Circuit Analysis Report',
    subject: `${analysis.topology} RLC circuit at ${formatSI(analysis.frequency, 'Hz', decimals)}`,
    author: 'RLC Studio',
    creator: 'RLC Studio 1.0',
  });

  drawPageHeader(ctx);

  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('AC Circuit Analysis', MARGIN, ctx.y + 2);
  doc.setFontSize(11);
  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.text(
    safe(`${analysis.topology.charAt(0).toUpperCase() + analysis.topology.slice(1)} RLC network - ${analysis.atResonance ? 'at resonance' : analysis.state}`),
    MARGIN,
    ctx.y + 9,
  );
  setText(doc, ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FIVE-STEP ANALYSIS  /  RMS PHASORS  /  SI UNITS', MARGIN, ctx.y + 15);
  ctx.y += 20;

  summaryBoxes(ctx, analysis, decimals);

  sectionTitle(ctx, 'Circuit & source', 'Effective component values after direct-reactance overrides.');
  keyValueGrid(
    ctx,
    [
      { label: 'Topology', value: analysis.topology },
      { label: 'Operating state', value: analysis.atResonance ? 'At resonance' : analysis.state },
      { label: 'Frequency f', value: formatSI(analysis.frequency, 'Hz', decimals) },
      { label: 'Angular frequency omega', value: `${formatFixed(analysis.angularFrequency, decimals)} rad/s` },
      { label: 'Resistance R', value: analysis.components.resistance === null ? 'not fitted' : formatSI(analysis.components.resistance, 'Ω', decimals) },
      { label: 'Inductance L', value: analysis.components.inductance === null ? 'not fitted' : `${formatSI(analysis.components.inductance, 'H', decimals)}${analysis.components.inductanceFromReactance ? ' (derived)' : ''}` },
      { label: 'Capacitance C', value: analysis.components.capacitance === null ? 'not fitted' : `${formatSI(analysis.components.capacitance, 'F', decimals)}${analysis.components.capacitanceFromReactance ? ' (derived)' : ''}` },
      { label: 'Source drive', value: analysis.source.drive },
      { label: 'Voltage U', value: formatSI(analysis.source.voltage, 'V', decimals) },
      { label: 'Current I', value: formatSI(analysis.source.current, 'A', decimals) },
    ],
  );

  sectionTitle(ctx, 'Step 1 - Reactances');
  keyValueGrid(ctx, [
    { label: 'Inductive reactance X_L', value: analysis.components.inductiveReactance === null ? 'not fitted' : formatSI(analysis.components.inductiveReactance, 'Ω', decimals) },
    { label: 'Capacitive reactance X_C', value: analysis.components.capacitiveReactance === null ? 'not fitted' : formatSI(analysis.components.capacitiveReactance, 'Ω', decimals) },
  ]);

  sectionTitle(ctx, analysis.topology === 'series' ? 'Step 2 - Series impedance' : 'Step 2 - Branch values & impedance');
  const stepTwo: KeyValue[] = [
    { label: 'Impedance |Z|', value: formatSI(analysis.impedance.magnitude, 'Ω', decimals) },
    { label: 'Impedance angle phi', value: formatAngle(analysis.impedance.angleDeg, decimals) },
  ];
  if (analysis.topology === 'series') {
    stepTwo.push(
      { label: 'Resistance R', value: analysis.components.resistance === null ? '0 ohm' : formatSI(analysis.components.resistance, 'Ω', decimals) },
      { label: 'Net reactance X_L - X_C', value: formatSI((analysis.components.inductiveReactance ?? 0) - (analysis.components.capacitiveReactance ?? 0), 'Ω', decimals) },
    );
  } else if (analysis.branchCurrents) {
    stepTwo.push(
      { label: 'Branch current I_R', value: analysis.branchCurrents.r === null ? 'not fitted' : formatSI(analysis.branchCurrents.r, 'A', decimals) },
      { label: 'Branch current I_L', value: analysis.branchCurrents.l === null ? 'not fitted' : formatSI(analysis.branchCurrents.l, 'A', decimals) },
      { label: 'Branch current I_C', value: analysis.branchCurrents.c === null ? 'not fitted' : formatSI(analysis.branchCurrents.c, 'A', decimals) },
      { label: 'Total admittance |Y|', value: Number.isFinite(analysis.impedance.magnitude) && analysis.impedance.magnitude > 0 ? formatSI(1 / analysis.impedance.magnitude, 'S', decimals) : '0 S' },
    );
  }
  keyValueGrid(ctx, stepTwo);

  sectionTitle(ctx, 'Step 3 - Main quantities');
  keyValueGrid(ctx, [
    { label: 'Source voltage U', value: formatSI(analysis.source.voltage, 'V', decimals) },
    { label: 'Total current I', value: formatSI(analysis.source.current, 'A', decimals) },
    { label: 'Current angle (U at 0 deg)', value: formatAngle(analysis.source.currentAngleDeg, decimals) },
    { label: 'Current phasor', value: `${formatSI(analysis.source.current, 'A', decimals)} at ${formatAngle(analysis.source.currentAngleDeg, decimals)}` },
  ]);

  sectionTitle(ctx, analysis.topology === 'series' ? 'Step 4 - Component voltages' : 'Step 4 - Component currents');
  if (analysis.topology === 'series' && analysis.componentVoltages) {
    keyValueGrid(ctx, [
      { label: 'Voltage across R, U_R', value: analysis.componentVoltages.r === null ? 'not fitted' : formatSI(analysis.componentVoltages.r, 'V', decimals) },
      { label: 'Voltage across L, U_L', value: analysis.componentVoltages.l === null ? 'not fitted' : formatSI(analysis.componentVoltages.l, 'V', decimals) },
      { label: 'Voltage across C, U_C', value: analysis.componentVoltages.c === null ? 'not fitted' : formatSI(analysis.componentVoltages.c, 'V', decimals) },
      { label: 'Phasor sum / source U', value: formatSI(analysis.source.voltage, 'V', decimals) },
    ]);
  } else if (analysis.branchCurrents) {
    keyValueGrid(ctx, [
      { label: 'Current through R, I_R', value: analysis.branchCurrents.r === null ? 'not fitted' : formatSI(analysis.branchCurrents.r, 'A', decimals) },
      { label: 'Current through L, I_L', value: analysis.branchCurrents.l === null ? 'not fitted' : formatSI(analysis.branchCurrents.l, 'A', decimals) },
      { label: 'Current through C, I_C', value: analysis.branchCurrents.c === null ? 'not fitted' : formatSI(analysis.branchCurrents.c, 'A', decimals) },
      { label: 'Voltage across each branch', value: formatSI(analysis.source.voltage, 'V', decimals) },
    ]);
  }

  sectionTitle(ctx, 'Step 5 - Power, phase & resonance');
  keyValueGrid(ctx, [
    { label: 'Active power P', value: formatSI(analysis.powers.active, 'W', decimals) },
    { label: 'Reactive power Q', value: formatSI(analysis.powers.reactive, 'var', decimals) },
    { label: 'Apparent power S', value: formatSI(analysis.powers.apparent, 'VA', decimals) },
    { label: 'Power factor cos(phi)', value: formatPF(analysis.powers.factor, decimals) },
    { label: 'Phase angle phi', value: formatAngle(analysis.powers.phaseDeg, decimals) },
    { label: 'Power factor nature', value: analysis.powers.nature },
  ]);

  if (analysis.resonance) {
    keyValueGrid(ctx, [
      { label: 'Resonant frequency f0', value: formatSI(analysis.resonance.frequency, 'Hz', decimals) },
      { label: 'Quality factor Q_f', value: Number.isFinite(analysis.resonance.qFactor) ? formatFixed(analysis.resonance.qFactor, decimals) : 'infinite (ideal)' },
      { label: 'Bandwidth BW', value: Number.isFinite(analysis.resonance.bandwidth) ? formatSI(analysis.resonance.bandwidth, 'Hz', decimals) : '0 Hz (ideal)' },
      { label: 'Characteristic impedance Z0', value: formatSI(analysis.resonance.characteristicImpedance, 'Ω', decimals) },
      { label: 'Frequency ratio f / f0', value: formatFixed(analysis.resonance.frequencyRatio, decimals) },
      { label: 'Damping ratio zeta', value: formatFixed(analysis.resonance.dampingRatio, decimals) },
    ]);
  }

  sectionTitle(ctx, 'Power-factor correction', 'Parallel capacitor, constant-power approximation.', 10);
  if (compensation.available) {
    keyValueGrid(ctx, [
      { label: 'Target power factor', value: formatPF(targetPf, decimals) },
      { label: 'Target phase phi2', value: formatAngle(compensation.targetPhaseDeg, decimals) },
      { label: 'Reactive power to correct', value: formatSI(compensation.reactivePowerToCorrect, 'var', decimals) },
      { label: 'Required capacitance C', value: `${formatFixed(compensation.capacitanceMicro, decimals)} uF` },
      { label: 'Current before correction', value: formatSI(compensation.currentBefore, 'A', decimals) },
      { label: 'Current after correction', value: formatSI(compensation.currentAfter, 'A', decimals) },
      { label: 'Current reduction', value: formatSI(compensation.currentReduction, 'A', decimals) },
      { label: 'Connection', value: 'parallel with the load' },
    ]);
  } else {
    paragraph(ctx, compensation.reason ?? 'Not available for the current operating point.', { size: 8 });
  }

  drawPhasor(ctx, analysis, decimals);
  drawFrequencyChart(
    ctx,
    sweepPoints,
    options.sweepMetric,
    options.sweepStart,
    options.sweepEnd,
    decimals,
    analysis.resonance?.frequency ?? null,
  );

  if (analysis.notes.length > 0) {
    sectionTitle(ctx, 'Engineering notes', undefined, 9);
    for (const note of analysis.notes) paragraph(ctx, note, { size: 8, indent: 3, gap: 1.5 });
  }

  const warnings = issues.filter((item) => item.severity !== 'info');
  if (warnings.length > 0) {
    sectionTitle(ctx, 'Validation notes', undefined, 9);
    for (const warning of warnings) {
      paragraph(ctx, `[${warning.severity.toUpperCase()}] ${warning.message}`, {
        size: 7.8,
        indent: 3,
        gap: 1.5,
      });
    }
  }

  paragraph(
    ctx,
    'Assumptions: sinusoidal steady state, ideal components, RMS magnitudes, and a source-voltage reference at 0 deg. Reactive power is positive for inductive networks; Q_f is the quality factor. Chart axis labels are rounded for readability.',
    { size: 7.2, color: FAINT, gap: 2 },
  );

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    setStroke(doc, LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, 287, PAGE_WIDTH - MARGIN, 287);
    setText(doc, FAINT);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`RLC Studio - generated ${generatedLabel}`, MARGIN, 291);
    doc.text(`Page ${page} of ${totalPages}`, PAGE_WIDTH - MARGIN, 291, { align: 'right' });
  }

  const datePart = generated.toISOString().slice(0, 10);
  doc.save(`rlc-studio-${analysis.topology}-${datePart}.pdf`);
}
