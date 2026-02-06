'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Settlement } from '@/lib/types';

export function useSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settlements')
      .select('*, paid_by_user:users!settlements_paid_by_fkey(*), paid_to_user:users!settlements_paid_to_fkey(*)')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching settlements:', error);
    } else {
      setSettlements(data as Settlement[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const createSettlement = async (settlement: { paid_by: string; paid_to: string; amount: number; date: string; notes?: string }) => {
    const { data, error } = await supabase
      .from('settlements')
      .insert(settlement)
      .select()
      .single();

    if (error) throw error;
    await fetchSettlements();
    return data;
  };

  const deleteSettlement = async (id: string) => {
    const { error } = await supabase.from('settlements').delete().eq('id', id);
    if (error) throw error;
    await fetchSettlements();
  };

  return { settlements, loading, refetch: fetchSettlements, createSettlement, deleteSettlement };
}
