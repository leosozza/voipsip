import { cn } from '@/lib/utils';

const KEYS: Array<[string, string]> = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
];

interface DialPadProps {
  onPress: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

/** 12-key telephone keypad. Every key is a native button, so it works with Tab/Enter/Space. */
export function DialPad({ onPress, disabled, className }: DialPadProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)} role="group" aria-label="Teclado numérico">
      {KEYS.map(([key, letters]) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onPress(key)}
          aria-label={`Tecla ${key}`}
          className="flex h-12 flex-col items-center justify-center rounded-md border bg-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent/70 disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="text-lg font-medium leading-none">{key}</span>
          <span className="mt-0.5 h-3 text-[9px] font-medium tracking-widest text-muted-foreground">{letters}</span>
        </button>
      ))}
    </div>
  );
}
