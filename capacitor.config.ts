import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p83abe351206248f9a1cefeca04124c9c',
  appName: 'budget-bro-bb',
  webDir: 'dist',
  server: process.env.CAPACITOR_LIVE_RELOAD === 'true'
    ? {
        url: 'https://83abe351-2062-48f9-a1ce-feca04124c9c.lovableproject.com?forceHideBadge=true',
        cleartext: true,
      }
    : undefined,
};

export default config;
