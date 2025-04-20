import boto3
import logging
from datetime import datetime, timedelta
import pytz

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_aws_client(service, region, aws_access_key, aws_secret_key):
    """Create and return an AWS service client."""
    try:
        return boto3.client(
            service,
            region_name=region,
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key
        )
    except Exception as e:
        logger.error(f"Failed to create AWS client for {service}: {str(e)}")
        raise

def get_all_regions(aws_access_key, aws_secret_key):
    """Get a list of all available AWS regions."""
    try:
        ec2_client = get_aws_client('ec2', 'us-east-1', aws_access_key, aws_secret_key)
        regions = [region['RegionName'] for region in ec2_client.describe_regions()['Regions']]
        return regions
    except Exception as e:
        logger.error(f"Failed to get AWS regions: {str(e)}")
        # Fallback to common regions if API fails
        return ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1']

def list_ec2_instances(aws_access_key, aws_secret_key, region):
    """List EC2 instances in the specified region."""
    try:
        ec2_client = get_aws_client('ec2', region, aws_access_key, aws_secret_key)
        response = ec2_client.describe_instances()

        instances = []
        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                instance_name = 'Unnamed'
                if 'Tags' in instance:
                    for tag in instance['Tags']:
                        if tag['Key'] == 'Name':
                            instance_name = tag['Value']

                platform = instance.get('Platform', 'Linux')
                if platform is None:
                    platform = 'Linux'

                instance_data = {
                    'id': instance['InstanceId'],
                    'name': instance_name,
                    'type': instance['InstanceType'],
                    'os': platform,
                    'state': instance['State']['Name'],
                    'region': region,
                    'service_type': 'EC2'
                }
                instances.append(instance_data)

        return instances
    except Exception as e:
        logger.error(f"Failed to list EC2 instances in {region}: {str(e)}")
        return []

def list_rds_instances(aws_access_key, aws_secret_key, region):
    """List RDS instances in the specified region."""
    try:
        rds_client = get_aws_client('rds', region, aws_access_key, aws_secret_key)
        response = rds_client.describe_db_instances()
        
        instances = []
        for instance in response['DBInstances']:
            instance_data = {
                'id': instance['DBInstanceIdentifier'],
                'name': instance['DBInstanceIdentifier'],
                'type': instance['DBInstanceClass'],
                'status': instance['DBInstanceStatus'],
                'engine': instance['Engine'],
                'region': region,
                'service_type': 'RDS'
            }
            instances.append(instance_data)
        
        return instances
    except Exception as e:
        logger.error(f"Failed to list RDS instances in {region}: {str(e)}")
        return []

def get_cloudwatch_metric_data(cloudwatch, metric_name, namespace, dimensions, period_days, statistic='Average'):
    """Get CloudWatch metric data for the specified period."""
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=period_days)
    logger.info(f"Fetching metrics for {metric_name} from {start_time} to {end_time}")
    
    try:
        response = cloudwatch.get_metric_statistics(
            Namespace=namespace,
            MetricName=metric_name,
            Dimensions=dimensions,
            StartTime=start_time,
            EndTime=end_time,
            Period=300,  # 5-minute intervals
            Statistics=[statistic]
        )
        
        return {
            'Datapoints': response['Datapoints']
        }
    except Exception as e:
        logger.error(f"Failed to get CloudWatch metric {metric_name}: {str(e)}")
        return {
            'Datapoints': []
        }

