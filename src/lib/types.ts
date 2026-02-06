export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

// ... (User interface remains same)

export interface Contact {
  id: string;
  name: string;
  type: 'person' | 'business' | 'other';
  created_at: string;
  user_id?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  default_split_percentage: number;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  exchange_rate: number;
  category_id: string;
  category?: Category;
  paid_by: string;
  paid_by_user?: User;
  split_percentage: number | null;
  date: string;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_id: string | null;
  notes: string | null;

  // Installments & Personal Finance fields
  installments: number; // e.g., 1
  installment_number?: number; // e.g., 1
  installments_total?: number; // e.g., 12
  group_id?: string; // Common ID to link monthly records

  // Debt / Contacts
  contact_id?: string;
  contact?: Contact;
  is_debt_settlement?: boolean;
  debtors?: {
    contact_id: string;
    contact: Contact;
    amount?: number;
    is_paid: boolean;
  }[];

  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'contact_debt';
  created_at: string;
  updated_at: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  currency: 'ARS' | 'USD';
  category_id: string;
  category?: Category;
  paid_by: string;
  paid_by_user?: User;
  split_percentage: number | null;
  frequency: 'monthly' | 'weekly';
  start_date: string;
  next_due_date: string;
  active: boolean;
  created_at: string;
}

export interface Settlement {
  id: string;
  paid_by: string;
  paid_by_user?: User;
  paid_to: string;
  paid_to_user?: User;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface BalanceResult {
  amount: number;
  debtor: User | null;
  creditor: User | null;
  isSettled: boolean;
}

export interface CategorySummary {
  category: Category;
  total: number;
  user1_paid: number;
  user2_paid: number;
  user1_owes: number;
  user2_owes: number;
}
