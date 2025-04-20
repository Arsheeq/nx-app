import logging
from datetime import datetime, timedelta
import json
from typing import List, Dict, Any, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_azure_metrics(client_id: str, client_secret: str, tenant_id: str, 
                     subscription_id: str, resource_list: List[str], period_days: int) -> List[Dict[str, Any]]:
    """
    Get metrics for the selected Azure resources.
    
    In a real implementation, this would use the Azure SDK to get metrics for each resource.
    For this sample, we'll generate mock data that has the same structure as the AWS metrics.
    """
    logger.info(f"Getting Azure metrics with period: {period_days} days")
    
    # Validate credentials
    if not client_id or not client_secret or not tenant_id or not subscription_id:
        logger.error("Azure credentials are missing")
        raise ValueError("Azure credentials are required")
    
    metrics_data = []
    
    for resource in resource_list:
        try:
            parts = resource.split('|')
            if len(parts) != 3:
                # Try to infer the format if possible (for backward compatibility)
                if len(parts) == 1:
                    # This is just a resource ID, try to infer type from format
                    resource_id = parts[0]
                    # Azure VM IDs often contain 'virtualMachines'
                    if 'virtualmachines' in resource_id.lower():
                        service_type = 'VM'
                        region = 'eastus'  # Default to East US
                        logger.warning(f"Resource format inferred for {resource_id} as VM in eastus")
                    else:
                        # Assume it's a database
                        service_type = 'Database'
                        region = 'eastus'  # Default to East US
                        logger.warning(f"Resource format inferred for {resource_id} as Database in eastus")
                else:
                    logger.error(f"Invalid resource format: {resource}")
                    continue
            else:
                service_type, resource_id, region = parts
            
            # Validate parts
            if not service_type or not resource_id or not region:
                logger.error(f"Invalid resource format: {resource}")
                continue
        except Exception as e:
            logger.error(f"Error parsing resource format: {resource} - {str(e)}")
            continue
            
        service_type = service_type.upper()
        
        # In a real implementation, you would connect to Azure Monitor here
        # For now, we'll generate mock metrics data with the same structure as AWS
        
        if service_type == 'VM':
            metrics = generate_vm_metrics(resource_id, region, period_days)
            metrics_data.append(metrics)
        
        elif service_type == 'Database':
            metrics = generate_database_metrics(resource_id, region, period_days)
            metrics_data.append(metrics)
    
    return metrics_data

def generate_vm_metrics(resource_id: str, region: str, period_days: int) -> Dict[str, Any]:
    """
    Generate metrics data for an Azure VM.
    
    In a real implementation, this would fetch actual metrics from Azure Monitor.
    """
    # Generate timestamps and values for the given period
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=period_days)
    
    timestamps, cpu_values = generate_demo_values(start_time, end_time)
    _, memory_values = generate_demo_values(start_time, end_time, 40, 80)
    _, disk_values = generate_demo_values(start_time, end_time, 30, 70)
    
    # CPU metrics
    cpu_metrics = {
        'timestamps': timestamps,
        'values': cpu_values,
        'average': sum(cpu_values) / len(cpu_values),
        'min': min(cpu_values),
        'max': max(cpu_values)
    }
    
    # Memory metrics
    memory_metrics = {
        'timestamps': timestamps,
        'values': memory_values,
        'average': sum(memory_values) / len(memory_values),
        'min': min(memory_values),
        'max': max(memory_values)
    }
    
    # Disk metrics
    disk_metrics = {
        'timestamps': timestamps,
        'values': disk_values,
        'average': sum(disk_values) / len(disk_values),
        'min': min(disk_values),
        'max': max(disk_values)
    }
    
    # Create resource metrics object
    metrics = {
        'id': resource_id,
        'name': f"VM-{resource_id.split('/')[-1]}",
        'type': 'Standard_D2s_v3',
        'platform': 'Linux',
        'state': 'running',
        'region': region,
        'service_type': 'VM',
        'metrics': {
            'cpu': cpu_metrics,
            'memory': memory_metrics,
            'disk': disk_metrics
        }
    }
    
    return metrics

def generate_database_metrics(resource_id: str, region: str, period_days: int) -> Dict[str, Any]:
    """
    Generate metrics data for an Azure database.
    
    In a real implementation, this would fetch actual metrics from Azure Monitor.
    """
    # Generate timestamps and values for the given period
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=period_days)
    
    timestamps, cpu_values = generate_demo_values(start_time, end_time, 20, 60)
    _, memory_values = generate_demo_values(start_time, end_time, 2, 8)  # GB
    _, disk_values = generate_demo_values(start_time, end_time, 20, 100)  # GB
    
    # CPU metrics
    cpu_metrics = {
        'timestamps': timestamps,
        'values': cpu_values,
        'average': sum(cpu_values) / len(cpu_values),
        'min': min(cpu_values),
        'max': max(cpu_values)
    }
    
    # Memory metrics
    memory_metrics = {
        'timestamps': timestamps,
        'values': memory_values,
        'average': sum(memory_values) / len(memory_values),
        'min': min(memory_values),
        'max': max(memory_values)
    }
    
    # Disk metrics
    disk_metrics = {
        'timestamps': timestamps,
        'values': disk_values,
        'average': sum(disk_values) / len(disk_values),
        'min': min(disk_values),
        'max': max(disk_values)
    }
    
    # Create resource metrics object
    metrics = {
        'id': resource_id,
        'name': f"DB-{resource_id.split('/')[-1]}",
        'type': 'Standard',
        'engine': 'SQL',
        'state': 'available',
        'region': region,
        'service_type': 'Database',
        'metrics': {
            'cpu': cpu_metrics,
            'memory': memory_metrics,
            'disk': disk_metrics
        }
    }
    
    return metrics

def generate_demo_values(start_time: datetime, end_time: datetime, 
                        min_value: float = 10, max_value: float = 80) -> Tuple[List[datetime], List[float]]:
    """Generate demo values between min_value and max_value for the given time period."""
    import random
    
    interval = timedelta(minutes=5)
    current_time = start_time
    
    timestamps = []
    values = []
    
    while current_time <= end_time:
        timestamps.append(current_time)
        
        # Generate a value between min_value and max_value
        value = min_value + (max_value - min_value) * random.random()
        values.append(value)
        
        current_time += interval
    
    return timestamps, values
