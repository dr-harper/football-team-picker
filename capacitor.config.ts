import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.co.mlharper.teamshuffle',
  appName: 'TeamShuffle',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Also set in android/app/src/main/res/values/strings.xml and VITE_GOOGLE_CLIENT_ID env var
      serverClientId: '88950522814-q2irelc9ufgkf12gqe9tj9t30kbg5o1i.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
