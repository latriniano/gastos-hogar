'use client';

import { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LucideIcon } from '@/components/LucideIcon';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
}

export default function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat)}
          className={cn(
            'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
            selectedId === cat.id
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-100 bg-white hover:border-gray-200'
          )}
        >
          <LucideIcon
            name={cat.icon}
            className={cn(
              'w-6 h-6',
              selectedId === cat.id ? 'text-indigo-600' : 'text-gray-500'
            )}
          />
          <span className="text-[10px] text-center leading-tight text-gray-700 line-clamp-2">
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
}
