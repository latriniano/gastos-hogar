'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Category } from '@/lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data as Category[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (category: { name: string; icon: string; default_split_percentage: number }) => {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    await fetchCategories();
    return data;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchCategories();
    return data;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    await fetchCategories();
  };

  return { categories, loading, refetch: fetchCategories, createCategory, updateCategory, deleteCategory };
}
