import katex from 'katex';
import { useMemo } from 'react';
import { cn } from '../../lib/cn';

interface FormulaProps {
  latex: string;
  block?: boolean;
  className?: string;
}

/** Render a LaTeX formula with KaTeX. Invalid input degrades gracefully. */
export function Formula({ latex, block = false, className }: FormulaProps) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        throwOnError: false,
        displayMode: block,
        strict: false,
        output: 'htmlAndMathml',
      }),
    [latex, block],
  );

  if (block) {
    return (
      <div
        className={cn('formula formula-block overflow-x-auto', className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={cn('formula inline-block', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
