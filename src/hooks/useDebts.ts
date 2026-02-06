import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Contact, Expense } from '@/lib/types';
import { useContacts } from './useContacts';

export interface DebtBalance {
    currency: string;
    owed_by_me: number;
    owed_to_me: number;
    net_balance: number;
}

export interface DebtSummary {
    contact: Contact;
    balances: Record<string, DebtBalance>; // Keyed by currency code (e.g. 'ARS', 'USD')
    // Helpers for backward compat or easy access if needed, but UI should iterate balances
}

interface UseDebtsOptions {
    month?: number;
    year?: number;
}

export function useDebts(options: UseDebtsOptions = {}) {
    const [debts, setDebts] = useState<DebtSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const { contacts, loading: contactsLoading } = useContacts();
    const supabase = createClient();

    const calculateDebts = useCallback(async () => {
        if (contactsLoading) return;
        setLoading(true);

        let query = supabase
            .from('expenses')
            .select('*, debtors:expense_debtors!inner(*)') // !inner filters to only those with debtors
            .order('date', { ascending: false });

        if (options.month !== undefined && options.year !== undefined) {
            const startDate = new Date(options.year, options.month, 1).toISOString().split('T')[0];
            const endDate = new Date(options.year, options.month + 1, 0).toISOString().split('T')[0];
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data: expenses, error } = await query;

        if (error) {
            console.error('Error fetching debt expenses:', error);
            setLoading(false);
            return;
        }

        const summaryMap = new Map<string, DebtSummary>();

        // Initialize map
        contacts.forEach(c => {
            summaryMap.set(c.id, {
                contact: c,
                balances: {}
            });
        });

        expenses?.forEach((e: any) => {
            const currency = e.currency || 'ARS';

            // 1. Handle Legacy Single Contact
            if (e.contact_id && (!e.debtors || e.debtors.length === 0)) {
                const summary = summaryMap.get(e.contact_id);
                if (summary) {
                    if (!summary.balances[currency]) {
                        summary.balances[currency] = { currency, owed_by_me: 0, owed_to_me: 0, net_balance: 0 };
                    }
                    const amount = e.amount;
                    if (e.is_debt_settlement) {
                        summary.balances[currency].owed_by_me -= amount;
                    } else if (e.payment_method === 'contact_debt') {
                        summary.balances[currency].owed_by_me += amount;
                    } else {
                        summary.balances[currency].owed_to_me += amount;
                    }
                }
            }

            // 2. Handle Multiple Debtors
            if (e.debtors && e.debtors.length > 0) {
                // If amount is not specified per debtor, we split equally among debtors + payer (roughly)
                // But typically "Gasto Compartido" means:
                // Total = $3000. 3 People (Me + A + B). 
                // Expense Debtors would list A and B.
                // If I paid, A owes me 1000, B owes me 1000. My cost is 1000.
                // Split logic: Total / (Debtors.length + 1) -> Assuming I am one of the people splitting.

                // If contact_debt (Someone else paid):
                // e.g. A paid $3000. Debtors list Me + B? Or just Me?
                // Logic: 
                // If I Paid: Each debtor owes me their share.
                // If Contact Paid (e.g. A): I owe A my share.
                // IMPORTANT: The system currently only allows selecting contacts as debtors.
                // If 'contact_debt', we assume the 'Legacy Contact' or 'First Debtor' is the payer?
                // For now, let's stick to standard flow: I paid, they owe me.

                // Standard flow: I paid.
                const totalParticipants = e.debtors.length + 1; // Me + Debtors
                const defaultSplitAmount = e.amount / totalParticipants;

                e.debtors.forEach((d: any) => {
                    const summary = summaryMap.get(d.contact_id);
                    if (summary) {
                        if (!summary.balances[currency]) {
                            summary.balances[currency] = { currency, owed_by_me: 0, owed_to_me: 0, net_balance: 0 };
                        }

                        // Calculate amount for this person
                        const shareAmount = d.amount || defaultSplitAmount;

                        if (e.is_debt_settlement) {
                            // Complex in multi-debtor, but usually specific to one person.
                            if (e.payment_method === 'contact_debt') {
                                // They paid everything using my money? Unlikely.
                                // Let's assume settlement is 1-on-1 usually.
                                summary.balances[currency].owed_by_me -= shareAmount;
                            } else {
                                // I paid to settle debt
                                summary.balances[currency].owed_by_me -= shareAmount;
                            }
                        } else if (e.payment_method === 'contact_debt') {
                            // They paid. I owe them my share? 
                            // Or they paid for everyone? 
                            // If Payment Method = Contact Debt (Other Paid), usually we select WHO paid.
                            // In this form, 'contact_debt' just says "Deuda".
                            // Ideally we know WHO paid. For now, if multiple debtors, it's ambiguous who "Deuda" refers to if we don't track payer_contact_id.
                            // Falling back to: If 'contact_debt', I owe this specific contact their share? No, that implies I paid.
                            // Let's assume for 'contact_debt' in multi-debtor is not fully supported yet or acts as "I owe each of them"?
                            // Let's treat 'contact_debt' as: I owe the CONTACT associated with the expense.
                            // But here we have multiple.

                            // Simplification: If I paid (default), they owe me.
                            summary.balances[currency].owed_to_me += shareAmount;
                        } else {
                            // I paid (Cash/Card/Etc). They each owe me their share.
                            summary.balances[currency].owed_to_me += shareAmount;
                        }
                    }
                });
            }
        });

        // Calculate Nets & Filter
        const results: DebtSummary[] = [];
        summaryMap.forEach(v => {
            let hasActivity = false;
            Object.values(v.balances).forEach(b => {
                b.net_balance = b.owed_to_me - b.owed_by_me;
                if (b.owed_by_me !== 0 || b.owed_to_me !== 0) hasActivity = true;
            });

            if (hasActivity) {
                results.push(v);
            }
        });

        setDebts(results);
        setLoading(false);
    }, [contacts, contactsLoading, supabase, options.month, options.year]);

    useEffect(() => {
        calculateDebts();
    }, [calculateDebts]);

    return { debts, loading: loading || contactsLoading, refetch: calculateDebts };
}
