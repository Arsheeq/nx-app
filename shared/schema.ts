import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Cloud Account schema
export const cloudAccounts = pgTable("cloud_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // AWS or Azure
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCloudAccountSchema = createInsertSchema(cloudAccounts).omit({
  id: true,
  createdAt: true,
});

// Resources schema
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull(), // EC2 instance ID, RDS ID, etc.
  name: text("name").notNull(),
  type: text("type").notNull(), // EC2, RDS, etc.
  region: text("region").notNull(),
  state: text("state").notNull(), // running, stopped, etc.
  cloudAccountId: integer("cloud_account_id").notNull(),
  metadata: json("metadata"), // Store additional info like instance type, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
});

// Reports schema
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  cloudAccountId: integer("cloud_account_id").notNull(),
  type: text("type").notNull(), // utilization or billing
  frequency: text("frequency"), // daily, weekly or monthly
  reportUrl: text("report_url"), // URL to the generated PDF
  resources: json("resources"), // Array of resource IDs included in the report
  status: text("status").notNull(), // pending, completed, failed
  metadata: json("metadata").$type<{
    provider: "AWS" | "AZURE";
    credentials: any;
    month?: number;
    year?: number;
  }>(), // Additional report details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

// Credentials schema - validation only, not stored
export const awsCredentialsSchema = z.object({
  accessKeyId: z.string().min(16).max(128),
  secretAccessKey: z.string().min(1),
  accountName: z.string().min(1).default("AWS Account"),
});

export const azureCredentialsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1),
  accountName: z.string().min(1).default("Azure Account"),
});

// Type definitions
export type CloudAccount = typeof cloudAccounts.$inferSelect;
export type InsertCloudAccount = z.infer<typeof insertCloudAccountSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type AwsCredentials = z.infer<typeof awsCredentialsSchema>;
export type AzureCredentials = z.infer<typeof azureCredentialsSchema>;
