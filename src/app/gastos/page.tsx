'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import ExpenseCard from '@/components/ExpenseCard';
import MonthPicker from '@/components/MonthPicker';
import Card from '@/components/ui/Card';
import { useExpenses } from '@/hooks/useExpenses';
import { useCategories } from '@/hooks/useCategories';
import { useBalance } from '@/hooks/useBalance';
import { Expense } from '@/lib/types';

export default function GastosPage() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaidBy, setSelectedPaidBy] = useState('');

  const { expenses, loading, deleteExpense } = useExpenses({
    month,
    year,
    categoryId: selectedCategory || undefined,
    paidBy: selectedPaidBy || undefined,
    search: search || undefined,
  });
  const { categories } = useCategories();
  const { users } = useBalance();

  const handleDelete = async (id: string) => {
    if (confirm('Eliminar este gasto?')) {
      await deleteExpense(id);
    }
  };

  const handleEdit = (expense: Expense) => {
    router.push(`/gastos/nuevo?id=${expense.id}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Gastos</h1>

      <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por descripcion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-xs bg-white text-gray-700 flex-shrink-0"
        >
          <option value="">Todas las categorias</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={selectedPaidBy}
          onChange={(e) => setSelectedPaidBy(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2 text-xs bg-white text-gray-700 flex-shrink-0"
        >
          <option value="">Todos</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-14 bg-gray-100 rounded" />
            </Card>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400 text-sm">No hay gastos en este periodo</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
