import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // REMOVED: build.rollupOptions.input section is no longer needed
  /*
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        qrtest: 'test-qr-scanner.html'
      }
    }
  },
  */
})