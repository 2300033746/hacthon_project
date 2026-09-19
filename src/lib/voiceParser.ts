import type { InventoryItem } from '@/lib/supabase';

export interface ParsedVoiceCommand {
  action: 'add' | 'restock' | 'set' | 'remove' | 'create' | 'unknown';
  itemName?: string;
  quantity?: number;
  unit?: string;
  rawText: string;
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, hundred: 100, dozen: 12, 'a dozen': 12,
};

function parseQuantity(text: string): number | undefined {
  // Match digit-based numbers
  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  // Match word-based numbers
  const lower = text.toLowerCase();
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return num;
  }
  return undefined;
}

function extractUnit(text: string): string | undefined {
  const lower = text.toLowerCase();
  const units = ['kg', 'kilogram', 'grams', 'g', 'boxes', 'box', 'units', 'unit',
    'liters', 'liter', 'l', 'pieces', 'piece', 'packs', 'pack', 'bottles', 'bottle',
    'cans', 'can', 'bags', 'bag', 'cartons', 'carton', 'rolls', 'roll', 'pairs', 'pair'];
  for (const u of units) {
    if (new RegExp(`\\b${u}\\b`).test(lower)) {
      // Normalize to plural form
      if (['kg', 'kilogram', 'kilograms'].includes(u)) return 'kg';
      if (['g', 'gram', 'grams'].includes(u)) return 'g';
      if (['l', 'liter', 'liters', 'litre', 'litres'].includes(u)) return 'liters';
      return u.endsWith('s') ? u : u + 's';
    }
  }
  return undefined;
}

function cleanItemName(text: string, qty: number | undefined, unit: string | undefined): string {
  let cleaned = text;

  // Remove action keywords
  cleaned = cleaned.replace(/\b(add|adding|added|restock|restocking|received|receiving|got|getting|new stock of|stock|deliver|delivered|delivery of|put in|putting in|incoming)\b/gi, '');
  cleaned = cleaned.replace(/\b(create|creating|created|make|making|add new|new product|new item)\b/gi, '');
  cleaned = cleaned.replace(/\b(set|setting|set to|change to|update to|adjust to)\b/gi, '');
  cleaned = cleaned.replace(/\b(remove|removing|removed|sold|selling|sell|take out|taking out|reduce|reducing)\b/gi, '');

  // Remove numbers
  if (qty !== undefined) {
    cleaned = cleaned.replace(/\b\d+\b/g, '');
    // Remove word numbers
    const allNumWords = [...Object.keys(NUMBER_WORDS), 'a dozen'];
    for (const w of allNumWords) {
      cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, 'gi'), '');
    }
  }

  // Remove units
  if (unit) {
    const allUnits = ['kg', 'kilogram', 'kilograms', 'grams', 'g', 'boxes', 'box',
      'units', 'unit', 'liters', 'liter', 'l', 'litre', 'litres', 'pieces', 'piece',
      'packs', 'pack', 'bottles', 'bottle', 'cans', 'can', 'bags', 'bag', 'cartons',
      'carton', 'rolls', 'roll', 'pairs', 'pair', 'of'];
    for (const u of allUnits) {
      cleaned = cleaned.replace(new RegExp(`\\b${u}\\b`, 'gi'), '');
    }
  }

  // Remove filler words
  cleaned = cleaned.replace(/\b(of|the|some|to|into|in|for|with|please|kindly|now|today|just|more|additional|extra)\b/gi, '');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Capitalize first letter
  if (cleaned) cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return cleaned || '';
}

export function parseVoiceCommand(text: string): ParsedVoiceCommand {
  const rawText = text;
  const lower = text.toLowerCase().trim();

  if (!lower) return { action: 'unknown', rawText };

  const qty = parseQuantity(text);
  const unit = extractUnit(text);

  // Detect action type
  const isCreate = /\b(create|creating|created|new product|new item|add new)\b/i.test(lower);
  const isAdd = /\b(add|adding|added|restock|restocking|received|receiving|got|getting|new stock|deliver|delivered|delivery|put in|incoming|more|additional)\b/i.test(lower);
  const isRemove = /\b(remove|removing|removed|sold|selling|sell|take out|taking out|reduce|reducing)\b/i.test(lower);
  const isSet = /\b(set|setting|set to|change to|update to|adjust to|update stock|fix)\b/i.test(lower);

  let action: ParsedVoiceCommand['action'] = 'unknown';
  if (isCreate) action = 'create';
  else if (isRemove) action = 'remove';
  else if (isSet) action = 'set';
  else if (isAdd) action = 'add';

  // Special: "add new" → create
  if (/\badd\s+new\b/i.test(lower)) action = 'create';

  const itemName = cleanItemName(text, qty, unit);

  return { action, itemName, quantity: qty, unit, rawText };
}

export interface StockAnswer {
  found: boolean;
  itemName?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  message: string;
  rawText: string;
}

export function parseStockQuestion(
  text: string,
  items: InventoryItem[]
): StockAnswer {
  const lower = text.toLowerCase().trim();

  // Check if this looks like a question about stock
  const isQuestion = /\b(how many|what.s the stock|stock of|stock level|quantity of|do we have|have we got|check|find|lookup|look up|show me|what do we have|is there|are there|inventory|available)\b/i.test(lower);

  if (!isQuestion && items.length === 0) {
    return { found: false, message: "I didn't catch a question. Try saying 'How many coffee beans do we have?'", rawText: text };
  }

  // Try to match item name from the question
  let bestMatch: InventoryItem | null = null;
  let bestScore = 0;

  for (const item of items) {
    const itemNameLower = item.name.toLowerCase();
    const words = itemNameLower.split(/\s+/);

    // Check for full name match
    if (lower.includes(itemNameLower)) {
      if (itemNameLower.length > bestScore) {
        bestMatch = item;
        bestScore = itemNameLower.length;
      }
      continue;
    }

    // Check for significant word matches (words longer than 2 chars)
    let matchCount = 0;
    for (const word of words) {
      if (word.length <= 2) continue;
      if (lower.includes(word)) matchCount++;
    }
    if (matchCount > 0 && matchCount >= Math.ceil(words.filter(w => w.length > 2).length / 2)) {
      const score = matchCount * 10 + itemNameLower.length;
      if (score > bestScore) {
        bestMatch = item;
        bestScore = score;
      }
    }
  }

  if (!bestMatch) {
    // If it seems like a general "what do we have" type question
    if (/\b(what do we have|what.s in stock|list|show all|show me everything|inventory)\b/i.test(lower)) {
      return {
        found: true,
        message: `You have ${items.length} item${items.length !== 1 ? 's' : ''} in inventory. ${items.filter(i => i.quantity > 0).length} are in stock, ${items.filter(i => i.quantity <= 0).length} are out of stock.`,
        rawText: text,
      };
    }
    return { found: false, message: "I couldn't find that item in your inventory. Try saying the product name more clearly.", rawText: text };
  }

  const item = bestMatch;
  let status: string;
  if (item.quantity <= 0) status = 'out of stock';
  else if (item.quantity <= item.low_stock_threshold) status = 'running low';
  else status = 'well stocked';

  return {
    found: true,
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    status,
    message: `You have ${item.quantity} ${item.unit} of ${item.name}. Status: ${status}.`,
    rawText: text,
  };
}
