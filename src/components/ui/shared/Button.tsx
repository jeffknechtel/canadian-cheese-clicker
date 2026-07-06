import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

/**
 * Shared disabled treatment for bespoke buttons that can't adopt <Button>
 * (dense grids, card buttons). Single source for the disabled combo.
 */
export const DISABLED_BUTTON_CLASSES = 'bg-gray-200 text-gray-700 cursor-not-allowed';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-cheddar-600 hover:bg-cheddar-700 text-white shadow-sm active:scale-95',
  secondary: 'bg-timber-100 hover:bg-timber-200 text-timber-800 border border-timber-300',
  ghost: 'hover:bg-white/20 text-current',
  danger: 'bg-maple-600 hover:bg-maple-700 text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-sm min-h-[44px] md:min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, className = '', disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cheddar-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        ) : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
