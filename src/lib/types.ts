// Row shapes for supabase/migrations. Keep in sync when the schema changes.

export type AccountType = 'cash' | 'bank' | 'card' | 'e_wallet';
export type TxnType = 'expense' | 'income';
export type TxnSource = 'manual' | 'qr' | 'ocr' | 'recurring';
export type TxnStatus = 'processing' | 'needs_review' | 'confirmed';
export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bank_code: string | null;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TxnType;
  icon: string;
  is_default: boolean;
  archived: boolean;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  category_id: string | null;
  recurring_rule_id: string | null;
  type: TxnType;
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
}

export interface MonthSummary {
  month: string;
  income: number;
  expense: number;
  count: number;
  categories: { id: string | null; name: string; icon: string; total: number; count: number }[];
}

/** Stored in transactions.extraction for auditability. */
export interface Extraction {
  qr?: { raw: string; bankCode: string; ref: string } | null;
  ocr?: SlipFields | null;
  error?: 'unreadable' | 'unavailable' | null;
  duplicateOf?: { id: string; date: string; amount: number | null } | null;
}

/** Fields the vision model returns for a slip or receipt. */
export interface SlipFields {
  amount: number | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  merchant: string | null;
  sender_name: string | null;
  bank_name: string | null;
  reference_no: string | null;
  kind: 'transfer_slip' | 'receipt' | 'other';
  category: string | null;
  confidence: number;
}
