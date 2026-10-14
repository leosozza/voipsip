import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepInfo {
  title: string;
  /** Steps that cannot be opened yet (e.g. before Bitrix24 is connected). */
  locked?: boolean;
}

interface StepperProps {
  steps: StepInfo[];
  current: number;
  completed: (index: number) => boolean;
  onSelect: (index: number) => void;
}

export function Stepper({ steps, current, completed, onSelect }: StepperProps) {
  return (
    <nav aria-label="Etapas da configuração">
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          const isDone = completed(i) && !isCurrent;
          return (
            <li key={step.title} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                disabled={step.locked}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group flex w-full flex-col items-start gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-full rounded-full transition-colors',
                    isCurrent || isDone ? 'bg-primary' : 'bg-muted',
                  )}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      isCurrent && 'border-primary bg-primary text-primary-foreground',
                      isDone && 'border-success bg-success text-success-foreground',
                      !isCurrent && !isDone && 'text-muted-foreground',
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" aria-label="Concluída" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'hidden truncate text-sm sm:block',
                      isCurrent ? 'font-medium' : 'text-muted-foreground group-enabled:group-hover:text-foreground',
                      step.locked && 'opacity-60',
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="sr-only sm:hidden">{step.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
