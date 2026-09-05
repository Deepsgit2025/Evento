export const ENV = {
  APP_NAME: 'Evento',
  APP_VERSION: '2.0.0',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

  // Google Sign-In / Drive sync.
  // Create OAuth client IDs at https://console.cloud.google.com/apis/credentials
  // (one "Web application" client is enough to get started; add iOS/Android
  // clients too if you build standalone native apps). Set them as env vars
  // (e.g. in a .env file consumed by Expo) — sync stays in local-only demo
  // mode until at least one of these is set.
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};
