import { ReactNode } from 'react';
import { useGameStore } from '../../../stores';

interface AnimatedTabContentProps {
  children: ReactNode;
  activeKey: string;
}

export function AnimatedTabContent({ children, activeKey }: AnimatedTabContentProps) {
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);

  return (
    <div
      key={activeKey}
      className={!reducedMotion ? 'animate-fade-in' : ''}
    >
      {children}
    </div>
  );
}
