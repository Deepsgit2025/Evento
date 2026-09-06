import { Event, Wedding } from '../database/types';
import { PatrikaCustomization } from './patrika';
import { InvitationTheme, getInvitationTheme, DEFAULT_INVITATION_THEME_ID } from './invitationThemes';

/**
 * A traditional Indian wedding card is rarely a single page — it opens with
 * an auspicious invocation, then the couple/date/venue, then the full
 * programme of functions. This builds that as one printable, multi-page
 * document (page-break-after per section) instead of a single flat card.
 *
 * Note on design: this is an original layout built from the conventions
 * that appear across most well-regarded Indian wedding invitations (gold-on-
 * maroon invocation page, Devanagari typography, floral/paisley corner
 * motifs, a programme/timeline page) — not a copy of any specific designer's
 * artwork, since lifting someone else's copyrighted design isn't something
 * to do even on request. The visuals are drawn in CSS/SVG so no external
 * image assets are needed for the PDF to render correctly on any device.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HINDI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
const HINDI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

const EVENT_TYPE_HINDI: Record<string, string> = {
  Haldi: 'हल्दी',
  Mehndi: 'मेहंदी',
  Sangeet: 'संगीत संध्या',
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
  };
}

/** A gold paisley/floral corner flourish, drawn in SVG so no image asset is needed. */
function cornerMotif(accent: string, rotation: number): string {
  return `
    <svg class="corner" style="transform: rotate(${rotation}deg)" width="90" height="90" viewBox="0 0 100 100">
      <path d="M2 2 C 40 2, 40 40, 2 40" fill="none" stroke="${accent}" stroke-width="2" opacity="0.8" />
      <path d="M2 2 C 2 40, 40 40, 40 2" fill="none" stroke="${accent}" stroke-width="1" opacity="0.5" />
      <circle cx="14" cy="14" r="4" fill="${accent}" opacity="0.7" />
      <path d="M2 2 Q 22 22 2 55" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.6" />
      <path d="M2 2 Q 22 22 55 2" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.6" />
    </svg>`;
}

const SHARED_STYLES = `
  * { box-sizing: border-box; }
  @page { size: 612px 792px; margin: 0; }
  body { margin: 0; font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Helvetica Neue', Arial, sans-serif; }
  .page {
    position: relative;
    width: 612px;
    height: 792px;
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }
  .frame {
    position: absolute;
    inset: 22px;
    border: 2px solid var(--accent);
    border-radius: 4px;
  }
  .frame::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid var(--accent);
    opacity: 0.6;
  }
  .corner { position: absolute; }
  .corner-tl { top: 26px; left: 26px; }
  .corner-tr { top: 26px; right: 26px; }
  .corner-bl { bottom: 26px; left: 26px; }
  .corner-br { bottom: 26px; right: 26px; }
`;

function pageChrome(theme: InvitationTheme, inner: string, background: string, extraCorners?: string): string {
  const accent = escapeHtml(theme.gold);
  return `
    <div class="page" style="--accent: ${accent}; background: ${background};">
      <div class="frame"></div>
      ${cornerMotif(accent, 0).replace('class="corner"', 'class="corner corner-tl"')}
      ${cornerMotif(accent, 90).replace('class="corner"', 'class="corner corner-tr"')}
      ${cornerMotif(accent, -90).replace('class="corner"', 'class="corner corner-bl"')}
      ${cornerMotif(accent, 180).replace('class="corner"', 'class="corner corner-br"')}
      ${extraCorners || ''}
      <div class="content">${inner}</div>
    </div>
  `;
}

