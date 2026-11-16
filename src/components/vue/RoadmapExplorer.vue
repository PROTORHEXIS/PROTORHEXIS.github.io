<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePublicLocale } from './usePublicLocale';
const { locale } = usePublicLocale();
type Category = 'all' | 'platform' | 'execution' | 'applications';
const selected = ref<Category>('all');
const query = ref('');
const filters: { value: Category; zh: string; en: string }[] = [
  { value: 'all', zh: '全部方向', en: 'All areas' },
  { value: 'platform', zh: '平台基础', en: 'Platform' },
  { value: 'execution', zh: '执行与自动化', en: 'Execution' },
  { value: 'applications', zh: '应用层', en: 'Applications' },
];
const entries = [
  { key: 'SYS-01', category: 'platform', name: 'TALOS', zh: '通用系统与运行平台方向', en: 'General systems and runtime platform', scope: 'PLATFORM / CONCEPTUAL' },
  { key: 'SYS-02', category: 'execution', name: 'MAXWELL', zh: '执行编排与自动化方向', en: 'Execution orchestration and automation', scope: 'EXECUTION / CONCEPTUAL' },
  { key: 'SYS-03', category: 'applications', name: 'APPLICATIONS', zh: '面向具体业务场景的应用与交互', en: 'Applications and interfaces for specific domains', scope: 'APPLICATION / CONCEPTUAL' },
] as const;
const visible = computed(() => entries.filter(e => {
  const categoryMatches = selected.value === 'all' || e.category === selected.value;
  const needle = query.value.trim().toLowerCase();
  const textMatches = !needle || [e.key, e.name, e.zh, e.en].join(' ').toLowerCase().includes(needle);
  return categoryMatches && textMatches;
}));
</script>
<template>
  <section class="explorer" aria-label="Public engineering area navigator">
    <div class="explorer-controls">
      <div class="explorer-tabs" role="group" :aria-label="locale === 'zh' ? '工程分类筛选' : 'Filter engineering areas'">
        <button v-for="item in filters" :key="item.value" type="button" :aria-pressed="selected === item.value" :class="['explorer-tab', { active: selected === item.value }]" @click="selected = item.value">{{ locale === 'zh' ? item.zh : item.en }}</button>
      </div>
      <label class="explorer-search">
        <span class="visually-hidden">{{ locale === 'zh' ? '搜索工程方向' : 'Search engineering areas' }}</span>
        <input v-model="query" type="search" :placeholder="locale === 'zh' ? '搜索系统 / SEARCH' : 'Search systems'" />
      </label>
    </div>
    <div class="explorer-grid" aria-live="polite">
      <article class="explorer-card" v-for="entry in visible" :key="entry.key">
        <div class="explorer-code">{{ entry.key }} <span>{{ entry.scope }}</span></div>
        <h3>{{ entry.name }}</h3>
        <p>{{ locale === 'zh' ? entry.zh : entry.en }}</p>
        <div class="explorer-card-foot"><span>{{ locale === 'zh' ? '暂无公开里程碑' : 'NO APPROVED MILESTONES' }}</span><a href="/roadmap/systems/" :aria-label="`${entry.name} — ${locale === 'zh' ? '系统图谱' : 'System map'}`">↗</a></div>
      </article>
      <div v-if="visible.length === 0" class="explorer-empty">{{ locale === 'zh' ? '没有匹配的公开方向。' : 'No matching public areas.' }}</div>
    </div>
  </section>
</template>
