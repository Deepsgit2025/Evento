import { Event, Wedding } from '../database/types';
import { PatrikaCustomization } from './patrika';
import { InvitationTheme, getInvitationTheme, DEFAULT_INVITATION_THEME_ID } from './invitationThemes';

/**
 * A traditional Indian wedding card is rarely a single page — it opens with
 * an auspicious invocation, then the couple/date/venue, then one page per
 * function of the wedding (Haldi, Mehndi, Sangeet, Baraat...), each in its
 * own festive colour, and closes with a blessing and a countdown. This
 * builds that as one printable, multi-page document (page-break-after per
 * section) instead of a single flat card.
 *
 * Note on design: this is an original layout built from the conventions
 * that appear across most well-regarded Indian wedding invitations (gold-on-
 * maroon invocation page, Devanagari typography, toran/mandala/paisley
 * motifs, per-function colour theming, a mandap illustration) — not a copy
 * of any specific designer's or website's artwork. The visuals are drawn in
 * CSS/SVG so no external image assets are needed for the PDF to render
 * correctly on any device, and a PDF page is static, so no scroll/audio/
 * animation behaviour is (or can be) carried over from a web page.
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
  /** Raw "YYYY-MM-DD" wedding date, kept separately from the display `date` string so the closing page can compute a real countdown even when `date` has been freely edited by the couple. */
  weddingDateIso?: string;
  /** A `data:` URI for the couple's cover photo, resolved asynchronously by the caller (see `resolveCoverPhotoDataUri`) since a plain local file:// URI isn't reliably readable from the PDF renderer. */
  coverPhotoDataUri?: string;
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

/**
 * Reads a local image (e.g. from expo-image-picker, which copies into the
 * app's own cache) and returns it as a `data:` URI so it can be embedded
 * directly in the invitation HTML — a plain file:// src isn't guaranteed to
 * be reachable from the native PDF renderer's webview on every device.
 * Returns undefined (silently) if the photo can't be read, so a broken
 * photo never blocks sending the invitation.
 */
export async function resolveCoverPhotoDataUri(uri: string | undefined | null): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith('data:')) return uri;
  try {
    const FileSystem = await import('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch (e) {
    return undefined;
  }
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

/** A toran-style garland strip (mango leaves + hanging bells) across the top (or, mirrored, the bottom) of a page. */
function toranStrip(accent: string, position: 'top' | 'bottom' = 'top'): string {
  const count = 16;
  const spacing = 612 / count;
  let leaves = '';
  for (let i = 0; i < count; i++) {
    const cx = Math.round(spacing * i + spacing / 2);
    leaves += `
      <path d="M${cx} 3 C ${cx - 8} 13, ${cx - 8} 24, ${cx} 32 C ${cx + 8} 24, ${cx + 8} 13, ${cx} 3 Z" fill="${accent}" opacity="0.85" />
      <circle cx="${cx}" cy="37" r="2.2" fill="${accent}" opacity="0.9" />
    `;
  }
  const cls = position === 'bottom' ? 'toran toran-bottom' : 'toran';
  return `
    <svg class="${cls}" width="612" height="44" viewBox="0 0 612 44" preserveAspectRatio="none">
      <line x1="0" y1="2" x2="612" y2="2" stroke="${accent}" stroke-width="1.5" opacity="0.55" />
      ${leaves}
    </svg>`;
}

/** A deterministic pseudo-random generator (fixed seed → fixed layout) so scatter decorations look organic without being different every time the same invitation is regenerated. */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** Scatters `count` copies of `shape` across the full page at pseudo-random (but stable) positions. */
function scatterAcrossPage(shape: (x: number, y: number, rotation: number, scale: number) => string, count: number, seedBase: number): string {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = Math.round(24 + seededRand(seedBase + i * 3.1) * 564);
    const y = Math.round(24 + seededRand(seedBase + i * 7.7 + 1) * 744);
    const rotation = Math.round(seededRand(seedBase + i * 5.3 + 2) * 360);
    const scale = Number((0.6 + seededRand(seedBase + i * 2.9 + 3) * 0.9).toFixed(2));
    out += shape(x, y, rotation, scale);
  }
  return `<svg class="scatter" width="612" height="792" viewBox="0 0 612 792">${out}</svg>`;
}

/** A shower of small petals raining across the page — used for the couple page and Baraat (the flower-shower procession). */
function petalShower(color: string, count = 20, seedBase = 0): string {
  return scatterAcrossPage((x, y, rotation, scale) => `
    <g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">
      <path d="M0 -9 C 7 -7 7 7 0 11 C -7 7 -7 -7 0 -9 Z" fill="${color}" opacity="0.5" />
    </g>`, count, seedBase);
}

