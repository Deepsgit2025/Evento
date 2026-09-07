import { Event, Wedding } from '../database/types';
import { PatrikaCustomization } from './patrika';
import { InvitationTheme, getInvitationTheme, DEFAULT_INVITATION_THEME_ID } from './invitationThemes';

/**
 * Resolves the couple/date/venue/theme details for an invitation and builds
 * the plain-text WhatsApp message. The visual invitation itself is the live,
 * auto-scrolling web page at docs/invite.html (see `buildLiveInviteUrl` in
 * `./liveInvite`) — this file only resolves what that page and the WhatsApp
 * text need.
 */

const HINDI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
const HINDI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

const EVENT_TYPE_HINDI: Record<string, string> = {
  Haldi: 'हल्दी',
  Mehndi: 'मेहंदी',
  Sangeet: 'संगीत संध्या',
  'DJ Night': 'डीजे नाइट',
  Baraat: 'बारात',
  Wedding: 'विवाह समारोह',
  Reception: 'स्वागत समारोह',
  Dinner: 'रात्रि भोज',
};

/** Parses "YYYY-MM-DD" as local time and renders it as a Hindi date, e.g. "२४ अक्टूबर २०२६" with weekday. */
export function formatIsoDateHindi(value: string | null | undefined, withWeekday = false): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const monthName = HINDI_MONTHS[Number(m) - 1];
  const base = `${Number(d)} ${monthName} ${y}`;
  return withWeekday ? `${HINDI_WEEKDAYS[date.getDay()]}, ${base}` : base;
}

function formatTimeHindi(time: string | null | undefined): string {
  if (!time) return '';
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const h = parseInt(match[1], 10);
  const m = match[2];
  let period = 'रात';
  if (h >= 4 && h < 12) period = 'सुबह';
  else if (h >= 12 && h < 16) period = 'दोपहर';
  else if (h >= 16 && h < 19) period = 'शाम';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

export interface InvitationDetails {
  brideName: string;
  groomName: string;
  date: string;
  venue: string;
  message: string;
  theme: InvitationTheme;
  /** Raw "YYYY-MM-DD" wedding date, kept separately from the display `date` string so the live invite can compute a real countdown even when `date` has been freely edited by the couple. */
  weddingDateIso?: string;
}

/**
 * Resolves what the invitation should say: per-invitation overrides win, and
 * the wedding profile fills in anything the user didn't customize.
 */
export function resolveInvitationDetails(
  wedding: Pick<Wedding, 'bride_name' | 'groom_name' | 'date' | 'venue'> | null,
  customization: Partial<PatrikaCustomization>
): InvitationDetails {
  return {
    brideName: customization.custom_bride_name || wedding?.bride_name || '',
    groomName: customization.custom_groom_name || wedding?.groom_name || '',
    date: customization.custom_date || formatIsoDateHindi(wedding?.date) || '',
    venue: customization.custom_venue || wedding?.venue || '',
    message: customization.message || '',
    theme: getInvitationTheme(customization.pdf_theme || DEFAULT_INVITATION_THEME_ID),
    weddingDateIso: wedding?.date || undefined,
  };
}

/** Plain-text version used for the WhatsApp message body (Hindi, includes the programme). */
export function buildInvitationText(details: InvitationDetails, guestName: string, events: Event[] = []): string {
  const lines: string[] = [];
  lines.push('॥ श्री गणेशाय नमः ॥');
  lines.push('');
  if (details.brideName && details.groomName) {
    lines.push(`${details.brideName} ❁ ${details.groomName}`);
    lines.push('');
  }
  lines.push(`प्रिय ${guestName} जी,`);
  if (details.message) {
    lines.push(details.message.replace(/{guest name}/gi, guestName));
  } else {
    lines.push('दोनों परिवारों के स्नेह आशीर्वाद सहित, हम आपको हमारे विवाह में सादर आमंत्रित करते हैं।');
  }
  if (details.date) lines.push(`\nदिनांक: ${details.date}`);
  if (details.venue) lines.push(`स्थान: ${details.venue}`);

  if (events.length > 0) {
    lines.push('\nविवाह के कार्यक्रम:');
    for (const ev of events) {
      const label = ev.event_type && EVENT_TYPE_HINDI[ev.event_type] ? EVENT_TYPE_HINDI[ev.event_type] : ev.name;
      const dateLine = ev.date ? formatIsoDateHindi(ev.date, true) : '';
      const timeLine = ev.start_time ? formatTimeHindi(ev.start_time) : '';
      lines.push(`• ${label}${dateLine ? ' — ' + dateLine : ''}${timeLine ? ', ' + timeLine : ''}`);
    }
  }

  lines.push('\nनीचे दिए लिंक पर टैप करके पूरा निमंत्रण देखें और उपस्थिति की पुष्टि करें।');
  return lines.join('\n');
}