def get_ec2_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days):
    """Get EC2 instance metrics from CloudWatch."""
    try:
        cloudwatch = get_aws_client('cloudwatch', region, aws_access_key, aws_secret_key)
        ec2_client = get_aws_client('ec2', region, aws_access_key, aws_secret_key)
        
        # Get instance details
        response = ec2_client.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        
        instance_name = instance_id
        if 'Tags' in instance:
            for tag in instance['Tags']:
                if tag['Key'] == 'Name':
                    instance_name = tag['Value']
        
        platform = instance.get('Platform', 'Linux')
        if platform is None:
            platform = 'Linux'
        
        os_type = platform.lower()
        dimensions = [{'Name': 'InstanceId', 'Value': instance_id}]
        
        # Get CPU metrics
        cpu_data = get_cloudwatch_metric_data(
            cloudwatch, 
            'CPUUtilization', 
            'AWS/EC2',
            dimensions,
            period_days
        )
        
        # Get memory metrics
        memory_metric = 'Memory % Committed Bytes In Use' if os_type == 'windows' else 'mem_used_percent'
        memory_data = get_cloudwatch_metric_data(
            cloudwatch,
            memory_metric,
            'CWAgent',
            dimensions,
            period_days
        )
        
        # Get disk metrics
        disk_metrics = {}
        
        if os_type == 'windows':
            # For Windows, get C:, D:, E: disks if present
            drives = ['C:', 'D:', 'E:']
            for drive in drives:
                drive_dimensions = dimensions + [
                    {'Name': 'instance', 'Value': drive}
                ]
                drive_key = f"disk {drive[0]}"
                disk_metrics[drive_key] = get_cloudwatch_metric_data(
                    cloudwatch,
                    'LogicalDisk % Free Space',
                    'CWAgent',
                    drive_dimensions,
                    period_days
                )
        else:
            # For Linux, just get root (/) disk
            disk_dimensions = dimensions + [
                {'Name': 'path', 'Value': '/'}
            ]
            disk_metrics['disk'] = get_cloudwatch_metric_data(
                cloudwatch,
                'disk_used_percent',
                'CWAgent',
                disk_dimensions,
                period_days
            )
        
        return {
            'id': instance_id,
            'name': instance_name,
            'type': instance['InstanceType'],
            'state': instance['State']['Name'],
            'os': platform,
            'region': region,
            'cpu': cpu_data,
            'memory': memory_data,
            'disk_metrics': disk_metrics
        }
    except Exception as e:
        logger.error(f"Failed to get EC2 metrics for {instance_id}: {str(e)}")
        return None

def get_rds_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days):
    """Get RDS instance metrics from CloudWatch."""
    try:
        cloudwatch = get_aws_client('cloudwatch', region, aws_access_key, aws_secret_key)
        rds_client = get_aws_client('rds', region, aws_access_key, aws_secret_key)
        
        # Get instance details
        response = rds_client.describe_db_instances(DBInstanceIdentifier=instance_id)
        instance = response['DBInstances'][0]
        
        dimensions = [{'Name': 'DBInstanceIdentifier', 'Value': instance_id}]
        
        # Get CPU metrics
        cpu_data = get_cloudwatch_metric_data(
            cloudwatch, 
            'CPUUtilization', 
            'AWS/RDS',
            dimensions,
            period_days
        )
        
        # Get memory metrics (available memory)
        memory_data = get_cloudwatch_metric_data(
            cloudwatch,
            'FreeableMemory',
            'AWS/RDS',
            dimensions,
            period_days
        )
        
        # Get disk metrics (available storage)
        disk_data = get_cloudwatch_metric_data(
            cloudwatch,
            'FreeStorageSpace',
            'AWS/RDS',
            dimensions,
            period_days
        )
        
        return {
            'id': instance_id,
            'name': instance_id,
            'type': instance['DBInstanceClass'],
            'status': instance['DBInstanceStatus'],
            'engine': instance['Engine'],
            'region': region,
            'cpu': cpu_data,
            'memory': memory_data,
            'disk': disk_data
        }
    except Exception as e:
        logger.error(f"Failed to get RDS metrics for {instance_id}: {str(e)}")
        return None

def convert_bytes_to_gb(data):
    """Convert byte values to gigabytes in the data structure"""
    if 'Datapoints' not in data or not data['Datapoints']:
        return
    
    for point in data['Datapoints']:
        if 'Average' in point:
            point['Average'] = point['Average'] / (1024 * 1024 * 1024)
        if 'Minimum' in point:
            point['Minimum'] = point['Minimum'] / (1024 * 1024 * 1024)
        if 'Maximum' in point:
            point['Maximum'] = point['Maximum'] / (1024 * 1024 * 1024)

def get_metrics(instance_id, metric_name, start_time, end_time, resource_type, resource_os=None):
    """Get metrics for a specific instance and metric type"""
    # Note: This is a stub function that would be implemented in a real AWS context
    # In this demo version, we'll generate demo data
    return generate_demo_metric_data()

