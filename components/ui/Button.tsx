import type React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles =
    'h-10 px-6 font-mono font-bold text-sm uppercase transition-all duration-100 active:translate-y-[1px]';

  const variants = {
    primary: 'bg-orange text-white hover:bg-orange/90 disabled:bg-gray-300 disabled:text-gray-500',
    secondary: 'bg-white border border-gray-300 text-ink hover:border-ink hover:bg-gray-100',
    danger: 'bg-alert-red text-white hover:bg-red-600',
    ghost: 'bg-transparent text-gray-600 hover:text-ink hover:bg-gray-100',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
