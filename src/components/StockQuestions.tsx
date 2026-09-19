import { useCallback, useState } from 'react';
import { Mic, MicOff, Search, MessageSquare, AlertCircle, Volume2 } from 'lucide-react';
import type { InventoryItem } from '@/lib/supabase';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { parseStockQuestion, type StockAnswer } from '@/lib/voiceParser';

interface StockQuestionsProps {
  items: InventoryItem[];
}

export function StockQuestions({ items }: StockQuestionsProps) {
  const [textInput, setTextInput] = useState('');
  const [answer, setAnswer] = useState<StockAnswer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processQuestion = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setIsProcessing(true);
      const result = parseStockQuestion(text, items);
      setAnswer(result);
      // Speak the answer aloud
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result.message);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
      setIsProcessing(false);
    },
    [items]
  );

  const handleFinalResult = useCallback(
    (transcript: string) => {
      setTextInput(transcript);
      processQuestion(transcript);
    },
    [processQuestion]
  );

  const {
    isListening, transcript, interim, error: speechError, isSupported,
    startListening, stopListening,
  } = useSpeechRecognition({ onFinalResult: handleFinalResult });

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setAnswer(null);
      startListening();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processQuestion(textInput);
  };

  const liveText = transcript || interim;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Stock Questions</h2>
          <p className="text-sm text-slate-500">Ask about stock levels — by voice or text</p>
        </div>
      </div>

      {/* Text + voice input */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={isListening ? liveText : textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="e.g. How many coffee beans do we have?"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing}
          className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Ask
        </button>
        {isSupported && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={isProcessing}
            className={`flex items-center justify-center w-12 rounded-xl transition-all ${
              isListening
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
      </form>

      {/* Speech error */}
      {speechError && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {speechError}
        </div>
      )}

      {/* Answer */}
      {answer && (
        <div className={`mt-4 p-5 rounded-xl ${answer.found ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${answer.found ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold mb-1 ${answer.found ? 'text-blue-900' : 'text-amber-900'}`}>
                {answer.found ? 'Answer' : 'Hmm…'}
              </p>
              <p className={`text-sm ${answer.found ? 'text-blue-800' : 'text-amber-800'}`}>
                {answer.message}
              </p>
              {answer.found && answer.quantity !== undefined && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-white border border-blue-200">
                    <span className="text-xs text-slate-400">Quantity</span>
                    <p className="text-sm font-bold text-slate-800">{answer.quantity} {answer.unit}</p>
                  </div>
                  {answer.status && (
                    <div className="px-3 py-1.5 rounded-lg bg-white border border-blue-200">
                      <span className="text-xs text-slate-400">Status</span>
                      <p className="text-sm font-bold text-slate-800 capitalize">{answer.status}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggested questions */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Try asking:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'How many coffee beans do we have?',
            'What do we have in stock?',
            'Check paper cups stock level',
            'Is sugar in stock?',
          ].map((q) => (
            <button
              key={q}
              onClick={() => {
                setTextInput(q);
                processQuestion(q);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
