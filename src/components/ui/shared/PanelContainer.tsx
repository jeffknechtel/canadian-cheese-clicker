interface PanelContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PanelContainer({ children, className = '' }: PanelContainerProps) {
  return (
    <div className={`p-4 bg-cream/80 backdrop-blur rounded-lg shadow-lg h-full flex flex-col panel-wood wood-grain ${className}`}>
      {children}
    </div>
  );
}
