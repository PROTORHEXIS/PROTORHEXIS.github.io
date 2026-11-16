type Locale = 'zh' | 'en';
const localeKey = 'protorhexis.public.locale';
let locale: Locale = 'zh';
try {
  if (window.localStorage.getItem(localeKey) === 'en') locale = 'en';
} catch { /* localStorage can be disabled */ }
function applyLocale() {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll<HTMLElement>('[data-zh][data-en]').forEach(el => {
    el.textContent = el.dataset[locale] ?? '';
  });
  document.querySelectorAll<HTMLButtonElement>('[data-lang-button]').forEach(button => {
    button.textContent = locale === 'zh' ? 'EN' : '中文';
    button.setAttribute('aria-label',locale === 'zh' ? 'Switch to English' : '切换为中文');
  });
  window.dispatchEvent(new CustomEvent('protorhexis:locale', { detail: locale }));
}
document.querySelectorAll<HTMLButtonElement>('[data-lang-button]').forEach(button => {
  button.addEventListener('click', () => {
    locale = locale === 'zh' ? 'en' : 'zh';
    try { window.localStorage.setItem(localeKey, locale); } catch { /* optional persistence */ }
    applyLocale();
  });
});
applyLocale();
