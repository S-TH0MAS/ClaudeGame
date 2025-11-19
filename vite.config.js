import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './', // Important pour que les liens fonctionnent sur GitHub Pages (chemins relatifs)
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game1: resolve(__dirname, 'games/game1/index.html'),
      },
    },
  },
});

