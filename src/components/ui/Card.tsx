import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({ className, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white shadow-sm border border-gray-100',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-4',
        padding === 'lg' && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
