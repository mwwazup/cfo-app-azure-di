// src/db/schema.ts
import { relations } from "drizzle-orm";
import {
  boolean, date, integer, jsonb, numeric, pgTable, text, timestamp, uuid, index, uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// NOTE: If profiles.id maps to Supabase auth.users.id, KEEP no default here.
// If not using Supabase Auth, uncomment defaultRandom() on profiles.id.
export const profiles = pgTable("profiles", {
  id: uuid("id") /* .defaultRandom() */.primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  emailIdx: index("idx_profiles_email").on(t.email),
}));

export const revenueEntries = pgTable("revenue_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  actualRevenue: numeric("actual_revenue", { precision: 15, scale: 2 }).default("0").notNull(),
  desiredRevenue: numeric("desired_revenue", { precision: 15, scale: 2 }),
  targetRevenue: numeric("target_revenue", { precision: 15, scale: 2 }),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }),
  ownerDraws: numeric("owner_draws", { precision: 15, scale: 2 }),
  isLocked: boolean("is_locked").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // prevent duplicates for the same month
  uniqUserPeriod: uniqueIndex("uq_revenue_entries_user_year_month")
    .on(t.userId, t.year, t.month),
  userIdx: index("idx_revenue_entries_user").on(t.userId),
  periodIdx: index("idx_revenue_entries_period").on(t.year, t.month),
}));

export const revenueData = pgTable("revenue_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  actualRevenue: numeric("actual_revenue", { precision: 15, scale: 2 }),
  desiredRevenue: numeric("desired_revenue", { precision: 15, scale: 2 }),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserDate: uniqueIndex("uq_revenue_data_user_date").on(t.userId, t.date),
  userIdx: index("idx_revenue_data_user").on(t.userId),
  dateIdx: index("idx_revenue_data_date").on(t.date),
}));

export const coachingMoments = pgTable("coaching_moments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  response: text("response").notNull(),
  impact: jsonb("impact"),
  date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
  title: text("title").notNull(),
  scenarioType: text("scenario_type"),
  responseType: text("response_type").default("quick_ridr").notNull(),
  ridrResponse: jsonb("ridr_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_coaching_moments_user").on(t.userId),
  dateIdx: index("idx_coaching_moments_date").on(t.date),
}));

export const kpiRecords = pgTable("kpi_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  period: date("period").notNull(),
  kpiName: text("kpi_name").notNull(),
  kpiValue: numeric("kpi_value", { precision: 15, scale: 2 }),
  kpiTarget: numeric("kpi_target", { precision: 15, scale: 2 }),
  goalValue: numeric("goal_value", { precision: 15, scale: 2 }),
  varianceAmount: numeric("variance_amount", { precision: 15, scale: 2 }),
  variancePercentage: numeric("variance_percentage", { precision: 5, scale: 2 }),
  trendVsLastMonth: numeric("trend_vs_last_month", { precision: 5, scale: 4 }),
  kpiCategory: text("kpi_category").default("revenue"),
  actionSuggestion: text("action_suggestion"),
  status: text("status").default("active"),
  notes: text("notes"),
  plainExplanation: text("plain_explanation"),
  displayFormat: text("display_format").default("number"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserPeriodName: uniqueIndex("uq_kpi_records_user_period_name")
    .on(t.userId, t.period, t.kpiName),
  userIdx: index("idx_kpi_records_user").on(t.userId),
  periodIdx: index("idx_kpi_records_period").on(t.period),
}));

export const momentumEntries = pgTable("momentum_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  momentumScore: integer("momentum_score"),
  notes: text("notes"),
  // Proper JSONB default (empty array)
  factors: jsonb("factors").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserDate: uniqueIndex("uq_momentum_entries_user_date").on(t.userId, t.date),
  userIdx: index("idx_momentum_entries_user").on(t.userId),
}));

export const financialDocuments = pgTable("financial_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: text("status").default("uploaded").notNull(),
  source: text("source"),
  filename: text("filename"),
  originalFilename: text("original_filename"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  analysisResult: jsonb("analysis_result"),
  rawJson: jsonb("raw_json"),
  summaryMetrics: jsonb("summary_metrics"),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("idx_financial_documents_user").on(t.userId),
  typeIdx: index("idx_financial_documents_type").on(t.documentType),
}));

