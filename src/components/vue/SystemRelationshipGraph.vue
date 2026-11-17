<script setup lang="ts">
import { computed, shallowRef, ref, onMounted, onBeforeUnmount } from 'vue';
import { VueFlow, Position, Handle, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';

interface Program { id:string; code:string; zh:string; en:string }
const props = defineProps<{ programs:Program[]; locale:'zh'|'en'; activeProgram:string }>();
const emit = defineEmits<{ select:[id:string] }>();
const compact = ref(false);
let mq: MediaQueryList | null = null;
const onCompact = () => {compact.value=Boolean(mq?.matches);};
onMounted(()=>{mq=window.matchMedia('(max-width:740px)');onCompact();mq.addEventListener('change',onCompact);});
onBeforeUnmount(()=>mq?.removeEventListener('change',onCompact));
// Visual, publicly safe example topology only: organizational grouping is not an integration claim.
const graphNodes = computed<Node[]>(() => [
  { id:'PROTORHEXIS', type:'hub', position:compact.value?{x:0,y:0}:{x:402,y:18}, sourcePosition:Position.Bottom, draggable:false,
    data:{id:'PROTORHEXIS',code:'ORG / 00',zh:'协作与公开工程入口',en:'Collaborative engineering network'} },
  ...props.programs.filter(p=>p.id!=='PROTORHEXIS').map((p,i)=>({
    id:p.id, type:'program', position:compact.value?{x:0,y:128*(i+1)}:{x:42+(i%2)*560,y:232+Math.floor(i/2)*160},
    targetPosition:Position.Top, draggable:false,
    data:{id:p.id,code:p.code,zh:p.zh,en:p.en},
  }))
]);
// No approved evidence of cross-system interfaces: render nodes without invented links.
const graphEdges = shallowRef<Edge[]>([]);
</script>

<template>
  <div class="system-graph" role="region" :aria-label="locale==='zh'?'公开项目索引图（关系待审查）':'Public project index; no unverified connections'">
    <div class="system-graph-tools"><span>VUE FLOW / READ ONLY</span><span>{{locale==='zh'?'拖动画布平移 · 滚动页面不缩放':'Drag canvas to pan · Page scroll does not zoom'}}</span></div>
    <div class="system-graph-viewport">
      <VueFlow :key="compact?'vertical':'wide'" :nodes="graphNodes" :edges="graphEdges" :fit-view-on-init="true" :min-zoom="compact?0.25:0.45" :max-zoom="1.5"
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
