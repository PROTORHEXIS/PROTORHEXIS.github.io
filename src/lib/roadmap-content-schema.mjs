import { z } from 'zod';

export const identifier = z.string().regex(/^[A-Z][A-Z0-9-]{2,63}$/);
export const date = z.iso.date();
export const localized = z.object({ zh:z.string().min(1).max(220), en:z.string().min(1).max(220) }).strict();
export const source = z.object({url:z.url().refine(s=>s.startsWith('https://'),'HTTPS source required'), sha:z.string().regex(/^[0-9a-f]{40}$/).optional(), note:z.string().max(220).optional()}).strict();
export const publication = z.enum(['approved','draft']);
export const phase = z.enum(['future','planned','development','qualification','review','published']);
export const category = z.enum(['platform','product','infrastructure']);
export const deliveryStatus = z.enum(['unassigned','tentative','committed','released']);
// Disclosure approval is not a Release Gate.
export const delivery = z.object({
  state:deliveryStatus,
  target:z.string().min(1).max(90).optional(),
  gateReceipt:z.string().min(6).max(160).optional()
}).strict();
export const programSchema=z.object({
  id:identifier, code:z.string().min(1).max(24), title:localized, description:localized,
  publication, order:z.number().int().min(0), sources:z.array(source).min(1)
}).strict();
export const schedule=z.object({start:date,end:date,kind:z.enum(['observed','tentative','committed'])}).strict().nullable();
export const legacyWorkSchema=z.object({
  id:identifier, program:identifier, title:localized, description:localized,
  phase, category, schedule, dependsOn:z.array(identifier), sources:z.array(source),
  updatedAt:date, publication, documentation:z.string().max(1200).optional(),
  reviewReceipt:z.string().regex(/^PUB-RM-[A-Z0-9-]{6,80}$/).optional(),
  delivery, verifiedAt:date.nullable()
}).strict();
export const legacyEventSchema=z.object({
  id:identifier, program:identifier, item:identifier.optional(), date, kind:z.enum(['milestone','verification','decision']),
  title:localized, description:localized, sources:z.array(source).min(1), publication,
  change:z.object({field:z.enum(['phase','delivery','schedule','scope']),before:z.string().max(140),
    after:z.string().max(140),reason:localized}).strict().optional()
}).strict();
export const relationSchema=z.object({
  id:identifier, from:identifier,to:identifier,kind:z.enum(['contains','depends_on','integrates_with']),
  description:localized, sources:z.array(source).min(1), publication
}).strict();
export const lifecycle=z.enum(['future','planned','development','qualification','review','completed','cancelled']);
export const disposition=z.enum(['ready','active','paused','blocked','integrated','verified','superseded','abandoned']);
export const verification=z.enum(['pass','fail','not_run','blocked','unknown','conflict']);
export const scheduleWindow=z.object({
  id:identifier, kind:z.enum(['planned','forecast','actual','observed']),
  start:date.nullable(),end:date.nullable(),commitment:z.enum(['none','tentative','committed'])
}).strict();
export const workSchema=legacyWorkSchema.extend({
  lifecycle:lifecycle.optional(),disposition:disposition.optional(),
  verificationSummary:z.object({result:verification,scope:z.string().min(1).max(100),asOf:date.nullable()}).strict().optional(),
  scheduleWindows:z.array(scheduleWindow).optional(),linkedReleaseIds:z.array(identifier).optional()
});
const eventExtension={publicUpdatedAt:date.optional(),occurredAt:z.iso.datetime({offset:true}).optional(),corrects:identifier.optional()};
const releaseEventSchema=z.object({
  id:identifier,program:identifier,kind:z.literal('release'),date,releaseId:identifier,
  sources:z.array(source.omit({sha:true})).min(1),publication,...eventExtension,publicUpdatedAt:date
}).strict();
export const eventSchema=z.union([legacyEventSchema.extend(eventExtension),releaseEventSchema]);
export const changeKinds=z.enum(['added','changed','improved','fixed','security','deprecated','removed','known_issue','migration']);
export const releaseSchema=z.object({
  id:identifier,program:identifier,displayName:localized,version:z.string().min(1).max(100).nullable(),
  channel:z.string().min(1).max(40),date:date.nullable(),preview:z.boolean(),summary:localized,
  availability:z.enum(['unknown','unavailable','preview','available','withdrawn']),
  changeIds:z.array(identifier),
  components:z.array(z.object({name:localized,version:z.string().min(1).max(100).nullable()}).strict()).optional(),
  sources:z.array(source.omit({sha:true})).min(1),publication,publicUpdatedAt:date
}).strict();
export const changeSchema=z.object({
  id:identifier,releaseId:identifier,kind:changeKinds,text:localized,
  implementation:z.enum(['planned','implemented']),verification,workIds:z.array(identifier).optional(),
  sources:z.array(source.omit({sha:true})).min(1),publication,publicUpdatedAt:date
}).strict();
export const schemas={program:programSchema,work:workSchema,event:eventSchema,relation:relationSchema,release:releaseSchema,change:changeSchema};
