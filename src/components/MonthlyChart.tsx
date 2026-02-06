'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthlyData {
  month: string;
  user1: number;
  user2: number;
  user1Name: string;
  user2Name: string;
}

interface MonthlyChartProps {
  data: MonthlyData[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  const user1Name = data[0]?.user1Name || 'Usuario 1';
  const user2Name = data[0]?.user2Name || 'Usuario 2';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        <Bar dataKey="user1" name={user1Name} fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="user2" name={user2Name} fill="#a78bfa" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
