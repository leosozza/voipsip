import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyFieldProps {
  value: string;
  /** Accessible name of what is being copied, e.g. "caminho do manipulador". */
  label: string;
  className?: string;
}

/** Read-only monospace value with a copy-to-clipboard button. */
export function CopyField({ value, label, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  return (
    <div className={cn('flex items-stretch overflow-hidden rounded-md border bg-muted/40', className)}>
      <code className="min-w-0 flex-1 select-all break-all px-3 py-2 font-mono text-sm">{value}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-auto shrink-0 rounded-none border-l"
        onClick={copy}
        aria-label={`Copiar ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
