'use client';

import { useState } from 'react';
import BalanceSummary from '@/components/BalanceSummary';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useBalance } from '@/hooks/useBalance';
import { useSettlements } from '@/hooks/useSettlements';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';

export default function LiquidarPage() {
  const { balance, refetch: refetchBalance } = useBalance();
  const { settlements, loading, createSettlement, deleteSettlement } = useSettlements();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSettle = async () => {
    if (!balance || balance.isSettled || !amount || parseFloat(amount) <= 0) return;

    setSaving(true);
    try {
      await createSettlement({
        paid_by: balance.debtor!.id,
        paid_to: balance.creditor!.id,
        amount: parseFloat(amount),
        date,
        notes: notes.trim() || undefined,
      });
      setAmount('');
      setNotes('');
      await refetchBalance();
    } catch (err) {
      console.error('Error creating settlement:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminar esta liquidacion?')) {
      await deleteSettlement(id);
      await refetchBalance();
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Liquidar</h1>

      <BalanceSummary />

      {balance && !balance.isSettled && (
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrar Pago</h2>
          <div className="space-y-3">
            <div className="text-center text-sm text-gray-500">
              {balance.debtor?.name} paga a {balance.creditor?.name}
            </div>
            <Input
              label="Monto"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder={balance.amount.toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setAmount(balance.amount.toFixed(2))}
              className="text-xs text-indigo-600 font-medium"
            >
              Usar monto total: {formatCurrency(balance.amount)}
            </button>
            <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Transferencia bancaria" />
            <Button onClick={handleSettle} className="w-full" disabled={saving}>
              {saving ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Historial de Liquidaciones</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse"><div className="h-12 bg-gray-100 rounded" /></Card>
            ))}
          </div>
        ) : settlements.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-400 text-sm">No hay liquidaciones registradas</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {settlements.map(settlement => (
              <Card key={settlement.id} padding="sm" className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {settlement.paid_by_user?.name} pago a {settlement.paid_to_user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(settlement.date), 'd MMM yyyy', { locale: es })}
                    {settlement.notes && ` - ${settlement.notes}`}
                  </p>
                </div>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(settlement.amount)}</p>
                <button onClick={() => handleDelete(settlement.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
