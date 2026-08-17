import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// app.html is the only entry that boots the React SPA — index.html is the
// separate marketing landing page. Vite's dev server has no idea which
// client-side routes belong to the SPA, so a hard refresh (or a direct visit)
// on e.g. /settings falls through to its default fallback (index.html),
// which looks like the user got logged out when it's really just the wrong
// page loading. This plugin rewrites requests for known app routes to
// app.html before Vite's own static/HTML middleware runs.
const APP_ROUTES = ['/dashboard', '/catalog', '/contacts', '/calendar', '/professionals', '/fiscal', '/finance', '/settings', '/login'];

function appHtmlFallback(): Plugin {
    return {
        name: 'app-html-spa-fallback',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url?.split('?')[0] ?? '';
                if (APP_ROUTES.some(route => url === route || url.startsWith(route + '/'))) {
                    req.url = '/app.html';
                }
                next();
            });
        }
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            landing: path.resolve(__dirname, 'landing.html'),
            app: path.resolve(__dirname, 'app.html'),
          }
        }
      },
      plugins: [react(), appHtmlFallback()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
