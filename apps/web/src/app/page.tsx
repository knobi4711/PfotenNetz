import { Dashboard } from '../components/Dashboard';
import { Providers } from '../providers/Providers';

export default function HomePage() {
  return (
    <Providers>
      <Dashboard />
    </Providers>
  );
}
