import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-semibold rounded-lg transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/30",
    secondary: "bg-[#141824] hover:bg-[#1c2233] text-slate-200 border border-[#1e2638] hover:border-[#2d3852]",
    ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white",
    danger: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
  };

  const sizes = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-8 px-3 text-xs gap-2",
    lg: "h-10 px-4 text-sm gap-2.5 rounded-xl"
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
};
