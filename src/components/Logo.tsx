import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  theme?: 'light' | 'dark' | 'auto';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  variant = 'full',
  theme = 'auto',
  size = 'md'
}) => {
  const sizeMap = {
    sm: { height: 28, font: 'text-lg', gap: 'gap-1.5' },
    md: { height: 38, font: 'text-xl', gap: 'gap-2' },
    lg: { height: 52, font: 'text-3xl', gap: 'gap-3' }
  };

  const currentSize = sizeMap[size];

  // Using the new official AerovaX logo image provided by the user
  // Logo: https://drive.google.com/file/d/1UJkvdzqPYtZK8Gk9Z-ZjkkDUOt4E5HNT/view
  const logoUrl = "https://drive.google.com/thumbnail?id=1UJkvdzqPYtZK8Gk9Z-ZjkkDUOt4E5HNT&sz=w1000";

  return (
    <div className={cn("flex items-center select-none", currentSize.gap, className)}>
      <div className="relative flex items-center justify-center shrink-0">
        <img 
          src={logoUrl} 
          alt="AerovaX Icon" 
          style={{ height: currentSize.height }}
          className="block"
        />
      </div>
      
      {variant === 'full' && (
        <span className={cn(
          "font-sans font-bold tracking-tight transition-colors duration-300",
          currentSize.font,
          theme === 'light' ? "text-[#2B2D42]" : 
          theme === 'dark' ? "text-white" : 
          "text-[#2B2D42] dark:text-white"
        )}>
          Aerova<span className="text-brand-coral">X</span>
        </span>
      )}
    </div>
  );
};

