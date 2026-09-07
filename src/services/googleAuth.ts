import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { ENV } from '../config/env';

/**
 * Real Google OAuth plumbing (Authorization Code + PKCE), dormant until a
 * client ID is configured. Until then, Google Drive sync falls back to the
 * local-only demo mode (see GoogleDriveService / settings/sync.tsx) instead
 * of pretending to be a real signed-in Google account.
 *
 * Setup: create an OAuth client at
 * https://console.cloud.google.com/apis/credentials and set
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and optionally the iOS/Android client
 * IDs) as env vars. The app's URL scheme ("evento://", see app.json) must be
 * added as an authorized redirect URI for native client types.
 */

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
};

// drive.file: the app can only read/write files it created itself — enough
// for a single backup file, without requesting broad Drive access.
export const GOOGLE_SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'];

export function getGoogleClientId(): string {
  if (Platform.OS === 'ios' && ENV.GOOGLE_IOS_CLIENT_ID) return ENV.GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === 'android' && ENV.GOOGLE_ANDROID_CLIENT_ID) return ENV.GOOGLE_ANDROID_CLIENT_ID;
  return ENV.GOOGLE_WEB_CLIENT_ID;
}

export function isGoogleSyncConfigured(): boolean {
  return !!getGoogleClientId();
}

export interface GoogleSession {
  accessToken: string;
  email: string;
  name: string;
  picture?: string;
}

export async function fetchGoogleProfile(accessToken: string): Promise<{ email: string; name: string; picture?: string }> {
  const info = await AuthSession.fetchUserInfoAsync({ accessToken }, GOOGLE_DISCOVERY);
  return { email: info.email, name: info.name || info.email, picture: info.picture };
}
