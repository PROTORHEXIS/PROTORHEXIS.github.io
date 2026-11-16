<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePublicLocale } from './usePublicLocale';
const {locale} = usePublicLocale();
type Kind = 'all' | 'milestone' | 'validation' | 'release';
const selected = ref<Kind>('all');
const categories: {value:Kind;zh:string;en:string}[] = [
  { value:'all', zh:'全部规则', en:'All requirements' },
  { value:'milestone', zh:'里程碑', en:'Milestones' },
  { value:'validation', zh:'工程验证', en:'Qualification' },
  { value:'release', zh:'发布资格', en:'Release eligibility' }
];
const rules = [
  {kind:'milestone', num:'01', zh:'目标、范围、状态和变更记录必须明确，不得把计划当成承诺。', en:'State objectives, scope, status and revision history. A plan is not a delivery promise.', label:'PUBLIC MILESTONE'},
  {kind:'validation', num:'02', zh:'说明测试对象、版本、覆盖范围与遗留限制；受限通过不等于产品发布。', en:'Publish tested artifact, revision, test scope and limitations. Bounded pass is not product release.', label:'BOUNDED EVIDENCE'},
  {kind:'release', num:'03', zh:'正式发布需要独立裁决，并链接可公开验证的证据。', en:'Public release requires a separate approval and publicly verifiable evidence.', label:'RELEASE DECISION'}
] as const;
const visible = computed(()=>rules.filter(r=>selected.value==='all'||r.kind===selected.value));
</script>
<template>
  <section class="evidence-model" aria-label="Evidence publication requirements">
    <div class="explorer-tabs" role="group" :aria-label="locale==='zh'?'筛选证据规则':'Filter evidence rules'">
      <button v-for="cat in categories" :key="cat.value" type="button" class="explorer-tab" :class="{active:selected===cat.value}" :aria-pressed="selected===cat.value" @click="selected=cat.value">{{locale==='zh'?cat.zh:cat.en}}</button>
    </div>
    <div class="method" aria-live="polite">
      <article class="method-row" v-for="rule in visible" :key="rule.num"><span class="method-id">{{rule.num}}</span><div><h3>{{rule.label}}</h3><p>{{locale==='zh'?rule.zh:rule.en}}</p></div><span class="method-status">PUBLICATION RULE</span></article>
    </div>
    <div class="empty-state evidence-empty"><div><div class="explorer-code">PUBLIC RECORDS / 00</div><div class="big">{{locale==='zh'?'尚无已批准的公开记录':'No approved public records'}}</div><p>{{locale==='zh'?'正式记录将在独立审查后通过版本化静态数据发布。':'Real entries will appear through versioned, reviewed static data.'}}</p></div><span class="empty-mark" aria-hidden="true">∅</span></div>
  </section>
</template>
