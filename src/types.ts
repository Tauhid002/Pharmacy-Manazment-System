/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'staff';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  email?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  total_owed: number;
  created_at?: string;
}

export interface SupplierPurchase {
  id: string;
  supplier_id: string;
  description?: string;
  amount: number;
  purchase_date: string;
  created_by?: string;
  created_at?: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  created_by?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name?: string;
  company?: string;
  category_id?: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  low_stock_threshold: number;
  batch_number?: string;
  expiry_date?: string;
  supplier_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockLog {
  id: string;
  medicine_id: string;
  quantity_added: number;
  note?: string;
  created_by?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile?: string;
  total_due: number;
  created_by?: string;
  created_at?: string;
}

export interface Sale {
  id: string;
  customer_id?: string;
  total_price: number;
  due_amount: number;
  paid_amount: number;
  sold_by: string;
  sale_date: string;
  // Joins
  customer_name?: string;
  sold_by_name?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  medicine_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  // Joins / Direct Table Display Fields
  medicine_name?: string;
  customer_name?: string;
  due_amount?: number;
  total_amount?: number;
}

export interface DueLedgerEntry {
  id: string;
  customer_id: string;
  sale_id?: string;
  type: 'due_added' | 'payment_received';
  amount: number;
  note?: string;
  created_by: string;
  created_at: string;
}

export interface DBConfig {
  url: string;
  anonKey: string;
  useLive: boolean;
}
