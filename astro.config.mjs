import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  site: 'https://protorhexis.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [vue()],
  vite: { plugins: [Icons({ compiler: 'vue3', autoInstall: false })] },
});
