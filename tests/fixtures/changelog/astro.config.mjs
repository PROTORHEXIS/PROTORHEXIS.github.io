import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import Icons from 'unplugin-icons/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  site:'https://protorhexis.com',
  integrations:[vue()],
  vite:{plugins:[Icons({compiler:'vue3',autoInstall:false})],server:{fs:{allow:[fileURLToPath(new URL('../../../',import.meta.url))]}}}
});
