import datetime
import json
import boto3
import pytz


cloudwatch_metrics = {
    "ec2": {
        "instance_id_key": "InstanceId",
        "linux": {
            "cpu": {
                "namespace": "AWS/EC2",
                "metric_name": "CPUUtilization",
                "unit": "Percent"
            },
            "memory": {
                "namespace": "CWAgent",
                "metric_name": "mem_used_percent",
                "unit": "Percent"
            },
            "disk": {
                "namespace": "CWAgent",
                "metric_name": "disk_used_percent",
                "unit": "Percent"
            }
        },
        "windows": {
            "cpu": {
                "namespace": "AWS/EC2",
                "metric_name": "CPUUtilization",
                 "unit": "Percent"
            },
            "memory": {
                "namespace": "CWAgent",
                "metric_name": "Memory % Committed Bytes In Use",
                "unit": None
            },
            "disk C": {
                "namespace": "CWAgent",
                "metric_name": "LogicalDisk % Free Space",
                "unit": None,
                "instance":"C:"
            },
            "disk D": {
                "namespace": "CWAgent",
                "metric_name": "LogicalDisk % Free Space",
                "unit": None,
                "instance": "D:"
            },
            "disk E": {
                "namespace": "CWAgent",
                "metric_name": "LogicalDisk % Free Space",
                "unit": None,
                "instance": "E:"
            },
            
        }
    },
    "rds": {
        "instance_id_key": "DBInstanceIdentifier",
        "namespace": "AWS/RDS",
        "cpu": {
            "metric_name": "CPUUtilization",
            "unit": "Percent"
        },
        "memory": {
            "metric_name": "FreeableMemory",
            "unit": "Bytes" 
        },
        "disk": {
            "metric_name": "FreeStorageSpace",
            "unit": "Bytes"
        }
    }
}


