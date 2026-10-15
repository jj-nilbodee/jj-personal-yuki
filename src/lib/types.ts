// Row shapes for supabase/migrations. Keep in sync when the schema changes.

export type AccountType = 'cash' | 'bank' | 'card' | 'e_wallet';
export type TxnType = 'expense' | 'income' | 'transfer';
/** Categories describe spending or income; transfers never have one. */
export type CategoryType = Exclude<TxnType, 'transfer'>;
export type TxnSource = 'manual' | 'qr' | 'ocr' | 'recurring';
export type TxnStatus = 'processing' | 'needs_review' | 'confirmed';
export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bank_code: string | null;
  archived: boolean;
  /** The account new entries start on. Exactly one per user, never hidden. */
  is_default: boolean;
  opening_balance: number;
}

/** Onboarding steps in order; profiles.onboarding_step is null once all are done. */
export const ONBOARDING_STEPS = ['name', 'account', 'salary', 'bills', 'budget'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface Profile {
  user_id: string;
  /** What Yuki calls the user at his touchpoints. */
  display_name: string | null;
  monthly_budget: number | null;
  onboarding_step: OnboardingStep | null;
}

/** Row from account_balances(). Negative on a credit card means money owed. */
export interface AccountBalance {
  id: string;
  name: string;
  type: AccountType;
  bank_code: string | null;
  archived: boolean;
  is_default: boolean;
  balance: number;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  is_default: boolean;
  archived: boolean;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  category_id: string | null;
  to_account_id: string | null; // transfers only
  recurring_rule_id: string | null;
  type: TxnType | null; // null on a slip draft until the user picks a direction
  amount: number | null;
  date: string; // YYYY-MM-DD, Bangkok local date
  merchant: string | null;
  note: string | null;
  status: TxnStatus;
  source: TxnSource;
  slip_path: string | null;
  bank_ref: string | null;
  sending_bank_code: string | null;
  extraction: Extraction | null;
  created_at: string;
}

export interface RecurringRule {
  id: string;
  type: TxnType;
  amount: number;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  merchant: string | null;
  note: string | null;
  frequency: Frequency;
  anchor_day: number;
  next_run_date: string;
  active: boolean;
}

export interface UpcomingRecurring {
  rule_id: string;
  due_date: string;
  type: TxnType;
  amount: number;
  merchant: string | null;
  note: string | null;
  category_id: string | null;
  account_id: string | null;
  to_account_id: string | null;
}

export interface CategoryTotal {
  id: string | null;
  name: string;
  icon: string;
  total: number;
  count: number;
}

export interface MonthSummary {
  month: string;
  income: number;
  expense: number;
  count: number;
  /** The monthly spending budget, or null if none is set. */
  budget: number | null;
  /** Budget minus this month's spending; negative when over. */
  budget_left: number | null;
  /** Spending by category, largest first. */
  categories: CategoryTotal[];
  /** Income by category, largest first. */
  income_categories: CategoryTotal[];
}

/** Stored in transactions.extraction for auditability. */
export interface Extraction {
  qr?: { raw: string; bankCode: string; ref: string } | null;
  ocr?: SlipFields | null;
  error?: 'unreadable' | 'unavailable' | null;
  duplicateOf?: { id: string; date: string; amount: number | null } | null;
  /** Field suggestions per direction, applied once the user says which way the money went. */
  suggested?: Partial<Record<TxnType, Suggestion>>;
}

export interface Suggestion {
  merchant?: string | null;
  category_id?: string | null;
  account_id?: string | null;
}

/** Fields the vision model returns for a slip or receipt. */
export interface SlipFields {
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  merchant: string | null; // who received the money: shop or transfer recipient
  sender_name: string | null;
  bank_name: string | null;
  reference_no: string | null;
  kind: 'transfer_slip' | 'receipt' | 'other';
  expense_category: string | null; // best fit if this was money out
  income_category: string | null; // best fit if this was money in
  confidence: number;
}
