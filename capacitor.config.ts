import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tn.studhub.app',
  appName: 'StudHub',
  webDir: 'www',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'light',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
