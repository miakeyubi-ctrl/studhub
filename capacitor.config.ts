import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tn.studhub.app',
  appName: 'StudHub',
  webDir: 'www',
  server: {
    // API VPS en HTTP tant que le domaine HTTPS n'est pas prêt
    cleartext: true,
    // http évite les crashs mixed-content WebView (API en http://IP)
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#eef9fa',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#eef9fa'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  }
};

export default config;
