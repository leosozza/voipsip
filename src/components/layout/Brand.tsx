import { Phone } from 'lucide-react';

export function Brand() {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-hidden="true">
        <Phone className="h-4 w-4" />
      </span>
      VoipSip Connector
    </span>
  );
}
