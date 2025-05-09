import { 
  EC2Client, 
  DescribeRegionsCommand, 
  DescribeInstancesCommand,
  DescribeInstancesCommandOutput 
} from '@aws-sdk/client-ec2';
import { 
  RDSClient, 
  DescribeDBInstancesCommand,
  DescribeDBInstancesCommandOutput 
} from '@aws-sdk/client-rds';
import { z } from 'zod';
import { InsertResource, awsCredentialsSchema } from '@shared/schema';

type AwsCredentials = z.infer<typeof awsCredentialsSchema>;

// Helper function to get all AWS regions
export async function getAllRegions(credentials: AwsCredentials): Promise<string[]> {
  try {
    const ec2Client = new EC2Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });
    
    const command = new DescribeRegionsCommand({});
    const response = await ec2Client.send(command);
    
    if (!response.Regions || response.Regions.length === 0) {
      console.warn('No regions returned from AWS, using default regions');
      return [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'eu-west-1', 'eu-west-2', 'eu-west-3',
        'eu-central-1', 'eu-north-1',
        'ap-south-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
        'ap-southeast-1', 'ap-southeast-2',
        'sa-east-1',
        'ca-central-1'
      ];
    }
    
    return response.Regions.map(region => region.RegionName || 'us-east-1');
  } catch (error) {
    console.error('Error getting AWS regions:', error);
    throw error;
  }
}

// Helper function to get EC2 instances for a region
export async function getEc2Instances(region: string, credentials: AwsCredentials, cloudAccountId: number): Promise<InsertResource[]> {
  console.log(`Scanning for EC2 instances in ${region}...`);
  
  try {
    const ec2Client = new EC2Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });
    
    const command = new DescribeInstancesCommand({});
    const response: DescribeInstancesCommandOutput = await ec2Client.send(command);
    
    if (!response.Reservations || response.Reservations.length === 0) {
      console.log(`No EC2 instances found in ${region}`);
      return [];
    }
    
    const resources: InsertResource[] = [];
    
    for (const reservation of response.Reservations) {
      if (!reservation.Instances) continue;
      
      for (const instance of reservation.Instances) {
        // Skip terminated instances
        if (instance.State?.Name === 'terminated') continue;
        
        // Get instance name from tags
        const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
        const name = nameTag?.Value || instance.InstanceId || '';
        
        console.log(`Found EC2 instance: ${instance.InstanceId} (${instance.State?.Name}) in ${region}`);
        
        resources.push({
          resourceId: instance.InstanceId || '',
          name,
          type: 'EC2',
          region,
          state: instance.State?.Name?.toLowerCase() || 'unknown',
          cloudAccountId,
          metadata: {
            instanceType: instance.InstanceType,
            platform: instance.Platform || 'linux',
            privateIp: instance.PrivateIpAddress,
            publicIp: instance.PublicIpAddress
          }
        });
      }
    }
    
    return resources;
  } catch (error) {
    console.error(`Error getting EC2 instances in ${region}:`, error);
    return [];
  }
}

// Helper function to get RDS instances for a region
export async function getRdsInstances(region: string, credentials: AwsCredentials, cloudAccountId: number): Promise<InsertResource[]> {
  console.log(`Scanning for RDS instances in ${region}...`);
  
  try {
    const rdsClient = new RDSClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    });
    
    const command = new DescribeDBInstancesCommand({});
    const response: DescribeDBInstancesCommandOutput = await rdsClient.send(command);
    
    if (!response.DBInstances || response.DBInstances.length === 0) {
      console.log(`No RDS instances found in ${region}`);
      return [];
    }
    
    const resources: InsertResource[] = [];
    
    for (const instance of response.DBInstances) {
      console.log(`Found RDS instance: ${instance.DBInstanceIdentifier} (${instance.DBInstanceStatus}) in ${region}`);
      
      resources.push({
        resourceId: instance.DBInstanceIdentifier || '',
        name: instance.DBName || instance.DBInstanceIdentifier || '',
        type: 'RDS',
        region,
        state: instance.DBInstanceStatus?.toLowerCase() || 'unknown',
        cloudAccountId,
        metadata: {
          instanceClass: instance.DBInstanceClass,
          engine: instance.Engine,
          engineVersion: instance.EngineVersion,
          storage: instance.AllocatedStorage
        }
      });
    }
    
    return resources;
  } catch (error) {
    console.error(`Error getting RDS instances in ${region}:`, error);
    return [];
  }
}

// Validate AWS credentials and list resources
export async function validateAndListAwsResources(credentials: AwsCredentials, cloudAccountId: number) {
  try {
    console.log('Validating AWS credentials...');
    
    // Validate credentials format
    const validatedCredentials = awsCredentialsSchema.parse(credentials);
    
    // Test credentials by getting all regions (throws if invalid)
    const regions = await getAllRegions(validatedCredentials);
    console.log(`Found ${regions.length} AWS regions`);
    
    // Credentials are valid, list resources from all regions
    console.log('Scanning AWS regions for resources...');
    
    const allResources: InsertResource[] = [];
    
    // Scan regions one at a time to avoid overwhelming API limits
    for (const region of regions) {
      try {
        const ec2Resources = await getEc2Instances(region, validatedCredentials, cloudAccountId);
        const rdsResources = await getRdsInstances(region, validatedCredentials, cloudAccountId);
        
        allResources.push(...ec2Resources, ...rdsResources);
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
    console.error('Error validating AWS credentials:', error);
    
    return {
      valid: false,
      error: error.message || 'Invalid AWS credentials',
    };
  }
}
