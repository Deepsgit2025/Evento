import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AITools } from './aiTools';

const AI_API_KEY_STORE_KEY = 'ai_assistant_api_key';

export interface AIMessage {
  id: string;
  wedding_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: number;
}

// ─── Fuzzy Matching Utilities ───

/** Simple Levenshtein distance for fuzzy matching */
function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[la][lb];
}

/** Check if a word fuzzy-matches any keyword (distance <= threshold) */
function fuzzyContains(text: string, keywords: string[], threshold: number = 2): boolean {
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    for (const keyword of keywords) {
      if (word.includes(keyword) || keyword.includes(word)) return true;
      if (word.length >= 3 && levenshtein(word, keyword) <= threshold) return true;
    }
  }
  return false;
}

// Intent types the engine can detect
type Intent =
  | 'GREETING'
  | 'HELP'
  | 'WEDDING_SUMMARY'
  | 'GET_GUEST'
  | 'GET_GUEST_ROOM'
  | 'GET_GUEST_INVITATION'
  | 'GET_ROOM_GUESTS'
  | 'GET_EMPTY_ROOMS'
  | 'GET_UNASSIGNED_GUESTS'
  | 'GET_UPCOMING_EVENTS'
  | 'GET_EVENT_GUESTS'
  | 'GET_VENDOR_PAYMENT'
  | 'GET_TOTAL_EXPENSES'
  | 'GET_TOTAL_PAYMENTS'
  | 'GET_PENDING_PAYMENTS'
  | 'GET_GUEST_COUNT'
  | 'GET_SIDE_COUNT'
  | 'GET_EVENT_COUNT'
  | 'GET_BUDGET'
  | 'UNKNOWN';

interface DetectedIntent {
  intent: Intent;
  params: Record<string, string>;
}

// ─── Keyword-based intent rules with fuzzy support ───

interface IntentRule {
  intent: Intent;
  keywords: string[][]; // Array of keyword groups — if ALL keywords in any group are found, it matches
  fuzzyKeywords?: string[][]; // Same but uses fuzzy matching
}

