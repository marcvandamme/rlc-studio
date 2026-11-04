import {
  ArrowRight,
  BookOpen,
  CircuitBoard,
  Equal,
  FlaskConical,
  Info,
  Library,
  Sigma,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Formula } from '../components/ui/Formula';

interface TheoryPageProps {
  onTryExample: (presetId: string) => void;
}

const CONTENTS = [
  { id: 'conventions', label: '1 · Phasors & conventions' },
  { id: 'impedance', label: '2 · Reactance & impedance' },
  { id: 'power', label: '3 · Power & power factor' },
  { id: 'resonance', label: '4 · Resonance & bandwidth' },
  { id: 'correction', label: '5 · Power-factor correction' },
  { id: 'units', label: '6 · Units & input syntax' },
  { id: 'worked', label: '7 · Worked example' },
];

export function TheoryPage({ onTryExample }: TheoryPageProps) {
  return (
    <div className="pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-6 py-6 shadow-card sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border border-line/70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 h-56 w-56 rounded-full border border-line/50"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Theory reference</Badge>
            <Badge tone="neutral">Sinusoidal steady state</Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The physics behind the numbers
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted">
            A compact reference for complex impedance, phasor addition, power, resonance and
            power-factor correction — written to match every calculation in the workbench.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[10.5px] text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1">
              <Sigma className="h-3 w-3 text-accent" aria-hidden />
              Complex arithmetic
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1">
              <Zap className="h-3 w-3 text-accent" aria-hidden />
              RMS phasors
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1">
              <CircuitBoard className="h-3 w-3 text-accent" aria-hidden />
              Ideal components
            </span>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-5">
          <TheorySection id="conventions" eyebrow="Foundations" title="Phasors & sign conventions">
            <p>
              A sinusoidal quantity is represented by a rotating phasor. At a fixed angular
              frequency <Formula latex="\omega = 2\pi f" />, the complex amplitude carries both the
              RMS magnitude and the phase angle. RLC Studio freezes the source voltage at{' '}
              <Formula latex="0^\circ" />, so every other angle is relative to U.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormulaCard
                title="Impedance"
                latex="\mathbf{Z} = R + jX = |Z|e^{j\varphi}"
                text="R is the real part; X = X_L − X_C is the net reactance."
              />
              <FormulaCard
                title="Ohm’s law"
                latex="\mathbf{U} = \mathbf{Z}\mathbf{I}"
                text="The same complex relation holds for every series element and every network."
              />
            </div>
            <div className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-4">
              <div className="flex items-center gap-2 text-accent">
                <Info className="h-4 w-4" aria-hidden />
                <p className="text-xs font-semibold">Sign convention used everywhere</p>
              </div>
              <ul className="mt-2 grid gap-2 text-[11.5px] leading-relaxed text-muted sm:grid-cols-2">
                <li>
                  <strong className="text-ink">φ &gt; 0</strong> — inductive load, current lags
                  voltage (lagging).
                </li>
                <li>
                  <strong className="text-ink">φ &lt; 0</strong> — capacitive load, current leads
                  voltage (leading).
                </li>
                <li>
                  <strong className="text-ink">Q &gt; 0</strong> — inductive reactive power.
                </li>
                <li>
                  <strong className="text-ink">Q &lt; 0</strong> — capacitive reactive power.
                </li>
              </ul>
            </div>
          </TheorySection>

          <TheorySection id="impedance" eyebrow="Step 1 & 2" title="Reactance & impedance">
            <p>
              Reactance is the frequency-dependent opposition to current. Inductors store energy in
              a magnetic field and make the current lag; capacitors store energy in an electric
              field and make the current lead.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormulaCard
                title="Inductive reactance"
                latex="X_L = 2\pi f L"
                text="Rises linearly with frequency and inductance."
              />
              <FormulaCard
                title="Capacitive reactance"
                latex="X_C = \dfrac{1}{2\pi f C}"
                text="Falls as frequency or capacitance rises."
              />
            </div>
            <h4 className="pt-2 text-xs font-semibold text-ink">Series network</h4>
            <p>
              One current flows through every element. Impedances add directly and the voltages add
              as phasors.
            </p>
            <Formula block latex="\mathbf{Z} = R + jX_L - jX_C = R + j(X_L - X_C)" />
            <Formula block latex="|Z| = \sqrt{R^2 + (X_L - X_C)^2}, \qquad \varphi = \operatorname{atan2}(X_L - X_C, R)" />
            <h4 className="pt-2 text-xs font-semibold text-ink">Parallel network</h4>
            <p>
              Every branch shares the same voltage. Admittances add directly; the branch currents
              add as phasors.
            </p>
            <Formula block latex="\mathbf{Y} = \frac{1}{R} + \frac{1}{jX_L} + j\frac{1}{X_C}, \qquad \mathbf{Z} = \frac{1}{\mathbf{Y}}" />
            <Formula block latex="I = \sqrt{I_R^2 + (I_C - I_L)^2}" />
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[520px] text-left text-[11px]">
                <thead className="bg-raised text-[9.5px] uppercase tracking-[0.12em] text-faint">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Quantity</th>
                    <th className="px-4 py-2.5 font-semibold">Series</th>
                    <th className="px-4 py-2.5 font-semibold">Parallel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-muted">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-ink">Shared quantity</td>
                    <td className="px-4 py-2.5">Current I</td>
                    <td className="px-4 py-2.5">Voltage U</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-ink">Combine</td>
                    <td className="px-4 py-2.5">Impedances add</td>
                    <td className="px-4 py-2.5">Admittances add</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-ink">Resonance</td>
                    <td className="px-4 py-2.5">|Z| minimum = R</td>
                    <td className="px-4 py-2.5">|Z| maximum = R</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </TheorySection>

          <TheorySection id="power" eyebrow="Step 5" title="Power & power factor">
            <p>
              In AC networks the product <Formula latex="UI" /> is apparent power. Only the
              in-phase component transfers net energy; the quadrature component shuttles between
              the source and the reactive elements.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormulaCard title="Active power" latex="P = UI\cos\varphi" text="Watts (W) — real work and heat." />
              <FormulaCard title="Reactive power" latex="Q = UI\sin\varphi" text="Volt-amperes reactive (var)." />
              <FormulaCard title="Apparent power" latex="S = UI" text="Volt-amperes (VA)." />
            </div>
            <Formula block latex="S^2 = P^2 + Q^2, \qquad \cos\varphi = \frac{P}{S}" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-inductive/25 bg-inductive/[0.05] p-4">
                <p className="text-xs font-semibold text-inductive">Lagging power factor</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Inductive load: current lags voltage, Q is positive. Motors, transformers and
                  coils are typical causes.
                </p>
              </div>
              <div className="rounded-2xl border border-capacitive/25 bg-capacitive/[0.05] p-4">
                <p className="text-xs font-semibold text-capacitive">Leading power factor</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Capacitive load: current leads voltage, Q is negative. Long cables and capacitor
                  banks can produce this condition.
                </p>
              </div>
            </div>
          </TheorySection>

          <TheorySection id="resonance" eyebrow="Step 5" title="Resonance & bandwidth">
            <p>
              At resonance the inductive and capacitive reactances are equal in magnitude, so they
              cancel. The natural frequency depends only on L and C; the quality factor depends on
              the resistance and the topology.
            </p>
            <Formula block latex="f_0 = \frac{1}{2\pi\sqrt{LC}}, \qquad \omega_0 = \frac{1}{\sqrt{LC}}" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormulaCard
                title="Series RLC"
                latex="Q_f = \frac{1}{R}\sqrt{\frac{L}{C}} = \frac{Z_0}{R}"
                text="Low R → high Q → narrow bandwidth and a sharp current peak."
              />
              <FormulaCard
                title="Parallel RLC"
                latex="Q_f = R\sqrt{\frac{C}{L}} = \frac{R}{Z_0}"
                text="High parallel R → high Q → a sharp impedance peak and current dip."
              />
            </div>
            <Formula block latex="BW = \frac{f_0}{Q_f}, \qquad \zeta = \frac{1}{2Q_f}, \qquad Z_0 = \sqrt{\frac{L}{C}}" />
            <div className="rounded-2xl border border-line bg-raised/60 p-4 text-[11.5px] leading-relaxed text-muted">
              <strong className="text-ink">Series vs. parallel:</strong> a series circuit has minimum
              impedance at resonance and draws maximum current. A parallel tank has maximum
              impedance at resonance and draws minimum line current. The symbol{' '}
              <Formula latex="Q_f" /> in this app is the quality factor; reactive power is{' '}
              <Formula latex="Q" />.
            </div>
          </TheorySection>

          <TheorySection id="correction" eyebrow="Application" title="Power-factor correction">
            <p>
              An inductive load can be compensated by placing a capacitor in parallel with it. The
              capacitor supplies the reactive power that the source would otherwise deliver,
              reducing the line current without changing the load’s active power.
            </p>
            <Formula block latex="Q_c = P(\tan\varphi_1 - \tan\varphi_2)" />
            <Formula block latex="C = \frac{Q_c}{\omega U^2} = \frac{P(\tan\varphi_1 - \tan\varphi_2)}{2\pi f\,U^2}" />
            <p className="text-[11px] leading-relaxed text-faint">
              φ₁ is the existing load angle and φ₂ = arccos(PF<sub>target</sub>). Choose a target
              below 1.00 in practice so the controller does not hunt between leading and lagging.
              This is a constant-power approximation: verify the final network with the compensated
              capacitor included.
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-raised/60 p-4">
              <FlaskConical className="h-4 w-4 text-accent" aria-hidden />
              <p className="flex-1 text-[11px] leading-relaxed text-muted">
                Try the parallel inductive load in the workbench and set the target power factor to
                0.95.
              </p>
              <Button size="sm" variant="secondary" onClick={() => onTryExample('parallel-inductive')}>
                Open example
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TheorySection>

          <TheorySection id="units" eyebrow="Reference" title="Units & input syntax">
            <p>
              Numeric fields accept SI prefixes and optional unit suffixes. Prefixes are
              case-sensitive, because <span className="font-mono text-ink">m</span> and{' '}
              <span className="font-mono text-ink">M</span> differ by nine orders of magnitude.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[480px] text-left text-[11px]">
                <thead className="bg-raised text-[9.5px] uppercase tracking-[0.12em] text-faint">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Prefix</th>
                    <th className="px-4 py-2.5 font-semibold">Multiplier</th>
                    <th className="px-4 py-2.5 font-semibold">Examples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-muted">
                  {[
                    ['M', '× 10⁶', '2.2M = 2.2 MΩ'],
                    ['k', '× 10³', '4.7k = 4,700'],
                    ['m', '× 10⁻³', '100mH = 0.1 H'],
                    ['u / µ / μ', '× 10⁻⁶', '10uF = 10 µF'],
                    ['n', '× 10⁻⁹', '470n = 470 nF'],
                    ['p', '× 10⁻¹²', '22p = 22 pF'],
                  ].map(([prefix, multiplier, example]) => (
                    <tr key={prefix}>
                      <td className="px-4 py-2.5 font-mono font-semibold text-ink">{prefix}</td>
                      <td className="px-4 py-2.5 font-mono">{multiplier}</td>
                      <td className="px-4 py-2.5 font-mono">{example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold text-ink">Smart parsing</p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
                  <li>Decimals with a comma or a dot are accepted.</li>
                  <li>Whitespace and unit text are ignored after parsing.</li>
                  <li>“2.2kΩ”, “4.7 k”, “10µF” and “159.15Hz” all work.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold text-ink">Direct reactance entry</p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
                  <li>
                    <span className="font-mono text-ink">50L</span> → X<sub>L</sub> = 50 Ω
                  </li>
                  <li>
                    <span className="font-mono text-ink">30C</span> → X<sub>C</sub> = 30 Ω
                  </li>
                  <li>
                    <span className="font-mono text-ink">100Z</span> → |Z| = 100 Ω for cross-check
                  </li>
                </ul>
              </div>
            </div>
          </TheorySection>

          <TheorySection id="worked" eyebrow="Walkthrough" title="Worked example">
            <p>
              Take a series network with <Formula latex="R = 100\ \Omega" />,{' '}
              <Formula latex="L = 100\ \mathrm{mH}" />,{' '}
              <Formula latex="C = 10\ \mu\mathrm{F}" />, <Formula latex="f = 50\ \mathrm{Hz}" /> and{' '}
              <Formula latex="U = 230\ \mathrm{V}" /> (RMS).
            </p>
            <ol className="space-y-3">
              <WorkedStep index="1" title="Reactances">
                <Formula block latex="X_L = 2\pi(50)(0.1) = 31.416\ \Omega" />
                <Formula block latex="X_C = \frac{1}{2\pi(50)(10^{-5})} = 318.31\ \Omega" />
              </WorkedStep>
              <WorkedStep index="2" title="Impedance">
                <Formula block latex="Z = 100 + j(31.416 - 318.31) = 100 - j286.89\ \Omega" />
                <Formula block latex="|Z| = 303.8\ \Omega, \qquad \varphi = -70.8^\circ" />
              </WorkedStep>
              <WorkedStep index="3" title="Current">
                <Formula block latex="I = \frac{230}{303.8} = 0.757\ \mathrm{A}, \qquad \angle I = +70.8^\circ" />
                <p className="text-[11px] text-muted">
                  The current leads the voltage because the capacitor dominates at 50 Hz.
                </p>
              </WorkedStep>
              <WorkedStep index="4" title="Component voltages">
                <Formula block latex="U_R = 75.7\ \mathrm{V},\quad U_L = 23.8\ \mathrm{V},\quad U_C = 241.0\ \mathrm{V}" />
                <p className="text-[11px] text-muted">
                  The voltages add as phasors, not arithmetically; their vector sum is 230 V.
                </p>
              </WorkedStep>
              <WorkedStep index="5" title="Power and resonance">
                <Formula block latex="P = 57.3\ \mathrm{W},\quad Q = -164.4\ \mathrm{var},\quad S = 174.1\ \mathrm{VA}" />
                <Formula block latex="f_0 = 159.15\ \mathrm{Hz},\qquad Q_f = 1.0,\qquad BW = 159.15\ \mathrm{Hz}" />
              </WorkedStep>
            </ol>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onTryExample('series-rlc')}
              icon={<Sparkles className="h-3.5 w-3.5" />}
            >
              Load this circuit in the calculator
            </Button>
          </TheorySection>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
            <div className="flex items-center gap-2 text-muted">
              <Library className="h-4 w-4" aria-hidden />
              <p className="text-[10.5px] leading-relaxed">
                Further reading: standard AC circuit analysis texts (Boylestad; Nilsson & Riedel).
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onTryExample('series-resonance')}>
              Explore resonance
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-center gap-2 text-muted">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">On this page</p>
            </div>
            <nav className="mt-3 space-y-1">
              {CONTENTS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-2 py-1.5 text-[11px] text-muted transition hover:bg-raised hover:text-ink"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 border-t border-line pt-3">
              <div className="flex items-center gap-2">
                <Equal className="h-3.5 w-3.5 text-accent" aria-hidden />
                <p className="text-[10px] font-semibold text-ink">Quick check</p>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                At resonance, <Formula latex="X_L = X_C" /> and the phase angle is 0° for an ideal
                lossless tank.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TheorySection({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-28 p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function FormulaCard({ title, latex, text }: { title: string; latex: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-raised/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{title}</p>
      <Formula latex={latex} block className="mt-2 text-[13px]" />
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function WorkedStep({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-line bg-raised/40 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 font-mono text-[10px] font-bold text-accent ring-1 ring-accent/20">
          {index}
        </span>
        <p className="text-xs font-semibold text-ink">{title}</p>
      </div>
      <div className="mt-2 space-y-1.5 pl-8">{children}</div>
    </li>
  );
}