/** Scattered small dots — turmeric-yellow for Haldi, henna-green for Mehndi. */
function dotShower(color: string, count = 26, seedBase = 100): string {
  return scatterAcrossPage((x, y, _rotation, scale) => `
    <circle cx="${x}" cy="${y}" r="${(4 * scale).toFixed(1)}" fill="${color}" opacity="0.55" />`, count, seedBase);
}

/** Scattered four-point sparkles — used for Sangeet/DJ Night/Reception, evoking string lights and a disco floor. */
function sparkleDots(color: string, count = 22, seedBase = 200): string {
  return scatterAcrossPage((x, y, rotation, scale) => `
    <g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">
      <path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill="${color}" opacity="0.65" />
    </g>`, count, seedBase);
}

/** A faint mandala watermark, centered behind a page's content, for texture without competing with the text. */
function mandalaWatermark(accent: string, size = 400): string {
  const petalCount = 12;
  let petals = '';
  for (let i = 0; i < petalCount; i++) {
    const angle = (360 / petalCount) * i;
    petals += `<path d="M100 100 C 100 46, 114 14, 100 2 C 86 14, 100 46, 100 100 Z" fill="none" stroke="${accent}" stroke-width="1" transform="rotate(${angle} 100 100)" />`;
  }
  return `
    <svg class="mandala" width="${size}" height="${size}" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="96" fill="none" stroke="${accent}" stroke-width="1" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="${accent}" stroke-width="1" />
      <circle cx="100" cy="100" r="6" fill="${accent}" />
      ${petals}
    </svg>`;
}

/** A simple mandap (four-pillar wedding canopy) illustration. */
function mandapIcon(accent: string): string {
  return `
    <svg width="190" height="114" viewBox="0 0 150 90">
      <path d="M14 86 V30 M136 86 V30 M14 30 Q75 4 136 30" fill="none" stroke="${accent}" stroke-width="2.5" />
      <path d="M40 86 V40 M110 86 V40" fill="none" stroke="${accent}" stroke-width="1.6" opacity="0.7" />
      <circle cx="75" cy="20" r="3.5" fill="${accent}" />
      <path d="M75 20 V10" stroke="${accent}" stroke-width="1.6" />
    </svg>`;
}

/** A kalash (sacred pot) with mango-leaf sprigs — used for Haldi. */
function kalashIcon(accent: string): string {
  return `
    <svg width="104" height="104" viewBox="0 0 64 64">
      <path d="M20 30 Q32 20 44 30 L40 52 Q32 58 24 52 Z" fill="${accent}" opacity="0.92" />
      <circle cx="32" cy="19" r="6" fill="${accent}" />
      <path d="M20 28 Q13 18 6 24" stroke="${accent}" stroke-width="2" fill="none" />
      <path d="M44 28 Q51 18 58 24" stroke="${accent}" stroke-width="2" fill="none" />
      <path d="M32 26 L32 8" stroke="${accent}" stroke-width="2" fill="none" />
    </svg>`;
}

/** A henna-adorned palm outline — used for Mehndi. */
function mehendiHandIcon(accent: string): string {
  return `
    <svg width="96" height="104" viewBox="0 0 64 64">
      <path d="M22 58 L22 32 Q22 26 26 26 Q30 26 30 32 L30 16 Q30 10 34 10 Q38 10 38 16 L38 32 Q38 22 42 22 Q46 22 46 32 L46 42 Q50 42 50 48 L50 58 Z" fill="none" stroke="${accent}" stroke-width="2.2" />
      <circle cx="30" cy="46" r="2" fill="${accent}" />
      <circle cx="38" cy="49" r="2" fill="${accent}" />
      <circle cx="34" cy="40" r="2" fill="${accent}" />
    </svg>`;
}

/** A dhol (barrel drum) — used for Sangeet. */
function dholIcon(accent: string): string {
  return `
    <svg width="106" height="98" viewBox="0 0 64 64">
      <rect x="16" y="22" width="32" height="20" rx="4" fill="none" stroke="${accent}" stroke-width="2.2" />
      <ellipse cx="32" cy="22" rx="16" ry="6" fill="none" stroke="${accent}" stroke-width="2.2" />
      <ellipse cx="32" cy="42" rx="16" ry="6" fill="none" stroke="${accent}" stroke-width="2.2" />
      <path d="M18 26 L13 40 M46 26 L51 40" stroke="${accent}" stroke-width="1.6" />
    </svg>`;
}

