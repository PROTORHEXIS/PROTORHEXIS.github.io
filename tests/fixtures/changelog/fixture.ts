import {compileSnapshots} from '../../../src/lib/roadmap-projection.mjs';
import {releaseSchema,changeSchema,eventSchema} from '../../../src/lib/roadmap-content-schema.mjs';
import {toReleaseViews} from '../../../src/components/vue/release-presentation';
import {toPublicEvents,type PublicRelease,type PublicChange} from '../../../src/data/workstation-public';
const local=(zh:string,en:string)=>({zh,en});
const sources=[{url:'https://github.com/PROTORHEXIS/PROTORHEXIS.github.io/pull/27'}];
const common={sources,publication:'approved',publicUpdatedAt:'2026-11-27'};
const first={...common,id:'FIXTURE-RELEASE-A',program:'TALOS',displayName:local('测试版本','Fixture release'),version:'Fixture 1',channel:'test',date:'2026-01-01',preview:false,summary:local('测试版本','Fixture release'),availability:'available',changeIds:['FIX-A','FIX-B','FIX-C','ADD-A','MIG-A','ISS-A']};
const second={...common,id:'FIXTURE-RELEASE-B',program:'MAXWELL',displayName:local('未编号预览','Unnamed preview'),version:null,channel:'preview',date:null,preview:true,summary:local('未发布预览','Unreleased fixture'),availability:'preview',changeIds:['ADD-B']};
const c=(id:string,kind:string,implementation:string,verification:string,zh:string,en:string,releaseId=first.id)=>({...common,id,kind,implementation,verification,text:local(zh,en),releaseId});
const records=[
c('FIX-A','fixed','implemented','pass','已确认的修复','Verified repair'),
c('FIX-B','fixed','implemented','not_run','待验证的修复','Unconfirmed repair'),
c('FIX-C','fixed','planned','not_run','计划修复','Planned repair'),
c('ADD-A','added','implemented','pass','新功能','New feature'),
c('MIG-A','migration','implemented','pass','迁移步骤','Migration step'),
c('ISS-A','known_issue','implemented','unknown','已知问题记录','Known issue record'),
c('ADD-B','added','planned','not_run','计划功能','Planned feature',second.id)];
const event=eventSchema.parse({...common,id:'FIXTURE-RELEASE-EVENT',program:'TALOS',kind:'release',date:'2026-01-01',releaseId:first.id});
const [,snapshot]=compileSnapshots({program:[{id:'TALOS'},{id:'MAXWELL'}],work:[],relation:[],event:[event],release:[releaseSchema.parse(first),releaseSchema.parse(second)],change:records.map(r=>changeSchema.parse(r))},JSON.stringify);
export const releases=toReleaseViews(snapshot.releases as PublicRelease[],snapshot.changes as PublicChange[]);
export const events=toPublicEvents(snapshot.events);
