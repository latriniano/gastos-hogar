'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase';
import { Expense } from '@/lib/types';
import ExpenseForm from '@/components/ExpenseForm';

function NuevoGastoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [expense, setExpense] = useState<Expense | undefined>(undefined);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      const supabase = createClient();
      supabase
        .from('expenses')
        .select('*, category:categories(*), paid_by_user:users!expenses_paid_by_fkey(*), contact:contacts(*), debtors:expense_debtors(*, contact:contacts(*))')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) setExpense(data as Expense);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Cargando...</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {expense ? 'Editar Gasto' : 'Nuevo Gasto'}
      </h1>
      <ExpenseForm expense={expense} />
    </div>
  );
}

export default function NuevoGastoPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-400">Cargando...</div>}>
      <NuevoGastoContent />
    </Suspense>
  );
}
