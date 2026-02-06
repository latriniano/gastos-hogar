'use client';

import { useBalance } from '@/hooks/useBalance';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';

export default function BalanceSummary() {
  const { balance, loading } = useBalance();

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mt-2" />
      </Card>
    );
  }

  if (!balance) return null;

  return (
    <Card
      className={balance.isSettled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
    >
      {balance.isSettled ? (
        <div className="text-center">
          <p className="text-green-700 font-semibold text-lg">Estan a mano!</p>
          <p className="text-green-600 text-sm mt-1">No hay deudas pendientes</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-red-700 text-sm">
            {balance.debtor?.name} le debe a {balance.creditor?.name}
          </p>
          <p className="text-red-800 font-bold text-2xl mt-1">
            {formatCurrency(balance.amount)}
          </p>
        </div>
      )}
    </Card>
  );
}
