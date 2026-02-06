'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export default function MonthPicker({ month, year, onChange }: MonthPickerProps) {
  const goBack = () => {
    if (month === 0) {
      onChange(11, year - 1);
    } else {
      onChange(month - 1, year);
    }
  };

  const goForward = () => {
    if (month === 11) {
      onChange(0, year + 1);
    } else {
      onChange(month + 1, year);
    }
  };

  const label = format(new Date(year, month, 1), 'MMMM yyyy', { locale: es });

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-2">
      <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <span className="text-sm font-medium text-gray-900 capitalize">{label}</span>
      <button onClick={goForward} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
