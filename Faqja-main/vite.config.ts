import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // API Key & Client ID Configuration
  const DEFAULT_API_KEY = 'AIzaSyBk0GT4ozaS-g31LqnYrzTleVokX1dw27A'; 
  const CLIENT_ID = '406226665276-03ois502nhvis03gcvasp0nmo0trjump.apps.googleusercontent.com';
  const APP_ID = '406226665276';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY || DEFAULT_API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || CLIENT_ID),
      'process.env.GOOGLE_APP_ID': JSON.stringify(env.VITE_GOOGLE_APP_ID || APP_ID),
    },
  };
});