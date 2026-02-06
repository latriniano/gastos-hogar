'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { RecurringExpense } from '@/lib/types';

export function useRecurringExpenses() {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchRecurring = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*, category:categories(*), paid_by_user:users!recurring_expenses_paid_by_fkey(*)')
      .order('next_due_date');

    if (error) {
      console.error('Error fetching recurring expenses:', error);
    } else {
      setRecurringExpenses(data as RecurringExpense[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const createRecurring = async (recurring: Omit<RecurringExpense, 'id' | 'created_at' | 'category' | 'paid_by_user'>) => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(recurring)
      .select()
      .single();

    if (error) throw error;
    await fetchRecurring();
    return data;
  };

  const updateRecurring = async (id: string, updates: Partial<RecurringExpense>) => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchRecurring();
    return data;
  };

  const deleteRecurring = async (id: string) => {
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
    if (error) throw error;
    await fetchRecurring();
  };

  const generateDueExpenses = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: dueExpenses, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('active', true)
      .lte('next_due_date', today);

    if (error || !dueExpenses?.length) return [];

    const generated: string[] = [];

    for (const recurring of dueExpenses) {
      const { error: insertError } = await supabase.from('expenses').insert({
        description: recurring.description,
        amount: recurring.amount,
        currency: recurring.currency,
        category_id: recurring.category_id,
        paid_by: recurring.paid_by,
        split_percentage: recurring.split_percentage,
        date: recurring.next_due_date,
        is_recurring: true,
        recurring_id: recurring.id,
      });

      if (!insertError) {
        generated.push(recurring.description);

        const nextDate = new Date(recurring.next_due_date);
        if (recurring.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else {
          nextDate.setDate(nextDate.getDate() + 7);
        }

        await supabase
          .from('recurring_expenses')
          .update({ next_due_date: nextDate.toISOString().split('T')[0] })
          .eq('id', recurring.id);
      }
    }

    await fetchRecurring();
    return generated;
  }, [supabase, fetchRecurring]);

  return {
    recurringExpenses,
    loading,
    refetch: fetchRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    generateDueExpenses,
  };
}
