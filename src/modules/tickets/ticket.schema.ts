import { z } from 'zod';

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  pipeline: z.string().optional(),
});

export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().optional(),
  hsTicketPriority: z.string().optional(),
  hsTicketCategory: z.string().optional(),
  hsPipeline: z.string().optional(),
  hsPipelineStage: z.string().optional(),
});

export const updateTicketStageSchema = z.object({
  stage: z.string().min(1, 'Stage is required'),
});

export const updateTicketSchema = createTicketSchema.partial();

export const replyToTicketSchema = z.object({
  content: z.string().min(1, 'Reply content is required'),
});
