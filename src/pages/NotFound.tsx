import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="space-y-4 text-center">
        <p className="text-5xl font-bold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <Button asChild>
          <Link to="/">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
