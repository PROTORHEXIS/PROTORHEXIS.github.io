<script setup lang="ts">
import { changeKinds, changeLabel, changeStateLabel, type ReleaseView } from './release-presentation';
import type { Translate } from './roadmap-presentation';
defineProps<{ release:ReleaseView; tr:Translate }>();
</script>
<template>
  <div class="inspector-hero"><small>{{release.program}} / {{release.channel}}</small><h2>{{release.version}}</h2><span class="inspector-status">{{release.preview?tr('未发布预览','Unreleased preview'):release.date??tr('日期未公开','Date unavailable')}}</span></div>
  <div class="inspector-section"><p>{{tr(release.summary.zh,release.summary.en)}}</p><p v-if="release.availability">{{tr(release.availability.zh,release.availability.en)}}</p><a :href="'/roadmap/changelog/?release='+encodeURIComponent(release.id)">{{tr('版本链接','Release link')}} ↗</a></div>
  <template v-for="kind in changeKinds" :key="kind">
    <details v-if="release.changes.some(change=>change.kind===kind)" class="inspector-section release-section" open>
      <summary>{{changeLabel(kind,tr)}}</summary>
      <div v-for="change in release.changes.filter(change=>change.kind===kind)" :key="change.id" class="release-change" :data-change-state="change.state">
        <small>{{changeStateLabel(change,tr)}}</small><p>{{tr(change.text.zh,change.text.en)}}</p>
      </div>
    </details>
  </template>
  <div v-if="release.compatibility" class="inspector-section"><span class="inspector-label">{{tr('兼容性','COMPATIBILITY')}}</span><p>{{tr(release.compatibility.zh,release.compatibility.en)}}</p></div>
  <div v-if="release.migration" class="inspector-section"><span class="inspector-label">{{tr('迁移','MIGRATION')}}</span><p>{{tr(release.migration.zh,release.migration.en)}}</p></div>
  <div v-if="release.knownIssues" class="inspector-section"><span class="inspector-label">{{tr('已知问题','KNOWN ISSUES')}}</span><p>{{tr(release.knownIssues.zh,release.knownIssues.en)}}</p></div>
</template>
