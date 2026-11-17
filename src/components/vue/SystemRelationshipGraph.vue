<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { VueFlow, Position, Handle, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';

interface Program { id:string; code:string; zh:string; en:string }
const props = defineProps<{ programs:Program[]; locale:'zh'|'en'; activeProgram:string }>();
const emit = defineEmits<{ select:[id:string] }>();
// Visual, publicly safe example topology only: organizational grouping is not an integration claim.
const graphNodes = computed<Node[]>(() => [
  { id:'PROTORHEXIS', type:'hub', position:{x:402,y:18}, sourcePosition:Position.Bottom, draggable:false,
    data:{id:'PROTORHEXIS',code:'ORG / 00',zh:'协作与公开工程入口',en:'Collaborative engineering network'} },
  ...props.programs.filter(p=>p.id!=='PROTORHEXIS').map((p,i)=>({
    id:p.id, type:'program', position:{x:42+(i%2)*560,y:232+Math.floor(i/2)*160},
    targetPosition:Position.Top, draggable:false,
    data:{id:p.id,code:p.code,zh:p.zh,en:p.en},
  }))
]);
const graphEdges = shallowRef<Edge[]>(props.programs.filter(p=>p.id!=='PROTORHEXIS').map(p=>({
  id:`illustrative-${p.id}`,source:'PROTORHEXIS',target:p.id,type:'smoothstep',
  animated:false, selectable:false,style:{stroke:'#66636a',strokeWidth:1.5}
})));
</script>

<template>
  <div class="system-graph" role="region" :aria-label="locale==='zh'?'可缩放的示例系统关系图':'Zoomable illustrative system relationship graph'">
    <div class="system-graph-tools"><span>VUE FLOW / READ ONLY</span><span>{{locale==='zh'?'拖动画布平移 · 滚动页面不缩放':'Drag canvas to pan · Page scroll does not zoom'}}</span></div>
    <div class="system-graph-viewport">
      <VueFlow :nodes="graphNodes" :edges="graphEdges" :fit-view-on-init="true" :min-zoom="0.45" :max-zoom="1.5"
        :nodes-draggable="false" :nodes-connectable="false" :elements-selectable="false"
        :zoom-on-scroll="false" :zoom-on-double-click="false" :prevent-scrolling="false"
        :pan-on-drag="true" class="system-graph-flow">
        <template #node-hub="{data}">
          <Handle type="source" :position="Position.Bottom" :connectable="false" />
          <button class="system-graph-node system-graph-hub" type="button" @click.stop="emit('select','all')">
            <span>{{data.code}}</span><strong>{{data.id}}</strong><small>{{locale==='zh'?data.zh:data.en}}</small>
          </button>
        </template>
        <template #node-program="{data}">
          <Handle type="target" :position="Position.Top" :connectable="false" />
          <button class="system-graph-node system-graph-program" type="button" :class="{'is-selected':activeProgram===data.id}" @click.stop="emit('select',data.id)">
            <span>{{data.code}}</span><strong>{{data.id}}</strong><small>{{locale==='zh'?data.zh:data.en}}</small>
          </button>
        </template>
      </VueFlow>
    </div>
  </div>
</template>
