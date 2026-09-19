import { useState } from 'react';
import {
  Package, Search, Edit2, Trash2, X, Check, AlertTriangle, PackageX,
} from 'lucide-react';
import type { InventoryItem, InventoryUpdate } from '@/lib/supabase';
import { supabase, getAlertLevel, ALERT_LEVELS } from '@/lib/supabase';

interface InventoryListProps {
  items: InventoryItem[];
  onInventoryChanged: () => void;
}

export function InventoryList({ items, onInventoryChanged }: InventoryListProps) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<InventoryUpdate>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      (i.sku?.toLowerCase().includes(q) ?? false) ||
      i.category.toLowerCase().includes(q)
    );
  });

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold,
      price: item.price,
      notes: item.notes,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from('inventory_items').update(editForm).eq('id', editingId);
    if (error) {
      alert(`Failed to save: ${error.message}`);
      return;
    }
    setEditingId(null);
    setEditForm({});
    onInventoryChanged();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('inventory_items').delete().eq('id', deleteId);
    if (error) {
      alert(`Failed to delete: ${error.message}`);
      return;
    }
    setDeleteId(null);
    onInventoryChanged();
  };

  const alertBadge = (item: InventoryItem) => {
    const level = getAlertLevel(item);
    if (level === ALERT_LEVELS.OUT_OF_STOCK) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
          <PackageX className="w-3 h-3" /> Out
        </span>
      );
    }
    if (level === ALERT_LEVELS.LOW_STOCK) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
          <AlertTriangle className="w-3 h-3" /> Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
        <Check className="w-3 h-3" /> OK
      </span>
    );
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Inventory</h2>
              <p className="text-sm text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm w-40 sm:w-56 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No items found{search ? ` for "${search}"` : ''}. Use voice entry to add items.
                </td>
              </tr>
            )}
            {filtered.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <input
                          type="text"
                          value={editForm.sku ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                          placeholder="SKU"
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        {item.sku && <p className="text-xs text-slate-400">{item.sku}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.category ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    ) : (
                      <span className="text-sm text-slate-600">{item.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={editForm.quantity ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value, 10) || 0 })}
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-sm text-right focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <input
                          type="text"
                          value={editForm.unit ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.quantity}</p>
                        <p className="text-xs text-slate-400">{item.unit}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editForm.low_stock_threshold ?? 10}
                          onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: parseInt(e.target.value, 10) || 0 })}
                          className="w-16 px-2 py-1 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                          placeholder="Threshold"
                        />
                      </div>
                    ) : (
                      alertBadge(item)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            aria-label="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                            aria-label="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            aria-label="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Delete item?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              This will permanently remove the item from your inventory. This can't be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
