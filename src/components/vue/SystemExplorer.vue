<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePublicLocale } from './usePublicLocale';
const { locale } = usePublicLocale();
const nodes = [
  { key: 'platform', code:'LAYER / 01', name:'TALOS', zh:'平台基础与通用执行边界', en:'Platform foundation and shared execution boundaries', noteZh:'这里展示的是面向公众的功能分类，而不是部署拓扑、可信计算边界或正式模块依赖。', noteEn:'This is a public functional category, not infrastructure topology, trust boundaries or approved module dependencies.' },
  { key: 'execution', code:'LAYER / 02', name:'MAXWELL', zh:'自动化、任务编排与执行流程', en:'Automation, task orchestration and execution workflows', noteZh:'内部任务、Agent 轨迹和执行日志不会直接导出到公开页面。', noteEn:'Internal task traces, agent histories and execution logs are not exported directly to this public page.' },
  { key: 'applications', code:'LAYER / 03', name:'APPLICATIONS', zh:'围绕特定业务建立可独立演进的应用', en:'Applications that evolve independently around specific domains', noteZh:'具体产品与交付时间只有经过独立的公开批准后才会列出。', noteEn:'Individual products and delivery dates appear only after public review and approval.' }
] as const;
type NodeKey = typeof nodes[number]['key'];
const selected = ref<NodeKey>('platform');
const item = computed(() => nodes.find(n=>n.key===selected.value)!);
</script>
<template>
  <div class="system-explorer">
    <div class="system-steps" role="group" :aria-label="locale === 'zh' ? '选择系统层级' : 'Select a system layer'">
      <button v-for="(node, i) in nodes" :key="node.key" class="system-step" :class="{active:selected===node.key}" type="button" :aria-pressed="selected===node.key" @click="selected=node.key">
        <span class="system-step-top"><span>{{ node.code }}</span><span aria-hidden="true">0{{i + 1}}</span></span>
        <strong>{{ node.name }}</strong><small>{{locale === 'zh' ? node.zh : node.en}}</small>
      </button>
    </div>
    <div class="system-detail" aria-live="polite">
      <div class="explorer-code">{{ item.code }} / SELECTED</div>
      <h3>{{item.name}}</h3>
      <p>{{locale === 'zh' ? item.noteZh : item.noteEn}}</p>
      <div class="system-detail-foot">CONCEPTUAL / NOT A RUNTIME DEPENDENCY GRAPH</div>
    </div>
  </div>
</template>