/** Page 1: the auspicious opening — Shree Ganesh invocation, addressed to the guest by name. */
function buildInvocationPage(theme: InvitationTheme, guestName: string): string {
  const goldMuted = escapeHtml(theme.goldMuted);
  const inner = `
    <style>
      .invocation-content {
        position: absolute; inset: 60px; display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center; color: #F5E9D3;
      }
      .om { font-size: 64px; color: var(--accent); margin-bottom: 8px; }
      .invocation-title { font-size: 22px; letter-spacing: 3px; color: var(--accent); margin-bottom: 28px; }
      .shloka { font-size: 16px; line-height: 2; color: ${goldMuted}; max-width: 380px; margin-bottom: 40px; font-style: italic; }
      .divider { width: 120px; height: 1px; background: var(--accent); margin: 24px 0; opacity: 0.7; }
      .invite-label { font-size: 13px; letter-spacing: 4px; color: ${goldMuted}; margin-bottom: 10px; }
      .guest-name { font-size: 32px; color: #FFF7E6; font-weight: 600; }
    </style>
    <div class="invocation-content">
      <div class="om">ॐ</div>
      <div class="invocation-title">॥ श्री गणेशाय नमः ॥</div>
      <div class="shloka">
        वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।<br/>
        निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥
      </div>
      <div class="divider"></div>
      <div class="invite-label">सादर आमंत्रण</div>
      <div class="guest-name">${escapeHtml(guestName)} जी</div>
    </div>
  `;
  return pageChrome(theme, inner, theme.darkBg);
}

/** Page 2: the couple, the date and the venue. */
function buildMainInvitationPage(theme: InvitationTheme, details: InvitationDetails, guestName: string): string {
  const textDark = escapeHtml(theme.textDark);
  const textMuted = escapeHtml(theme.textMuted);
  const coupleLine = details.brideName && details.groomName
    ? `<div class="couple">${escapeHtml(details.brideName)}<div class="amp">&#10086;</div>${escapeHtml(details.groomName)}</div>`
    : '';

  const customMessage = details.message
    ? `<div class="message">${escapeHtml(details.message.replace(/{guest name}/gi, guestName)).replace(/\n/g, '<br/>')}</div>`
    : '';

  const dateBlock = details.date
    ? `<div class="info-card"><div class="info-label">दिनांक</div><div class="info-value">${escapeHtml(details.date)}</div></div>`
    : '';
  const venueBlock = details.venue
    ? `<div class="info-card"><div class="info-label">स्थान</div><div class="info-value">${escapeHtml(details.venue)}</div></div>`
    : '';

  const inner = `
    <style>
      .main-content {
        position: absolute; inset: 70px; display: flex; flex-direction: column;
        align-items: center; text-align: center; color: ${textDark};
      }
      .eyebrow { font-size: 13px; letter-spacing: 4px; color: var(--accent); margin-bottom: 28px; }
      .couple { font-size: 34px; font-weight: 700; color: ${textDark}; line-height: 1.5; }
      .amp { font-size: 16px; color: var(--accent); margin: 6px 0; }
      .tagline { font-size: 15px; color: ${textMuted}; margin: 22px 0 26px; }
      .message { font-size: 15px; line-height: 1.9; color: ${textDark}; max-width: 380px; margin-bottom: 26px; }
      .guest-line { font-size: 14px; color: ${textMuted}; margin-bottom: 4px; }
      .guest-name-main { font-size: 20px; font-weight: 600; color: ${textDark}; margin-bottom: 22px; }
      .info-row { display: flex; gap: 26px; margin-top: auto; }
      .info-card { border: 1px solid var(--accent); border-radius: 6px; padding: 14px 22px; min-width: 160px; }
      .info-label { font-size: 11px; letter-spacing: 2px; color: var(--accent); margin-bottom: 6px; }
      .info-value { font-size: 15px; color: ${textDark}; }
    </style>
    <div class="main-content">
      <div class="eyebrow">विवाह निमंत्रण</div>
      ${coupleLine}
      <div class="tagline">विवाह बंधन में बंधने जा रहे हैं</div>
      <div class="guest-line">प्रिय</div>
      <div class="guest-name-main">${escapeHtml(guestName)} जी</div>
      ${customMessage}
      <div class="info-row">
        ${dateBlock}
        ${venueBlock}
      </div>
    </div>
  `;
  return pageChrome(theme, inner, theme.lightBg);
}

