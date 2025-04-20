#!/usr/bin/env python3
"""
Direct report generation script for AWS resource metrics.
This script can be used to generate reports directly from the command line.

Example usage:
    python direct_report.py --account-name "My AWS Account" --resources "EC2|i-01234567890|us-east-1" "RDS|my-db-instance|us-east-1" --frequency daily --output-dir reports

Requirements:
    - AWS credentials (either from environment variables or passed as arguments)
    - Python libraries: boto3, matplotlib, reportlab
"""

import os
import sys
import argparse
import logging
from datetime import datetime

from aws_utils import get_instance_metrics
from report_generator import generate_pdf_report

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Generate AWS resource utilization report')
    
    # Required arguments
    parser.add_argument('--account-name', required=True, help='AWS account name for the report')
    parser.add_argument('--resources', required=True, nargs='+', 
                      help='List of resources in format: "SERVICE_TYPE|RESOURCE_ID|REGION"')
    
    # Optional arguments
    parser.add_argument('--aws-access-key', help='AWS access key ID (default: from environment)')
    parser.add_argument('--aws-secret-key', help='AWS secret access key (default: from environment)')
    parser.add_argument('--frequency', default='daily', choices=['daily', 'weekly'],
                      help='Report frequency (daily or weekly)')
    parser.add_argument('--output-dir', default='reports', 
                      help='Directory to save the generated report')
    
    return parser.parse_args()

def main():
    """
    Generate a PDF utilization report directly from command line arguments
    """
    # Parse arguments
    args = parse_arguments()
    
    # Get AWS credentials from args or environment
    aws_access_key = args.aws_access_key or os.environ.get('AWS_ACCESS_KEY_ID')
    aws_secret_key = args.aws_secret_key or os.environ.get('AWS_SECRET_ACCESS_KEY')
    
    if not aws_access_key or not aws_secret_key:
        logger.error("AWS credentials not provided. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables or provide them as arguments.")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Calculate period based on frequency
    period_days = 1 if args.frequency == 'daily' else 7
    
    try:
        # Get metrics data for selected resources
        logger.info(f"Fetching metrics for {len(args.resources)} resources")
        metrics_data = get_instance_metrics(aws_access_key, aws_secret_key, args.resources, period_days)
        
        if not metrics_data:
            logger.error("Failed to get metrics data")
            sys.exit(1)
        
        # Generate the PDF report
        logger.info("Generating PDF report")
        logger.info(f"Received metrics data for {len(metrics_data)} resources:")
        for resource in metrics_data:
            logger.info(f"- {resource['service_type']} Resource: {resource['id']} in {resource['region']}")
            
        pdf_data = generate_pdf_report(args.account_name, metrics_data)
        
        # Generate the report filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"aws_report_{timestamp}.pdf"
        output_path = os.path.join(args.output_dir, filename)
        
        # Save the PDF to disk
        with open(output_path, 'wb') as f:
            f.write(pdf_data)
        
        logger.info(f"Report generated successfully: {output_path}")
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()