import type { ReactNode } from 'react';

/** Numbered list of instructions with large step markers. */
export function Instructions({ children }: { children: ReactNode }) {
  return <ol className="space-y-4">{children}</ol>;
}

export function Instruction({ n, title, children }: { n: number; title: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        aria-hidden="true"
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5 text-sm">
        <p className="font-medium">{title}</p>
        {children && <div className="space-y-2 text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}

/** Highlighted Bitrix24 UI path, e.g. <Path items={['Aplicativos', 'Recursos do desenvolvedor']} />. */
export function MenuPath({ items }: { items: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-foreground">
      {items.map((item, i) => (
        <span key={item} className="inline-flex items-center gap-1">
          {i > 0 && <span aria-hidden="true">→</span>}
          <strong className="font-medium">{item}</strong>
        </span>
      ))}
    </span>
  );
}
