import { z } from 'zod';

export const identifier = z.string().regex(/^[A-Z][A-Z0-9-]{2,63}$/);
export const date = z.iso.date();
export const localized = z.object({ zh:z.string().min(1).max(220), en:z.string().min(1).max(220) }).strict();
export const source = z.object({url:z.url().refine(s=>s.startsWith('https://'),'HTTPS source required'), sha:z.string().regex(/^[0-9a-f]{40}$/).optional(), note:z.string().max(220).optional()}).strict();
export const publication = z.enum(['approved','draft']);
export const phase = z.enum(['planned','development','qualification','review','published']);
export const category = z.enum(['platform','product','infrastructure']);
export const programSchema=z.object({
  id:identifier, code:z.string().min(1).max(24), title:localized, description:localized,
  publication, order:z.number().int().min(0), sources:z.array(source).min(1)
}).strict();
export const schedule=z.object({start:date,end:date,kind:z.enum(['observed','tentative','committed'])}).strict().nullable();
export const workSchema=z.object({
  id:identifier, program:identifier, title:localized, description:localized,
  phase, category, schedule, dependsOn:z.array(identifier), sources:z.array(source),
  updatedAt:date, publication, documentation:z.string().max(1200).optional()
}).strict();
export const eventSchema=z.object({
  id:identifier, program:identifier, item:identifier.optional(), date, kind:z.enum(['milestone','verification','decision']),
  title:localized, description:localized, sources:z.array(source).min(1), publication
}).strict();
export const relationSchema=z.object({
  id:identifier, from:identifier,to:identifier,kind:z.enum(['contains','depends_on','integrates_with']),
  description:localized, sources:z.array(source).min(1), publication
}).strict();
export const schemas={program:programSchema,work:workSchema,event:eventSchema,relation:relationSchema};
