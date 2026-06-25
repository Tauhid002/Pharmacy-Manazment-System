/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Medicine, Category, Customer, Supplier, Sale, SaleItem, 
  DueLedgerEntry, SupplierPurchase, SupplierPayment, StockLog, Profile, DBConfig, UserRole
} from '../types';

// Read config from local storage or default to env
const getInitialConfig = (): DBConfig => {
  const saved = localStorage.getItem('pharmacy_db_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // If the user's saved config is empty or doesn't have live credentials, inject the provided credentials
      if (!parsed.url || parsed.url.includes('placeholder')) {
        parsed.url = 'https://hfgjcrtcmbtvvcwglnug.supabase.co';
        parsed.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZ2pjcnRjbWJ0dnZjd2dsbnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQ3NTcsImV4cCI6MjA5Nzk2MDc1N30.4zCO8jkTIdRl-ptP4BbsEIxsJU1zPL3-DypVoMinI94';
        parsed.useLive = true;
        localStorage.setItem('pharmacy_db_config', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      // Ignore
    }
  }
  
  const defaultUrl = 'https://hfgjcrtcmbtvvcwglnug.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmZ2pjcnRjbWJ0dnZjd2dsbnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODQ3NTcsImV4cCI6MjA5Nzk2MDc1N30.4zCO8jkTIdRl-ptP4BbsEIxsJU1zPL3-DypVoMinI94';
  
  const config = {
    url: defaultUrl,
    anonKey: defaultKey,
    useLive: true
  };
  localStorage.setItem('pharmacy_db_config', JSON.stringify(config));
  return config;
};

let currentConfig = getInitialConfig();
let supabase: SupabaseClient | null = null;

if (currentConfig.useLive && currentConfig.url && currentConfig.anonKey) {
  try {
    supabase = createClient(currentConfig.url, currentConfig.anonKey);
  } catch (err) {
    console.error('Failed to initialize live Supabase client:', err);
  }
}

// -----------------------------------------
// DEMO/LOCAL-STORAGE DATABASE STATE ENGINE
// -----------------------------------------
const SEED_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Tablets' },
  { id: 'cat-2', name: 'Capsules' },
  { id: 'cat-3', name: 'Syrups' },
  { id: 'cat-4', name: 'Inhalers' },
  { id: 'cat-5', name: 'Ointments' }
];

const SEED_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Beximco Pharmaceuticals Ltd.', contact_person: 'Rashedul Karim', phone: '01711223344', address: 'Dhaka, Bangladesh', total_owed: 2500 },
  { id: 'sup-2', name: 'Square Pharmaceuticals PLC', contact_person: 'Mustafizur Rahman', phone: '01811223344', address: 'Pabna, Bangladesh', total_owed: 4200 },
  { id: 'sup-3', name: 'Incepta Pharmaceuticals Ltd.', contact_person: 'Sohail Tanveer', phone: '01911223344', address: 'Savar, Dhaka', total_owed: 0 }
];

const SEED_PROFILES: Profile[] = [
  { id: 'user-owner', full_name: 'Owner Admin', role: 'owner', phone: '01700000001' },
  { id: 'user-staff1', full_name: 'Kamal Uddin', role: 'staff', phone: '01700000002' },
  { id: 'user-staff2', full_name: 'Rahima Begum', role: 'staff', phone: '01700000003' }
];

