import { useCallback, useEffect, useState } from 'react';
import { Warehouse, RefreshCw } from 'lucide-react';
import { supabase, type InventoryItem, getAlertLevel, ALERT_LEVELS } from '@/lib/supabase';
import { VoiceStockEntry } from '@/components/VoiceStockEntry';
import { StockQuestions } from '@/components/StockQuestions';
import { SmartAlerts } from '@/components/SmartAlerts';
import { InventoryList } from '@/components/InventoryList';

function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems((data ?? []) as InventoryItem[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const outCount = items.filter((i) => getAlertLevel(i) === ALERT_LEVELS.OUT_OF_STOCK).length;
  const lowCount = items.filter((i) => getAlertLevel(i) === ALERT_LEVELS.LOW_STOCK).length;
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * Number(i.price), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-600 text-white">
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">StockVoice</h1>
                <p className="text-xs text-slate-500 leading-tight">Voice-Based Inventory Management</p>
              </div>
            </div>
            <button
              onClick={fetchItems}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Items</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Units</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalUnits.toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Stock Value</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalValue.toFixed(2)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${outCount + lowCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${outCount + lowCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {outCount + lowCount}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            Couldn't load inventory: {error}. Click Refresh to try again.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <span className="ml-2 text-slate-500">Loading inventory…</span>
          </div>
        ) : (
          <>
            {/* Voice entry + alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VoiceStockEntry items={items} onInventoryChanged={fetchItems} />
              <SmartAlerts items={items} />
            </div>

            {/* Stock questions */}
            <StockQuestions items={items} />

            {/* Inventory list */}
            <InventoryList items={items} onInventoryChanged={fetchItems} />
          </>
        )}

        <footer className="text-center py-4 text-xs text-slate-400">
          StockVoice — Voice-Based Inventory Management for Small Businesses
        </footer>
      </main>
    </div>
  );
}

export default App;
