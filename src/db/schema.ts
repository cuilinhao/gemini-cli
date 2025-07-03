import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  unique,
  uniqueIndex,
  bigint,
} from "drizzle-orm/pg-core";

// Users table - updated for Gemini CLI
export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    api_key_enc: text(), // Encrypted Google API Key
    cost_settings: text(), // JSON string for cost control settings
    nickname: varchar({ length: 255 }),
    avatar_url: varchar({ length: 255 }),
    locale: varchar({ length: 50 }),
    signin_type: varchar({ length: 50 }),
    signin_ip: varchar({ length: 255 }),
    signin_provider: varchar({ length: 50 }),
    signin_openid: varchar({ length: 255 }),
    invite_code: varchar({ length: 255 }).notNull().default(""),
    updated_at: timestamp({ withTimezone: true }),
    invited_by: varchar({ length: 255 }).notNull().default(""),
    is_affiliate: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex("email_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);

// Chats table - for conversation history
export const chats = pgTable("chats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar({ length: 255 }).notNull(),
  title: varchar({ length: 255 }),
  model: varchar({ length: 50 }).notNull(), // gemini-1.5-pro, gemini-1.5-flash
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Messages table - for individual messages in chats
export const messages = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  chat_id: integer().notNull(),
  role: varchar({ length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text().notNull(),
  token_used: integer().default(0),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Files table - for file upload and summary history
export const files = pgTable("files", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar({ length: 255 }).notNull(),
  filename: varchar({ length: 255 }).notNull(),
  size: bigint({ mode: "number" }).notNull(),
  url: varchar({ length: 500 }),
  file_type: varchar({ length: 50 }), // pdf, txt, log, etc.
  processed: boolean().default(false),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Limits table - for rate limiting
export const limits = pgTable("limits", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar({ length: 255 }).notNull(),
  window_start: timestamp({ withTimezone: true }).notNull(),
  req_count: integer().default(0),
  token_count: integer().default(0),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Usage Stats table - for tracking detailed usage with model information
export const usageStats = pgTable("usage_stats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: varchar({ length: 255 }).notNull(),
  model: varchar({ length: 50 }).notNull(), // gemini-1.5-pro, gemini-1.5-flash, etc.
  tokens_used: integer().default(0),
  estimated_cost: integer().default(0), // Cost in cents (e.g., 125 = $1.25)
  request_type: varchar({ length: 50 }), // 'chat', 'script', 'analysis', 'summary'
  prompt_tokens: integer().default(0),
  completion_tokens: integer().default(0),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  order_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull().default(""),
  user_email: varchar({ length: 255 }).notNull().default(""),
  amount: integer().notNull(),
  interval: varchar({ length: 50 }),
  expired_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull(),
  stripe_session_id: varchar({ length: 255 }),
  credits: integer().notNull(),
  currency: varchar({ length: 50 }),
  sub_id: varchar({ length: 255 }),
  sub_interval_count: integer(),
  sub_cycle_anchor: integer(),
  sub_period_end: integer(),
  sub_period_start: integer(),
  sub_times: integer(),
  product_id: varchar({ length: 255 }),
  product_name: varchar({ length: 255 }),
  valid_months: integer(),
  order_detail: text(),
  paid_at: timestamp({ withTimezone: true }),
  paid_email: varchar({ length: 255 }),
  paid_detail: text(),
});

// API Keys table
export const apikeys = pgTable("apikeys", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  api_key: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 100 }),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
});

// Credits table
export const credits = pgTable("credits", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  trans_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull(),
  trans_type: varchar({ length: 50 }).notNull(),
  credits: integer().notNull(),
  order_no: varchar({ length: 255 }),
  expired_at: timestamp({ withTimezone: true }),
});

// Posts table
export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  slug: varchar({ length: 255 }),
  title: varchar({ length: 255 }),
  description: text(),
  content: text(),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  cover_url: varchar({ length: 255 }),
  author_name: varchar({ length: 255 }),
  author_avatar_url: varchar({ length: 255 }),
  locale: varchar({ length: 50 }),
});

// Affiliates table
export const affiliates = pgTable("affiliates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull().default(""),
  invited_by: varchar({ length: 255 }).notNull(),
  paid_order_no: varchar({ length: 255 }).notNull().default(""),
  paid_amount: integer().notNull().default(0),
  reward_percent: integer().notNull().default(0),
  reward_amount: integer().notNull().default(0),
});

// Feedbacks table
export const feedbacks = pgTable("feedbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  user_uuid: varchar({ length: 255 }),
  content: text(),
  rating: integer(),
});
