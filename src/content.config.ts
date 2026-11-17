import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { programSchema, workSchema, eventSchema, relationSchema } from './lib/roadmap-content-schema.mjs';

export const collections = {
  roadmapPrograms: defineCollection({ loader:glob({pattern:'**/*.yaml',base:'./src/content/roadmap/programs'}),schema:programSchema }),
  roadmapWork: defineCollection({ loader:glob({pattern:'**/*.md',base:'./src/content/roadmap/work-items'}),schema:workSchema }),
  roadmapUpdates: defineCollection({ loader:glob({pattern:'**/*.md',base:'./src/content/roadmap/updates'}),schema:eventSchema }),
  roadmapRelations: defineCollection({ loader:glob({pattern:'**/*.yaml',base:'./src/content/roadmap/relations'}),schema:relationSchema }),
};
