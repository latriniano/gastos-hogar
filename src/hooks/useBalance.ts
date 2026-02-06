'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { BalanceResult, User } from '@/lib/types';

export function useBalance() {
  const [balance, setBalance] = useState<BalanceResult | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const calculateBalance = useCallback(async () => {
    setLoading(true);

    const [usersRes, expensesRes, settlementsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('expenses').select('*, category:categories(default_split_percentage)'),
      supabase.from('settlements').select('*'),
    ]);

    if (usersRes.error || expensesRes.error || settlementsRes.error) {
      console.error('Error calculating balance');
      setLoading(false);
      return;
    }

    const allUsers = usersRes.data as User[];
    setUsers(allUsers);

    if (allUsers.length < 2) {
      setBalance({ amount: 0, debtor: null, creditor: null, isSettled: true });
      setLoading(false);
      return;
    }

    const user1 = allUsers[0];
    const user2 = allUsers[1];

    let user1Debe = 0;
    let user2Debe = 0;

    for (const expense of expensesRes.data) {
      if (new Date(expense.date) > new Date()) continue; // Skip future expenses

      const finalAmount = expense.currency === 'USD'
        ? expense.amount * expense.exchange_rate
        : expense.amount;

      const split = expense.split_percentage ?? expense.category?.default_split_percentage ?? 50;
      const correspondeUser1 = finalAmount * (split / 100);
      const correspondeUser2 = finalAmount - correspondeUser1;

      if (expense.paid_by === user1.id) {
        user2Debe += correspondeUser2;
      } else if (expense.paid_by === user2.id) {
        user1Debe += correspondeUser1;
      }
    }

    let balanceAmount = user1Debe - user2Debe;

    for (const settlement of settlementsRes.data) {
      if (settlement.paid_by === user1.id && settlement.paid_to === user2.id) {
        balanceAmount -= settlement.amount;
      } else if (settlement.paid_by === user2.id && settlement.paid_to === user1.id) {
        balanceAmount += settlement.amount;
      }
    }

    if (balanceAmount > 0) {
      setBalance({ amount: balanceAmount, debtor: user1, creditor: user2, isSettled: false });
    } else if (balanceAmount < 0) {
      setBalance({ amount: Math.abs(balanceAmount), debtor: user2, creditor: user1, isSettled: false });
    } else {
      setBalance({ amount: 0, debtor: null, creditor: null, isSettled: true });
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    calculateBalance();
  }, [calculateBalance]);

  return { balance, users, loading, refetch: calculateBalance };
}
