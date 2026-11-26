import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cijing.app',
  appName: '逻辑填空',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
  },
};

export default config;
