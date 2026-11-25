import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RateRoastApp } from '@/components/RateRoastApp';

export default function HomePage() {
  return (
    <ErrorBoundary>
      <RateRoastApp />
    </ErrorBoundary>
  );
}
