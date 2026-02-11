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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    let query = supabase
      .from('expenses')
      .select('*, category:categories(*), paid_by_user:users!expenses_paid_by_fkey(*), contact:contacts(*), debtors:expense_debtors(*, contact:contacts(*))')
      .order('date', { ascending: false });

    if (options.month !== undefined && options.year !== undefined) {
      // Build date strings directly to avoid timezone issues with toISOString()
      const startDate = `${options.year}-${String(options.month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(options.year, options.month + 1, 0).getDate();
      const endDate = `${options.year}-${String(options.month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
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
      setFetchError(error.message || 'Error al cargar gastos');
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
    const numInstallments = expense.installments || 1;
    const totalAmount = expense.amount;
    const installmentAmount = parseFloat((totalAmount / numInstallments).toFixed(2));
    const groupId = numInstallments > 1 ? crypto.randomUUID() : null;

    // Create rows for each installment
    // Parse date parts to handle local time consistently without TZ shifts
    const [year, month, day] = expense.date.split('-').map(Number); // month is 1-based here

    for (let i = 0; i < numInstallments; i++) {
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

      // Explicitly list only valid DB columns — never spread the expense object
      // to avoid sending relation/virtual fields (debtors, category, contact, etc.)
      expensesToInsert.push({
        description: numInstallments > 1 ? `${expense.description} (Cuota ${i + 1}/${numInstallments})` : expense.description,
        amount: installmentAmount,
        currency: expense.currency,
        exchange_rate: expense.exchange_rate,
        category_id: expense.category_id,
        paid_by: expense.paid_by,
        split_percentage: expense.split_percentage ?? null,
        date: dateStr,
        receipt_url: expense.receipt_url ?? null,
        is_recurring: expense.is_recurring ?? false,
        recurring_id: expense.recurring_id ?? null,
        notes: expense.notes ?? null,
        payment_method: expense.payment_method,
        installments: expense.installments || 1,
        installment_number: numInstallments > 1 ? i + 1 : null,
        installments_total: numInstallments > 1 ? numInstallments : null,
        group_id: groupId,
        contact_id: expense.contact_id || null,
        is_debt_settlement: expense.is_debt_settlement || false,
      });
    }

    // Fix rounding difference in the last installment
    if (numInstallments > 1) {
      const totalSplit = installmentAmount * numInstallments;
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

    return createdExpenses;
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    // Explicitly pick only valid DB columns to avoid sending relation/virtual fields
    const expenseUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    const dbColumns = [
      'description', 'amount', 'currency', 'exchange_rate', 'category_id',
      'paid_by', 'split_percentage', 'date', 'receipt_url', 'is_recurring',
      'recurring_id', 'notes', 'payment_method', 'installments',
      'installment_number', 'installments_total', 'group_id', 'contact_id',
      'is_debt_settlement',
    ] as const;
    for (const col of dbColumns) {
      if (col in updates) {
        expenseUpdates[col] = (updates as any)[col];
      }
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(expenseUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Handle Debtors Update
    if (updates.debtors !== undefined) {
      // 1. Delete existing debtors
      await supabase.from('expense_debtors').delete().eq('expense_id', id);

      // 2. Insert new list
      if (updates.debtors.length > 0) {
        const debtorsToInsert = updates.debtors.map((d: any) => ({
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

  return { expenses, loading, fetchError, refetch: fetchExpenses, createExpense, updateExpense, deleteExpense };
}
