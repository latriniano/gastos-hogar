'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CategorySummary } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#ec4899', '#f472b6', '#f9a8d4',
  '#f59e0b', '#fbbf24', '#fcd34d',
  '#10b981',
];

interface ExpenseChartProps {
  data: CategorySummary[];
}

export default function ExpenseChart({ data }: ExpenseChartProps) {
  const chartData = data
    .filter(d => d.total > 0)
    .map(d => ({
      name: d.category.name,
      value: d.total,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
        />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-gray-700">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
