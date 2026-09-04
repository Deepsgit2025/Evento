export const ENV = {
  APP_NAME: 'Evento',
  APP_VERSION: '2.0.0',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Google Drive (user must configure OAuth client ID for their app)
  GOOGLE_DRIVE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '',
};
