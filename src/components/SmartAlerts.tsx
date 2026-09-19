import { AlertTriangle, PackageX, Package, Bell, TrendingDown } from 'lucide-react';
import type { InventoryItem } from '@/lib/supabase';
import { getAlertLevel, ALERT_LEVELS } from '@/lib/supabase';

interface SmartAlertsProps {
  items: InventoryItem[];
}

export function SmartAlerts({ items }: SmartAlertsProps) {
  const outOfStock = items.filter((i) => getAlertLevel(i) === ALERT_LEVELS.OUT_OF_STOCK);
  const lowStock = items.filter((i) => getAlertLevel(i) === ALERT_LEVELS.LOW_STOCK);
  const okItems = items.filter((i) => getAlertLevel(i) === ALERT_LEVELS.OK);

  const totalAlerts = outOfStock.length + lowStock.length;
  const hasAlerts = totalAlerts > 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 ${hasAlerts ? 'bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100' : 'bg-green-50 border-b border-green-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${hasAlerts ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Smart Alerts</h2>
              <p className="text-sm text-slate-500">
                {hasAlerts
                  ? `${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''} need your attention`
                  : 'All items are well stocked'}
              </p>
            </div>
          </div>
          {hasAlerts && (
            <span className="flex items-center justify-center min-w-8 h-8 px-3 rounded-full bg-red-500 text-white text-sm font-bold animate-pulse">
              {totalAlerts}
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-px bg-slate-100">
        <div className="bg-white px-4 py-3 text-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 mx-auto mb-1">
            <PackageX className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{outOfStock.length}</p>
          <p className="text-xs text-slate-500">Out of Stock</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 mx-auto mb-1">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{lowStock.length}</p>
          <p className="text-xs text-slate-500">Low Stock</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-600 mx-auto mb-1">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{okItems.length}</p>
          <p className="text-xs text-slate-500">Well Stocked</p>
        </div>
      </div>

      {/* Alert list */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {outOfStock.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500 text-white flex-shrink-0">
              <PackageX className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-red-700">
                Out of stock — reorder now. Threshold: {item.low_stock_threshold} {item.unit}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-red-600">0</p>
              <p className="text-xs text-slate-400">{item.unit}</p>
            </div>
          </div>
        ))}

        {lowStock.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500 text-white flex-shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-amber-700">
                Running low — {item.quantity} of {item.low_stock_threshold} {item.unit} threshold
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-amber-600">{item.quantity}</p>
              <p className="text-xs text-slate-400">{item.unit}</p>
            </div>
          </div>
        ))}

        {!hasAlerts && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-3">
              <Package className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-700">Everything looks good!</p>
            <p className="text-xs text-slate-400 mt-1">No items are running low or out of stock.</p>
          </div>
        )}
      </div>
    </div>
  );
}
