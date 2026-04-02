import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompany } from '@/hooks/useCompany';
import { useSipAccounts } from '@/hooks/useSipAccounts';
import type { SipAccount } from '@/types/voip';
import { stripBrazilDDI } from '@/lib/utils';

interface ClickToCallProps {
  phoneNumber: string;
}

function makeCall(phoneNumber: string, account: SipAccount) {
  const domain = account.sip_domain || account.sip_server;
  const uri = `sip:${stripBrazilDDI(phoneNumber)}@${domain}`;
  window.location.href = uri;
}

export function ClickToCall({ phoneNumber }: ClickToCallProps) {
  const { currentCompany } = useCompany();
  const { sipAccounts } = useSipAccounts(currentCompany?.id);

  if (!sipAccounts || sipAccounts.length === 0) {
    return (
      <Button variant="ghost" size="icon" disabled title="Nenhuma conta SIP configurada">
        <Phone className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  if (sipAccounts.length === 1) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => makeCall(phoneNumber, sipAccounts[0])}
        title={`Ligar via ${sipAccounts[0].display_name}`}
      >
        <Phone className="h-4 w-4 text-primary" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Escolher conta para ligar">
          <Phone className="h-4 w-4 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sipAccounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => makeCall(phoneNumber, account)}
          >
            <Phone className="mr-2 h-4 w-4" />
            {account.display_name}
            {account.is_default && (
              <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