def generate_demo_metric_data():
    """Generate demo metric data when real data is not available."""
    from random import random, randint
    from datetime import datetime, timedelta
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=24)
    data_points = []
    
    # Generate data points for the last 24 hours at 5-minute intervals
    current_time = start_time
    while current_time <= end_time:
        # Generate a value between 10 and 80 for average load
        value = 10 + 70 * random()
        
        data_points.append({
            'Timestamp': current_time,
            'Average': value,
            'Minimum': max(0, value - randint(5, 15)),
            'Maximum': min(100, value + randint(5, 15)),
            'Unit': 'Percent'
        })
        
        current_time += timedelta(minutes=5)
    
    return {
        'Datapoints': data_points
    }

def get_instance_metrics(aws_access_key, aws_secret_key, resource_list, period_days):
    """Get metrics for the selected EC2 and RDS instances."""
    logger.info(f"Getting metrics with period: {period_days} days")
    if not aws_access_key or not aws_secret_key:
        logger.error("AWS credentials are missing")
        raise ValueError("AWS credentials are required")
    
    metrics_data = []
    
    for resource in resource_list:
        parts = resource.split('|')
        if len(parts) != 3:
            logger.error(f"Invalid resource format: {resource}")
            continue
        
        service_type, instance_id, region = parts
        
        if service_type == 'EC2':
            instance_info = get_ec2_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days)
            if instance_info:
                # Convert to the format expected by the report generator
                metrics = {
                    'id': instance_id,
                    'name': instance_info['name'],
                    'type': instance_info['type'],
                    'platform': instance_info['os'],
                    'state': instance_info['state'],
                    'region': region,
                    'service_type': 'EC2',
                    'metrics': {
                        'cpu': process_metric_data(instance_info['cpu']),
                        'memory': process_metric_data(instance_info['memory']),
                        'disk': process_metric_data(instance_info['disk_metrics'].get('disk', {'Datapoints': []}))
                    }
                }
                
                # Add Windows-specific disk metrics if present
                if instance_info['os'].lower() == 'windows':
                    for drive_key, drive_data in instance_info['disk_metrics'].items():
                        if drive_key != 'disk' and drive_data['Datapoints']:
                            metrics['metrics'][drive_key] = process_metric_data(drive_data)
                
                metrics_data.append(metrics)
        
        elif service_type == 'RDS':
            instance_info = get_rds_metrics(aws_access_key, aws_secret_key, instance_id, region, period_days)
            if instance_info:
                # Process memory and disk data (convert bytes to GB)
                memory_data = process_metric_data(instance_info['memory'], convert_to_gb=True)
                disk_data = process_metric_data(instance_info['disk'], convert_to_gb=True)
                
                metrics = {
                    'id': instance_id,
                    'name': instance_info['name'],
                    'type': instance_info['type'],
                    'state': instance_info['status'],
                    'engine': instance_info['engine'],
                    'region': region,
                    'service_type': 'RDS',
                    'metrics': {
                        'cpu': process_metric_data(instance_info['cpu']),
                        'memory': memory_data,
                        'disk': disk_data
                    }
                }
                metrics_data.append(metrics)
    
    return metrics_data

def process_metric_data(data, convert_to_gb=False):
    """Process raw CloudWatch metric data into a format used by the report generator"""
    if not data or 'Datapoints' not in data or not data['Datapoints']:
        return {
            'timestamps': [],
            'values': [],
            'average': 0,
            'min': 0,
            'max': 0
        }
    
    # Sort data points by timestamp
    data_points = sorted(data['Datapoints'], key=lambda x: x['Timestamp'])
    
    # Extract values and timestamps
    timestamps = [dp['Timestamp'] for dp in data_points]
    
    # Apply unit conversion if needed
    if convert_to_gb:
        values = [dp['Average'] / (1024 * 1024 * 1024) for dp in data_points]
    else:
        values = [dp['Average'] for dp in data_points]
    
    # Calculate statistics
    average = sum(values) / len(values) if values else 0
    min_value = min(values) if values else 0
    max_value = max(values) if values else 0
    
    return {
        'timestamps': timestamps,
        'values': values,
        'average': average,
        'min': min_value,
        'max': max_value
    }