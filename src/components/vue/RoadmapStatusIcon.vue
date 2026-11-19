<script setup lang="ts">
import { computed } from 'vue';
import IconFuture from '~icons/material-symbols/help-outline';
import IconPlanned from '~icons/material-symbols/event';
import IconDevelop from '~icons/material-symbols/construction';
import IconQualify from '~icons/material-symbols/fact-check';
import IconReview from '~icons/material-symbols/rate-review';
import IconPublished from '~icons/material-symbols/check-circle';
import IconUnassigned from '~icons/material-symbols/remove-circle-outline';
import IconTentative from '~icons/material-symbols/schedule';
import IconCommitted from '~icons/material-symbols/verified';
import IconMilestone from '~icons/material-symbols/flag';
import IconDecision from '~icons/material-symbols/alt-route';
import IconProject from '~icons/material-symbols/info-outline';

/** States are facts from the reviewed public snapshot, not a theme/accent. */
type Status = 'future' | 'planned' | 'development' | 'qualification' | 'review' |
  'published' | 'unassigned' | 'tentative' | 'committed' | 'released' |
  'milestone' | 'verification' | 'decision' | 'project';
const props=defineProps<{status:Status}>();
const icons={
  future:IconFuture,planned:IconPlanned,development:IconDevelop,
  qualification:IconQualify,review:IconReview,published:IconPublished,
  unassigned:IconUnassigned,tentative:IconTentative,committed:IconCommitted,released:IconPublished,
  milestone:IconMilestone,verification:IconCommitted,decision:IconDecision,project:IconProject
};
const selected=computed(()=>icons[props.status]);
</script>

<template>
  <span class="ws-status-icon" :data-status-icon="status" aria-hidden="true">
    <component :is="selected" />
  </span>
</template>
