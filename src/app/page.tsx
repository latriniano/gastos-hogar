'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, CreditCard, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import ExpenseCard from '@/components/ExpenseCard';
import Card from '@/components/ui/Card';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type CurrencyCode = 'ARS' | 'USD';

export default function DashboardPage() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Fetch Current Month Expenses
  const { expenses: monthExpenses, loading: loadingMonth } = useExpenses({
    month: currentMonth,
    year: currentYear
  });

  // Fetch Recent for list
  const { expenses: recentExpenses, loading: loadingRecent } = useExpenses({ limit: 5 });

  // Fetch Debts for Current Month Only
  const { debts, loading: loadingDebts } = useDebts({
    month: currentMonth,
    year: currentYear
  });

  const { generateDueExpenses } = useRecurringExpenses();
  const [generatedExpenses, setGeneratedExpenses] = useState<string[]>([]);

  useEffect(() => {
    generateDueExpenses().then((generated) => {
      if (generated.length > 0) {
        setGeneratedExpenses(generated);
      }
    });
  }, [generateDueExpenses]);

  // Calculations
  const totalSpentARS = monthExpenses
    .filter(e => e.currency === 'ARS')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSpentUSD = monthExpenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amount, 0);

  const creditCardTotal = monthExpenses
    .filter(e => e.payment_method === 'credit_card')
    .reduce((sum, e) => sum + (e.currency === 'USD' ? e.amount * e.exchange_rate : e.amount), 0);
  // Credit card total usually is paid in ARS ultimately or shown as "Coming on statement". 
  // User might want this split too? For now, let's keep it aggregated or split if needed.
  // Usually credit card summaries in Argentina show USD and ARS separately. 
  // Let's stick to "Total Mes" requested change first.

  // Debts Summary
  const debtsByCurrency: Record<string, { owedToMe: number; owedByMe: number }> = {};

  debts.forEach(d => {
    Object.values(d.balances).forEach(b => {
      if (!debtsByCurrency[b.currency]) {
        debtsByCurrency[b.currency] = { owedToMe: 0, owedByMe: 0 };
      }
      debtsByCurrency[b.currency].owedToMe += b.owed_to_me;
      debtsByCurrency[b.currency].owedByMe += b.owed_by_me;
    });
  });

  const currencies = Object.keys(debtsByCurrency);
  const currentMonthName = format(now, 'MMMM', { locale: es });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 capitalize">{currentMonthName} {currentYear}</h1>
          <p className="text-sm text-gray-500">Resumen Financiero</p>
        </div>
      </header>

      {generatedExpenses.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700 font-medium">Gastos recurrentes generados:</p>
          <ul className="text-sm text-blue-600 mt-1">
            {generatedExpenses.map((name, i) => (
              <li key={i}>- {name}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <Wallet className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Total Mes</span>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSpentARS, 'ARS')}</p>
            {totalSpentUSD > 0 && (
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalSpentUSD, 'USD')}</p>
            )}
          </div>
        </Card>

        <Card className="bg-white border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <CreditCard className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Tarjeta</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(creditCardTotal)}</p>
        </Card>
      </div>

      {/* Debts Summary */}
      {
        currencies.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-green-50 border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">Me deben</span>
              </div>
              <div className="space-y-3">
                {/* Total per Currency */}
                <div className="space-y-1">
                  {currencies.map(curr => {
                    const amount = debtsByCurrency[curr].owedToMe;
                    if (amount <= 0) return null;
                    return (
                      <p key={curr} className="text-lg font-bold text-green-800">
                        {formatCurrency(amount, curr as CurrencyCode)}
                      </p>
                    );
                  })}
                  {currencies.every(c => debtsByCurrency[c].owedToMe <= 0) && (
                    <p className="text-sm text-green-800/50">$ 0</p>
                  )}
                </div>

                {/* Breakdown per Contact */}
                {Object.keys(debtsByCurrency).some(c => debtsByCurrency[c].owedToMe > 0) && (
                  <div className="pt-2 border-t border-green-200/50 space-y-1">
                    {debts.map(d => {
                      // Check if this contact owes anything in any currency
                      const owedCurrencies = Object.values(d.balances).filter(b => b.owed_to_me > 0);
                      if (owedCurrencies.length === 0) return null;

                      return (
                        <div key={d.contact.id} className="flex justify-between items-start text-xs text-green-700">
                          <span>{d.contact.name}</span>
                          <div className="text-right font-medium">
                            {owedCurrencies.map(b => (
                              <div key={b.currency}>
                                {formatCurrency(b.owed_to_me, b.currency as CurrencyCode)}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <Card className="bg-red-50 border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700 font-medium">Debo</span>
              </div>
              <div className="space-y-1">
                {currencies.map(curr => {
                  const amount = debtsByCurrency[curr].owedByMe;
                  if (amount <= 0) return null;
                  return (
                    <p key={curr} className="text-lg font-bold text-red-800">
                      {formatCurrency(amount, curr as CurrencyCode)}
                    </p>
                  );
                })}
                {currencies.every(c => debtsByCurrency[c].owedByMe <= 0) && (
                  <p className="text-sm text-red-800/50">$ 0</p>
                )}
              </div>
            </Card>
          </div>
        )
      }

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Ultimos movimientos</h2>
          <Link href="/gastos" className="text-xs text-indigo-600 font-medium">
            Ver todos
          </Link>
        </div>

        {loadingRecent ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <div className="h-12 bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        ) : recentExpenses.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-gray-400 text-sm">No hay gastos registrados</p>
            <Link href="/gastos/nuevo" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
              Registrar el primero
            </Link>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map(expense => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
          </div>
        )}
      </div>

      <Link
        href="/gastos/nuevo"
        className="fixed bottom-24 right-4 z-20 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors active:bg-indigo-800"
      >
        <Plus className="w-7 h-7 text-white" />
      </Link>
    </div >
  );
}