export const documentMetrics = pgTable("document_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull()
    .references(() => financialDocuments.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(),
  metricKey: text("metric_key").notNull(),
  label: text("label").notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).default("0").notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  docIdx: index("idx_document_metrics_doc").on(t.documentId),
}));

export const documentKpis = pgTable("document_kpis", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull()
    .references(() => financialDocuments.id, { onDelete: "cascade" }),
  grossProfit: numeric("gross_profit", { precision: 15, scale: 2 }),
  grossMargin: numeric("gross_margin", { precision: 5, scale: 2 }),
  netProfit: numeric("net_profit", { precision: 15, scale: 2 }),
  netMargin: numeric("net_margin", { precision: 5, scale: 2 }),
  totalRevenue: numeric("total_revenue", { precision: 15, scale: 2 }),
  totalExpenses: numeric("total_expenses", { precision: 15, scale: 2 }),
  operatingExpenses: numeric("operating_expenses", { precision: 15, scale: 2 }),
  cogs: numeric("cogs", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  docIdx: index("idx_document_kpis_doc").on(t.documentId),
}));

export const revenueKpis = pgTable("revenue_kpis", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month"),
  totalRevenue: numeric("total_revenue", { precision: 15, scale: 2 }),
  targetRevenue: numeric("target_revenue", { precision: 15, scale: 2 }),
  varianceAmount: numeric("variance_amount", { precision: 15, scale: 2 }),
  variancePercentage: numeric("variance_percentage", { precision: 5, scale: 2 }),
  growthRate: numeric("growth_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserPeriod: uniqueIndex("uq_revenue_kpis_user_year_month").on(t.userId, t.year, t.month),
  userIdx: index("idx_revenue_kpis_user").on(t.userId),
  periodIdx: index("idx_revenue_kpis_period").on(t.year, t.month),
}));

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Clerk user ID (TEXT format)
  serviceName: text("service_name").notNull(),
  serviceCategory: text("service_category"),
  color: text("color"),
  defaultPrice: numeric("default_price", { precision: 15, scale: 2 }),
  cogsCost: numeric("cogs_cost", { precision: 15, scale: 2 }),
  isAutoPricingEnabled: boolean("is_auto_pricing_enabled").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserName: uniqueIndex("uq_services_user_name").on(t.userId, t.serviceName),
  userIdx: index("idx_services_user").on(t.userId),
  activeIdx: index("idx_services_active").on(t.userId, t.isActive),
}));

export const serviceActivities = pgTable("service_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Clerk user ID (TEXT format)
  serviceId: uuid("service_id").notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  weekOfMonth: integer("week_of_month").notNull(),
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  appointmentCount: integer("appointment_count").default(0),
  totalRevenue: numeric("total_revenue", { precision: 15, scale: 2 }).default("0"),
  avgTicketPrice: numeric("avg_ticket_price", { precision: 15, scale: 2 }),
  isAutoCalculated: boolean("is_auto_calculated").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqServiceWeek: uniqueIndex("uq_service_activities_service_week")
    .on(t.serviceId, t.year, t.month, t.weekOfMonth),
  userIdx: index("idx_service_activities_user").on(t.userId),
  serviceIdx: index("idx_service_activities_service").on(t.serviceId),
  periodIdx: index("idx_service_activities_period").on(t.year, t.month),
  weekIdx: index("idx_service_activities_week").on(t.weekStartDate),
}));

// -------- Relations (TypeScript-only, optional but nice) --------
export const profilesRelations = relations(profiles, ({ many }) => ({
  revenueEntries: many(revenueEntries),
  revenueData: many(revenueData),
  coachingMoments: many(coachingMoments),
  kpiRecords: many(kpiRecords),
  momentumEntries: many(momentumEntries),
  financialDocuments: many(financialDocuments),
  services: many(services),
  serviceActivities: many(serviceActivities),
}));

