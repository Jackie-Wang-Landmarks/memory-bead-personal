import React from 'react';

interface NeumorphicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'black';
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({ 
  children, 
  active = false, 
  icon, 
  label, 
  variant = 'primary',
  className = '',
  ...props 
}) => {
  const baseStyles = "relative flex items-center justify-center transition-all duration-300 ease-out active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
  
  // Shadow logic
  let shadowStyles = "";
  let colorStyles = "";

  switch (variant) {
    case 'black':
      // Stronger shadow for wood background visibility
      shadowStyles = "shadow-[4px_4px_10px_rgba(0,0,0,0.4),-4px_-4px_10px_rgba(255,255,255,0.1)]";
      colorStyles = "bg-gray-900 text-white hover:bg-black";
      break;
    case 'danger':
      shadowStyles = active ? "shadow-neumorph-inset bg-clay" : "shadow-neumorph bg-clay";
      colorStyles = "text-red-500 rounded-2xl";
      break;
    case 'secondary':
      shadowStyles = active ? "shadow-neumorph-inset bg-clay" : "shadow-neumorph bg-clay";
      colorStyles = "text-gray-400 rounded-2xl";
      break;
    case 'primary':
    default:
      shadowStyles = active ? "shadow-neumorph-inset bg-clay" : "shadow-neumorph bg-clay hover:-translate-y-0.5";
      colorStyles = "text-gray-600 rounded-2xl";
      break;
  }

  return (
    <button 
      className={`${baseStyles} ${shadowStyles} ${colorStyles} ${className} ${label ? 'px-8 py-4 space-x-3' : 'p-4'}`}
      {...props}
    >
      {icon && <span className={variant === 'black' ? "text-white" : ""}>{icon}</span>}
      {label && <span className="font-semibold text-sm tracking-wide">{label}</span>}
      {children}
    </button>
  );
};