const SEED_MEDICINES: Medicine[] = [
  { 
    id: 'med-1', name: 'Napa', generic_name: 'Paracetamol', company: 'Beximco', 
    category_id: 'cat-1', purchase_price: 8, selling_price: 10, stock: 120, 
    low_stock_threshold: 10, batch_number: 'N-449', expiry_date: '2026-12-15', 
    supplier_id: 'sup-1' 
  },
  { 
    id: 'med-2', name: 'Napa Extra', generic_name: 'Paracetamol + Caffeine', company: 'Beximco', 
    category_id: 'cat-1', purchase_price: 11, selling_price: 15, stock: 8, 
    low_stock_threshold: 15, batch_number: 'NE-102', expiry_date: '2026-11-20', 
    supplier_id: 'sup-1' // Low stock
  },
  { 
    id: 'med-3', name: 'Sergel 20', generic_name: 'Esomeprazole', company: 'Healthcare', 
    category_id: 'cat-2', purchase_price: 5, selling_price: 7, stock: 45, 
    low_stock_threshold: 10, batch_number: 'SR-88', expiry_date: '2026-07-12', 
    supplier_id: 'sup-2' // Expiring within 30 days of June 25, 2026!
  },
  { 
    id: 'med-4', name: 'Alatrol', generic_name: 'Cetirizine Hydrochloride', company: 'Square', 
    category_id: 'cat-1', purchase_price: 2.2, selling_price: 3.0, stock: 250, 
    low_stock_threshold: 20, batch_number: 'AL-309', expiry_date: '2027-04-05', 
    supplier_id: 'sup-2' 
  },
  { 
    id: 'med-5', name: 'Monas 10', generic_name: 'Montelukast Sodium', company: 'Acme', 
    category_id: 'cat-1', purchase_price: 12.5, selling_price: 16.0, stock: 2, 
    low_stock_threshold: 10, batch_number: 'M10-44', expiry_date: '2026-09-12', 
    supplier_id: 'sup-3' // Low Stock (stock=2, limit=10)
  },
  { 
    id: 'med-6', name: 'Tufnil', generic_name: 'Tolfenamic Acid', company: 'Incepta', 
    category_id: 'cat-1', purchase_price: 9.5, selling_price: 12.0, stock: 40, 
    low_stock_threshold: 5, batch_number: 'TF-20', expiry_date: '2026-07-18', 
    supplier_id: 'sup-3' // Expiring within 30 days!
  },
  { 
    id: 'med-7', name: 'Seclo 20', generic_name: 'Omeprazole', company: 'Square', 
    category_id: 'cat-2', purchase_price: 4.5, selling_price: 6.0, stock: 0, 
    low_stock_threshold: 15, batch_number: 'SC-12', expiry_date: '2027-01-30', 
    supplier_id: 'sup-2' // Out of Stock!
  }
];

const SEED_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'Palok Mahamud', mobile: '01712345678', total_due: 450 },
  { id: 'cust-2', name: 'Anika Rahman', mobile: '01811223344', total_due: 0 },
  { id: 'cust-3', name: 'Sabbir Ahmed', mobile: '01511223344', total_due: 1200 }
];

const SEED_SALES: Sale[] = [
  { id: 'sale-1', customer_id: 'cust-1', total_price: 850, due_amount: 450, paid_amount: 400, sold_by: 'user-staff1', sale_date: '2026-06-23T14:30:00Z' },
  { id: 'sale-2', customer_id: 'cust-2', total_price: 240, due_amount: 0, paid_amount: 240, sold_by: 'user-staff2', sale_date: '2026-06-24T10:15:00Z' },
  { id: 'sale-3', customer_id: 'cust-3', total_price: 1500, due_amount: 1200, paid_amount: 300, sold_by: 'user-owner', sale_date: '2026-06-25T02:00:00Z' }
];

const SEED_SALE_ITEMS: SaleItem[] = [
  { id: 'item-1', sale_id: 'sale-1', medicine_id: 'med-1', quantity: 20, unit_price: 10, subtotal: 200 },
  { id: 'item-2', sale_id: 'sale-1', medicine_id: 'med-2', quantity: 10, unit_price: 15, subtotal: 150 },
  { id: 'item-3', sale_id: 'sale-1', medicine_id: 'med-3', quantity: 71, unit_price: 7, subtotal: 497 }, // Sergel
  
  { id: 'item-4', sale_id: 'sale-2', medicine_id: 'med-4', quantity: 80, unit_price: 3, subtotal: 240 }, // Alatrol
  
  { id: 'item-5', sale_id: 'sale-3', medicine_id: 'med-1', quantity: 50, unit_price: 10, subtotal: 500 },
  { id: 'item-6', sale_id: 'sale-3', medicine_id: 'med-5', quantity: 50, unit_price: 16, subtotal: 800 },
  { id: 'item-7', sale_id: 'sale-3', medicine_id: 'med-6', quantity: 16, unit_price: 12, subtotal: 192 }
];

