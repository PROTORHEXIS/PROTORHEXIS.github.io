<script setup lang="ts">
import EngineeringIcon from './EngineeringIcon.vue';
import type { Translate } from './roadmap-presentation';
import type { ReleaseView } from './release-presentation';
defineProps<{ releases:ReleaseView[]; selectedId:string; tr:Translate }>();
const emit=defineEmits<{ select:[id:string] }>();
</script>
<template>
  <div class="changelog-list">
    <TransitionGroup name="release-list">
      <button v-for="release in releases" :key="release.id" type="button" class="changelog-card" :data-release-id="release.id" :aria-pressed="selectedId===release.id" @click="emit('select',release.id)">
        <small>{{release.program}} / {{release.channel}} · {{release.preview?tr('未发布预览','Unreleased preview'):release.date??tr('日期未公开','Date unavailable')}}</small>
        <strong>{{release.version}}</strong>
        <p>{{tr(release.summary.zh,release.summary.en)}}</p><EngineeringIcon name="next" />
      </button>
    </TransitionGroup>
    <div v-if="!releases.length" class="ws-no-results changelog-empty" role="status">{{tr('暂无符合条件的已授权版本记录。','No authorized release records match.')}}</div>
  </div>
</template>
