import { create } from 'zustand';

export type ReportType = 'utilization' | 'billing';
export type CloudProvider = 'AWS' | 'Azure';
export type Frequency = 'daily' | 'weekly';

export interface CloudAccount {
  id: number;
  name: string;
  provider: CloudProvider;
}

export interface CloudResource {
  id: number;
  resourceId: string;
  name: string;
  type: string;
  region: string;
  state: string;
  cloudAccountId: number;
  metadata?: any;
}

export interface Step {
  id: string;
  title: string;
}

export interface UtilizationStep extends Step {
  id: 'cloud-provider' | 'report-type' | 'credentials' | 'resources' | 'frequency' | 'generate';
}

export interface BillingStep extends Step {
  id: 'cloud-provider' | 'report-type' | 'select-period' | 'credentials' | 'generate';
}

// Define store state
interface StoreState {
  // Wizard state
  currentStep: number;
  reportType: ReportType;
  cloudProvider: CloudProvider;
  
  // AWS/Azure credentials
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  accountName: string;
  
  // Azure specific
  azureClientId: string;
  azureClientSecret: string;
  azureTenantId: string;
  azureSubscriptionId: string;
  
  // Account and resources
  cloudAccountId: number | null;
  resources: CloudResource[];
  selectedResources: string[];
  
  // Utilization report options
  frequency: Frequency;
  
  // Billing report options
  billingMonth: number;
  billingYear: number;
  
  // Report generation
  reportId: number | null;
  reportStatus: 'pending' | 'completed' | 'failed' | null;
  reportUrl: string | null;
  
  // Actions
  setReportType: (type: ReportType) => void;
  setCloudProvider: (provider: CloudProvider) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Credentials
  setAwsCredentials: (accessKeyId: string, secretAccessKey: string, name: string) => void;
  setAzureCredentials: (clientId: string, clientSecret: string, tenantId: string, subscriptionId: string, name: string) => void;
  
  // Account and resources
  setCloudAccountId: (id: number) => void;
  setResources: (resources: CloudResource[]) => void;
  toggleResourceSelection: (resourceId: string) => void;
  setSelectedResources: (resources: string[]) => void;
  
  // Report options
  setFrequency: (frequency: Frequency) => void;
  setBillingPeriod: (month: number, year: number) => void;
  
  // Report generation
  setReportId: (id: number | null) => void;
  setReportStatus: (status: 'pending' | 'completed' | 'failed' | null) => void;
  setReportUrl: (url: string | null) => void;
  
  // Reset
  resetStore: () => void;
}

// Helper function to get appropriate steps based on report type
export function getSteps(reportType: ReportType): Step[] {
  if (reportType === 'utilization') {
    return [
      { id: 'cloud-provider', title: 'Cloud Provider' },
      { id: 'report-type', title: 'Report Type' },
      { id: 'credentials', title: 'Credentials' },
      { id: 'resources', title: 'Resources' },
      { id: 'frequency', title: 'Frequency' },
      { id: 'generate', title: 'Generate' }
    ];
  } else {
    return [
      { id: 'cloud-provider', title: 'Cloud Provider' },
      { id: 'report-type', title: 'Report Type' },
      { id: 'select-period', title: 'Select Period' },
      { id: 'credentials', title: 'Credentials' },
      { id: 'generate', title: 'Generate' }
    ];
  }
}

// Create store
export const useStore = create<StoreState>((set) => ({
  // Initial state
  currentStep: 1,
  reportType: 'utilization',
  cloudProvider: 'AWS',
  
  // AWS/Azure credentials
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  accountName: '',
  
  // Azure specific
  azureClientId: '',
  azureClientSecret: '',
  azureTenantId: '',
  azureSubscriptionId: '',
  
  // Account and resources
  cloudAccountId: null,
  resources: [],
  selectedResources: [],
  
  // Utilization report options
  frequency: 'daily',
  
  // Billing report options
  billingMonth: new Date().getMonth() + 1, // Current month
  billingYear: new Date().getFullYear(),
  
  // Report generation
  reportId: null,
  reportStatus: null,
  reportUrl: null,
  
  // Actions
  setReportType: (type) => set({ reportType: type }),
  setCloudProvider: (provider) => set({ cloudProvider: provider }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  
  // Credentials
  setAwsCredentials: (accessKeyId, secretAccessKey, name) => set({
    awsAccessKeyId: accessKeyId,
    awsSecretAccessKey: secretAccessKey,
    accountName: name
  }),
  
  setAzureCredentials: (clientId, clientSecret, tenantId, subscriptionId, name) => set({
    azureClientId: clientId,
    azureClientSecret: clientSecret,
    azureTenantId: tenantId,
    azureSubscriptionId: subscriptionId,
    accountName: name
  }),
  
  // Account and resources
  setCloudAccountId: (id) => set({ cloudAccountId: id }),
  setResources: (resources) => set({ resources }),
  
  toggleResourceSelection: (resourceId) => set((state) => {
    const isSelected = state.selectedResources.includes(resourceId);
    
    return {
      selectedResources: isSelected
        ? state.selectedResources.filter(id => id !== resourceId)
        : [...state.selectedResources, resourceId]
    };
  }),
  
  setSelectedResources: (resources) => set({ selectedResources: resources }),
  
  // Report options
  setFrequency: (frequency) => set({ frequency }),
  setBillingPeriod: (month, year) => set({
    billingMonth: month,
    billingYear: year
  }),
  
  // Report generation
  setReportId: (id) => set({ reportId: id }),
  setReportStatus: (status) => set({ reportStatus: status }),
  setReportUrl: (url) => set({ reportUrl: url }),
  
  // Reset store
  resetStore: () => set({
    currentStep: 1,
    reportType: 'utilization',
    cloudProvider: 'AWS',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    accountName: '',
    azureClientId: '',
    azureClientSecret: '',
    azureTenantId: '',
    azureSubscriptionId: '',
    cloudAccountId: null,
    resources: [],
    selectedResources: [],
    frequency: 'daily',
    billingMonth: new Date().getMonth() + 1,
    billingYear: new Date().getFullYear(),
    reportId: null,
    reportStatus: null,
    reportUrl: null
  })
}));