/** Page 3: the full programme of functions, in chronological order. */
function buildProgrammePage(theme: InvitationTheme, events: Event[]): string {
  const textDark = escapeHtml(theme.textDark);
  const textMuted = escapeHtml(theme.textMuted);
  const rows = events.map(ev => {
    const label = ev.event_type && EVENT_TYPE_HINDI[ev.event_type] ? EVENT_TYPE_HINDI[ev.event_type] : escapeHtml(ev.name);
    const dateLine = ev.date ? formatIsoDateHindi(ev.date, true) : '';
    const timeLine = ev.start_time
      ? `${formatTimeHindi(ev.start_time)}${ev.end_time ? ' – ' + formatTimeHindi(ev.end_time) : ''}`
      : '';
    const locationLine = ev.location ? escapeHtml(ev.location) : '';

    return `
      <div class="timeline-row">
        <div class="timeline-dot"></div>
        <div class="timeline-body">
          <div class="event-name">${label}</div>
          ${dateLine ? `<div class="event-meta">${dateLine}${timeLine ? ' · ' + timeLine : ''}</div>` : ''}
          ${locationLine ? `<div class="event-location">${locationLine}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const body = events.length > 0
    ? `<div class="timeline">${rows}</div>`
    : `<div class="empty-note">कार्यक्रम की जानकारी शीघ्र साझा की जाएगी।</div>`;

  const inner = `
    <style>
      .programme-content {
        position: absolute; inset: 70px; display: flex; flex-direction: column;
        align-items: center; color: ${textDark};
      }
      .programme-title { font-size: 22px; font-weight: 700; letter-spacing: 2px; margin-bottom: 6px; text-align: center; }
      .programme-subtitle { font-size: 13px; color: var(--accent); letter-spacing: 3px; margin-bottom: 30px; text-align: center; }
      .timeline { width: 100%; max-width: 420px; border-left: 2px solid var(--accent); padding-left: 22px; }
      .timeline-row { position: relative; margin-bottom: 26px; }
      .timeline-dot { position: absolute; left: -28px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }
      .event-name { font-size: 17px; font-weight: 700; color: ${textDark}; }
      .event-meta { font-size: 13px; color: ${textMuted}; margin-top: 2px; }
      .event-location { font-size: 13px; color: ${textMuted}; margin-top: 1px; }
      .empty-note { font-size: 14px; color: ${textMuted}; margin-top: 60px; }
      .rsvp { margin-top: auto; text-align: center; }
      .rsvp-line { font-size: 14px; color: ${textDark}; margin-bottom: 6px; }
      .rsvp-blessing { font-size: 13px; color: var(--accent); font-style: italic; }
    </style>
    <div class="programme-content">
      <div class="programme-title">विवाह के कार्यक्रम</div>
      <div class="programme-subtitle">WEDDING PROGRAMME</div>
      ${body}
      <div class="rsvp">
        <div class="rsvp-line">कृपया अपनी उपस्थिति की पुष्टि करें</div>
        <div class="rsvp-blessing">आपकी उपस्थिति हमारे लिए मंगलकारी होगी</div>
      </div>
    </div>
  `;
  return pageChrome(theme, inner, theme.lightBg);
}

/**
 * Builds the full multi-page invitation (invocation → couple/date/venue →
 * programme). `events` is optional — pass the wedding's events so page 3
 * lists the actual functions; it renders a placeholder line if omitted.
 */
export function buildInvitationHtml(details: InvitationDetails, guestName: string, events: Event[] = []): string {
  const theme = details.theme;

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>${SHARED_STYLES}</style>
    </head>
    <body>
      ${buildInvocationPage(theme, guestName)}
      ${buildMainInvitationPage(theme, details, guestName)}
      ${buildProgrammePage(theme, events)}
    </body>
  </html>
  `;
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

  lines.push('\nकृपया अपनी उपस्थिति की पुष्टि करें।');
  return lines.join('\n');
}