const SEED_DUE_LEDGER: DueLedgerEntry[] = [
  { id: 'due-1', customer_id: 'cust-1', sale_id: 'sale-1', type: 'due_added', amount: 450, note: 'Sale #sale-1', created_by: 'user-staff1', created_at: '2026-06-23T14:30:00Z' },
  { id: 'due-2', customer_id: 'cust-3', sale_id: 'sale-3', type: 'due_added', amount: 1200, note: 'Sale #sale-3', created_by: 'user-owner', created_at: '2026-06-25T02:00:00Z' }
];

const SEED_STOCK_LOGS: StockLog[] = [
  { id: 'log-1', medicine_id: 'med-1', quantity_added: 100, note: 'Initial Stocking', created_by: 'user-owner', created_at: '2026-06-20T10:00:00Z' },
  { id: 'log-2', medicine_id: 'med-2', quantity_added: 50, note: 'Supplier Beximco restock', created_by: 'user-staff1', created_at: '2026-06-22T09:00:00Z' }
];

const SEED_SUPPLIER_PURCHASES: SupplierPurchase[] = [
  { id: 'pur-1', supplier_id: 'sup-1', description: 'Bought 200 Napa, 50 Napa Extra', amount: 2150, purchase_date: '2026-06-21', created_by: 'user-owner', created_at: '2026-06-21T11:00:00Z' },
  { id: 'pur-2', supplier_id: 'sup-2', description: 'Bought 300 Sergel, 500 Alatrol', amount: 2600, purchase_date: '2026-06-22', created_by: 'user-owner', created_at: '2026-06-22T14:00:00Z' }
];

const SEED_SUPPLIER_PAYMENTS: SupplierPayment[] = [
  { id: 'pay-1', supplier_id: 'sup-1', amount: 1000, payment_date: '2026-06-21', created_by: 'user-owner', created_at: '2026-06-21T12:00:00Z' },
  { id: 'pay-2', supplier_id: 'sup-2', amount: 500, payment_date: '2026-06-23', created_by: 'user-staff1', created_at: '2026-06-23T15:00:00Z' }
];

// Helper to initialize local storage
const initializeLocalStorage = () => {
  const initTable = <T>(key: string, seed: T[]) => {
    if (!localStorage.getItem(`pharm_db_${key}`)) {
      localStorage.setItem(`pharm_db_${key}`, JSON.stringify(seed));
    }
  };
  
  initTable('categories', SEED_CATEGORIES);
  initTable('suppliers', SEED_SUPPLIERS);
  initTable('profiles', SEED_PROFILES);
  initTable('medicines', SEED_MEDICINES);
  initTable('customers', SEED_CUSTOMERS);
  initTable('sales', SEED_SALES);
  initTable('sale_items', SEED_SALE_ITEMS);
  initTable('due_ledger', SEED_DUE_LEDGER);
  initTable('stock_logs', SEED_STOCK_LOGS);
  initTable('supplier_purchases', SEED_SUPPLIER_PURCHASES);
  initTable('supplier_payments', SEED_SUPPLIER_PAYMENTS);
  
  // Track currently simulated logged-in user
  if (!localStorage.getItem('pharm_current_user_id')) {
    localStorage.setItem('pharm_current_user_id', 'user-owner'); // Default to owner for preview ease
  }
};

initializeLocalStorage();

// Local Storage helpers
const getTable = <T>(key: string): T[] => {
  const data = localStorage.getItem(`pharm_db_${key}`);
  return data ? JSON.parse(data) : [];
};

const saveTable = <T>(key: string, data: T[]) => {
  localStorage.setItem(`pharm_db_${key}`, JSON.stringify(data));
};

// Current mock user
const getMockUser = (): Profile => {
  const userId = localStorage.getItem('pharm_current_user_id') || 'user-owner';
  const profiles = getTable<Profile>('profiles');
  return profiles.find(p => p.id === userId) || profiles[0];
};

const setMockUser = (userId: string) => {
  localStorage.setItem('pharm_current_user_id', userId);
};

