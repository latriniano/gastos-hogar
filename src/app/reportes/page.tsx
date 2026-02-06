'use client';

import { useState, useEffect, useCallback } from 'react';
import MonthPicker from '@/components/MonthPicker';
import ExpenseChart from '@/components/ExpenseChart';
import MonthlyChart from '@/components/MonthlyChart';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase';
import { CategorySummary, Expense, User, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download } from 'lucide-react';

export default function ReportesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; user1: number; user2: number; user1Name: string; user2Name: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [usersRes, categoriesRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('categories').select('*'),
    ]);

    const allUsers = (usersRes.data || []) as User[];
    const allCategories = (categoriesRes.data || []) as Category[];
    setUsers(allUsers);

    const user1 = allUsers[0];
    const user2 = allUsers[1];

    // Expenses for selected month
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('*, category:categories(*)')
      .gte('date', startDate)
      .lte('date', endDate);

    const expensesList = (monthExpenses || []) as Expense[];
    setExpenses(expensesList);

    // Category summaries
    const summaries: CategorySummary[] = allCategories.map(cat => {
      const catExpenses = expensesList.filter(e => e.category_id === cat.id);
      const total = catExpenses.reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount), 0);
      const user1Paid = catExpenses.filter(e => e.paid_by === user1?.id).reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount), 0);
      const user2Paid = catExpenses.filter(e => e.paid_by === user2?.id).reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount), 0);

      return {
        category: cat,
        total,
        user1_paid: user1Paid,
        user2_paid: user2Paid,
        user1_owes: 0,
        user2_owes: 0,
      };
    });

    setCategorySummaries(summaries.filter(s => s.total > 0));

    // Monthly chart data (last 6 months)
    const monthlyResults = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(year, month, 1), i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: mExpenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', mStart)
        .lte('date', mEnd);

      const mList = (mExpenses || []) as Expense[];
      monthlyResults.push({
        month: format(d, 'MMM yy', { locale: es }),
        user1: mList.filter(e => e.paid_by === user1?.id).reduce((s, e) => s + (e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount), 0),
        user2: mList.filter(e => e.paid_by === user2?.id).reduce((s, e) => s + (e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount), 0),
        user1Name: user1?.name || 'Usuario 1',
        user2Name: user2?.name || 'Usuario 2',
      });
    }
    setMonthlyData(monthlyResults);
    setLoading(false);
  }, [month, year, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    const user1 = users[0];
    const user2 = users[1];
    const header = `Fecha,Descripcion,Categoria,Monto,Moneda,Pago,Split,Corresponde ${user1?.name || 'U1'},Corresponde ${user2?.name || 'U2'}`;

    const rows = expenses.map(e => {
      const split = e.split_percentage ?? e.category?.default_split_percentage ?? 50;
      const finalAmount = e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount;
      const u1Amount = finalAmount * (split / 100);
      const u2Amount = finalAmount - u1Amount;
      const paidByName = e.paid_by === user1?.id ? user1?.name : user2?.name;

      return `${e.date},"${e.description}","${e.category?.name || ''}",${finalAmount.toFixed(2)},${e.currency},${paidByName},${split}/${100 - split},${u1Amount.toFixed(2)},${u2Amount.toFixed(2)}`;
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gastos-${year}-${String(month + 1).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalMonth = categorySummaries.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
        <Button variant="secondary" size="sm" onClick={exportCSV} disabled={expenses.length === 0}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />

      {loading ? (
        <div className="space-y-4">
          <Card className="animate-pulse"><div className="h-64 bg-gray-100 rounded" /></Card>
          <Card className="animate-pulse"><div className="h-64 bg-gray-100 rounded" /></Card>
        </div>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Gastos por Categoria</h2>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(totalMonth)}</span>
            </div>
            <ExpenseChart data={categorySummaries} />
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Evolucion Mensual</h2>
            <MonthlyChart data={monthlyData} />
          </Card>

          {categorySummaries.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumen por Categoria</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-gray-500 font-medium">Categoria</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                      <th className="text-right py-2 text-gray-500 font-medium">{users[0]?.name}</th>
                      <th className="text-right py-2 text-gray-500 font-medium">{users[1]?.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySummaries.map(s => (
                      <tr key={s.category.id} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{s.category.name}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(s.total)}</td>
                        <td className="py-2 text-right text-gray-600">{formatCurrency(s.user1_paid)}</td>
                        <td className="py-2 text-right text-gray-600">{formatCurrency(s.user2_paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
