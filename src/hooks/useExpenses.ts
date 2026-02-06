'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Expense } from '@/lib/types';

interface UseExpensesOptions {
  month?: number;
  year?: number;
  categoryId?: string;
  paidBy?: string;
  search?: string;
  limit?: number;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('expenses')
      .select('*, category:categories(*), paid_by_user:users!expenses_paid_by_fkey(*), contact:contacts(*), debtors:expense_debtors(*, contact:contacts(*))')
      .order('date', { ascending: false });

    if (options.month !== undefined && options.year !== undefined) {
      const startDate = new Date(options.year, options.month, 1).toISOString().split('T')[0];
      const endDate = new Date(options.year, options.month + 1, 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    }

    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    if (options.paidBy) {
      query = query.eq('paid_by', options.paidBy);
    }

    if (options.search) {
      query = query.ilike('description', `%${options.search}%`);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      setExpenses(data as Expense[]);
    }
    setLoading(false);
  }, [options.month, options.year, options.categoryId, options.paidBy, options.search, options.limit, supabase]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'category' | 'paid_by_user'>) => {
    const expensesToInsert = [];
    const installments = expense.installments || 1;
    const totalAmount = expense.amount;
    const installmentAmount = parseFloat((totalAmount / installments).toFixed(2));
    const groupId = installments > 1 ? crypto.randomUUID() : null;

    // Create rows for each installment
    // Parse date parts to handle local time consistently without TZ shifts
    const [year, month, day] = expense.date.split('-').map(Number); // month is 1-based here

    for (let i = 0; i < installments; i++) {
      let dateStr = '';

      if (expense.payment_method === 'credit_card') {
        // Credit card payments start the 1st of the NEXT month
        const d = new Date(year, month + i, 1);

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${da}`;
      } else {
        // Cash/Debit: Use original date (though normally installments=1)
        const d = new Date(year, (month - 1) + i, day);

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${da}`;
      }

      expensesToInsert.push({
        ...expense,
        amount: installmentAmount,
        date: dateStr,
        description: installments > 1 ? `${expense.description} (Cuota ${i + 1}/${installments})` : expense.description,
        installment_number: installments > 1 ? i + 1 : null,
        installments_total: installments > 1 ? installments : null,
        group_id: groupId,
        contact_id: expense.contact_id || null, // Ensure explicitly null if undefined
        is_debt_settlement: expense.is_debt_settlement || false
      });
    }

    // Fix rounding difference in the last installment
    if (installments > 1) {
      const totalSplit = installmentAmount * installments;
      const diff = totalAmount - totalSplit;
      if (Math.abs(diff) > 0.001) { // Floating point comparison
        expensesToInsert[expensesToInsert.length - 1].amount = parseFloat((expensesToInsert[expensesToInsert.length - 1].amount + diff).toFixed(2));
      }
    }

    const { data: createdExpenses, error } = await supabase
      .from('expenses')
      .insert(expensesToInsert)
      .select();

    if (error) throw error;

    // Handle Debtors (Multiple Contacts)
    if (expense.debtors && expense.debtors.length > 0 && createdExpenses) {
      const debtorsToInsert: any[] = [];
      createdExpenses.forEach((createdExp: any) => {
        expense.debtors?.forEach(debtor => {
          debtorsToInsert.push({
            expense_id: createdExp.id,
            contact_id: debtor.contact_id,
            amount: debtor.amount || null,
            is_paid: debtor.is_paid || false
          });
        });
      });

      if (debtorsToInsert.length > 0) {
        const { error: debtorsError } = await supabase
          .from('expense_debtors')
          .insert(debtorsToInsert);

        if (debtorsError) console.error('Error inserting debtors:', debtorsError);
      }
    }

    await fetchExpenses();
    return createdExpenses;
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    // Separate primary updates from debtors updates
    const { debtors, ...expenseUpdates } = updates;

    const { data, error } = await supabase
      .from('expenses')
      .update({ ...expenseUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Handle Debtors Update
    if (debtors !== undefined) {
      // 1. Delete existing debtors
      await supabase.from('expense_debtors').delete().eq('expense_id', id);

      // 2. Insert new list
      if (debtors.length > 0) {
        const debtorsToInsert = debtors.map(d => ({
          expense_id: id,
          contact_id: d.contact_id,
          amount: d.amount || null,
          is_paid: d.is_paid || false
        }));

        const { error: debtorsError } = await supabase
          .from('expense_debtors')
          .insert(debtorsToInsert);

        if (debtorsError) console.error('Error updating debtors:', debtorsError);
      }
    }

    await fetchExpenses();
    return data;
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    await fetchExpenses();
  };

  return { expenses, loading, refetch: fetchExpenses, createExpense, updateExpense, deleteExpense };
}
