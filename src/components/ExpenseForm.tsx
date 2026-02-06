'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Expense } from '@/lib/types';
import { useCategories } from '@/hooks/useCategories';
import { useBalance } from '@/hooks/useBalance';
import { useExpenses } from '@/hooks/useExpenses';
import { useContacts } from '@/hooks/useContacts';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { createClient } from '@/lib/supabase';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import CategoryPicker from '@/components/CategoryPicker';

interface ExpenseFormProps {
  expense?: Expense;
}

export default function ExpenseForm({ expense }: ExpenseFormProps) {
  const router = useRouter();
  const { categories } = useCategories();
  const { users } = useBalance();
  const { createExpense, updateExpense } = useExpenses();
  const { createRecurring } = useRecurringExpenses();
  const { contacts, addContact } = useContacts();
  const supabase = createClient();

  const [userId, setUserId] = useState('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, [supabase]);

  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [categoryId, setCategoryId] = useState(expense?.category_id || '');
  const [paidBy, setPaidBy] = useState(expense?.paid_by || '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(expense?.currency || 'ARS');
  // ... (keep other states)
  const [exchangeRate, setExchangeRate] = useState(expense?.exchange_rate?.toString() || '1');
  const [splitPercentage, setSplitPercentage] = useState<number | null>(expense?.split_percentage ?? null);
  const [isCustomSplit, setIsCustomSplit] = useState(expense?.split_percentage !== null && expense?.split_percentage !== 50);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'contact_debt'>(expense?.payment_method || 'cash');
  const [installments, setInstallments] = useState(expense?.installments?.toString() || '1');

  const [selectedDebtors, setSelectedDebtors] = useState<{ id: string, name: string }[]>([]);
  const [isDebtSettlement, setIsDebtSettlement] = useState(expense?.is_debt_settlement || false);
  const [isRecurring, setIsRecurring] = useState(false);

  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(expense?.notes || '');
  const [showNotes, setShowNotes] = useState(!!expense?.notes);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Contact search states
  const [contactSearch, setContactSearch] = useState('');
  const [contactName, setContactName] = useState(''); // Stores the final selected name
  const [showContactOptions, setShowContactOptions] = useState(false);

  // Initialize debtors when editing
  useEffect(() => {
    if (expense) {
      const initialDebtors: { id: string, name: string }[] = [];

      // 1. Check for new debtors array
      if (expense.debtors && expense.debtors.length > 0) {
        expense.debtors.forEach(d => {
          initialDebtors.push({ id: d.contact_id, name: d.contact?.name || 'Unknown' });
        });
      }
      // 2. Fallback to legacy contact_id
      else if (expense.contact_id) {
        // We need to find the name from contacts list if not available
        // But contacts might not be loaded yet. We can try finding in contacts list.
        const c = contacts.find(c => c.id === expense.contact_id);
        if (c) {
          initialDebtors.push({ id: c.id, name: c.name });
        }
      }

      // Only set if we found something and haven't touched it yet
      if (initialDebtors.length > 0 && selectedDebtors.length === 0) {
        setSelectedDebtors(initialDebtors);
      }
    }
  }, [expense, contacts]); // Removed selectedDebtors dependency to avoid overwrite loop if careful, but adding it might be safer to strictly init. 
  // Actually, better to run this once or when expense/contacts change, but guard against overwriting user changes?
  // Simply: run when contacts load if we have expense.

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) &&
    !selectedDebtors.some(d => d.id === c.id) // Exclude already selected
  );

  useEffect(() => {
    if (users.length > 0 && !paidBy) {
      setPaidBy(users[0].id);
    }
  }, [users, paidBy]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Ingresa un monto valido';
    if (!description.trim()) newErrors.description = 'Ingresa una descripcion';
    if (!categoryId) newErrors.category = 'Selecciona una categoria';
    if (!paidBy) newErrors.paidBy = 'Selecciona quien pago';
    if (currency === 'USD' && (!exchangeRate || parseFloat(exchangeRate) <= 0)) {
      newErrors.exchangeRate = 'Ingresa la cotizacion';
    }
    if (paymentMethod === 'credit_card' && (!installments || parseInt(installments) < 1)) {
      newErrors.installments = 'Ingresa la cantidad de cuotas';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // ensure we have userId if needed for recursion, though existing expense just needs paidBy from form state
    // but creating recursion needs a 'paid_by' which we can use 'paidBy' state.

    setSaving(true);
    try {
      let receiptUrl = expense?.receipt_url || null;

      if (receiptFile) {
        const fileName = `${Date.now()}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
          receiptUrl = urlData.publicUrl;
        }
      }

      const expenseData = {
        amount: parseFloat(amount),
        description: description.trim(),
        category_id: categoryId,
        paid_by: paidBy,
        currency,
        exchange_rate: currency === 'USD' ? parseFloat(exchangeRate) : 1,
        split_percentage: isCustomSplit ? splitPercentage : null,
        date,
        notes: notes.trim() || null,
        receipt_url: receiptUrl,
        is_recurring: false,
        recurring_id: null,
        payment_method: paymentMethod,
        installments: paymentMethod === 'credit_card' ? parseInt(installments) : 1,
        is_debt_settlement: isDebtSettlement,
        debtors: selectedDebtors.map(d => ({
          contact_id: d.id,
          contact: { id: d.id, name: d.name, type: 'person' as const, created_at: '' }, // Mock contact object for type satisfaction
          is_paid: false
        }))
      };

      if (expense) {
        await updateExpense(expense.id, expenseData);
      } else {
        await createExpense(expenseData);
      }

      if (isRecurring) {
        const nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + 1);

        await createRecurring({
          description: description,
          amount: parseFloat(amount),
          currency: currency,
          category_id: categoryId,
          paid_by: paidBy, // Use the selected payer
          frequency: 'monthly',
          start_date: date,
          next_due_date: nextDate.toISOString().split('T')[0],
          active: true,
          split_percentage: null
        });
      }

      router.push('/gastos');
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setCurrency('ARS')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${currency === 'ARS' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
                }`}
            >
              ARS
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
                }`}
            >
              USD
            </button>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
            className="text-2xl font-bold"
          />
        </div>
      </div>

      {currency === 'USD' && (
        <Input
          label="Cotizacion (1 USD = X ARS)"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={exchangeRate}
          onChange={(e) => setExchangeRate(e.target.value)}
          error={errors.exchangeRate}
        />
      )}

      <Input
        label="Descripcion"
        placeholder="Ej: Compra en Coto"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
        <CategoryPicker
          categories={categories}
          selectedId={categoryId}
          onSelect={(cat) => setCategoryId(cat.id)}
        />
        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quien pago?</label>
        <div className="flex gap-2">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setPaidBy(user.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border-2 ${paidBy === user.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-600'
                }`}
            >
              {user.name}
            </button>
          ))}
        </div>
        {errors.paidBy && <p className="mt-1 text-sm text-red-600">{errors.paidBy}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Medio de Pago</label>
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap px-3 ${paymentMethod === 'cash'
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600'
              }`}
          >
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('debit_card')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap px-3 ${paymentMethod === 'debit_card'
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600'
              }`}
          >
            Debito
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('credit_card')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap px-3 ${paymentMethod === 'credit_card'
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600'
              }`}
          >
            Credito
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('contact_debt')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap px-3 ${paymentMethod === 'contact_debt'
              ? 'border-purple-500 bg-purple-50 text-purple-700'
              : 'border-gray-200 bg-white text-gray-600'
              }`}
          >
            Deuda (Otro Pagó)
          </button>
        </div>

        {paymentMethod === 'credit_card' && (
          <Input
            label="Cantidad de Cuotas"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            error={errors.installments}
          />
        )}
      </div>

      <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setIsRecurring(!isRecurring)}>
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isRecurring ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
          {isRecurring && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-blue-900 cursor-pointer select-none block">
            Debito Automatico Mensual
          </label>
          <span className="block text-xs text-blue-600/80 font-normal mt-0.5">
            Se creara este mismo gasto todos los meses automaticamente.
          </span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl space-y-3">
        <label className="block text-sm font-medium text-gray-700">Asignar a Contacto / Deuda</label>

        <div className="relative">
          <input
            type="text"
            placeholder="Buscar o crear nuevo contacto..."
            value={contactSearch}
            onChange={(e) => {
              setContactSearch(e.target.value);
            }}
            onFocus={() => setShowContactOptions(true)}
            onBlur={() => setTimeout(() => setShowContactOptions(false), 200)}
            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />

          {showContactOptions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-gray-500 italic border-b border-gray-100"
                onClick={() => {
                  setSelectedDebtors([]);
                  setContactSearch('');
                  setContactName('');
                  setShowContactOptions(false);
                }}
              >
                Limpiar seleccion
              </div>

              {filteredContacts.map(c => (
                <div
                  key={c.id}
                  className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-gray-700"
                  onClick={() => {
                    setSelectedDebtors(prev => [...prev, { id: c.id, name: c.name }]);
                    setContactSearch('');
                    // Keep open or close? Close usually better.
                    setShowContactOptions(false);
                  }}
                >
                  {c.name}
                </div>
              ))}

              {contactSearch && !contacts.some(c => c.name.toLowerCase() === contactSearch.toLowerCase()) && (
                <div
                  className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-indigo-600 font-medium border-t border-gray-100"
                  onClick={async () => {
                    try {
                      const newContact = await addContact(contactSearch);
                      if (newContact) {
                        setSelectedDebtors(prev => [...prev, { id: newContact.id, name: newContact.name }]);
                        setContactSearch('');
                        setShowContactOptions(false);
                      }
                    } catch (err) {
                      console.error("Error creating contact", err);
                    }
                  }}
                >
                  + Crear "{contactSearch}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Debtors Chips */}
        {selectedDebtors.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedDebtors.map(d => (
              <div key={d.id} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                <span>{d.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDebtors(prev => prev.filter(p => p.id !== d.id))}
                  className="hover:text-indigo-900 focus:outline-none"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedDebtors.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="isDebtSettlement"
              checked={isDebtSettlement}
              onChange={(e) => setIsDebtSettlement(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isDebtSettlement" className="text-sm text-gray-600">
              Es un pago para saldar deuda?
            </label>
          </div>
        )}
      </div>

      {/* Hidden Split Logic - kept for legacy or if needed explicitly, but deprioritized */}
      <div className="hidden">
        {/* Legacy Split Code if needed to be restored */}
      </div>

      <Input
        label="Fecha"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante (opcional)</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
      </div>

      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="text-sm text-indigo-600 font-medium"
        >
          + Agregar notas
        </button>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Notas adicionales..."
          />
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving ? 'Guardando...' : expense ? 'Actualizar Gasto' : 'Guardar Gasto'}
      </Button>
    </form>
  );
}