/** A simplified horse silhouette — used for Baraat. */
function horseIcon(accent: string): string {
  return `
    <svg width="100" height="100" viewBox="0 0 64 64">
      <path d="M40 12 C48 14 51 24 46 30 L51 34 L44 37 L44 45 Q44 53 35 55 L25 55 Q29 47 25 41 Q17 39 17 28 Q17 15 29 13 Q34 9 40 12 Z" fill="none" stroke="${accent}" stroke-width="2.2" />
      <circle cx="38" cy="22" r="1.7" fill="${accent}" />
    </svg>`;
}

/** A lit diya (oil lamp) — used for Reception, the invocation page and the closing page. */
function diyaIcon(accent: string): string {
  return `
    <svg width="90" height="105" viewBox="0 0 48 56">
      <path d="M4 40 Q24 54 44 40 Q41 29 24 29 Q7 29 4 40 Z" fill="none" stroke="${accent}" stroke-width="2.2" />
      <path d="M24 27 C19 20 24 15 24 8 C29 15 31 20 24 27 Z" fill="${accent}" />
    </svg>`;
}

/** A disco ball over a microphone — used for DJ Night. */
function discoMicIcon(accent: string): string {
  return `
    <svg width="96" height="120" viewBox="0 0 80 100">
      <circle cx="40" cy="24" r="16" fill="none" stroke="${accent}" stroke-width="2" />
      <path d="M24 24 H56 M40 8 V40 M28 12 L52 36 M52 12 L28 36" stroke="${accent}" stroke-width="1" opacity="0.75" />
      <line x1="40" y1="40" x2="40" y2="54" stroke="${accent}" stroke-width="2" />
      <rect x="33" y="54" width="14" height="26" rx="7" fill="none" stroke="${accent}" stroke-width="2" />
      <line x1="40" y1="80" x2="40" y2="92" stroke="${accent}" stroke-width="2" />
      <line x1="30" y1="92" x2="50" y2="92" stroke="${accent}" stroke-width="2" />
    </svg>`;
}

interface EventPageStyle {
  bg: string;
  accent: string;
  text: string;
  icon: (accent: string) => string;
  /** Extra scatter decoration specific to this function (turmeric dots, henna dots, disco sparkle, rose petals...). */
  decor?: () => string;
}

const EVENT_TYPE_STYLE: Record<string, EventPageStyle> = {
  Haldi: { bg: '#F4A522', accent: '#7A4B00', text: '#4A2E00', icon: kalashIcon, decor: () => dotShower('#FFD54F', 30, 10) },
  Mehndi: { bg: '#2F6B3A', accent: '#F3E7C4', text: '#F3E7C4', icon: mehendiHandIcon, decor: () => dotShower('#8BC34A', 30, 20) },
  Sangeet: { bg: '#181233', accent: '#D4AF37', text: '#F3E7C4', icon: dholIcon, decor: () => sparkleDots('#D4AF37', 22, 30) },
  'DJ Night': { bg: '#150E2E', accent: '#FF4FA3', text: '#F3E7C4', icon: discoMicIcon, decor: () => sparkleDots('#FF4FA3', 30, 35) },
  Baraat: { bg: '#5C1A24', accent: '#F1C77B', text: '#F6E4C1', icon: horseIcon, decor: () => petalShower('#F27C93', 24, 40) },
  Reception: { bg: '#0B132B', accent: '#D4AF37', text: '#F3E7C4', icon: diyaIcon, decor: () => sparkleDots('#D4AF37', 22, 50) },
};

