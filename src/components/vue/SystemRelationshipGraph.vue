<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { VueFlow, Position, Handle, type Node, type Edge } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';

interface Program { id:string; code:string; zh:string; en:string }
interface Relation { id:string; from:string; to:string; kind:string; publication:string }
const props = defineProps<{ programs:Program[]; relations:Relation[]; locale:'zh'|'en'; activeProgram:string }>();
const emit = defineEmits<{ select:[id:string] }>();
const compact = ref(false);
let mq: MediaQueryList | null = null;
const viewportEl = ref<HTMLElement | null>(null);
type ViewportApi = {
  getViewport: () => { x:number; y:number; zoom:number };
  setViewport: (viewport:{x:number;y:number;zoom:number}, options?:{duration:number}) => Promise<boolean> | void;
};
let flow:ViewportApi | null = null;
let paneObserver: ResizeObserver | null = null;
let revealFrame=0;
// Vue Flow is a transformed canvas, not a native scroll container.
// Pan only far enough to expose the whole selected node in its resized pane.
function revealGraphNode() {
  const nodeId=props.activeProgram;
  if(nodeId==='all' || !flow || !viewportEl.value) return;
  const root=viewportEl.value;
  const node=Array.from(root.querySelectorAll<HTMLElement>('.system-graph-node[data-program-id]'))
    .find(el=>el.dataset.programId===nodeId);
  if(!node) return;
  const view=root.getBoundingClientRect(), target=node.getBoundingClientRect();
  const pad=14,left=view.left+pad,right=view.right-pad,top=view.top+pad,bottom=view.bottom-pad;
  if(right<=left||bottom<=top) return;
  const dx=target.width>right-left ? left-target.left
    :target.left<left ? left-target.left :target.right>right ? right-target.right:0;
  const dy=target.height>bottom-top ? top-target.top
    :target.top<top ? top-target.top :target.bottom>bottom ? bottom-target.bottom:0;
  if(Math.abs(dx)<.5 && Math.abs(dy)<.5) return;
  const current=flow.getViewport();
  void flow.setViewport({x:current.x+dx,y:current.y+dy,zoom:current.zoom},{duration:0});
}
function queueGraphReveal() {
  if(revealFrame) cancelAnimationFrame(revealFrame);
  revealFrame=requestAnimationFrame(()=>{revealFrame=0;revealGraphNode();});
}
function onPaneReady(instance:ViewportApi) { flow=instance; nextTick(queueGraphReveal); }
watch(()=>props.activeProgram,()=>nextTick(queueGraphReveal),{flush:'post'});

const onCompact = () => {compact.value=Boolean(mq?.matches);};
onMounted(()=>{
  mq=window.matchMedia('(max-width:740px)');
  onCompact();mq.addEventListener('change',onCompact);
  if(viewportEl.value && typeof ResizeObserver!=='undefined') {
    paneObserver=new ResizeObserver(queueGraphReveal);
    paneObserver.observe(viewportEl.value);
  }
});
onBeforeUnmount(()=>{
  mq?.removeEventListener('change',onCompact);
  paneObserver?.disconnect();
  if(revealFrame) cancelAnimationFrame(revealFrame);
});
// The positions are presentation only. Every drawn connection must exist in reviewed public data.
const graphNodes = computed<Node[]>(() => [
  { id:'PROTORHEXIS', type:'hub', position:compact.value?{x:0,y:0}:{x:402,y:18}, sourcePosition:Position.Bottom, draggable:false,
    data:{id:'PROTORHEXIS',code:'ORG / 00',zh:'协作与公开工程入口',en:'Collaborative engineering network'} },
  ...props.programs.filter(p=>p.id!=='PROTORHEXIS').map((p,i)=>({
    id:p.id, type:'program', position:compact.value?{x:0,y:128*(i+1)}:{x:42+(i%2)*560,y:232+Math.floor(i/2)*160},
    targetPosition:Position.Top, draggable:false,
    data:{id:p.id,code:p.code,zh:p.zh,en:p.en},
  }))
]);
const graphEdges = computed<Edge[]>(() => {
  const ids = new Set(props.programs.map(p=>p.id));
  return props.relations
    .filter(r=>r.publication==='approved' && r.kind==='contains' && r.from==='PROTORHEXIS' && ids.has(r.to) && r.to!==r.from)
    .map(r=>({id:r.id,source:r.from,target:r.to,type:'smoothstep',selectable:false,animated:false}));
});
</script>

<template>
  <div class="system-graph" role="region" :aria-label="locale==='zh'?'已审核的公开项目归属图':'Reviewed public organizational grouping'">
    <div class="system-graph-tools"><span>VUE FLOW / READ ONLY</span><span>{{locale==='zh'?'拖动画布平移 · 滚动页面不缩放':'Drag canvas to pan · Page scroll does not zoom'}}</span></div>
    <div ref="viewportEl" class="system-graph-viewport">
      <VueFlow :key="compact?'vertical':'wide'" :nodes="graphNodes" :edges="graphEdges" :fit-view-on-init="true" :min-zoom="compact?0.25:0.45" :max-zoom="1.5"
        :nodes-draggable="false" :nodes-connectable="false" :elements-selectable="false"
        :zoom-on-scroll="false" :zoom-on-double-click="false" :prevent-scrolling="false"
        :pan-on-drag="true" class="system-graph-flow" @pane-ready="onPaneReady">
        <template #node-hub="{data}">
          <Handle type="source" :position="Position.Bottom" :connectable="false" />
          <button class="system-graph-node system-graph-hub" type="button" @click.stop="emit('select','all')">
            <span>{{data.code}}</span><strong>{{data.id}}</strong><small>{{locale==='zh'?data.zh:data.en}}</small>
          </button>
        </template>
        <template #node-program="{data}">
          <Handle type="target" :position="Position.Top" :connectable="false" />
          <button class="system-graph-node system-graph-program" :data-program-id="data.id" type="button" :class="{'is-selected':activeProgram===data.id}" @click.stop="emit('select',data.id)">
            <span>{{data.code}}</span><strong>{{data.id}}</strong><small>{{locale==='zh'?data.zh:data.en}}</small>
          </button>
        </template>
      </VueFlow>
    </div>
  </div>
</template>