// -----------------------------------------
// DATABASE WRAPPER SERVICE
// -----------------------------------------
export const dbService = {
  // Config
  getConfig: () => currentConfig,
  updateConfig: (config: DBConfig) => {
    localStorage.setItem('pharmacy_db_config', JSON.stringify(config));
    currentConfig = config;
    if (config.useLive && config.url && config.anonKey) {
      try {
        supabase = createClient(config.url, config.anonKey);
      } catch (err) {
        console.error('Failed to change to live Supabase:', err);
      }
    } else {
      supabase = null;
    }
    // Refresh page to re-init everything with correct DB
    window.location.reload();
  },

  resetDemoDatabase: () => {
    localStorage.removeItem('pharm_db_categories');
    localStorage.removeItem('pharm_db_suppliers');
    localStorage.removeItem('pharm_db_profiles');
    localStorage.removeItem('pharm_db_medicines');
    localStorage.removeItem('pharm_db_customers');
    localStorage.removeItem('pharm_db_sales');
    localStorage.removeItem('pharm_db_sale_items');
    localStorage.removeItem('pharm_db_due_ledger');
    localStorage.removeItem('pharm_db_stock_logs');
    localStorage.removeItem('pharm_db_supplier_purchases');
    localStorage.removeItem('pharm_db_supplier_payments');
    initializeLocalStorage();
    window.location.reload();
  },

  // Auth / Current User
  getCurrentUser: async (): Promise<Profile> => {
    if (currentConfig.useLive && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (profile) return profile as Profile;

          // Auto-create missing profile row for authenticated user
          const finalRole = user.email?.toLowerCase() === 'palokmahamud@gmail.com' ? 'owner' : 'staff';
          const defaultName = user.email?.split('@')[0] || 'Pharma User';
          const newProfile: Profile = {
            id: user.id,
            full_name: defaultName,
            role: finalRole,
            phone: user.phone || null,
            email: user.email || null,
            is_active: true,
            created_at: new Date().toISOString()
          };

          try {
            await supabase.from('profiles').upsert([newProfile]);
          } catch (upsertErr) {
            console.error('Error auto-creating missing profile:', upsertErr);
          }
          return newProfile;
        }
      } catch (err) {
        console.warn('Supabase auth check failed:', err);
      }
      throw new Error('No user authenticated in Supabase');
    }
    return getMockUser();
  },

  setMockUser: (userId: string) => {
    setMockUser(userId);
    window.location.reload();
  },

  getMockProfiles: (): Profile[] => {
    return getTable<Profile>('profiles');
  },

  addMockProfile: (name: string, role: UserRole, phone: string) => {
    const profiles = getTable<Profile>('profiles');
    const newId = `user-${Date.now()}`;
    const newProfile: Profile = {
      id: newId,
      full_name: name,
      role,
      phone,
      created_at: new Date().toISOString()
    };
    profiles.push(newProfile);
    saveTable('profiles', profiles);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data as Category[];
    }
    return getTable<Category>('categories').sort((a, b) => a.name.localeCompare(b.name));
  },

  addCategory: async (name: string): Promise<Category> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
      if (error) throw error;
      return data as Category;
    }
    const categories = getTable<Category>('categories');
    // Ensure unique name
    const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newCategory = { id: `cat-${Date.now()}`, name };
    categories.push(newCategory);
    saveTable('categories', categories);
    return newCategory;
  },

  // Medicines
  getMedicines: async (): Promise<Medicine[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('medicines').select('*').order('name');
      if (error) throw error;
      return data as Medicine[];
    }
    return getTable<Medicine>('medicines');
  },

  addMedicine: async (medicine: Omit<Medicine, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<Medicine> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('medicines').insert([{
        ...medicine,
        created_by: user.id
      }]).select().single();
      if (error) throw error;
      return data as Medicine;
    }
    const medicines = getTable<Medicine>('medicines');
    const newMedicine: Medicine = {
      ...medicine,
      id: `med-${Date.now()}`,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    medicines.push(newMedicine);
    saveTable('medicines', medicines);
    return newMedicine;
  },

  updateMedicine: async (id: string, updates: Partial<Medicine>): Promise<Medicine> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('medicines').update({
        ...updates,
        updated_at: new Date().toISOString()
      }).eq('id', id).select().single();
      if (error) throw error;
      return data as Medicine;
    }
    const medicines = getTable<Medicine>('medicines');
    const index = medicines.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Medicine not found');
    
    medicines[index] = {
      ...medicines[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveTable('medicines', medicines);
    return medicines[index];
  },

  deleteMedicine: async (id: string): Promise<void> => {
    if (currentConfig.useLive && supabase) {
      const { error } = await supabase.from('medicines').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    const medicines = getTable<Medicine>('medicines');
    const filtered = medicines.filter(m => m.id !== id);
    saveTable('medicines', filtered);
  },

  // Restock Medicine RPC
  restockMedicine: async (medicineId: string, quantity: number, note?: string): Promise<void> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      const { error } = await supabase.rpc('restock_medicine', {
        p_medicine_id: medicineId,
        p_quantity: quantity,
        p_note: note || null
      });
      if (error) throw error;
      return;
    }
    
    // Simulate restock_medicine RPC
    const medicines = getTable<Medicine>('medicines');
    const logs = getTable<StockLog>('stock_logs');
    
    const medIdx = medicines.findIndex(m => m.id === medicineId);
    if (medIdx === -1) throw new Error('Medicine not found');
    
    medicines[medIdx].stock += quantity;
    medicines[medIdx].updated_at = new Date().toISOString();
    
    const newLog: StockLog = {
      id: `log-${Date.now()}`,
      medicine_id: medicineId,
      quantity_added: quantity,
      note,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    
    logs.push(newLog);
    
    saveTable('medicines', medicines);
    saveTable('stock_logs', logs);
  },

  getStockLogs: async (): Promise<StockLog[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('stock_logs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as StockLog[];
    }
    return getTable<StockLog>('stock_logs').sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) throw error;
      return data as Customer[];
    }
    return getTable<Customer>('customers');
  },

  addCustomer: async (name: string, mobile?: string): Promise<Customer> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('customers').insert([{
        name,
        mobile: mobile || null,
        created_by: user.id,
        total_due: 0
      }]).select().single();
      if (error) throw error;
      return data as Customer;
    }
    const customers = getTable<Customer>('customers');
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      mobile: mobile || undefined,
      total_due: 0,
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    customers.push(newCustomer);
    saveTable('customers', customers);
    return newCustomer;
  },

  // Sales & Checkout Flow RPC
  createSale: async (customerId: string | null, dueAmount: number, items: { medicine_id: string, quantity: number, unit_price: number }[]): Promise<string> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.rpc('create_sale', {
        p_customer_id: customerId || null,
        p_due_amount: dueAmount,
        p_items: items // triggers the stored SQL RPC
      });
      if (error) throw error;
      return data as string; // returns sale_id
    }

    // SIMULATE create_sale RPC
    const sales = getTable<Sale>('sales');
    const saleItems = getTable<SaleItem>('sale_items');
    const medicines = getTable<Medicine>('medicines');
    const dueLedger = getTable<DueLedgerEntry>('due_ledger');
    const customers = getTable<Customer>('customers');

    // Calculate total price
    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const saleId = `sale-${Date.now()}`;

    // Verify stock
    for (const item of items) {
      const med = medicines.find(m => m.id === item.medicine_id);
      if (!med) throw new Error(`Medicine ${item.medicine_id} not found`);
      if (med.stock < item.quantity) {
        throw new Error(`Insufficient stock for medicine "${med.name}" (Requested ${item.quantity}, Stock ${med.stock})`);
      }
    }

    // Insert sale header
    const newSale: Sale = {
      id: saleId,
      customer_id: customerId || undefined,
      total_price: total,
      due_amount: dueAmount,
      paid_amount: total - dueAmount,
      sold_by: user.id,
      sale_date: new Date().toISOString()
    };
    sales.push(newSale);

    // Insert sale items and decrement stock
    for (const item of items) {
      const medIdx = medicines.findIndex(m => m.id === item.medicine_id);
      medicines[medIdx].stock -= item.quantity;
      medicines[medIdx].updated_at = new Date().toISOString();

      const newItem: SaleItem = {
        id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        sale_id: saleId,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price
      };
      saleItems.push(newItem);
    }

    // Handle due if any
    if (dueAmount > 0 && customerId) {
      const newLedger: DueLedgerEntry = {
        id: `due-${Date.now()}`,
        customer_id: customerId,
        sale_id: saleId,
        type: 'due_added',
        amount: dueAmount,
        note: `Sale #${saleId}`,
        created_by: user.id,
        created_at: new Date().toISOString()
      };
      dueLedger.push(newLedger);

      const custIdx = customers.findIndex(c => c.id === customerId);
      if (custIdx !== -1) {
        customers[custIdx].total_due = Number(customers[custIdx].total_due) + dueAmount;
      }
    }

    saveTable('sales', sales);
    saveTable('sale_items', saleItems);
    saveTable('medicines', medicines);
    saveTable('due_ledger', dueLedger);
    saveTable('customers', customers);

    return saleId;
  },

  getSales: async (): Promise<Sale[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('sales').select('*').order('sale_date', { ascending: false });
      if (error) throw error;
      return data as Sale[];
    }
    return getTable<Sale>('sales').sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  },

  getSaleItems: async (saleId?: string): Promise<SaleItem[]> => {
    if (currentConfig.useLive && supabase) {
      let query = supabase.from('sale_items').select('*');
      if (saleId) {
        query = query.eq('sale_id', saleId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SaleItem[];
    }
    const items = getTable<SaleItem>('sale_items');
    return saleId ? items.filter(i => i.sale_id === saleId) : items;
  },

  // Due Ledger Tally Khata RPC
  getDueLedger: async (customerId?: string): Promise<DueLedgerEntry[]> => {
    if (currentConfig.useLive && supabase) {
      let query = supabase.from('due_ledger').select('*').order('created_at', { ascending: false });
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as DueLedgerEntry[];
    }
    const ledger = getTable<DueLedgerEntry>('due_ledger');
    const sorted = ledger.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return customerId ? sorted.filter(l => l.customer_id === customerId) : sorted;
  },

  recordDuePayment: async (customerId: string, amount: number, note?: string): Promise<void> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      const { error } = await supabase.rpc('record_due_payment', {
        p_customer_id: customerId,
        p_amount: amount,
        p_note: note || null
      });
      if (error) throw error;
      return;
    }

    // SIMULATE record_due_payment RPC
    const dueLedger = getTable<DueLedgerEntry>('due_ledger');
    const customers = getTable<Customer>('customers');

    const newLedger: DueLedgerEntry = {
      id: `due-${Date.now()}`,
      customer_id: customerId,
      type: 'payment_received',
      amount,
      note: note || 'Due Payment',
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    dueLedger.push(newLedger);

    const custIdx = customers.findIndex(c => c.id === customerId);
    if (custIdx !== -1) {
      customers[custIdx].total_due = Math.max(0, Number(customers[custIdx].total_due) - amount);
    }

    saveTable('due_ledger', dueLedger);
    saveTable('customers', customers);
  },

  // Suppliers Management
  getSuppliers: async (): Promise<Supplier[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      return data as Supplier[];
    }
    return getTable<Supplier>('suppliers');
  },

  addSupplier: async (name: string, contactPerson?: string, phone?: string, address?: string): Promise<Supplier> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('suppliers').insert([{
        name,
        contact_person: contactPerson || null,
        phone: phone || null,
        address: address || null,
        total_owed: 0
      }]).select().single();
      if (error) throw error;
      return data as Supplier;
    }
    const suppliers = getTable<Supplier>('suppliers');
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name,
      contact_person: contactPerson,
      phone,
      address,
      total_owed: 0,
      created_at: new Date().toISOString()
    };
    suppliers.push(newSupplier);
    saveTable('suppliers', suppliers);
    return newSupplier;
  },

  addSupplierPurchase: async (supplierId: string, description: string, amount: number): Promise<void> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      // Step 1: Add purchase row
      const { error: purError } = await supabase.from('supplier_purchases').insert([{
        supplier_id: supplierId,
        description,
        amount,
        created_by: user.id
      }]);
      if (purError) throw purError;

      // Step 2: Update total_owed in supplier table
      // Supabase RLS allows update
      const { data: currentSupplier } = await supabase.from('suppliers').select('total_owed').eq('id', supplierId).single();
      const newOwed = Number(currentSupplier?.total_owed || 0) + amount;
      const { error: supError } = await supabase.from('suppliers').update({ total_owed: newOwed }).eq('id', supplierId);
      if (supError) throw supError;
      return;
    }

    const purchases = getTable<SupplierPurchase>('supplier_purchases');
    const suppliers = getTable<Supplier>('suppliers');

    const newPur: SupplierPurchase = {
      id: `pur-${Date.now()}`,
      supplier_id: supplierId,
      description,
      amount,
      purchase_date: new Date().toISOString().split('T')[0],
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    purchases.push(newPur);

    const supIdx = suppliers.findIndex(s => s.id === supplierId);
    if (supIdx !== -1) {
      suppliers[supIdx].total_owed = Number(suppliers[supIdx].total_owed) + amount;
    }

    saveTable('supplier_purchases', purchases);
    saveTable('suppliers', suppliers);
  },

  addSupplierPayment: async (supplierId: string, amount: number): Promise<void> => {
    const user = await dbService.getCurrentUser();
    if (currentConfig.useLive && supabase) {
      const { error: payError } = await supabase.from('supplier_payments').insert([{
        supplier_id: supplierId,
        amount,
        created_by: user.id
      }]);
      if (payError) throw payError;

      const { data: currentSupplier } = await supabase.from('suppliers').select('total_owed').eq('id', supplierId).single();
      const newOwed = Math.max(0, Number(currentSupplier?.total_owed || 0) - amount);
      const { error: supError } = await supabase.from('suppliers').update({ total_owed: newOwed }).eq('id', supplierId);
      if (supError) throw supError;
      return;
    }

    const payments = getTable<SupplierPayment>('supplier_payments');
    const suppliers = getTable<Supplier>('suppliers');

    const newPay: SupplierPayment = {
      id: `pay-${Date.now()}`,
      supplier_id: supplierId,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      created_by: user.id,
      created_at: new Date().toISOString()
    };
    payments.push(newPay);

    const supIdx = suppliers.findIndex(s => s.id === supplierId);
    if (supIdx !== -1) {
      suppliers[supIdx].total_owed = Math.max(0, Number(suppliers[supIdx].total_owed) - amount);
    }

    saveTable('supplier_payments', payments);
    saveTable('suppliers', suppliers);
  },

  getSupplierPurchases: async (supplierId?: string): Promise<SupplierPurchase[]> => {
    if (currentConfig.useLive && supabase) {
      let query = supabase.from('supplier_purchases').select('*').order('purchase_date', { ascending: false });
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierPurchase[];
    }
    const purchases = getTable<SupplierPurchase>('supplier_purchases');
    const sorted = purchases.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
    return supplierId ? sorted.filter(p => p.supplier_id === supplierId) : sorted;
  },

  getSupplierPayments: async (supplierId?: string): Promise<SupplierPayment[]> => {
    if (currentConfig.useLive && supabase) {
      let query = supabase.from('supplier_payments').select('*').order('payment_date', { ascending: false });
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierPayment[];
    }
    const payments = getTable<SupplierPayment>('supplier_payments');
    const sorted = payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    return supplierId ? sorted.filter(p => p.supplier_id === supplierId) : sorted;
  },

  getCurrentMockUser: (): Profile => {
    return getMockUser();
  },

  getProfiles: async (): Promise<Profile[]> => {
    if (currentConfig.useLive && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data as Profile[];
    }
    return getTable<Profile>('profiles');
  },

  registerStaff: async (fullName: string, email: string, role: 'owner' | 'staff'): Promise<void> => {
    if (currentConfig.useLive && supabase) {
      const { error } = await supabase.from('profiles').insert([{
        id: `usr-${Date.now()}`,
        full_name: fullName,
        email,
        role,
        is_active: true
      }]);
      if (error) throw error;
      return;
    }
    const profiles = getTable<Profile>('profiles');
    const newProfile: Profile = {
      id: `usr-${Date.now()}`,
      full_name: fullName,
      email,
      role,
      is_active: true,
      created_at: new Date().toISOString()
    };
    profiles.push(newProfile);
    saveTable('profiles', profiles);
  },

  toggleStaffStatus: async (profileId: string, isActive: boolean): Promise<void> => {
    if (currentConfig.useLive && supabase) {
      const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', profileId);
      if (error) throw error;
      return;
    }
    const profiles = getTable<Profile>('profiles');
    const index = profiles.findIndex(p => p.id === profileId);
    if (index !== -1) {
      profiles[index].is_active = isActive;
      saveTable('profiles', profiles);
    }
  },

  paySupplier: async (supplierId: string, amount: number, note?: string): Promise<void> => {
    return dbService.addSupplierPayment(supplierId, amount);
  },

  signOut: async (): Promise<void> => {
    if (currentConfig.useLive && supabase) {
      await supabase.auth.signOut();
    }
  }
};