function defaultEventStyle(theme: InvitationTheme): EventPageStyle {
  return { bg: theme.lightBg, accent: theme.gold, text: theme.textDark, icon: mandapIcon };
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
  .toran { position: absolute; top: 24px; left: 0; }
  .toran-bottom { top: auto; bottom: 24px; transform: scaleY(-1); }
  .mandala {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    opacity: 0.08; z-index: 0;
  }
  .scatter { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
  .content { position: relative; height: 100%; z-index: 1; }
  .event-content {
    position: absolute; inset: 66px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
  }
  .event-icon { margin-bottom: 26px; }
  .event-label { font-size: 42px; font-weight: 700; letter-spacing: 1px; margin-bottom: 22px; }
  .event-date { font-size: 19px; margin-bottom: 8px; opacity: 0.92; }
  .event-time { font-size: 17px; margin-bottom: 8px; opacity: 0.85; }
  .event-loc { font-size: 16px; opacity: 0.8; margin-top: 8px; }
`;

function pageChrome(theme: InvitationTheme, inner: string, background: string, opts?: { accent?: string; decor?: string; bottomToran?: boolean }): string {
  const accent = escapeHtml(opts?.accent || theme.gold);
  return `
    <div class="page" style="--accent: ${accent}; background: ${background};">
      <div class="frame"></div>
      ${cornerMotif(accent, 0).replace('class="corner"', 'class="corner corner-tl"')}
      ${cornerMotif(accent, 90).replace('class="corner"', 'class="corner corner-tr"')}
      ${cornerMotif(accent, -90).replace('class="corner"', 'class="corner corner-bl"')}
      ${cornerMotif(accent, 180).replace('class="corner"', 'class="corner corner-br"')}
      ${mandalaWatermark(accent)}
      ${opts?.decor || ''}
      ${toranStrip(accent)}
      ${opts?.bottomToran ? toranStrip(accent, 'bottom') : ''}
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
      .om { font-size: 60px; color: var(--accent); margin-bottom: 4px; }
      .invocation-title { font-size: 22px; letter-spacing: 3px; color: var(--accent); margin-bottom: 24px; }
      .shloka { font-size: 16px; line-height: 2; color: ${goldMuted}; max-width: 380px; margin-bottom: 30px; font-style: italic; }
      .divider { width: 120px; height: 1px; background: var(--accent); margin: 20px 0; opacity: 0.7; }
      .invite-label { font-size: 13px; letter-spacing: 4px; color: ${goldMuted}; margin-bottom: 10px; }
      .guest-name { font-size: 32px; color: #FFF7E6; font-weight: 600; margin-bottom: 26px; }
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
      ${diyaIcon(escapeHtml(theme.gold))}
    </div>
  `;
  return pageChrome(theme, inner, theme.darkBg, { bottomToran: true, decor: dotShower(escapeHtml(theme.goldMuted), 16, 5) });
}

/** Page 2: the couple, the date, the venue, and — if provided — their photo. */
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

  const photoBlock = details.coverPhotoDataUri
    ? `<div class="couple-photo-wrap"><img class="couple-photo" src="${details.coverPhotoDataUri}" /></div>`
    : `<div class="mandap-wrap">${mandapIcon(escapeHtml(theme.gold))}</div>`;

  const inner = `
    <style>
      .main-content {
        position: absolute; inset: 66px; display: flex; flex-direction: column;
        align-items: center; text-align: center; color: ${textDark};
      }
      .eyebrow { font-size: 13px; letter-spacing: 4px; color: var(--accent); margin-bottom: 16px; }
      .couple-photo-wrap { margin-bottom: 16px; }
      .couple-photo {
        width: 130px; height: 130px; border-radius: 65px; object-fit: cover;
        border: 3px solid var(--accent);
      }
      .mandap-wrap { margin-bottom: 4px; }
      .couple { font-size: 38px; font-weight: 700; color: ${textDark}; line-height: 1.5; }
      .amp { font-size: 16px; color: var(--accent); margin: 4px 0; }
      .tagline { font-size: 16px; color: ${textMuted}; margin: 18px 0 22px; }
      .message { font-size: 16px; line-height: 1.9; color: ${textDark}; max-width: 400px; margin-bottom: 22px; }
      .guest-line { font-size: 15px; color: ${textMuted}; margin-bottom: 4px; }
      .guest-name-main { font-size: 22px; font-weight: 600; color: ${textDark}; margin-bottom: 18px; }
      .info-row { display: flex; gap: 26px; margin-top: auto; }
      .info-card { border: 1px solid var(--accent); border-radius: 6px; padding: 14px 22px; min-width: 160px; }
      .info-label { font-size: 11px; letter-spacing: 2px; color: var(--accent); margin-bottom: 6px; }
      .info-value { font-size: 15px; color: ${textDark}; }
    </style>
    <div class="main-content">
      <div class="eyebrow">विवाह निमंत्रण</div>
      ${photoBlock}
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
  return pageChrome(theme, inner, theme.lightBg, { decor: petalShower('#E88BA0', 16, 8) });
}

/** One page per wedding function (Haldi, Mehndi, Sangeet...), each in its own festive colour. */
function buildEventPage(theme: InvitationTheme, event: Event): string {
  const style = (event.event_type && EVENT_TYPE_STYLE[event.event_type]) || defaultEventStyle(theme);
  const label = event.event_type && EVENT_TYPE_HINDI[event.event_type] ? EVENT_TYPE_HINDI[event.event_type] : escapeHtml(event.name);
  const dateLine = event.date ? formatIsoDateHindi(event.date, true) : '';
  const timeLine = event.start_time
    ? `${formatTimeHindi(event.start_time)}${event.end_time ? ' – ' + formatTimeHindi(event.end_time) : ''}`
    : '';
  const locationLine = event.location ? escapeHtml(event.location) : '';
  const text = escapeHtml(style.text);

  const inner = `
    <div class="event-content" style="color: ${text};">
      <div class="event-icon">${style.icon(escapeHtml(style.accent))}</div>
      <div class="event-label">${label}</div>
      ${dateLine ? `<div class="event-date">${dateLine}</div>` : ''}
      ${timeLine ? `<div class="event-time">${timeLine}</div>` : ''}
      ${locationLine ? `<div class="event-loc">${locationLine}</div>` : ''}
    </div>
  `;
  return pageChrome(theme, inner, style.bg, { accent: style.accent, decor: style.decor ? style.decor() : '', bottomToran: true });
}

/** Closing page: blessing, RSVP request, and — when the wedding date is known — a real countdown. */
function buildClosingPage(theme: InvitationTheme): string {
  const gold = escapeHtml(theme.gold);
  const goldMuted = escapeHtml(theme.goldMuted);

  const inner = `
    <style>
      .closing-content {
        position: absolute; inset: 70px; display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center; color: #F5E9D3;
      }
      .closing-icon { margin-bottom: 22px; }
      .closing-title { font-size: 25px; font-weight: 700; letter-spacing: 1px; color: #FFF7E6; margin-bottom: 24px; }
      .countdown { margin-bottom: 28px; }
      .countdown-num { font-size: 60px; font-weight: 800; color: var(--accent); line-height: 1; }
      .countdown-label { font-size: 15px; letter-spacing: 3px; color: ${goldMuted}; margin-top: 6px; }
      .divider-line { width: 120px; height: 1px; background: var(--accent); margin: 22px 0; opacity: 0.7; }
      .rsvp-line { font-size: 17px; color: #F5E9D3; margin-bottom: 8px; }
      .blessing { font-size: 15px; color: ${goldMuted}; font-style: italic; }
      .countdown-slot { min-height: 100px; }
    </style>
    <div class="closing-content" data-countdown-slot>
      <div class="closing-icon">${diyaIcon(gold)}</div>
      <div class="closing-title">आपकी शुभकामनाएं और उपस्थिति</div>
      <div class="countdown-slot"></div>
      <div class="rsvp-line">कृपया अपनी उपस्थिति की पुष्टि करें</div>
      <div class="divider-line"></div>
      <div class="blessing">सपरिवार पधारने की कृपा करें</div>
    </div>
  `;
  return pageChrome(theme, inner, theme.darkBg, { bottomToran: true, decor: dotShower(goldMuted, 16, 90) });
}

/** Fills the closing page's countdown slot with a real days-remaining count, computed at build time (not live JS, since a PDF page is static). */
function withCountdown(html: string, weddingDateIso?: string): string {
  if (!weddingDateIso) return html;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weddingDateIso);
  if (!match) return html;
  const [, y, m, d] = match;
  const target = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  let block = '';
  if (diffDays > 0) {
    block = `<div class="countdown"><div class="countdown-num">${diffDays}</div><div class="countdown-label">दिन शेष</div></div>`;
  } else if (diffDays === 0) {
    block = `<div class="countdown"><div class="countdown-num">आज</div><div class="countdown-label">है शुभ दिन</div></div>`;
  }
  if (!block) return html;
  return html.replace('<div class="countdown-slot"></div>', block);
}

/**
 * Builds the full multi-page invitation: invocation → couple/date/venue →
 * one page per wedding function → closing blessing/countdown. `events` is
 * optional — pass the wedding's events so each function gets its own themed
 * page; the closing page still renders (without event pages) if omitted.
 */
export function buildInvitationHtml(details: InvitationDetails, guestName: string, events: Event[] = []): string {
  const theme = details.theme;
  const eventPages = events.map(ev => buildEventPage(theme, ev)).join('');
  const closingPage = withCountdown(buildClosingPage(theme), details.weddingDateIso);

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>${SHARED_STYLES}</style>
    </head>
    <body>
      ${buildInvocationPage(theme, guestName)}
      ${buildMainInvitationPage(theme, details, guestName)}
      ${eventPages}
      ${closingPage}
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
