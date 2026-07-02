import type { HTMLAttributes, ReactNode } from 'react';

interface PanelContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  /** Render as a different element (e.g. `section`) to preserve landmark semantics. */
  as?: 'div' | 'section';
}

export function PanelContainer({ children, className = '', as: Tag = 'div', ...rest }: PanelContainerProps) {
  return (
    <Tag
      className={`p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