const INTENT_RULES: IntentRule[] = [
  // Greetings
  {
    intent: 'GREETING',
    keywords: [
      ['hello'], ['hi'], ['hey'], ['namaste'], ['namaskar'], ['hlo'], ['hii'],
      ['good', 'morning'], ['good', 'evening'], ['good', 'afternoon'],
      ['kaise', 'ho'], ['kya', 'hal']
    ],
  },
  // Help
  {
    intent: 'HELP',
    keywords: [
      ['help'], ['madad'], ['kya', 'kar', 'sakte'], ['what', 'can', 'you'],
      ['commands'], ['features']
    ],
  },
  // Guest room queries
  {
    intent: 'GET_GUEST_ROOM',
    keywords: [
      ['room', 'konsa'], ['room', 'kaun'], ['room', 'kaunsa'],
      ['ka', 'room'], ['ki', 'room'], ['ke', 'room'], ['kiska', 'room'],
      ['room', 'number'], ['kis', 'room'], ['room', 'mein'],
      ['kahan', 'hai'], ['kahan', 'reh'], ['where', 'stay'],
      ['room', 'assign'], ['room', 'allot'],
    ],
    fuzzyKeywords: [
      ['room', 'konsa'], ['kamra', 'konsa'], ['kamre']
    ],
  },
  // Room occupants
  {
    intent: 'GET_ROOM_GUESTS',
    keywords: [
      ['room', 'kaun'], ['room', 'mein', 'kaun'], ['room', 'mein', 'kon'],
      ['who', 'room'], ['room', 'occupant'], ['room', 'guest'],
    ],
  },
  // Guest invitation status
  {
    intent: 'GET_GUEST_INVITATION',
    keywords: [
      ['patrika', 'di'], ['patrika', 'bhej'], ['patrika', 'sent'],
      ['invitation', 'sent'], ['invitation', 'status'], ['invite', 'bhej'],
      ['ko', 'patrika'], ['ka', 'patrika'], ['ki', 'patrika'],
    ],
    fuzzyKeywords: [
      ['patrika', 'status'], ['nimantran']
    ],
  },
  // Event guests
  {
    intent: 'GET_EVENT_GUESTS',
    keywords: [
      ['mein', 'kaun', 'aa'], ['mein', 'kitne'], ['mein', 'log'],
      ['kaun', 'aa', 'raha'], ['who', 'coming'], ['who', 'attend'],
      ['guests', 'for'], ['guests', 'at'], ['attending'],
    ],
    fuzzyKeywords: [
      ['mehndi', 'kaun'], ['sangeet', 'kaun'], ['haldi', 'kaun'],
      ['reception', 'kaun'], ['wedding', 'kaun']
    ],
  },
  // Upcoming events
  {
    intent: 'GET_UPCOMING_EVENTS',
    keywords: [
      ['upcoming', 'event'], ['next', 'event'], ['agle', 'event'],
      ['event', 'list'], ['event', 'schedule'], ['kal', 'event'],
      ['aaj', 'event'], ['function', 'list'], ['ceremony'],
      ['events', 'kab'], ['events', 'kitne'], ['konsa', 'event'],
      ['kya', 'function'], ['kya', 'event'],
    ],
    fuzzyKeywords: [
      ['upcoming', 'functions'], ['events', 'timeline']
    ],
  },
  // Vendor payment
  {
    intent: 'GET_VENDOR_PAYMENT',
    keywords: [
      ['payment', 'kitna'], ['payment', 'diya'], ['payment', 'baaki'],
      ['vendor', 'payment'], ['vendor', 'paisa'], ['vendor', 'bill'],
      ['photographer', 'payment'], ['caterer', 'payment'], ['decorator', 'payment'],
      ['ka', 'payment'], ['ki', 'payment'], ['ke', 'payment'],
      ['kitna', 'diya'], ['kitna', 'dena'], ['kitna', 'baaki'],
      ['how', 'much', 'paid'], ['how', 'much', 'pay'],
    ],
    fuzzyKeywords: [
      ['payment', 'karna'], ['paisa', 'dena'], ['bill', 'kitna']
    ],
  },
  // Total expenses
  {
    intent: 'GET_TOTAL_EXPENSES',
    keywords: [
      ['total', 'expense'], ['total', 'kharch'], ['kul', 'kharch'],
      ['sab', 'kharch'], ['total', 'cost'], ['kitna', 'kharch'],
      ['how', 'much', 'spent'], ['total', 'spent'],
    ],
    fuzzyKeywords: [
      ['kharcha', 'kitna'], ['expense', 'total']
    ],
  },
  // Budget
  {
    intent: 'GET_BUDGET',
    keywords: [
      ['budget'], ['total', 'budget'], ['remaining', 'budget'],
      ['budget', 'kitna'], ['budget', 'bacha'],
    ],
  },
  // Pending payments
  {
    intent: 'GET_PENDING_PAYMENTS',
    keywords: [
      ['pending', 'payment'], ['baaki', 'payment'], ['remaining', 'payment'],
      ['kitna', 'baaki'], ['kitna', 'dena'], ['how', 'much', 'pending'],
      ['unpaid'], ['due', 'payment'],
    ],
  },
  // Guest count
  {
    intent: 'GET_GUEST_COUNT',
    keywords: [
      ['kitne', 'guest'], ['kitne', 'mehman'], ['kitne', 'log'],
      ['how', 'many', 'guest'], ['total', 'guest'], ['guest', 'count'],
      ['kitne', 'people'], ['total', 'people'], ['total', 'log'],
    ],
    fuzzyKeywords: [
      ['mehman', 'kitne'], ['mehmaan', 'kitne']
    ],
  },
  // Side count
  {
    intent: 'GET_SIDE_COUNT',
    keywords: [
      ['dulhan', 'side'], ['bride', 'side'], ['ladki', 'side'],
      ['dulha', 'side'], ['groom', 'side'], ['ladka', 'side'],
      ['dulhan', 'taraf'], ['dulha', 'taraf'],
      ['bride', 'kitne'], ['groom', 'kitne'],
    ],
  },
  // Unassigned guests
  {
    intent: 'GET_UNASSIGNED_GUESTS',
    keywords: [
      ['without', 'room'], ['bina', 'room'], ['no', 'room'],
      ['room', 'nahi'], ['room', 'nhi'], ['unassigned'],
      ['need', 'room'], ['room', 'chahiye'],
    ],
    fuzzyKeywords: [
      ['bina', 'kamra'], ['kamra', 'nahi']
    ],
  },
  // Empty rooms
  {
    intent: 'GET_EMPTY_ROOMS',
    keywords: [
      ['empty', 'room'], ['khali', 'room'], ['available', 'room'],
      ['room', 'khali'], ['kamra', 'khali'], ['free', 'room'],
    ],
  },
  // Wedding summary
  {
    intent: 'WEDDING_SUMMARY',
    keywords: [
      ['wedding', 'summary'], ['shaadi', 'summary'], ['status'],
      ['overall', 'status'], ['full', 'summary'], ['sab', 'batao'],
      ['complete', 'status'], ['wedding', 'status'],
    ],
  },
  // Generic guest lookup (must be last)
  {
    intent: 'GET_GUEST',
    keywords: [
      ['about'], ['details'], ['info'], ['jankari'], ['batao'],
    ],
  },
];

