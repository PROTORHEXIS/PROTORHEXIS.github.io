<script setup lang="ts">
import EngineeringIcon from './EngineeringIcon.vue';
import { roadmapLabels, type Translate } from './roadmap-presentation';
import type { PublicEvent } from '../../data/workstation-public';

const props = defineProps<{ events: PublicEvent[]; selectedId: string; tr: Translate }>();
const emit = defineEmits<{ select: [id: string] }>();
const { eventName, fmtDate } = roadmapLabels(props.tr);
</script>

<template>
  <div class="event-stream"><TransitionGroup name="activity-list"><button v-for="event in events" :key="event.id" class="event-entry" :data-event-id="event.id" :class="{selected:selectedId===event.id}" :aria-pressed="selectedId===event.id" @click="emit('select',event.id)"><span class="event-date">{{fmtDate(event.date)}}<small>{{event.program}}</small></span><span class="event-marker"><i></i></span><span class="event-body"><span class="event-kind">{{eventName(event.kind)}} <span>/ {{event.id}}</span></span><strong>{{tr(event.titleZh,event.titleEn)}}</strong><span class="event-summary">{{tr(event.descZh,event.descEn)}}</span><span class="event-arrow" aria-hidden="true"><EngineeringIcon name="next" /></span></span></button></TransitionGroup><div v-if="events.length===0" class="ws-no-results">{{tr('没有匹配的事件。','No matching events.')}}</div></div>
</template>
