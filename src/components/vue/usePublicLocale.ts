import { ref, onMounted, onUnmounted } from 'vue';
export type PublicLocale = 'zh' | 'en';
export function usePublicLocale() {
  const locale = ref<PublicLocale>('zh');
  const read = () => { locale.value = document.documentElement.lang === 'en' ? 'en' : 'zh'; };
  onMounted(() => { read(); window.addEventListener('protorhexis:locale', read); });
  onUnmounted(() => window.removeEventListener('protorhexis:locale', read));
  return { locale };
}