// ─── Intent Detection ───

function detectIntent(query: string): DetectedIntent {
  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);

  for (const rule of INTENT_RULES) {
    // Check exact keyword groups
    for (const keywordGroup of rule.keywords) {
      if (keywordGroup.every(kw => lowerQuery.includes(kw))) {
        return { intent: rule.intent, params: extractParams(query, rule.intent) };
      }
    }
    // Check fuzzy keyword groups
    if (rule.fuzzyKeywords) {
      for (const keywordGroup of rule.fuzzyKeywords) {
        if (keywordGroup.every(kw => fuzzyContains(lowerQuery, [kw], 2))) {
          return { intent: rule.intent, params: extractParams(query, rule.intent) };
        }
      }
    }
  }
  
  // Fallback: if query contains a name-like word, try guest lookup
  const nameWords = query.split(/\s+/).filter(w => w.length > 2 && /^[A-Za-z]/.test(w));
  if (nameWords.length > 0 && nameWords.length <= 4) {
    return { intent: 'GET_GUEST', params: { name: nameWords.join(' ') } };
  }
  
  return { intent: 'UNKNOWN', params: {} };
}

function extractParams(query: string, intent: Intent): Record<string, string> {
  const params: Record<string, string> = {};
  switch (intent) {
    case 'GET_GUEST_ROOM':
    case 'GET_GUEST_INVITATION':
    case 'GET_GUEST':
      params.name = extractName(query);
      break;
    case 'GET_ROOM_GUESTS':
      params.roomNumber = extractRoomNumber(query);
      break;
    case 'GET_EVENT_GUESTS':
      params.eventName = extractEventName(query);
      break;
    case 'GET_VENDOR_PAYMENT':
      params.vendorName = extractVendorName(query);
      break;
    case 'GET_SIDE_COUNT':
      params.side = extractSide(query);
      break;
  }
  return params;
}

// ─── Parameter Extractors ───

const STOP_WORDS = new Set([
  'ka', 'ki', 'ke', 'ko', 'kya', 'hai', 'konsa', 'konsi', 'kaun', 'kaunsa',
  'room', 'patrika', 'invitation', 'payment', 'kahan', 'where', 'is', 'the',
  'about', 'details', 'info', 'mein', 'me', 'mai', 'kitna', 'how', 'much',
  'staying', 'assigned', 'status', 'batao', 'bata', 'do', 'de', 'show',
  'total', 'guest', 'guests', 'log', 'people', 'event', 'vendor',
  'what', 'which', 'tell', 'give', 'se', 'ne', 'aur', 'ya', 'or', 'and',
  'for', 'in', 'at', 'to', 'of', 'on', 'with', 'has', 'have', 'are',
  'kiska', 'kiski', 'kiske', 'diya', 'bhej', 'sent', 'side', 'taraf'
]);

