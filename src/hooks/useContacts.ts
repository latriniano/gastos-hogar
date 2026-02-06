import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Contact } from '../lib/types';

export function useContacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const fetchContacts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('name');

            if (error) throw error;
            setContacts(data || []);
        } catch (err: any) {
            console.error('Error fetching contacts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const addContact = async (name: string, type: 'person' | 'business' = 'person') => {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .insert([{ name, type }])
                .select()
                .single();

            if (error) throw error;
            setContacts((prev) => [...prev, data]);
            return data;
        } catch (err: any) {
            console.error('Error adding contact:', err);
            throw err;
        }
    };

    const deleteContact = async (id: string) => {
        try {
            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setContacts((prev) => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error('Error deleting contact:', err);
            throw err;
        }
    }

    return { contacts, loading, error, addContact, deleteContact, refreshContacts: fetchContacts };
}
