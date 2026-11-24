<script setup lang="ts">
import { computed } from 'vue';
import { motion } from 'motion-v';
import EngineeringIcon from './EngineeringIcon.vue';
import RoadmapStatusIcon from './RoadmapStatusIcon.vue';
import { roadmapLabels, stages, type Translate } from './roadmap-presentation';
import type { WorkItem } from '../../data/workstation-public';

const props = defineProps<{ items: WorkItem[]; selectedId: string; reducedMotion: boolean; tr: Translate }>();
const emit = defineEmits<{ select: [id: string] }>();
const { streamName, deliveryName } = roadmapLabels(props.tr);
const lanes = computed(() => stages.map(stage => ({ ...stage, items: props.items.filter(item => item.stage === stage.id) })));
</script>

<template>
  <div class="ws-board" :style="{'--board-stage-count':stages.length,'--board-min-width':`${stages.length*260}px`}">
          <section v-for="stage in lanes" :key="stage.id" class="kanban-column"><div class="kanban-heading" :data-stage="stage.id"><span class="kanban-stage-label"><RoadmapStatusIcon :status="stage.id" />{{stage.code}} / {{tr(stage.zh,stage.en)}}</span><span class="kanban-count">{{stage.items.length.toString().padStart(2,'0')}}</span></div><div class="kanban-stack"><motion.button v-for="item in stage.items" :key="item.id" layout :initial="false" :whileHover="reducedMotion ? undefined : { y: -2 }" :whilePress="reducedMotion ? undefined : { scale: 0.99 }" :transition="{ duration: reducedMotion ? 0 : 0.14 }" class="kanban-card" :data-item-id="item.id" :class="{selected:selectedId===item.id}" :aria-pressed="selectedId===item.id" @click="emit('select',item.id)"><span class="kanban-card-head"><small>{{item.id}}</small><small>{{item.program}}</small></span><strong>{{tr(item.titleZh,item.titleEn)}}</strong><p>{{tr(item.descZh,item.descEn)}}</p><span class="kanban-card-foot"><span>{{streamName(item.stream)}}</span><span class="kanban-delivery" :data-delivery="item.deliveryState"><RoadmapStatusIcon :status="item.deliveryState" />{{deliveryName(item.deliveryState)}}</span><span class="ws-action-glyph"><EngineeringIcon name="next" /></span></span></motion.button><div v-if="!stage.items.length" class="kanban-empty">NO ITEMS</div></div></section>
        </div>
</template>
