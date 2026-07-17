import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cgcritic.app',
  appName: 'CGCritic',
  webDir: 'www',
  plugins: {
    // Route HTTP through the native layer so requests bypass the WebView's
    // CORS engine (the backend does not send CORS headers) and cookies are
    // persisted by the native cookie store for the session-based auth.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
