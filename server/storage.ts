import { cloudAccounts, resources, reports } from "@shared/schema";
import type { CloudAccount, InsertCloudAccount, Resource, InsertResource, Report, InsertReport } from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Cloud Accounts
  getCloudAccount(id: number): Promise<CloudAccount | undefined>;
  getCloudAccountByName(name: string, provider: string): Promise<CloudAccount | undefined>;
  createCloudAccount(account: InsertCloudAccount): Promise<CloudAccount>;
  listCloudAccounts(): Promise<CloudAccount[]>;

  // Resources
  getResource(id: number): Promise<Resource | undefined>;
  getResourceByResourceId(resourceId: string): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  listResources(cloudAccountId: number): Promise<Resource[]>;
  listResourcesByType(cloudAccountId: number, type: string): Promise<Resource[]>;

  // Reports
  getReport(id: number): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReportStatus(id: number, status: string, reportUrl?: string): Promise<Report>;
  listReports(cloudAccountId: number): Promise<Report[]>;
  
  // User
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private cloudAccounts: Map<number, CloudAccount>;
  private resources: Map<number, Resource>;
  private reports: Map<number, Report>;
  private users: Map<number, any>;
  currentCloudAccountId: number;
  currentResourceId: number;
  currentReportId: number;
  currentUserId: number;

  constructor() {
    this.cloudAccounts = new Map();
    this.resources = new Map();
    this.reports = new Map();
    this.users = new Map();
    this.currentCloudAccountId = 1;
    this.currentResourceId = 1;
    this.currentReportId = 1;
    this.currentUserId = 1;
  }

  // Cloud Account methods
  async getCloudAccount(id: number): Promise<CloudAccount | undefined> {
    return this.cloudAccounts.get(id);
  }

  async getCloudAccountByName(name: string, provider: string): Promise<CloudAccount | undefined> {
    return Array.from(this.cloudAccounts.values()).find(
      (account) => account.name === name && account.provider === provider
    );
  }

  async createCloudAccount(account: InsertCloudAccount): Promise<CloudAccount> {
    const id = this.currentCloudAccountId++;
    const newAccount: CloudAccount = { 
      ...account, 
      id, 
      createdAt: new Date() 
    };
    this.cloudAccounts.set(id, newAccount);
    return newAccount;
  }

  async listCloudAccounts(): Promise<CloudAccount[]> {
    return Array.from(this.cloudAccounts.values());
  }

  // Resource methods
  async getResource(id: number): Promise<Resource | undefined> {
    return this.resources.get(id);
  }

  async getResourceByResourceId(resourceId: string): Promise<Resource | undefined> {
    return Array.from(this.resources.values()).find(
      (resource) => resource.resourceId === resourceId
    );
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.currentResourceId++;
    const newResource: Resource = { 
      ...resource, 
      id, 
      createdAt: new Date() 
    };
    this.resources.set(id, newResource);
    return newResource;
  }

  async listResources(cloudAccountId: number): Promise<Resource[]> {
    return Array.from(this.resources.values()).filter(
      (resource) => resource.cloudAccountId === cloudAccountId
    );
  }

  async listResourcesByType(cloudAccountId: number, type: string): Promise<Resource[]> {
    return Array.from(this.resources.values()).filter(
      (resource) => resource.cloudAccountId === cloudAccountId && resource.type === type
    );
  }

  // Report methods
  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async createReport(report: InsertReport): Promise<Report> {
    const id = this.currentReportId++;
    const newReport: Report = { 
      ...report, 
      id, 
      createdAt: new Date() 
    };
    this.reports.set(id, newReport);
    return newReport;
  }

  async updateReportStatus(id: number, status: string, reportUrl?: string): Promise<Report> {
    const report = this.reports.get(id);
    if (!report) {
      throw new Error(`Report with ID ${id} not found`);
    }
    
    const updatedReport: Report = { 
      ...report, 
      status, 
      ...(reportUrl && { reportUrl }) 
    };
    
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  async listReports(cloudAccountId: number): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(
      (report) => report.cloudAccountId === cloudAccountId
    );
  }

  // User methods (keeping from original template)
  async getUser(id: number): Promise<any> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: any): Promise<any> {
    const id = this.currentUserId++;
    const newUser = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
}

export const storage = new MemStorage();
