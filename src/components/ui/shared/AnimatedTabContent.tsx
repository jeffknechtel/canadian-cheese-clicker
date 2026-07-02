import type { ReactNode } from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';

interface AnimatedTabContentProps {
  children: ReactNode;
  activeKey: string;
}

export function AnimatedTabContent({ children, activeKey }: AnimatedTabContentProps) {
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  return (
    <div
      key={activeKey}
      className={!reducedMotion ? 'animate-fade-in' : ''}
    >
      {children}
    </div>
  );
}
