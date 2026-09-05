import { Wedding } from '../database/types';
import { PatrikaCustomization } from './patrika';
import { formatIsoDateFriendly } from '../utils/date';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface InvitationDetails {
  brideName: string;
  groomName: string;
  date: string;
  venue: string;
  message: string;
  accentColor: string;
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
    date: customization.custom_date || formatIsoDateFriendly(wedding?.date) || '',
    venue: customization.custom_venue || wedding?.venue || '',
    message: customization.message || 'We invite you to share our joy',
    accentColor: customization.accent_color || '#D4AF37',
  };
}

/**
 * Builds the printable invitation. Unlike the previous version, the couple's
 * names, the date and the venue all appear on the card — not just the
 * recipient's name.
 */
export function buildInvitationHtml(details: InvitationDetails, guestName: string): string {
  const accent = escapeHtml(details.accentColor);
  const message = escapeHtml(details.message.replace(/{guest name}/gi, guestName)).replace(/\n/g, '<br/>');

  const coupleLine = details.brideName && details.groomName
    ? `<div class="couple">${escapeHtml(details.brideName)}<span class="amp">&amp;</span>${escapeHtml(details.groomName)}</div>`
    : '';

  const dateLine = details.date
    ? `<div class="detail"><span class="label">When</span>${escapeHtml(details.date)}</div>`
    : '';

  const venueLine = details.venue
    ? `<div class="detail"><span class="label">Where</span>${escapeHtml(details.venue)}</div>`
    : '';

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fdfbf7; color: #4a4a4a; text-align: center; padding: 40px; margin: 20px; border: 8px solid ${accent}; border-radius: 12px; }
        .header { color: #800020; font-size: 24px; font-weight: bold; margin-bottom: 6px; letter-spacing: 2px; text-transform: uppercase; }
        .subheader { color: ${accent}; font-size: 16px; margin-bottom: 26px; letter-spacing: 1px; }
        .couple { font-size: 40px; font-weight: bold; color: #222; margin: 10px 0 24px; line-height: 1.3; }
        .amp { display: block; font-size: 22px; font-weight: normal; font-style: italic; color: ${accent}; margin: 6px 0; }
        .details { margin: 24px 0; }
        .detail { font-size: 18px; line-height: 1.7; margin: 10px 0; color: #333; }
        .label { display: block; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: ${accent}; margin-bottom: 2px; }
        .content { font-size: 18px; line-height: 1.8; margin-bottom: 20px; }
        .guest-name { font-size: 26px; font-weight: bold; margin: 20px 0; color: #222; border-bottom: 2px solid ${accent}; display: inline-block; padding-bottom: 5px; font-style: italic; }
        .footer { margin-top: 40px; font-size: 16px; font-style: italic; color: #888; }
        .flourish { font-size: 30px; color: ${accent}; margin: 12px 0; }
      </style>
    </head>
    <body>
      <div class="header">Wedding Invitation</div>
      <div class="subheader">Join Us In Our Joy</div>
      ${coupleLine}
      <div class="content">Dear</div>
      <div class="guest-name">${escapeHtml(guestName)}</div>
      <div class="flourish">&#10087;</div>
      <div class="content">${message}</div>
      <div class="details">
        ${dateLine}
        ${venueLine}
      </div>
      <div class="flourish">&#10087;</div>
      <div class="footer">Please let us know if you will be attending.</div>
    </body>
  </html>
  `;
}

/** Plain-text version used for the WhatsApp message body. */
export function buildInvitationText(details: InvitationDetails, guestName: string): string {
  const lines: string[] = [];
  if (details.brideName && details.groomName) {
    lines.push(`${details.brideName} & ${details.groomName}`);
    lines.push('');
  }
  lines.push(`Dear ${guestName},`);
  lines.push(details.message.replace(/{guest name}/gi, guestName));
  if (details.date) lines.push(`\nWhen: ${details.date}`);
  if (details.venue) lines.push(`Where: ${details.venue}`);
  return lines.join('\n');
}
