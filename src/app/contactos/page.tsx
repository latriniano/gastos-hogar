'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useContacts } from '@/hooks/useContacts';
import { useDebts } from '@/hooks/useDebts';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, User as UserIcon } from 'lucide-react';

export default function ContactosPage() {
    const { contacts, loading: loadingContacts, addContact, deleteContact } = useContacts();
    const { debts, loading: loadingDebts } = useDebts();
    const [newContactName, setNewContactName] = useState('');
    const [adding, setAdding] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContactName.trim()) return;

        setAdding(true);
        try {
            await addContact(newContactName.trim());
            setNewContactName('');
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Estas seguro?')) return;
        await deleteContact(id);
    }

    const getDebtInfo = (contactId: string) => {
        return debts.find(d => d.contact.id === contactId);
    };

    if (loadingContacts || loadingDebts) return <div className="p-4">Cargando...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-900">Contactos y Deudas</h1>

            {/* Add New Contact */}
            <Card>
                <form onSubmit={handleAdd} className="flex gap-2">
                    <Input
                        placeholder="Nombre del contacto"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={adding || !newContactName.trim()}>
                        <Plus className="w-5 h-5" />
                    </Button>
                </form>
            </Card>

            {/* Contacts List */}
            <div className="space-y-3">
                {contacts.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No tienes contactos registrados.</p>
                ) : (
                    contacts.map(contact => {
                        const debt = getDebtInfo(contact.id);
                        const balances = debt ? Object.values(debt.balances) : [];
                        const hasDebt = balances.some(b => b.net_balance !== 0);

                        return (
                            <Card key={contact.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{contact.name}</p>

                                        {!hasDebt ? (
                                            <p className="text-xs text-gray-400">Al dia</p>
                                        ) : (
                                            <div className="flex flex-col">
                                                {balances.map(b => {
                                                    if (b.net_balance === 0) return null;
                                                    const owesMe = b.net_balance > 0;
                                                    return (
                                                        <p key={b.currency} className={`text-xs font-medium ${owesMe ? 'text-green-600' : 'text-red-600'}`}>
                                                            {owesMe ? 'Me debe' : 'Le debo'} {formatCurrency(Math.abs(b.net_balance), b.currency as 'ARS' | 'USD')}
                                                        </p>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(contact.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