function extractName(query: string): string {
  const words = query
    .replace(/[?\"'.!,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
  
  // Take contiguous capitalized or non-stop words as the name
  return words.slice(0, 3).join(' ').trim();
}

function extractRoomNumber(query: string): string {
  const match = query.match(/room\s*(?:#|no\.?\s*)?(\d+[a-z]?)/i) 
    || query.match(/(\d+[a-z]?)\s*(?:no\.?\s*)?(?:room|kamra|kamre)/i)
    || query.match(/\b(\d{1,4}[a-z]?)\b/);
  return match ? match[1] : '';
}

function extractEventName(query: string): string {
  const eventKeywords = [
    'mehndi', 'mehendi', 'sangeet', 'haldi', 'wedding', 'reception',
    'baraat', 'barat', 'tilak', 'engagement', 'cocktail', 'ceremony',
    'shaadi', 'shadi', 'nikah', 'phera', 'phere', 'bidai', 'vidai',
    'mandap', 'ganesh', 'puja', 'sehrabandi', 'jaimala', 'kanyadaan'
  ];
  const lowerQuery = query.toLowerCase();
  
  for (const keyword of eventKeywords) {
    if (lowerQuery.includes(keyword)) return keyword;
  }
  
  const match = query.match(/(?:in|at|for|mein|me|mai)\s+(\w+(?:\s+\w+)?)\s+(?:event|function|ceremony)?/i);
  return match ? match[1] : '';
}

function extractVendorName(query: string): string {
  const vendorTypes = [
    'photographer', 'caterer', 'decorator', 'dj', 'florist', 'makeup',
    'mehndi', 'pandit', 'tent', 'band', 'halwai', 'videographer',
    'planner', 'catering', 'mandap', 'lighting', 'fireworks'
  ];
  const lowerQuery = query.toLowerCase();
  
  for (const vtype of vendorTypes) {
    if (lowerQuery.includes(vtype)) return vtype;
  }
  
  return extractName(query);
}

function extractSide(query: string): string {
  const lowerQuery = query.toLowerCase();
  if (['dulhan', 'bride', 'ladki'].some(w => lowerQuery.includes(w))) return 'Bride';
  if (['dulha', 'groom', 'ladka'].some(w => lowerQuery.includes(w))) return 'Groom';
  return '';
}

// ─── Response Formatting ───

function formatResponse(intent: Intent, data: any, params: Record<string, string>, language: string = 'en'): string {
  const isHindi = language === 'hi';
  
  // Handle greeting
  if (intent === 'GREETING') {
    return isHindi
      ? "नमस्ते! 🙏 मैं आपका वेडिंग असिस्टेंट हूं। मुझसे मेहमानों, कमरों, खर्चों या कार्यक्रम के बारे में कुछ भी पूछें!"
      : "Hello! 🙏 I'm your wedding assistant. Ask me about guests, rooms, expenses, or events!";
  }
  
  // Handle help
  if (intent === 'HELP') {
    return isHindi
      ? "मैं आपकी इन चीजों में मदद कर सकता हूं:\n\n👫 मेहमानों की जानकारी\n🏨 कमरा कौन सा है\n💰 खर्चे और payment\n📋 कार्यक्रम की जानकारी\n✉️ पत्रिका स्टेटस\n\nबस पूछें! जैसे: \"Rohan ka room konsa hai?\""
      : "I can help you with:\n\n👫 Guest information & count\n🏨 Room assignments\n💰 Expenses & vendor payments\n📋 Event schedules\n✉️ Invitation status\n\nJust ask! E.g.: \"How many guests total?\", \"Rohan ka room?\"";
  }
  
  if (!data || (data.result && typeof data.result === 'string' && (data.result.includes('No ') || data.result.includes('not found')))) {
    return isHindi
      ? "यह जानकारी आपके शादी के रिकॉर्ड में अभी उपलब्ध नहीं है।"
      : "I don't have that information in your wedding records yet.";
  }
  
  const result = data.result;
  
  switch (intent) {
    case 'GET_GUEST':
    case 'GET_GUEST_ROOM': {
      if (Array.isArray(result) && result.length > 0) {
        const g = result[0];
        let response = '';
        if (intent === 'GET_GUEST_ROOM') {
          if (g.room_number) {
            response = isHindi
              ? `🏨 ${g.full_name} ${g.hotel_name || ''} के Room ${g.room_number} में हैं।`
              : `🏨 ${g.full_name} is in Room ${g.room_number}${g.hotel_name ? ` at ${g.hotel_name}` : ''}.`;
          } else {
            response = isHindi
              ? `${g.full_name} को अभी कोई कमरा नहीं दिया गया है।`
              : `${g.full_name} doesn't have a room assigned yet.`;
          }
        } else {
          response = isHindi
            ? `👤 ${g.full_name}\n• पक्ष: ${g.side === 'Bride' ? 'दुल्हन' : 'दूल्हा'}\n• RSVP: ${g.rsvp_status}\n• पार्टी: ${g.party_size} लोग`
            : `👤 ${g.full_name}\n• Side: ${g.side}\n• RSVP: ${g.rsvp_status}\n• Party size: ${g.party_size}`;
          if (g.room_number) {
            response += isHindi ? `\n• कमरा: ${g.room_number}` : `\n• Room: ${g.room_number}`;
          }
        }
        return response;
      }
      return isHindi ? "इस नाम का कोई मेहमान नहीं मिला।" : "No guest found with that name.";
    }
    
    case 'GET_GUEST_INVITATION': {
      if (Array.isArray(result) && result.length > 0) {
        const inv = result[0];
        const statusMap: Record<string, string> = {
          'NOT_SENT': isHindi ? '❌ नहीं भेजा' : '❌ Not sent',
          'SENT': isHindi ? '✅ भेज दिया' : '✅ Sent',
          'QUEUED': isHindi ? '⏳ तैयार' : '⏳ Queued',
          'FAILED': isHindi ? '❗ विफल' : '❗ Failed',
        };
        return isHindi
          ? `✉️ ${inv.full_name} की पत्रिका "${inv.title}" — ${statusMap[inv.status] || inv.status}`
          : `✉️ ${inv.full_name}'s invitation "${inv.title}" — ${statusMap[inv.status] || inv.status}`;
      }
      return isHindi ? "इस मेहमान के लिए कोई पत्रिका नहीं मिली।" : "No invitation found for this guest.";
    }
    
    case 'GET_ROOM_GUESTS': {
      if (Array.isArray(result) && result.length > 0) {
        const names = result.map((r: any) => r.full_name).join(', ');
        return isHindi
          ? `🏨 कमरा ${params.roomNumber || ''} में: ${names}`
          : `🏨 Room ${params.roomNumber || ''}: ${names}`;
      }
      return isHindi
        ? `कमरा ${params.roomNumber || ''} में कोई नहीं है।`
        : `No one is assigned to Room ${params.roomNumber || ''}.`;
    }
    
    case 'GET_UPCOMING_EVENTS': {
      if (Array.isArray(result) && result.length > 0) {
        const lines = result.map((e: any) => {
          const parts = [e.name];
          if (e.date) parts.push(`📅 ${e.date}`);
          if (e.start_time) parts.push(`⏰ ${e.start_time}`);
          if (e.location) parts.push(`📍 ${e.location}`);
          return `• ${parts.join(' · ')}`;
        });
        return isHindi
          ? `🎉 आगामी कार्यक्रम:\n\n${lines.join('\n')}`
          : `🎉 Upcoming events:\n\n${lines.join('\n')}`;
      }
      return isHindi ? "कोई कार्यक्रम नियोजित नहीं है।" : "No events scheduled.";
    }
    
    case 'GET_EVENT_GUESTS': {
      if (Array.isArray(result) && result.length > 0) {
        const count = result.length;
        const totalParty = result.reduce((sum: number, g: any) => sum + (g.party_size || 1), 0);
        const eventName = params.eventName || 'this event';
        return isHindi
          ? `🎊 ${eventName} में ${count} मेहमान (कुल ${totalParty} लोग) आ रहे हैं।`
          : `🎊 ${count} guests (${totalParty} people total) are coming to ${eventName}.`;
      }
      return isHindi
        ? `${params.eventName || 'इस कार्यक्रम'} के लिए कोई मेहमान नहीं मिले।`
        : `No guests found for ${params.eventName || 'this event'}.`;
    }
    
    case 'GET_VENDOR_PAYMENT': {
      if (Array.isArray(result) && result.length > 0) {
        const lines = result.map((v: any) => {
          return isHindi
            ? `💳 ${v.name} (${v.category})\n   तय: ₹${v.agreed_amount.toLocaleString()}, दिया: ₹${v.total_paid.toLocaleString()}, बाकी: ₹${v.pending.toLocaleString()}`
            : `💳 ${v.name} (${v.category})\n   Agreed: ₹${v.agreed_amount.toLocaleString()}, Paid: ₹${v.total_paid.toLocaleString()}, Pending: ₹${v.pending.toLocaleString()}`;
        });
        return lines.join('\n\n');
      }
      return isHindi ? "कोई विक्रेता नहीं मिला।" : "No vendors found.";
    }
    
    case 'GET_TOTAL_EXPENSES': {
      if (result && typeof result === 'object') {
        return isHindi
          ? `💰 खर्चों का सारांश:\n\n• सामान्य खर्चे: ₹${result.total_general_expenses.toLocaleString()}\n• विक्रेता भुगतान: ₹${result.total_vendor_payments.toLocaleString()}\n• कुल: ₹${result.combined_total.toLocaleString()}`
          : `💰 Expense Summary:\n\n• General expenses: ₹${result.total_general_expenses.toLocaleString()}\n• Vendor payments: ₹${result.total_vendor_payments.toLocaleString()}\n• Total: ₹${result.combined_total.toLocaleString()}`;
      }
      return typeof result === 'string' ? result : (isHindi ? "खर्चे की जानकारी उपलब्ध नहीं है।" : "No expense data available.");
    }

    case 'GET_BUDGET': {
      if (result && typeof result === 'object') {
        if (result.budget === null) {
          return isHindi ? "अभी कोई बजट सेट नहीं किया गया है।" : "No budget has been set yet.";
        }
        return isHindi
          ? `💰 बजट: ₹${result.budget.toLocaleString()}\n• खर्च: ₹${result.spent.toLocaleString()}\n• बचा: ₹${result.remaining.toLocaleString()}`
          : `💰 Budget: ₹${result.budget.toLocaleString()}\n• Spent: ₹${result.spent.toLocaleString()}\n• Remaining: ₹${result.remaining.toLocaleString()}`;
      }
      return isHindi ? "बजट की जानकारी उपलब्ध नहीं है।" : "Budget info not available.";
    }
    
    case 'GET_GUEST_COUNT': {
      if (typeof result === 'object' && result.count !== undefined) {
        return isHindi
          ? `👫 शादी में कुल ${result.count} मेहमान हैं (${result.totalPeople} लोग)।`
          : `👫 There are ${result.count} guest entries (${result.totalPeople} people total).`;
      }
      return typeof result === 'string' ? result : (isHindi ? "मेहमानों की जानकारी उपलब्ध नहीं है।" : "Guest count not available.");
    }
    
    case 'GET_SIDE_COUNT': {
      if (typeof result === 'object' && result.count !== undefined) {
        const side = params.side === 'Bride' ? (isHindi ? 'दुल्हन' : 'Bride') : (isHindi ? 'दूल्हा' : 'Groom');
        return isHindi
          ? `${side} की तरफ से ${result.count} मेहमान हैं।`
          : `There are ${result.count} guests from the ${side}'s side.`;
      }
      return typeof result === 'string' ? result : '';
    }
    
    case 'GET_UNASSIGNED_GUESTS':
      return typeof result === 'string' ? `🏨 ${result}` : (isHindi ? "जानकारी उपलब्ध नहीं है।" : "Information not available.");
    
    case 'GET_EMPTY_ROOMS':
      return typeof result === 'string' ? `🏨 ${result}` : (isHindi ? "जानकारी उपलब्ध नहीं है।" : "Information not available.");
    
    case 'GET_PENDING_PAYMENTS':
      return typeof result === 'string' ? `💳 ${result}` : (isHindi ? "जानकारी उपलब्ध नहीं है।" : "Information not available.");

    case 'WEDDING_SUMMARY':
      if (result && typeof result === 'object') {
        return isHindi
          ? `📋 शादी का सारांश:\n\n👫 कुल मेहमान: ${result.totalPeople} लोग (${result.guestCount} रिकॉर्ड)\n🎉 कार्यक्रम: ${result.eventCount}\n🏨 कमरे: ${result.roomCount}\n💼 विक्रेता: ${result.vendorCount}\n💰 कुल खर्चा: ₹${result.totalSpent.toLocaleString()}`
          : `📋 Wedding Summary:\n\n👫 Total Guests: ${result.totalPeople} people (${result.guestCount} records)\n🎉 Events: ${result.eventCount}\n🏨 Rooms: ${result.roomCount}\n💼 Vendors: ${result.vendorCount}\n💰 Total Spent: ₹${result.totalSpent.toLocaleString()}`;
      }
      return isHindi ? "सारांश उपलब्ध नहीं है।" : "Summary not available.";
    
    default:
      return isHindi
        ? "मुझे यह समझ नहीं आया। कृपया मेहमानों, कमरों, खर्चों या कार्यक्रम के बारे में पूछें।"
        : "I didn't quite understand that. Try asking about guests, rooms, expenses, or events!";
  }
}

export const AIService = {
  /**
   * The assistant answers from the local database, so a key is optional.
   * It is stored for the cloud-model path that the settings screen configures.
   */
  async getApiKey(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AI_API_KEY_STORE_KEY);
    } catch {
      return null;
    }
  },

  async setApiKey(key: string): Promise<void> {
    if (!key) {
      await SecureStore.deleteItemAsync(AI_API_KEY_STORE_KEY);
      return;
    }
    await SecureStore.setItemAsync(AI_API_KEY_STORE_KEY, key);
  },

  async getChatHistory(db: SQLite.SQLiteDatabase, weddingId: string): Promise<AIMessage[]> {
    return await db.getAllAsync<AIMessage>(
      `SELECT * FROM ai_messages WHERE wedding_id = ? ORDER BY created_at ASC`,
      [weddingId]
    );
  },

  async clearChatHistory(db: SQLite.SQLiteDatabase, weddingId: string) {
    await db.runAsync(`DELETE FROM ai_messages WHERE wedding_id = ?`, [weddingId]);
  },

  async sendMessage(db: SQLite.SQLiteDatabase, weddingId: string, message: string, language: string = 'en'): Promise<string> {
    const userId = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO ai_messages (id, wedding_id, role, content) VALUES (?, ?, ?, ?)`,
      [userId, weddingId, 'user', message]
    );

    try {
      const { intent, params } = detectIntent(message);
      
      let data: any = null;
      
      switch (intent) {
        case 'GREETING':
        case 'HELP':
          // No data needed
          break;
        case 'GET_GUEST':
        case 'GET_GUEST_ROOM':
          if (params.name) data = await AITools.getGuestByName(db, weddingId, params.name);
          break;
        case 'GET_GUEST_INVITATION':
          if (params.name) data = await AITools.getGuestInvitationStatus(db, weddingId, params.name);
          break;
        case 'GET_ROOM_GUESTS':
          if (params.roomNumber) data = await AITools.getRoomOccupants(db, weddingId, params.roomNumber);
          break;
        case 'GET_UPCOMING_EVENTS':
          data = await AITools.getUpcomingEvents(db, weddingId);
          break;
        case 'GET_EVENT_GUESTS':
          if (params.eventName) data = await AITools.getEventGuests(db, weddingId, params.eventName);
          break;
        case 'GET_VENDOR_PAYMENT':
          data = await AITools.getVendorPaymentSummary(db, weddingId, params.vendorName);
          break;
        case 'GET_TOTAL_EXPENSES':
          data = await AITools.getWeddingExpensesSummary(db, weddingId);
          break;
        case 'GET_BUDGET':
          data = await AITools.getBudgetSummary(db, weddingId);
          break;
        case 'GET_GUEST_COUNT':
          data = await AITools.getGuestCount(db, weddingId);
          break;
        case 'GET_SIDE_COUNT':
          data = await AITools.getSideCount(db, weddingId, params.side || 'Bride');
          break;
        case 'GET_UNASSIGNED_GUESTS':
          data = await AITools.getGuestsWithoutRooms(db, weddingId);
          break;
        case 'GET_EMPTY_ROOMS':
          data = await AITools.getEmptyRooms(db, weddingId);
          break;
        case 'GET_PENDING_PAYMENTS':
          data = await AITools.getPendingPayments(db, weddingId);
          break;
        case 'WEDDING_SUMMARY':
          data = await AITools.getWeddingSummary(db, weddingId);
          break;
      }
      
      const response = formatResponse(intent, data, params, language);
      
      await db.runAsync(
        `INSERT INTO ai_messages (id, wedding_id, role, content) VALUES (?, ?, ?, ?)`,
        [Crypto.randomUUID(), weddingId, 'model', response]
      );
      
      return response;
    } catch (e: any) {
      const errorMsg = language === 'hi'
        ? "क्षमा करें, इस प्रश्न का उत्तर देने में समस्या हुई।"
        : "Sorry, I had trouble answering that question.";
      
      await db.runAsync(
        `INSERT INTO ai_messages (id, wedding_id, role, content) VALUES (?, ?, ?, ?)`,
        [Crypto.randomUUID(), weddingId, 'model', errorMsg]
      );
      
      return errorMsg;
    }
  }
};