export const revenueEntriesRelations = relations(revenueEntries, ({ one }) => ({
  user: one(profiles, {
    fields: [revenueEntries.userId],
    references: [profiles.id],
  }),
}));

export const revenueDataRelations = relations(revenueData, ({ one }) => ({
  user: one(profiles, {
    fields: [revenueData.userId],
    references: [profiles.id],
  }),
}));

export const financialDocumentRelations = relations(financialDocuments, ({ one, many }) => ({
  user: one(profiles, {
    fields: [financialDocuments.userId],
    references: [profiles.id],
  }),
  metrics: many(documentMetrics),
  kpis: many(documentKpis),
}));

export const documentMetricsRelations = relations(documentMetrics, ({ one }) => ({
  document: one(financialDocuments, {
    fields: [documentMetrics.documentId],
    references: [financialDocuments.id],
  }),
}));

export const documentKpisRelations = relations(documentKpis, ({ one }) => ({
  document: one(financialDocuments, {
    fields: [documentKpis.documentId],
    references: [financialDocuments.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  user: one(profiles, {
    fields: [services.userId],
    references: [profiles.id],
  }),
  activities: many(serviceActivities),
}));

export const serviceActivitiesRelations = relations(serviceActivities, ({ one }) => ({
  user: one(profiles, {
    fields: [serviceActivities.userId],
    references: [profiles.id],
  }),
  service: one(services, {
    fields: [serviceActivities.serviceId],
    references: [services.id],
  }),
}));

// -------- Types --------
export type Profile = typeof profiles.$inferSelect;
export type RevenueEntry = typeof revenueEntries.$inferSelect;
export type RevenueDatum = typeof revenueData.$inferSelect;
export type CoachingMoment = typeof coachingMoments.$inferSelect;
export type KpiRecord = typeof kpiRecords.$inferSelect;
export type MomentumEntry = typeof momentumEntries.$inferSelect;
export type FinancialDocument = typeof financialDocuments.$inferSelect;
export type DocumentMetric = typeof documentMetrics.$inferSelect;
export type DocumentKpi = typeof documentKpis.$inferSelect;
export type RevenueKpi = typeof revenueKpis.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ServiceActivity = typeof serviceActivities.$inferSelect;

// -------- Weekly Budget Tracking --------
export const weeklyBudgetTracking = pgTable("weekly_budget_tracking", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Clerk user ID (TEXT format)
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  weekOfMonth: integer("week_of_month").notNull(),
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  weeklyBudgetTarget: numeric("weekly_budget_target", { precision: 15, scale: 2 }).default("0").notNull(),
  monthlyFirTotal: numeric("monthly_fir_total", { precision: 15, scale: 2 }),
  monthlyRevenuePercentage: numeric("monthly_revenue_percentage", { precision: 5, scale: 4 }),
  actualRevenue: numeric("actual_revenue", { precision: 15, scale: 2 }).default("0"),
  jobsCompleted: integer("jobs_completed").default(0),
  varianceAmount: numeric("variance_amount", { precision: 15, scale: 2 }),
  variancePercentage: numeric("variance_percentage", { precision: 5, scale: 2 }),
  isOnTrack: boolean("is_on_track").default(true),
  isAutoPopulated: boolean("is_auto_populated").default(false),
  lastServiceSyncAt: timestamp("last_service_sync_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserWeek: uniqueIndex("uq_weekly_budget_user_week")
    .on(t.userId, t.year, t.month, t.weekOfMonth),
  userIdx: index("idx_weekly_budget_user").on(t.userId),
  periodIdx: index("idx_weekly_budget_period").on(t.year, t.month),
  weekIdx: index("idx_weekly_budget_week").on(t.weekStartDate),
}));

export const weeklyBudgetTrackingRelations = relations(weeklyBudgetTracking, ({ one }) => ({
  user: one(profiles, {
    fields: [weeklyBudgetTracking.userId],
    references: [profiles.id],
  }),
}));

export type WeeklyBudgetTracking = typeof weeklyBudgetTracking.$inferSelect;

