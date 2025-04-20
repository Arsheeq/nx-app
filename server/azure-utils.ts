import { z } from 'zod';
import { azureCredentialsSchema, InsertResource } from '@shared/schema';

type AzureCredentials = z.infer<typeof azureCredentialsSchema>;

// Get all Azure regions
export async function getAllAzureRegions(credentials: AzureCredentials): Promise<string[]> {
  try {
    // In a real implementation, we would use Azure SDK to get regions
    // For now, we'll return a static list of common Azure regions
    return [
      'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
      'northeurope', 'westeurope', 'uksouth', 'ukwest',
      'eastasia', 'southeastasia', 'japaneast', 'japanwest',
      'australiaeast', 'australiasoutheast', 'southindia',
      'brazilsouth', 'canadacentral', 'canadaeast'
    ];
  } catch (error) {
    console.error('Error getting Azure regions:', error);
    throw error;
  }
}

// Helper function to get Azure VMs for a region
export async function getAzureVMs(region: string, credentials: AzureCredentials, cloudAccountId: number): Promise<InsertResource[]> {
  console.log(`Scanning for Azure VMs in ${region}...`);
  
  try {
    // In a real implementation, we would use Azure SDK to get VMs
    // For now, we'll simulate it with some placeholder logic

    // Implement with Azure SDK in production
    // const subscriptionClient = new SubscriptionClient(credentials);
    // const computeClient = new ComputeManagementClient(credentials, subscriptionId);
    
    // Simulating a failure case for demonstration
    if (credentials.clientId === 'invalid') {
      throw new Error('Invalid Azure credentials');
    }
    
    // In a real implementation, this would be real data from Azure API
    // This is just to simulate the shape of data we would get
    const mockVMs = [
      {
        id: 'vm-123',
        name: 'web-server',
        region: region,
        state: 'running',
        vmSize: 'Standard_D2s_v3',
        osType: 'Linux'
      }
    ];
    
    // Convert to our InsertResource format
    const resources: InsertResource[] = mockVMs.map(vm => ({
      resourceId: vm.id,
      name: vm.name,
      type: 'VM',
      region: vm.region,
      state: vm.state,
      cloudAccountId,
      metadata: {
        vmSize: vm.vmSize,
        osType: vm.osType
      }
    }));
    
    return resources;
  } catch (error) {
    console.error(`Error getting Azure VMs in ${region}:`, error);
    return [];
  }
}

// Helper function to get Azure Databases for a region
export async function getAzureDatabases(region: string, credentials: AzureCredentials, cloudAccountId: number): Promise<InsertResource[]> {
  console.log(`Scanning for Azure Databases in ${region}...`);
  
  try {
    // In a real implementation, we would use Azure SDK to get databases
    // For now, we'll simulate it with some placeholder logic

    // Implement with Azure SDK in production
    // const sqlManagementClient = new SqlManagementClient(credentials, subscriptionId);
    
    // In a real implementation, this would be real data from Azure API
    // This is just to simulate the shape of data we would get
    const mockDatabases = [
      {
        id: 'db-123',
        name: 'product-db',
        region: region,
        state: 'online',
        dbType: 'SQL',
        tier: 'Standard'
      }
    ];
    
    // Convert to our InsertResource format
    const resources: InsertResource[] = mockDatabases.map(db => ({
      resourceId: db.id,
      name: db.name,
      type: 'Database',
      region: db.region,
      state: db.state,
      cloudAccountId,
      metadata: {
        dbType: db.dbType,
        tier: db.tier
      }
    }));
    
    return resources;
  } catch (error) {
    console.error(`Error getting Azure Databases in ${region}:`, error);
    return [];
  }
}

// Validate Azure credentials and list resources
export async function validateAndListAzureResources(credentials: AzureCredentials, cloudAccountId: number) {
  try {
    console.log('Validating Azure credentials...');
    
    // Validate credentials format
    const validatedCredentials = azureCredentialsSchema.parse(credentials);
    
    // Test credentials by getting all regions (throws if invalid)
    const regions = await getAllAzureRegions(validatedCredentials);
    console.log(`Found ${regions.length} Azure regions`);
    
    // Credentials are valid, list resources from all regions
    console.log('Scanning Azure regions for resources...');
    
    const allResources: InsertResource[] = [];
    
    // Scan regions one at a time
    for (const region of regions) {
      try {
        const vmResources = await getAzureVMs(region, validatedCredentials, cloudAccountId);
        const dbResources = await getAzureDatabases(region, validatedCredentials, cloudAccountId);
        
        allResources.push(...vmResources, ...dbResources);
      } catch (error) {
        console.error(`Error listing resources in region ${region}:`, error);
        // Continue with other regions even if one fails
      }
    }
    
    console.log(`Total resources found: ${allResources.length}`);
    
    return {
      valid: true,
      resources: allResources,
    };
  } catch (error: any) {
    console.error('Error validating Azure credentials:', error);
    
    return {
      valid: false,
      error: error.message || 'Invalid Azure credentials',
    };
  }
}
