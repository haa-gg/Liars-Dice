import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'gnu-terry-pratchett',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('X-Clacks-Overhead', 'GNU Terry Pratchett');
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('X-Clacks-Overhead', 'GNU Terry Pratchett');
          next();
        });
      }
    }
  ],
  base: '/Liars-Dice/',
  test: {
    globals: true,
    environment: 'node',
  },
})
