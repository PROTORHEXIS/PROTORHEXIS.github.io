// The public site's shared navigation/loading gate.
// Two polygon clip-path slabs are adapted from the owner's TALOS Canvas demo.
// We deliberately DO NOT show a fabricated completion percentage: the bar is
// indeterminate until the document and Astro hydration signal real readiness.
type State = 'entry'|'idle'|'covering'|'covered'|'revealing';
const gate = document.getElementById('site-loading-gate');
const root = document.documentElement;
const startClip = 'polygon(-40% -10%,-20% -10%,-40% 110%,-60% 110%)';
const coverClip = 'polygon(-30% -10%,130% -10%,110% 110%,-50% 110%)';
const exitClip = 'polygon(130% -10%,150% -10%,130% 110%,110% 110%)';

if (gate) {
  const back = gate.querySelector<HTMLElement>('.site-loading-gate__slab--back');
  const front = gate.querySelector<HTMLElement>('.site-loading-gate__slab--front');
  const progress = gate.querySelector<HTMLElement>('.site-loading-gate__track');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inTransition = false;
  const delay = (ms:number) => new Promise<void>(resolve=>window.setTimeout(resolve,ms));
  const twoFrames = () => new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));

  function setState(state:State) {
    if(!gate) return;
    gate.dataset.state=state;
    gate.setAttribute('aria-hidden',state==='idle'?'true':'false');
    root.classList.toggle('site-gate-busy',state!=='idle');
    document.body?.setAttribute('aria-busy',String(state!=='idle'));
  }
  function reset() {
    if (!gate) return;
    setState('idle');
    gate.dataset.progress='loading';
    progress?.setAttribute('aria-valuetext','加载中 / Loading');
    back?.style.removeProperty('clip-path');
    front?.style.removeProperty('clip-path');
    root.classList.remove('site-gate-boot');
    inTransition=false;
  }
  function animateClip(el:HTMLElement|null,from:string,to:string,duration:number):Promise<void> {
    if(!el || reduced.matches) {
      if(el) el.style.clipPath=to;
      return Promise.resolve();
    }
    el.style.clipPath=from;
    const anim=el.animate([{clipPath:from},{clipPath:to}],{
      duration,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'
    });
    return anim.finished.then(()=>{
      el.style.clipPath=to;
      anim.cancel();
    }).catch(()=>{el.style.clipPath=to;});
  }
  function awaitFullLoad():Promise<void> {
    if(document.readyState==='complete') return Promise.resolve();
    return new Promise(resolve=>window.addEventListener('load',()=>resolve(),{once:true}));
  }
  function awaitHydration():Promise<void> {
    if(!document.querySelector('astro-island[ssr]')) return Promise.resolve();
    return new Promise(resolve=>{
      const observer=new MutationObserver(()=>{
        if(!document.querySelector('astro-island[ssr]')){observer.disconnect();resolve();}
      });
      observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['ssr']});
      window.setTimeout(()=>{observer.disconnect();resolve();},5200);
    });
  }
  async function revealOnceReady() {
    setState('entry');
    try {
      // The watchdog and timeout ensure a failed asset cannot trap the visitor.
      await Promise.race([Promise.all([awaitFullLoad(),awaitHydration()]),delay(7200)]);
      if(!gate || gate.dataset.state!=='entry') return;
      gate.dataset.progress='ready';
      progress?.setAttribute('aria-valuetext','页面已就绪 / Ready');
      await delay(reduced.matches?0:190);
      if(reduced.matches){reset();return;}
      setState('revealing');
      // The source demo's diagonal sweep leaves the covered viewport to the right.
      await Promise.all([
        animateClip(front,coverClip,exitClip,620),
        delay(70).then(()=>animateClip(back,coverClip,exitClip,550))
      ]);
    } catch {
      // Always reveal the document, including if the animation API fails.
    } finally {reset();}
  }
  async function coverAndNavigate(url:string) {
    if(inTransition) return;
    inTransition=true;
    if(reduced.matches) {window.location.assign(url);return;}
    setState('covering');
    if(gate) gate.dataset.progress='loading';
    try {
      await Promise.all([
        animateClip(back,startClip,coverClip,550),
        delay(60).then(()=>animateClip(front,startClip,coverClip,620))
      ]);
      setState('covered');
      await twoFrames(); // Make the logo and bar paint before the document changes.
      window.location.assign(url);
      // If a browser/network error prevents navigation, do not strand the UI.
      window.setTimeout(()=>{
        if(inTransition && document.visibilityState==='visible') reset();
      },8500);
    } catch {
      reset();
      window.location.assign(url);
    }
  }
  document.addEventListener('click',(event:MouseEvent)=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if(inTransition) return;
    const el=event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if(!el || el.hasAttribute('download') || el.dataset.noLoading!==undefined) return;
    if(el.target && el.target!=='_self') return;
    if(el.relList.contains('external')) return;
    const next=new URL(el.href,window.location.href);
    if(next.protocol!=='http:' && next.protocol!=='https:') return;
    if(next.origin!==window.location.origin || next.pathname.startsWith('/api/')) return;
    // Plain anchors and same-page hash navigation remain native/browser-fast.
    if(next.pathname===window.location.pathname && next.search===window.location.search) return;
    event.preventDefault();
    void coverAndNavigate(next.href);
  });
  window.addEventListener('pageshow',event=>{
    // A back-forward-cache document can resume mid-overlay.
    if(event.persisted) reset();
  });
  void revealOnceReady();
}
