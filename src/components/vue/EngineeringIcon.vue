<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import LineArrowLeft from '~icons/line-md/arrow-left';
import LineArrowRight from '~icons/line-md/arrow-right';
import LineArrowDown from '~icons/line-md/arrow-down';
import LineClose from '~icons/line-md/close';
import LineAlert from '~icons/line-md/alert-circle';
import LineRestore from '~icons/line-md/backup-restore';
import MaterialSearch from '~icons/material-symbols/search';
import MaterialArrowBack from '~icons/material-symbols/arrow-back';
import MaterialArrowForward from '~icons/material-symbols/arrow-forward';
import MaterialArrowDown from '~icons/material-symbols/keyboard-arrow-down';
import MaterialClose from '~icons/material-symbols/close';
import MaterialWarning from '~icons/material-symbols/warning-outline';
import MaterialRestore from '~icons/material-symbols/restart-alt';
import FluentInfo from '~icons/fluent/info-24-regular';

/**
 * Public engineering icon policy:
 * 1. Material Line Icons: animated interaction feedback
 * 2. Material Symbols: static semantic icon / reduced-motion fallbacks
 * 3. Fluent: precise specialty affordances when not available above
 * Only locally bundled icon data is used; do not use Iconify runtime API.
 */
type SemanticName = 'back' | 'next' | 'expand' | 'close' | 'warning' | 'reset' | 'search' | 'info';
const props = defineProps<{ name: SemanticName }>();
const prefersReducedMotion = ref(true);
const hydrated = ref(false);
let media: MediaQueryList | undefined;
const onPreferenceChange = (e: MediaQueryListEvent) => { prefersReducedMotion.value = e.matches; };
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion.value = media.matches;
  hydrated.value = true;
  media.addEventListener('change', onPreferenceChange);
});
onBeforeUnmount(() => media?.removeEventListener('change', onPreferenceChange));
const animatedIcons = {
  back: LineArrowLeft,
  next: LineArrowRight,
  expand: LineArrowDown,
  close: LineClose,
  warning: LineAlert,
  reset: LineRestore,
  search: MaterialSearch, // the first collection has no verified equivalent in the V2 vocabulary
  info: FluentInfo, // reserved low-frequency detail marker, not a primary action
};
const staticIcons = {
  back: MaterialArrowBack,
  next: MaterialArrowForward,
  expand: MaterialArrowDown,
  close: MaterialClose,
  warning: MaterialWarning,
  reset: MaterialRestore,
  search: MaterialSearch,
  info: FluentInfo,
};
const resolved = computed(() => (hydrated.value && !prefersReducedMotion.value ? animatedIcons : staticIcons)[props.name]);
</script>

<template>
  <component :is="resolved" aria-hidden="true" focusable="false" class="ws-glyph" />
</template>
