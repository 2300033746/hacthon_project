import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  price: number;
  last_updated: string;
  notes: string;
  created_at: string;
}

export type InventoryUpdate = {
  name?: string;
  sku?: string | null;
  category?: string;
  quantity?: number;
  unit?: string;
  low_stock_threshold?: number;
  price?: number;
  notes?: string;
};

export const ALERT_LEVELS = {
  OUT_OF_STOCK: 'out_of_stock',
  LOW_STOCK: 'low_stock',
  OK: 'ok',
} as const;

export function getAlertLevel(item: InventoryItem): string {
  if (item.quantity <= 0) return ALERT_LEVELS.OUT_OF_STOCK;
  if (item.quantity <= item.low_stock_threshold) return ALERT_LEVELS.LOW_STOCK;
  return ALERT_LEVELS.OK;
}
