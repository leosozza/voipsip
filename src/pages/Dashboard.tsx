import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Painel" description="Resumo das chamadas dos últimos 7 dias." />
      <DashboardView
        recentAction={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/calls">
              Ver todas
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />
    </div>
  );
}
