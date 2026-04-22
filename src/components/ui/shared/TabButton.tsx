interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'timber' | 'amber' | 'cheddar';
}

const VARIANT_STYLES = {
  timber: {
    active: 'bg-timber-500 text-white border-timber-600',
    inactive: 'bg-timber-100 text-timber-700 border-timber-300 hover:bg-timber-200',
  },
  amber: {
    active: 'bg-amber-600 text-white border-amber-700',
    inactive: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
  },
  cheddar: {
    active: 'bg-cheddar-500 text-white border-cheddar-600',
    inactive: 'bg-cheddar-100 text-cheddar-700 border-cheddar-300 hover:bg-cheddar-200',
  },
};

export function TabButton({
  active,
  onClick,
  children,
  className = '',
  variant = 'timber',
}: TabButtonProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors border
        ${active ? styles.active : styles.inactive}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