class Client:
    def __init__(
        self,
        region="ap-south-1",
        account_id=None
    ):
        self.account_id = account_id
        self.namespace = "AWS/EC2"
        self.region = region
        self.period = 300
        self.secrets = self.get_secrets(account_id)
        self.session = boto3.Session(aws_access_key_id=self.secrets.get('access_key'), aws_secret_access_key=self.secrets.get("secret_key"))
    
    def get_secrets(self, account_id):

        session = boto3.session.Session()
        client = session.client(service_name='secretsmanager', region_name=self.region)
        response = client.get_secret_value(SecretId=account_id)

        secret =  json.loads(response['SecretString'])
        return secret

    def get_running_ec2_instance_ids(self, region_name=None):
        """
        Retrieve instance IDs of all EC2 instances that are not in a 'stopped' state.
        
        :param region_name: Optional specific region to check. If None, checks all regions.
        :return: List of dictionaries containing instance information
        """
        # Create an EC2 client
        ec2 = self.session.client("ec2", region_name=self.region) 
        
        # If no region specified, get all regions
        if region_name is None:
            regions = [region['RegionName'] for region in ec2.describe_regions()['Regions']]
        else:
            regions = [region_name]
        
        # List to store instance IDs with their states
        instance_data = []
        
        # Iterate through regions
        for region in regions:
            # Create EC2 client for each region
            regional_ec2 = self.session.client("ec2", region_name=region) 
            
            # Describe instances in the region
            paginator = regional_ec2.get_paginator('describe_instances')
            for page in paginator.paginate():
                for reservation in page['Reservations']:
                    for instance in reservation['Instances']:
                        instance_id = instance['InstanceId']
                        state = instance['State']['Name']
                        
                        instance_data.append({
                            'instance_id': instance_id,
                            'state': state,
                            'region': region,
                            'name': next((tag['Value'] for tag in instance.get('Tags', []) if tag['Key'] == 'Name'), 'unnamed')
                        })
        
        # Sort the instances by state, with 'running' first
        state_priority = {
            'running': 1,
            'pending': 2,
            'shutting-down': 3,
            'stopping': 4,
            'terminated': 5
        }

        sorted_instances = sorted(instance_data, key=lambda x: state_priority.get(x['state'], 999))
        instance_ids = [instance['instance_id'] for instance in sorted_instances]
        return instance_ids

    def get_metrics(self, instance_id, metric_name, start_time, end_time, resource_type, resource_os):

        if resource_type == "ec2":
            cloudwatch_metric_name = cloudwatch_metrics[resource_type][resource_os][metric_name]['metric_name']
            namespace = cloudwatch_metrics[resource_type][resource_os][metric_name]['namespace']
            unit = cloudwatch_metrics[resource_type][resource_os][metric_name]['unit']
            instance_id_key = cloudwatch_metrics[resource_type]['instance_id_key']
            
            instance = cloudwatch_metrics.get(resource_type, {}).get(resource_os, {}).get(metric_name, {}).get('instance', None)
            if metric_name == "memory":
                    Dimensions= self.get_demenstion_ram([{"Name": instance_id_key, "Value": instance_id}], instance_id,namespace,cloudwatch_metric_name)

            else:
                Dimensions = [{"Name": instance_id_key, "Value": instance_id}]
            if instance :
                instance_info=self.get_instance_info(instance_id)
                instance_ImageId=instance_info.get("ami")
                instance_Type=instance_info.get("type")
                # print(instance_info)
        elif resource_type == "rds":
            cloudwatch_metric_name = cloudwatch_metrics[resource_type][metric_name]['metric_name']
            namespace = cloudwatch_metrics[resource_type]['namespace']
            unit = cloudwatch_metrics[resource_type][metric_name]['unit']
            instance_id_key = cloudwatch_metrics[resource_type]['instance_id_key']
            Dimensions = [{"Name": instance_id_key, "Value": instance_id}]

        else:
            return "Unsupported resource type"


        cloudwatch = self.session.client("cloudwatch", region_name=self.region)
        
        if unit:
            # Set Dimensions before making the API call
            if resource_os == "linux" and metric_name == "disk":
                Dimensions = self.get_demenstion([{"Name": instance_id_key, "Value": instance_id}], instance_id)
                if Dimensions is None:
                    Dimensions = [{"Name": instance_id_key, "Value": instance_id}]

            
            else:
                Dimensions = [{"Name": instance_id_key, "Value": instance_id}]
            
            if Dimensions is None:
                Dimensions = [{"Name": instance_id_key, "Value": instance_id}]
           
            response = cloudwatch.get_metric_statistics(
                Namespace=namespace,
                MetricName=cloudwatch_metric_name,
                Dimensions=Dimensions,
                Statistics=["Average"],
                StartTime=start_time,
                EndTime=end_time,
                Period=self.period,
                Unit=unit
            )   
                        
        else: 
            # Define the base Dimensions structure for the non-disk metrics

            # If the metric_name is one of the disk-related names, add extra Dimensions
            if metric_name in ["disk C", "disk E", "disk D"]:
                Dimensions.extend([
                    {"Name": "instance", "Value": instance},
                    {"Name": "ImageId", "Value": instance_ImageId},
                    {"Name": "objectname", "Value": "LogicalDisk"},
                    {"Name": "InstanceType", "Value": instance_Type}
                ])
            
            if Dimensions is None:
                Dimensions = [{"Name": instance_id_key, "Value": instance_id}]
            
            response = cloudwatch.get_metric_statistics(
                Namespace=namespace,
                MetricName=cloudwatch_metric_name,
                Dimensions=Dimensions,
                Statistics=["Average"],
                StartTime=start_time,
                EndTime=end_time,
                Period=self.period
            )
        # print(response)

        local_tz = pytz.timezone('Asia/Kolkata')
        for data in response['Datapoints']:
            utc_time = data['Timestamp'].replace(tzinfo=pytz.utc)
            local_time = utc_time.astimezone(local_tz)
            data['Timestamp'] = local_time
        
        return response
    
    
    def get_instance_info(self, instance_id):
        """
        Get instance information from EC2
        
        Parameters:
        - instance_id: EC2 instance ID
        
        Returns:
        Dictionary with instance information
        """
        try:
            ec2 = self.session.client("ec2", region_name=self.region) 
            response = ec2.describe_instances(InstanceIds=[instance_id])
            instance = response['Reservations'][0]['Instances'][0]
            instance_ImageId= response['Reservations'][0]['Instances'][0]['ImageId']
            # Extract relevant information
            info = {
                "id": instance_id,
                "name": self._get_instance_name(instance),
                "type": instance['InstanceType'],
                "os": self._get_os_info(instance),
                "state": instance['State']['Name'],
                "ami":instance_ImageId
            }
            return info
        except Exception as e:
            print(f"Error getting instance info for {instance_id}: {e}")
            # Return basic info if we can't get details
            return {
                "id": instance_id,
                "name": instance_id,
                "type": "Unknown",
                "os": "Unknown",
                "state": "Unknown"
            }
    def get_rds_instances(self):
        """
        Gets a list of all RDS instances with their ID, name, type, and status.
        Returns formatted data ready for display.
        """
        # Initialize boto3 RDS client
        rds_client = self.session.client("rds", region_name=self.region)
        
        # Get list of all DB instances
        response = rds_client.describe_db_instances()
        
        # Extract relevant information
        instances = []
        for instance in response['DBInstances']:
            # Extract instance information
            instance_id = instance['DBInstanceIdentifier']
            instance_type = instance['DBInstanceClass']
            instance_status = instance['DBInstanceStatus']
            engine = instance['Engine']
            engine_version = instance['EngineVersion']
            

            # Add to our list
            instances.append({
                'id': instance_id,
                'type': instance_type,
                'status': instance_status,
                'engine': engine,
                'engine_version': engine_version
            })
        
        return instances
    def _get_instance_name(self, instance):
        """Extract instance name from tags"""
        if 'Tags' in instance:
            for tag in instance['Tags']:
                if tag['Key'] == 'Name':
                    return tag['Value']
        return instance['InstanceId']

    def _get_os_info(self, instance):
        """Extract OS info from platform or image details"""
        if 'Platform' in instance:
            return instance['Platform']
        # If platform is not specified, it's likely Linux
        return "Linux"

    def list_available_metrics(self, instance_id):
        cloudwatch = self.session.client("cloudwatch", region_name=self.region)
        metrics = cloudwatch.list_metrics(
            Namespace="CWAgent",
            Dimensions=[{"Name": "InstanceId", "Value": instance_id}]
        )
        
        return metrics
    
    # upload to nubinix s3 bucket
    def upload_to_s3(self, local_file, bucket, s3_path):
        nx_session = boto3.Session()
        s3_client = nx_session.client("s3", region_name=self.region)
        s3_client.upload_file(local_file, bucket, s3_path)

    def get_demenstion(self,Dimensions,instance_id):
        # print(instance_id)
        cloudwatch = self.session.client("cloudwatch", region_name=self.region)
        matching_metrics = []
        response = cloudwatch.list_metrics(
                        Namespace='CWAgent',
                        MetricName='disk_used_percent'
                        )
        for metric in response['Metrics']:
            dimensions = metric.get('Dimensions', [])

            has_path = any(d['Name'] == 'path' and d['Value'] == '/' for d in dimensions)
            has_instance = any(d['Name'] == 'InstanceId' and d['Value'] == instance_id for d in dimensions)

            if has_path and has_instance:
                matching_metrics.append(metric)
                Dimensions.extend(matching_metrics[0]['Dimensions'])
                break  # Exit after first match
                
            
        # print(Dimensions)
        return Dimensions
    
    def get_demenstion_ram(self,Dimensions,instance_id,Namespace,MetricName):
        # print(instance_id)
        cloudwatch = self.session.client("cloudwatch", region_name=self.region)
        matching_metrics = []
        response = cloudwatch.list_metrics(
                        Namespace=Namespace,
                        MetricName=MetricName
                        )
        for metric in response['Metrics']:
            dimensions = metric.get('Dimensions', [])
            
            # for linux 
            # has_path = any(d['Name'] == 'path' and d['Value'] == '/' for d in dimensions)
            # has_instance = any(d['Name'] == 'InstanceId' and d['Value'] == instance_id for d in dimensions)
            
            has_instance = any(d['Name'] == 'InstanceId' and d['Value'] == instance_id for d in dimensions)
            if  has_instance:
                matching_metrics.append(metric)
                Dimensions.extend(matching_metrics[0]['Dimensions'])
                # print(Dimensions)
                return Dimensions  # Exit after first match
            
                
            
        # print(Dimensions)
    
   
   

if __name__ == "__main__":
    client = Client("ap-south-1","850676308078")
    
    # Define IST timezone
    ist = pytz.timezone("Asia/Kolkata")

    # Define start and end times in IST
    start_time_ist = datetime.datetime(2025, 3, 28, 0, 0, 0, tzinfo=ist)
    end_time_ist = datetime.datetime(2025, 3, 29, 2, 0, 0, tzinfo=ist)

    # Convert IST to UTC
    start_time_utc = start_time_ist.astimezone(pytz.utc)
    end_time_utc = end_time_ist.astimezone(pytz.utc)
    response = client.get_metrics("i-01f33ef2a663e910d", "memory", start_time_utc, end_time_utc, "ec2", "linux")
    time_series = response['Datapoints']
    time_series.sort(key=lambda x: x['Timestamp'])
    # print(client.list_available_metrics("i-0a048169afb2f51a2"))
    
    for t in time_series:
        print(t)
