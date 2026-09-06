export interface InvitationTheme {
  id: string;
  name: string;
  /** Deep background for the invocation page (page 1), as a CSS gradient. */
  darkBg: string;
  /** Light background shared by pages 2 and 3. */
  lightBg: string;
  /** Border, motifs, dividers, and accent text — used consistently on all 3 pages. */
  gold: string;
  /** Muted gold used for secondary text on the dark page. */
  goldMuted: string;
  /** Body text color on the light pages. */
  textDark: string;
  /** Secondary/meta text color on the light pages. */
  textMuted: string;
}

export const INVITATION_THEMES: InvitationTheme[] = [
  {
    id: 'royal-maroon',
    name: 'रॉयल मरून',
    darkBg: 'linear-gradient(160deg, #5C1220 0%, #7A1C29 55%, #5C1220 100%)',
    lightBg: '#FFFBF3',
    gold: '#C9A24B',
    goldMuted: '#D8C08E',
    textDark: '#3B2C22',
    textMuted: '#6B584A',
  },
  {
    id: 'emerald-gold',
    name: 'पन्ना हरा',
    darkBg: 'linear-gradient(160deg, #0B3D2E 0%, #145A43 55%, #0B3D2E 100%)',
    lightBg: '#F8FFF9',
    gold: '#D4AF37',
    goldMuted: '#B9D9C4',
    textDark: '#1F3A2E',
    textMuted: '#4C6459',
  },
  {
    id: 'royal-blue',
    name: 'शाही नीला',
    darkBg: 'linear-gradient(160deg, #0B1F3D 0%, #16305A 55%, #0B1F3D 100%)',
    lightBg: '#F7FAFF',
    gold: '#C9A24B',
    goldMuted: '#B7C4DE',
    textDark: '#1C2740',
    textMuted: '#51597A',
  },
  {
    id: 'blush-rosegold',
    name: 'गुलाबी',
    darkBg: 'linear-gradient(160deg, #5C1B3A 0%, #7A2C50 55%, #5C1B3A 100%)',
    lightBg: '#FFF7F9',
    gold: '#D9A66C',
    goldMuted: '#E7B9C9',
    textDark: '#4A2C36',
    textMuted: '#6E5460',
  },
  {
    id: 'ivory-copper',
    name: 'आइवरी कॉपर',
    darkBg: 'linear-gradient(160deg, #4A2C1D 0%, #6B3F27 55%, #4A2C1D 100%)',
    lightBg: '#FFFDF8',
    gold: '#B5652B',
    goldMuted: '#D9B693',
    textDark: '#3B2A1E',
    textMuted: '#6B5642',
  },
  {
    id: 'plum-silver',
    name: 'बैंगनी',
    darkBg: 'linear-gradient(160deg, #2E1A3D 0%, #46285C 55%, #2E1A3D 100%)',
    lightBg: '#FAF8FC',
    gold: '#9C7FB0',
    goldMuted: '#C9B8D6',
    textDark: '#2E2038',
    textMuted: '#5A4C66',
  },
];

export const DEFAULT_INVITATION_THEME_ID = INVITATION_THEMES[0].id;

export function getInvitationTheme(id: string | null | undefined): InvitationTheme {
  return INVITATION_THEMES.find(t => t.id === id) || INVITATION_THEMES[0];
}
