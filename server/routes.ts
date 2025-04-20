import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  awsCredentialsSchema,
  azureCredentialsSchema,
  insertCloudAccountSchema,
  insertReportSchema
} from "@shared/schema";
import { validateAndListAwsResources } from "./aws-utils";
import { validateAndListAzureResources } from "./azure-utils";
import { generateReport } from "./python-bridge";
import fs from "fs";
import path from "path";

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create python-backend directory if it doesn't exist
const pythonBackendDir = path.join(process.cwd(), "python-backend");
if (!fs.existsSync(pythonBackendDir)) {
  fs.mkdirSync(pythonBackendDir, { recursive: true });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for cloud accounts
  app.get("/api/cloud-accounts", async (req: Request, res: Response) => {
    try {
      const accounts = await storage.listCloudAccounts();
      res.json(accounts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cloud-accounts", async (req: Request, res: Response) => {
    try {
      const accountData = insertCloudAccountSchema.parse(req.body);
      const account = await storage.createCloudAccount(accountData);
      res.status(201).json(account);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // AWS credentials validation and resource discovery
  app.post("/api/aws/validate", async (req: Request, res: Response) => {
    try {
      const credentials = awsCredentialsSchema.parse(req.body);
      
      // Create or get cloud account
      let account = await storage.getCloudAccountByName(
        credentials.accountName,
        "AWS"
      );
      
      if (!account) {
        account = await storage.createCloudAccount({
          name: credentials.accountName,
          provider: "AWS"
        });
      }
      
      // Validate credentials and get resources
      const result = await validateAndListAwsResources(credentials, account.id);
      
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
      
      // Store discovered resources
      const savedResources = [];
      for (const resource of result.resources) {
        savedResources.push(await storage.createResource(resource));
      }
      
      res.json({
        valid: true,
        accountId: account.id,
        resources: savedResources
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Azure credentials validation and resource discovery
  app.post("/api/azure/validate", async (req: Request, res: Response) => {
    try {
      const credentials = azureCredentialsSchema.parse(req.body);
      
      // Create or get cloud account
      let account = await storage.getCloudAccountByName(
        credentials.accountName,
        "AZURE"
      );
      
      if (!account) {
        account = await storage.createCloudAccount({
          name: credentials.accountName,
          provider: "AZURE"
        });
      }
      
      // Validate credentials and get resources
      const result = await validateAndListAzureResources(credentials, account.id);
      
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }
      
      // Store discovered resources
      const savedResources = [];
      for (const resource of result.resources) {
        savedResources.push(await storage.createResource(resource));
      }
      
      res.json({
        valid: true,
        accountId: account.id,
        resources: savedResources
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // API routes for resources
  app.get("/api/resources/:accountId", async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId, 10);
      const resources = await storage.listResources(accountId);
      res.json(resources);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API routes for reports
  app.post("/api/reports", async (req: Request, res: Response) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      
      // Create a report entry with 'pending' status
      const report = await storage.createReport({
        ...reportData,
        status: "pending"
      });
      
      // Generate the report in the background
      const metadata = report.metadata || {};
      const provider = (metadata.provider as "AWS" | "AZURE") || "AWS";
      const credentials = metadata.credentials || {};
      const resources = report.resources as string[];
      const reportType = report.type;
      const frequency = report.frequency;
      
      // Get account name to include in the report
      const account = await storage.getCloudAccount(reportData.cloudAccountId);
      const accountName = account?.name || `${provider} Account`;
      
      // Start report generation in background
      generateReport({
        cloudProvider: provider,
        reportType: reportType as "utilization" | "billing",
        credentials,
        resources,
        accountName: accountName,
        frequency: frequency as "daily" | "weekly" | undefined,
        month: metadata.month,
        year: metadata.year
      }).then(async (result) => {
        if (result.success && result.filePath) {
          // Update report status to completed with file path
          await storage.updateReportStatus(report.id, "completed", result.filePath);
        } else {
          // Update report status to failed
          await storage.updateReportStatus(report.id, "failed");
        }
      }).catch(async (error) => {
        console.error("Error generating report:", error);
        await storage.updateReportStatus(report.id, "failed");
      });
      
      // Return the pending report to the client
      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/reports/:accountId", async (req: Request, res: Response) => {
    try {
      const accountId = parseInt(req.params.accountId, 10);
      const reports = await storage.listReports(accountId);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id/status", async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id, 10);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      res.json({ status: report.status, reportUrl: report.reportUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id/download", async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id, 10);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      if (report.status !== "completed" || !report.reportUrl) {
        return res.status(400).json({ error: "Report is not ready for download" });
      }
      
      // Send the file
      res.download(report.reportUrl);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
