import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TONE_CLASS, type Tone } from '@/lib/format';

export function StatusDot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', TONE_CLASS[tone].dot, pulse && 'motion-safe:animate-pulse', className)}
    />
  );
}

export function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium', TONE_CLASS[tone].badge, className)}>
      {children}
    </Badge>
  );
}
