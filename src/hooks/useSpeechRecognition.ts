import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal type declarations for the Web Speech API (not in standard TS lib)
interface SpeechRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognition(): (new () => ISpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinalResult?: (transcript: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = 'en-US', continuous = false, interimResults = true, onFinalResult } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onFinalRef = useRef(onFinalResult);
  onFinalRef.current = onFinalResult;

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setIsSupported(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setTranscript((prev) => (prev ? prev + ' ' : '') + finalText.trim());
        setInterim('');
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event: Event) => {
      const e = event as unknown as { error?: string };
      if (e.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (e.error === 'network') {
        setError('Network error during speech recognition.');
      } else {
        setError(`Speech recognition error: ${e.error ?? 'unknown'}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang, continuous, interimResults]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setTranscript('');
    setInterim('');
    try {
      recognitionRef.current.start();
    } catch {
      // start() throws if already started — safe to ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interim,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
