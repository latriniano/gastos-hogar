'use client';

import { useState } from 'react';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useCategories } from '@/hooks/useCategories';
import { useBalance } from '@/hooks/useBalance';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import CategoryPicker from '@/components/CategoryPicker';
import { LucideIcon } from '@/components/LucideIcon';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function GastosFijosPage() {
  const { recurringExpenses, loading, createRecurring, updateRecurring, deleteRecurring } = useRecurringExpenses();
  const { categories } = useCategories();
  const { users } = useBalance();
  const [showCreate, setShowCreate] = useState(false);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [categoryId, setCategoryId] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCurrency('ARS');
    setCategoryId('');
    setPaidBy(users[0]?.id || '');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleCreate = async () => {
    if (!description.trim() || !amount || !categoryId || !paidBy) return;
    await createRecurring({
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      category_id: categoryId,
      paid_by: paidBy,
      split_percentage: null,
      frequency,
      start_date: startDate,
      next_due_date: startDate,
      active: true,
    });
    setShowCreate(false);
    resetForm();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await updateRecurring(id, { active: !active });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminar este gasto fijo?')) {
      await deleteRecurring(id);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Gastos Fijos</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse"><div className="h-16 bg-gray-100 rounded" /></Card>
          ))}
        </div>
      ) : recurringExpenses.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-400 text-sm">No hay gastos fijos configurados</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {recurringExpenses.map(rec => (
            <Card key={rec.id} padding="sm" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={rec.category?.icon || 'package'} className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{rec.description}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rec.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {rec.active ? 'Activo' : 'Pausado'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {formatCurrency(rec.amount, rec.currency)} | Proximo: {format(new Date(rec.next_due_date), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleActive(rec.id, rec.active)}>
                  {rec.active ? 'Pausar' : 'Activar'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} className="text-red-500">
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button onClick={() => { resetForm(); setShowCreate(true); }} className="w-full">+ Nuevo Gasto Fijo</Button>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Gasto Fijo">
        <div className="space-y-4">
          <Input label="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Alquiler" />
          <div className="flex gap-2">
            <div className="flex rounded-xl border border-gray-300 overflow-hidden">
              <button type="button" onClick={() => setCurrency('ARS')} className={`px-3 py-2 text-sm font-medium ${currency === 'ARS' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>ARS</button>
              <button type="button" onClick={() => setCurrency('USD')} className={`px-3 py-2 text-sm font-medium ${currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>USD</button>
            </div>
            <Input type="number" inputMode="decimal" step="0.01" placeholder="Monto" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <CategoryPicker categories={categories} selectedId={categoryId} onSelect={(cat) => setCategoryId(cat.id)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quien paga?</label>
            <div className="flex gap-2">
              {users.map(user => (
                <button key={user.id} type="button" onClick={() => setPaidBy(user.id)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 ${paidBy === user.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                  {user.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFrequency('monthly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 ${frequency === 'monthly' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600'}`}>Mensual</button>
            <button type="button" onClick={() => setFrequency('weekly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 ${frequency === 'weekly' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600'}`}>Semanal</button>
          </div>
          <Input label="Fecha de inicio" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Button onClick={handleCreate} className="w-full">Crear Gasto Fijo</Button>
        </div>
      </Modal>
    </div>
  );
}
