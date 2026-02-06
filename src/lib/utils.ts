export function formatCurrency(amount: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  if (currency === 'USD') {
    return `US$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSplit(percentage: number): string {
  const other = 100 - percentage;
  return `${percentage}/${other}`;
}

export function calculateSplitAmounts(
  amount: number,
  currency: 'ARS' | 'USD',
  exchangeRate: number,
  splitPercentage: number
): { user1Amount: number; user2Amount: number } {
  const finalAmount = currency === 'USD' ? amount * exchangeRate : amount;
  const user1Amount = finalAmount * (splitPercentage / 100);
  const user2Amount = finalAmount - user1Amount;
  return { user1Amount, user2Amount };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
