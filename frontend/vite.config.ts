import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            monaco: ['modern-monaco'],
            icons: ['developer-icons', 'lucide-react'],
            recharts: ['recharts'],
            jspdf: ['jspdf'],
            prism: ['prism-react-renderer'],
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
