import { useSearchParams, Navigate } from 'react-router-dom';

export default function BitrixSettingsPage() {
  const [searchParams] = useSearchParams();
  const params = new URLSearchParams(searchParams);
  params.set('tab', 'settings');
  return <Navigate to={`/bitrix/app?${params.toString()}`} replace />;
}
