'use client';

import { Expense } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/ui/Card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Edit2, Users, CreditCard, ArrowRightLeft } from 'lucide-react';
import { LucideIcon } from '@/components/LucideIcon';

interface ExpenseCardProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}

export default function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  // Personal Finance View: focus on Description, Amount, Date.
  // Secondary: Installments, Contact, Payment Method.

  return (
    <Card padding="sm" className="flex items-center gap-3">
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${expense.is_debt_settlement ? 'bg-green-100' : 'bg-indigo-100'
        }`}>
        {expense.is_debt_settlement ? (
          <ArrowRightLeft className="w-5 h-5 text-green-600" />
        ) : (
          <LucideIcon name={expense.category?.icon || 'package'} className="w-5 h-5 text-indigo-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{expense.description}</p>
        <div className="flex items-center flex-wrap gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            {(() => {
              const [y, m, d] = expense.date.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              return format(dateObj, 'd MMM', { locale: es });
            })()}
          </span>

          {expense.installments_total && expense.installments_total > 1 && (
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Cuota {expense.installment_number}/{expense.installments_total}
            </span>
          )}

          {/* Multiple Debtors Display */}
          {expense.debtors && expense.debtors.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {expense.debtors.map(d => (
                <span key={d.contact_id} className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {d.contact?.name}
                </span>
              ))}
            </div>
          ) : expense.contact ? (
            // Legacy single contact support
            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Users className="w-3 h-3" />
              {expense.is_debt_settlement ? 'Pago a ' : ''}{expense.contact.name}
            </span>
          ) : null}

          {expense.payment_method === 'contact_debt' && (
            <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
              Deuda
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className={`text-sm font-bold ${expense.payment_method === 'contact_debt' ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(expense.amount, expense.currency)}
          </p>
          {expense.currency === 'USD' && (
            <p className="text-[10px] text-gray-400">
              TC: {expense.exchange_rate}
            </p>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex flex-col gap-1 ml-1">
            {onEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Editar"
              >
                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(expense.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                aria-label="Borrar"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
