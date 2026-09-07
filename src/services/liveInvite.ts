import { Event } from '../database/types';
import { InvitationDetails } from './invitationDocument';

/**
 * The live, auto-scrolling invitation page is a single static file hosted on
 * GitHub Pages (docs/invite.html in this repo) — there's no backend to store
 * per-wedding data, so the whole payload (names, date, venue, message,
 * events) is base64url-encoded straight into the URL fragment. The page
 * reads and decodes it client-side. Keep this in sync with the payload
 * shape `docs/invite.html` expects.
 */
const LIVE_INVITE_BASE_URL = 'https://deepsgit2025.github.io/Evento/invite.html';

interface LiveInvitePayload {
  b: string;
  g: string;
  d: string;
  v: string;
  m: string;
  n: string;
  t: string;
  e: [string, string, string, string, string][];
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** UTF-8 encodes a JS string into bytes (no TextEncoder dependency, for broad Hermes compatibility). */
function utf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i)!;
    if (code > 0xffff) i++; // this codepoint consumed a surrogate pair
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return bytes;
}

function base64UrlEncode(str: string): string {
  const bytes = utf8Bytes(str);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += BASE64_CHARS[b0 >> 2];
    out += BASE64_CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? '' : BASE64_CHARS[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? '' : BASE64_CHARS[b2 & 63];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}

/** Builds the shareable link to the live, auto-scrolling web invitation for one guest. */
export function buildLiveInviteUrl(details: InvitationDetails, guestName: string, events: Event[] = []): string {
  const payload: LiveInvitePayload = {
    b: details.brideName,
    g: details.groomName,
    d: details.weddingDateIso || '',
    v: details.venue,
    m: details.message ? details.message.replace(/{guest name}/gi, guestName) : '',
    n: guestName,
    t: details.theme.id,
    e: events.map(ev => [
      ev.event_type || ev.name || '',
      ev.date || '',
      ev.start_time || '',
      ev.end_time || '',
      ev.location || '',
    ]),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${LIVE_INVITE_BASE_URL}#i=${encoded}`;
}
