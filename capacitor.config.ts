import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pratik.obsidia',
  appName: 'Obsidian',
  server: {
    url: 'https://obsidian-safe-and-secure.onrender.com',
    cleartext: false
  }
};

export default config;