/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingCart, UserPlus, Trash2, Coins, CheckCircle, 
  X, Mic, MicOff, QrCode, AlertTriangle, FileText, ChevronRight, Plus
} from 'lucide-react';
import { dbService } from '../lib/supabase';
import { Medicine, Category, Customer, Profile } from '../types';
import BarcodeScanner from '../components/BarcodeScanner';
import { VoiceCommandListener, ParsedVoiceCommand } from '../utils/voice';

interface SalesProps {
  currentUser: Profile;
}

interface CartItem {
  medicine: Medicine;
  quantity: number;
  unit_price: number;
}

export default function Sales({ currentUser }: SalesProps) {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Selection state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer link
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Payment
  const [dueAmount, setDueAmount] = useState<number>(0);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Quick Customer Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  // Voice Listening
  const [isListening, setIsListening] = useState(false);
  const [voiceListener, setVoiceListener] = useState<VoiceCommandListener | null>(null);
  const [voiceTextFeedback, setVoiceTextFeedback] = useState('');

  // Success / Receipt State
  const [successSaleId, setSuccessSaleId] = useState<string | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<{
    id: string;
    customerName?: string;
    total: number;
    paid: number;
    due: number;
    items: CartItem[];
    date: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [medsData, catsData, custsData] = await Promise.all([
        dbService.getMedicines(),
        dbService.getCategories(),
        dbService.getCustomers()
      ]);
      setMedicines(medsData);
      setCategories(catsData);
      setCustomers(custsData);
    } catch (err) {
      console.error('Error loading checkout resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Initialize voice listener
    const listener = new VoiceCommandListener();
    if (listener.isSupported()) {
      listener.onListeningStateChange = (listening) => setIsListening(listening);
      listener.onError = (err) => {
        console.error('Mic error:', err);
        setIsListening(false);
      };
      listener.onResult = (parsed) => {
        handleVoiceCommand(parsed);
      };
      setVoiceListener(listener);
    }
  }, []);

  // Voice Command executor
  const handleVoiceCommand = (command: ParsedVoiceCommand) => {
    setVoiceTextFeedback(`Heard: "${command.originalText}"`);
    setTimeout(() => setVoiceTextFeedback(''), 4000);

    if (command.action === 'search' && command.medicineName) {
      setMedicineSearch(command.medicineName);
      setSelectedCategory(null);
      // Try to find matching medicine
      const match = medicines.find(m => m.name.toLowerCase().includes(command.medicineName!.toLowerCase()));
      if (match) {
        setSelectedMedicine(match);
        setQuantity(1);
      }
    } else if (command.action === 'check' && command.medicineName) {
      const match = medicines.find(m => m.name.toLowerCase().includes(command.medicineName!.toLowerCase()));
      if (match) {
        alert(`Stock check: "${match.name}" has ${match.stock} units remaining.`);
      } else {
        alert(`Medicine "${command.medicineName}" not found in stock logs.`);
      }
    } else if (command.action === 'sell' && command.medicineName && command.quantity) {
      const match = medicines.find(m => m.name.toLowerCase().includes(command.medicineName!.toLowerCase()));
      if (match) {
        if (match.stock < command.quantity) {
          alert(`Warning: Requested ${command.quantity} units of Napa, but only ${match.stock} are available!`);
          return;
        }
        // Add to cart directly
        addToCartExplicit(match, command.quantity);
      } else {
        alert(`Could not find medicine matching "${command.medicineName}" for sales command.`);
      }
    }
  };

  const handleMicToggle = () => {
    if (!voiceListener) {
      alert('Voice commands are not supported on your browser. Please use Chrome/Safari for Web Speech.');
      return;
    }
    if (isListening) {
      voiceListener.stop();
    } else {
      voiceListener.start();
    }
  };

  const addToCartExplicit = (med: Medicine, qty: number) => {
    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.medicine.id === med.id);
      if (existingIdx !== -1) {
        const newQty = prevCart[existingIdx].quantity + qty;
        if (newQty > med.stock) {
          alert(`Cannot exceed available stock of ${med.stock} pcs for "${med.name}"`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIdx].quantity = newQty;
        return updated;
      } else {
        return [...prevCart, { medicine: med, quantity: qty, unit_price: med.selling_price }];
      }
    });
  };

  const handleAddToCart = () => {
    if (!selectedMedicine) return;
    if (quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    if (quantity > selectedMedicine.stock) {
      alert(`Insufficient stock! Only ${selectedMedicine.stock} pcs available for "${selectedMedicine.name}"`);
      return;
    }

    addToCartExplicit(selectedMedicine, quantity);
    setSelectedMedicine(null);
    setMedicineSearch('');
    setQuantity(1);
  };

  const handleRemoveFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const handleBarcodeSuccess = (med: Medicine) => {
    addToCartExplicit(med, 1);
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const added = await dbService.addCustomer(newCustName.trim(), newCustMobile.trim() || undefined);
      setCustomers([...customers, added]);
      setSelectedCustomer(added.id);
      setNewCustName('');
      setNewCustMobile('');
      setShowAddCustomerModal(false);
    } catch (err) {
      alert('Failed to register customer: ' + err);
    }
  };

  // Payment calculations
  const totalPrice = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const paidAmount = Math.max(0, totalPrice - dueAmount);

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Your checkout cart is empty.');
      return;
    }
    
    // Due constraints
    if (dueAmount > 0 && !selectedCustomer) {
      alert('A Linked Customer is REQUIRED if there is a due amount! Please select or add a customer to log the due record.');
      return;
    }

    if (dueAmount > totalPrice) {
      alert('Due Amount cannot be greater than the total sales price!');
      return;
    }

    try {
      const saleItemsData = cart.map(item => ({
        medicine_id: item.medicine.id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));

      const saleId = await dbService.createSale(
        selectedCustomer || null,
        dueAmount,
        saleItemsData
      );

      const custName = customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Cash Customer';

      // Setup receipt
      setReceiptDetails({
        id: saleId,
        customerName: custName,
        total: totalPrice,
        paid: paidAmount,
        due: dueAmount,
        items: [...cart],
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      setSuccessSaleId(saleId);
      setCart([]);
      setDueAmount(0);
      setSelectedCustomer('');
      
      // Reload stock & customers
      const [medsData, custsData] = await Promise.all([
        dbService.getMedicines(),
        dbService.getCustomers()
      ]);
      setMedicines(medsData);
      setCustomers(custsData);

    } catch (err) {
      alert('Sale transaction failed: ' + err);
    }
  };

  // Autocomplete medicine search results
  const medicineMatches = medicines.filter(med => {
    const query = medicineSearch.toLowerCase().trim();
    if (!query) return false;
    
    const matchesQuery = 
      med.name.toLowerCase().includes(query) ||
      (med.generic_name && med.generic_name.toLowerCase().includes(query));

    const matchesCategory = !selectedCategory || med.category_id === selectedCategory;

    return matchesQuery && matchesCategory;
  });

  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans text-gray-900 dark:text-slate-100">
      
      {/* LEFT COLUMN: Medicine Selection & Cart Builders (cols 1 to 7) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Medicine Selector autocomplete panel */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">1. Medicine Autocomplete</h3>
            
            {/* Quick Micro buttons */}
            <div className="flex items-center gap-2">
              <button
                id="mic-trigger-btn"
                onClick={handleMicToggle}
                className={`p-2 rounded-lg border flex items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                  isListening 
                    ? 'bg-rose-500/10 border-rose-500 text-rose-500 animate-pulse' 
                    : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400'
                }`}
                title="Trigger Web Speech Listener"
              >
                {isListening ? <Mic className="w-4 h-4 text-rose-500" /> : <MicOff className="w-4 h-4" />}
                <span className="hidden sm:inline">Voice Command</span>
              </button>
              
              <button
                id="barcode-scanner-trigger-btn"
                onClick={() => setShowBarcodeScanner(true)}
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-slate-400 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Trigger Simulated Barcode Camera"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Scan Code</span>
              </button>
            </div>
          </div>

          {/* Voice text feedback */}
          {voiceTextFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold animate-pulse border border-emerald-200/20">
              {voiceTextFeedback}
            </div>
          )}

          {/* Category-First Pills Row */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-400 uppercase">Category-First Selection</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="sales-cat-pill-all"
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  !selectedCategory 
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/10' 
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  id={`sales-cat-pill-${cat.id}`}
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    selectedCategory === cat.id 
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/10' 
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Autocomplete Input */}
          <div className="space-y-1.5 relative">
            <label className="block text-xs font-bold text-gray-400 uppercase">Search Medicine Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
              <input
                id="sales-autocomplete-input"
                type="text"
                placeholder={selectedCategoryName ? `Type medicine in category "${selectedCategoryName}"...` : "Start typing brand name or formula..."}
                value={medicineSearch}
                onChange={(e) => {
                  setMedicineSearch(e.target.value);
                  if (selectedMedicine && e.target.value !== selectedMedicine.name) {
                    setSelectedMedicine(null);
                  }
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Results popup */}
            {medicineMatches.length > 0 && !selectedMedicine && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-52 overflow-y-auto p-1 divide-y divide-gray-50 dark:divide-slate-700/50">
                {medicineMatches.map(med => (
                  <button
                    id={`autocomplete-match-${med.id}`}
                    key={med.id}
                    type="button"
                    onClick={() => {
                      setSelectedMedicine(med);
                      setMedicineSearch(med.name);
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{med.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{med.generic_name} ({med.company})</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">৳{med.selling_price}</p>
                      <p className={`text-[10px] font-mono ${med.stock <= med.low_stock_threshold ? 'text-rose-500 font-bold' : 'text-gray-400'}`}>Stock: {med.stock}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active selection & Qty input */}
          {selectedMedicine && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="col-span-1">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block tracking-wider">Active Choice</span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">{selectedMedicine.name}</h4>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">৳{selectedMedicine.selling_price} / unit • Stock: {selectedMedicine.stock} pcs</p>
              </div>

              <div className="col-span-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider mb-1">Qty Added</span>
                <input
                  id="checkout-qty-input"
                  type="number"
                  min="1"
                  max={selectedMedicine.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-mono focus:outline-hidden"
                />
              </div>

              <div className="col-span-1 pt-4 sm:pt-0">
                <button
                  id="add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={selectedMedicine.stock === 0}
                  className="w-full py-2 bg-emerald-600 disabled:opacity-50 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  {selectedMedicine.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Cart items table */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <ShoppingCart className="w-4.5 h-4.5" />
              2. Checkout Cart
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full">{cart.length} items</span>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto opacity-35 mb-2.5" />
              <p className="text-xs">No medicines added to cart yet. Add items above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
              {cart.map((item, index) => (
                <div key={index} className="py-3 flex items-center justify-between text-xs font-sans">
                  <div className="space-y-0.5 flex-1 pr-4">
                    <p className="font-bold text-gray-900 dark:text-white">{item.medicine.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">{item.medicine.generic_name} • ৳{item.unit_price} each</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="font-semibold font-mono text-gray-600 dark:text-slate-400">x{item.quantity}</span>
                    <span className="font-bold font-mono text-[14px] text-gray-950 dark:text-white w-18 text-right">৳{(item.quantity * item.unit_price).toFixed(2)}</span>
                    <button
                      id={`remove-cart-item-${index}`}
                      onClick={() => handleRemoveFromCart(index)}
                      className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Customer Links & Dues Payment panels (cols 8 to 12) */}
      <div className="lg:col-span-5 space-y-6">
        
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
          
          {/* Customer section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">3. Customer Link</h3>
              <button
                id="quick-add-cust-btn"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Customer
              </button>
            </div>

            <div className="relative">
              <select
                id="checkout-customer-dropdown"
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-999 text-gray-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                <option value="">Walk-in Cash Customer (No Dues)</option>
                {customers.map(cust => (
                  <option key={cust.id} value={cust.id}>{cust.name} {cust.mobile ? `(${cust.mobile})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500">4. Payment Calculator</h3>
            
            <div className="space-y-2.5">
              
              {/* Total Price display */}
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-500">Total Bill Summary:</span>
                <span className="font-bold font-mono text-base text-gray-950 dark:text-white">৳{totalPrice.toLocaleString()}</span>
              </div>

              {/* Due amount input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-400 uppercase">Customer Due / Credit (৳)</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    id="checkout-due-amount-input"
                    type="number"
                    min="0"
                    max={totalPrice}
                    value={dueAmount || ''}
                    placeholder="0"
                    onChange={(e) => setDueAmount(Math.min(totalPrice, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-mono text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
                {dueAmount > 0 && !selectedCustomer && (
                  <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Due amount entered requires linking a Customer profile above!
                  </span>
                )}
              </div>

              {/* Paid amount live display */}
              <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 dark:border-slate-800/80">
                <span className="text-xs font-semibold text-gray-500">Paid Cash Received (Live):</span>
                <span className="font-bold font-mono text-[17px] text-emerald-600 dark:text-emerald-400">৳{paidAmount.toLocaleString()}</span>
              </div>

            </div>
          </div>

          {/* Submit Checkout */}
          <button
            id="checkout-finalize-btn"
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || (dueAmount > 0 && !selectedCustomer)}
            className="w-full py-3 mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-4.5 h-4.5" />
            Complete Checkout Sale
          </button>

        </div>

        {/* Success Invoice Receipt (Renders after successful checkout) */}
        {receiptDetails && (
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-emerald-500/15 pb-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-500 animate-bounce" />
              <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">Sale Checkout Completed Successfully</h4>
            </div>
            
            {/* Receipt Box */}
            <div className="border border-dashed border-gray-200 dark:border-slate-800 p-4 rounded-xl space-y-3 font-mono text-[11px] text-gray-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="text-center pb-2 border-b border-gray-200 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">PHARMAMANAGER RECEIPT</h5>
                <p>DHAKA, BANGLADESH • SYSTEM INVOICE</p>
                <p className="text-[9px] text-gray-400">{receiptDetails.date}</p>
              </div>

              <div className="space-y-1">
                <p><span className="text-gray-400">INVOICE:</span> #{receiptDetails.id.substring(0, 12)}</p>
                <p><span className="text-gray-400">CLIENT:</span> {receiptDetails.customerName}</p>
                <p><span className="text-gray-400">CASHIER:</span> {currentUser.full_name}</p>
              </div>

              <div className="border-t border-b border-dashed border-gray-200 dark:border-slate-800 py-2 space-y-1.5">
                <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                  <span>ITEM</span>
                  <div className="flex gap-4">
                    <span>QTY</span>
                    <span>SUB</span>
                  </div>
                </div>
                {receiptDetails.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[150px]">{item.medicine.name}</span>
                    <div className="flex gap-6">
                      <span>x{item.quantity}</span>
                      <span>৳{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1 text-right">
                <p className="text-gray-950 dark:text-white font-bold"><span className="text-gray-400 font-normal">TOTAL BILL:</span> ৳{receiptDetails.total.toLocaleString()}</p>
                <p><span className="text-gray-400">CASH RECEIVED:</span> ৳{receiptDetails.paid.toLocaleString()}</p>
                {receiptDetails.due > 0 && (
                  <p className="text-rose-500 font-bold"><span className="text-gray-400 font-normal">DUE BALANCE:</span> ৳{receiptDetails.due.toLocaleString()}</p>
                )}
              </div>

              <div className="text-center pt-2 text-[9px] text-gray-400 uppercase tracking-widest">
                *** THANK YOU ***
              </div>
            </div>

            <button
              id="close-receipt-btn"
              onClick={() => setReceiptDetails(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Dismiss Invoice View
            </button>
          </div>
        )}

      </div>

      {/* QUICK CUSTOMER ADD MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-base text-gray-950 dark:text-white flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                Register New Customer
              </h3>
              <button 
                id="close-cust-modal-btn"
                onClick={() => setShowAddCustomerModal(false)} 
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Customer Full Name *</label>
                <input
                  id="new-cust-name-input"
                  type="text"
                  required
                  placeholder="e.g. Mahfuzur Rahman"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wide mb-1">Mobile Contact Number (Optional)</label>
                <input
                  id="new-cust-mobile-input"
                  type="tel"
                  placeholder="e.g. 017XXXXXXXX"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-800 rounded-lg text-sm bg-transparent text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  id="cancel-cust-btn"
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  id="submit-cust-btn"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMART BARCODE SCANNER MODAL */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanSuccess={handleBarcodeSuccess}
        medicines={medicines}
      />

    </div>
  );
}
