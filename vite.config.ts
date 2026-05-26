import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native': 'react-native-web',
        '@expo/vector-icons': path.resolve(__dirname, './src/mocks/vector-icons.tsx'),
        'expo-router': path.resolve(__dirname, './src/mocks/expo-router.tsx'),
        '@react-native-async-storage/async-storage': path.resolve(__dirname, './src/mocks/async-storage.ts'),
        'react-native-safe-area-context': path.resolve(__dirname, './src/mocks/safe-area-context.tsx'),
        '@react-native-community/slider': path.resolve(__dirname, './src/mocks/slider.tsx'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
