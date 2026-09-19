import { useCallback, useRef, useState } from 'react';
import {
  Mic, MicOff, Plus, TrendingUp, TrendingDown, RefreshCw, Check, AlertCircle,
} from 'lucide-react';
import { supabase, type InventoryItem, type InventoryUpdate } from '@/lib/supabase';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { parseVoiceCommand, type ParsedVoiceCommand } from '@/lib/voiceParser';

interface VoiceStockEntryProps {
  items: InventoryItem[];
  onInventoryChanged: () => void;
}

export function VoiceStockEntry({ items, onInventoryChanged }: VoiceStockEntryProps) {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastCommand, setLastCommand] = useState<ParsedVoiceCommand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef<string>('');

  const findItemByName = useCallback((name: string): InventoryItem | null => {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    // Exact match first
    let match = items.find((i) => i.name.toLowerCase() === lower) ?? null;
    // Partial contains match
    if (!match) {
      match = items.find((i) => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase())) ?? null;
    }
    // Word overlap match
    if (!match) {
      const queryWords = lower.split(/\s+/).filter((w) => w.length > 2);
      match = items.find((i) => {
        const itemWords = i.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        return queryWords.some((qw) => itemWords.some((iw) => iw.includes(qw) || qw.includes(iw)));
      }) ?? null;
    }
    return match;
  }, [items]);

  const handleFinalResult = useCallback(async (transcript: string) => {
    if (processedRef.current === transcript) return;
    processedRef.current = transcript;

    const parsed = parseVoiceCommand(transcript);
    setLastCommand(parsed);

    if (parsed.action === 'unknown' || !parsed.itemName) {
      setStatusMessage({
        type: 'error',
        text: "I didn't catch that. Try: 'Add 20 boxes of paper cups' or 'Create new item organic tea bags'",
      });
      return;
    }

    if (!parsed.quantity && parsed.action !== 'create') {
      setStatusMessage({
        type: 'error',
        text: `How many ${parsed.unit ?? 'units'} of ${parsed.itemName}? Try: "Add 20 ${parsed.unit ?? 'boxes'} of ${parsed.itemName}"`,
      });
      return;
    }

    setIsProcessing(true);

    try {
      const existing = findItemByName(parsed.itemName);

      if (parsed.action === 'create') {
        if (existing) {
          setStatusMessage({
            type: 'info',
            text: `${parsed.itemName} already exists with ${existing.quantity} ${existing.unit} in stock. Use "add" to restock instead.`,
          });
          setIsProcessing(false);
          return;
        }
        const insertData: InventoryUpdate = {
          name: parsed.itemName,
          quantity: parsed.quantity ?? 0,
          unit: parsed.unit ?? 'units',
          category: 'General',
          low_stock_threshold: 10,
          price: 0,
        };
        const { error } = await supabase.from('inventory_items').insert(insertData);
        if (error) throw error;
        setStatusMessage({
          type: 'success',
          text: `Created "${parsed.itemName}" with ${parsed.quantity ?? 0} ${parsed.unit ?? 'units'}.`,
        });
      } else if (existing) {
        let newQty: number;
        if (parsed.action === 'add') {
          newQty = existing.quantity + (parsed.quantity ?? 0);
        } else if (parsed.action === 'remove') {
          newQty = Math.max(0, existing.quantity - (parsed.quantity ?? 0));
        } else {
          // set
          newQty = parsed.quantity ?? existing.quantity;
        }

        const updateData: InventoryUpdate = {
          quantity: newQty,
          ...(parsed.unit ? { unit: parsed.unit } : {}),
        };
        const { error } = await supabase.from('inventory_items').update(updateData).eq('id', existing.id);
        if (error) throw error;

        const actionVerb = parsed.action === 'add' ? 'Added' : parsed.action === 'remove' ? 'Removed' : 'Set';
        setStatusMessage({
          type: 'success',
          text: `${actionVerb} ${parsed.quantity} ${parsed.unit ?? existing.unit} of ${existing.name}. New stock: ${newQty} ${parsed.unit ?? existing.unit}.`,
        });
      } else {
        // Item doesn't exist — create it with the spoken quantity
        const insertData: InventoryUpdate = {
          name: parsed.itemName,
          quantity: parsed.quantity ?? 0,
          unit: parsed.unit ?? 'units',
          category: 'General',
          low_stock_threshold: 10,
          price: 0,
        };
        const { error } = await supabase.from('inventory_items').insert(insertData);
        if (error) throw error;
        setStatusMessage({
          type: 'success',
          text: `"${parsed.itemName}" wasn't in your inventory, so I created it with ${parsed.quantity ?? 0} ${parsed.unit ?? 'units'}.`,
        });
      }

      onInventoryChanged();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Something went wrong updating inventory. ${(err as Error).message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [findItemByName, items, onInventoryChanged]);

  const {
    isListening, transcript, interim, error: speechError, isSupported,
    startListening, stopListening, resetTranscript,
  } = useSpeechRecognition({ onFinalResult: handleFinalResult });

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setStatusMessage(null);
      setLastCommand(null);
      resetTranscript();
      startListening();
    }
  };

  const displayText = transcript || interim;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 text-teal-600">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Voice Stock Entry</h2>
          <p className="text-sm text-slate-500">Speak to add, restock, or adjust inventory</p>
        </div>
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center py-8">
        <button
          onClick={handleToggle}
          disabled={!isSupported || isProcessing}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
            isListening
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
              : 'bg-teal-600 text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700 hover:scale-105'
          } disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100`}
          aria-label={isListening ? 'Stop listening' : 'Start voice entry'}
        >
          {isListening ? (
            <>
              <MicOff className="w-8 h-8" />
              <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" />
            </>
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
        <p className="mt-4 text-sm font-medium text-slate-600">
          {!isSupported
            ? 'Voice input not supported in this browser'
            : isListening
            ? 'Listening… speak now'
            : isProcessing
            ? 'Processing…'
            : 'Tap to speak'}
        </p>
      </div>

      {/* Live transcript */}
      {displayText && (
        <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Heard:</p>
          <p className="text-slate-800 text-base">
            {transcript}
            {interim && !transcript && <span className="text-slate-400">{interim}</span>}
          </p>
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <div
          className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium">{statusMessage.text}</p>
        </div>
      )}

      {/* Speech error */}
      {speechError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {speechError}
        </div>
      )}

      {/* Parsed command preview */}
      {lastCommand && lastCommand.action !== 'unknown' && (
        <div className="mb-4 p-4 rounded-xl bg-teal-50 border border-teal-200">
          <p className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-2">Parsed Command</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-teal-700 text-xs font-semibold border border-teal-200">
              {lastCommand.action === 'add' && <TrendingUp className="w-3 h-3" />}
              {lastCommand.action === 'remove' && <TrendingDown className="w-3 h-3" />}
              {lastCommand.action === 'create' && <Plus className="w-3 h-3" />}
              {lastCommand.action === 'set' && <RefreshCw className="w-3 h-3" />}
              {lastCommand.action}
            </span>
            {lastCommand.itemName && (
              <span className="px-2.5 py-1 rounded-full bg-white text-slate-700 text-xs font-medium border border-slate-200">
                {lastCommand.itemName}
              </span>
            )}
            {lastCommand.quantity !== undefined && (
              <span className="px-2.5 py-1 rounded-full bg-white text-slate-700 text-xs font-medium border border-slate-200">
                {lastCommand.quantity} {lastCommand.unit ?? 'units'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Example commands */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Try saying:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Add 20 boxes of paper cups',
            'Create new item organic honey',
            'Restock 50 coffee beans',
            'Remove 5 milk cartons',
            'Set sugar packets to 30',
          ].map((example) => (
            <span
              key={example}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
            >
              "{example}"
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
