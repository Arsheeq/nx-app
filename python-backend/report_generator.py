import io
import os
import logging
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.units import inch
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_chart(timestamps, values, metric_name, instance_name, avg, min_val, max_val):
    """Create a chart for the metric and return as bytes."""
    try:
        plt.figure(figsize=(10, 4))
        
        # Plot the data with a bright, highlighted color
        plt.plot(timestamps, values, color='#FF0066', linewidth=2.5, 
                 marker='o', markersize=3, markerfacecolor='#FF0066', 
                 label='Average', alpha=0.9)
        
        # Add average line
        plt.axhline(y=avg, color='#FF0066', linestyle='-', alpha=0.5, label='Average')
        
        # Format x-axis to show dates
        plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%H:%M', tz=pytz.UTC))
        plt.gca().xaxis.set_major_locator(mdates.HourLocator(interval=3))
        
        # Add grid
        plt.grid(True, linestyle='--', alpha=0.7)
        
        # Set labels and title
        plt.xlabel('Time', fontweight='bold')
        
        # Check if the metric is memory or disk (where we use GB)
        if 'gb' in metric_name.lower() or any(word in metric_name.lower() for word in ['memory', 'disk']):
            unit = 'GB'
            plt.ylabel(f"{metric_name} ({unit})", fontweight='bold')
        else:
            unit = 'Percent'
            plt.ylabel(f"{metric_name} ({unit})", fontweight='bold')
        
        # Find the start and end times from the available timestamps
        if timestamps:
            start_time = min(timestamps)
            end_time = max(timestamps)
            
            # Format the time span in the title
            start_str = start_time.strftime('%Y-%m-%d %H:%M')
            end_str = end_time.strftime('%Y-%m-%d %H:%M')
            plt.title(f'{instance_name}: {metric_name}\n{start_str} to {end_str}', fontweight='bold')
            
            # Set explicit x-axis range based on the data
            plt.xlim(start_time, end_time)
        else:
            plt.title(f'{instance_name}: {metric_name}\nNo data available', fontweight='bold')
        
        # Add legend
        plt.legend(loc='upper right', frameon=True)
        
        # Add statistics
        if unit == 'Percent':
            stats_text = f"Min: {min_val:.2f}% | Max: {max_val:.2f}% | Avg: {avg:.2f}%"
        else:
            stats_text = f"Min: {min_val:.2f} GB | Max: {max_val:.2f} GB | Avg: {avg:.2f} GB"
        plt.figtext(0.5, 0.01, stats_text, ha='center', fontsize=10, fontweight='bold')
        
        # Tight layout to maximize graph area
        plt.tight_layout()
        
        # Save plot to bytes
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        plt.close()
        buf.seek(0)
        
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Error creating chart: {str(e)}")
        # Create error chart
        plt.figure(figsize=(10, 4))
        plt.text(0.5, 0.5, f'Error creating chart: {str(e)}', horizontalalignment='center', verticalalignment='center')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150)
        plt.close()
        buf.seek(0)
        
        return buf.getvalue()

def wrap_table_data(data):
    """Helper function to wrap table data cells as paragraphs for better formatting"""
    wrapped_data = []
    styles = getSampleStyleSheet()
    
    for row in data:
        wrapped_row = []
        for cell in row:
            if not isinstance(cell, Paragraph):
                wrapped_row.append(Paragraph(str(cell), styles['Normal']))
            else:
                wrapped_row.append(cell)
        wrapped_data.append(wrapped_row)
    
    return wrapped_data

def create_utilization_report(doc, elements, account_name, metrics_data, cloud_provider):
    """Create utilization report content"""
    styles = getSampleStyleSheet()
    
    # Define custom styles
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Title'],
        fontSize=18,
        alignment=1,  # Center alignment
        spaceAfter=0.2*inch
    )
    
    header_style = ParagraphStyle(
        name='HeaderStyle',
        parent=styles['Heading1'],
        fontSize=14,
        spaceAfter=0.1*inch
    )
    
    subheader_style = ParagraphStyle(
        name='SubHeaderStyle',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=0.1*inch
    )
    
    label_style = ParagraphStyle(
        name='LabelStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceBefore=0.1*inch,
        spaceAfter=0.05*inch,
        fontName='Helvetica-Bold'
    )
    
    remark_style = ParagraphStyle(
        name='RemarkStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=0.1*inch,
        fontName='Helvetica-Oblique'
    )
    
    # Cover page
    elements.append(Paragraph(f"{cloud_provider.upper()} UTILIZATION<br/>REPORT", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Add report information table
    report_data = [
        ["Account", account_name],
        ["Report", "Resource Utilization"],
        ["Date", datetime.now().strftime("%Y-%m-%d")]
    ]
    
    report_table = Table(wrap_table_data(report_data), colWidths=[1.5*inch, 3*inch])
    report_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6)
    ]))
    
    elements.append(report_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # Group metrics by service type
    service_types = {}
    for resource in metrics_data:
        service_type = resource.get('service_type', 'Unknown')
        if service_type not in service_types:
            service_types[service_type] = []
        service_types[service_type].append(resource)
    
    # Add resources summary
    for service_type, resources in service_types.items():
        elements.append(Paragraph(f"{service_type} Resources Covered in Report:", header_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Create a table for instance summary based on service type
        if service_type in ['EC2', 'VM']:
            summary_data = [["Instance ID", "Name", "Type", "Status"]]
            for resource in resources:
                summary_data.append([
                    resource['id'],
                    resource['name'],
                    resource['type'],
                    resource['state']
                ])
        else:  # RDS or Database
            summary_data = [["Instance Name", "Type", "Status", "Engine"]]
            for resource in resources:
                summary_data.append([
                    resource['id'],
                    resource['type'],
                    resource['state'],
                    resource.get('engine', 'Unknown')
                ])
        
        # Create and add the summary table
        summary_table = Table(wrap_table_data(summary_data), colWidths=[1.59*inch, 3*inch, 1.5*inch, 1*inch])
        summary_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 0.4*inch))
    
    # Process each resource
    for resource in metrics_data:
        # Start a new page for each resource
        elements.append(PageBreak())
        
        service_type = resource.get('service_type', 'Unknown')
        
        if service_type in ['EC2', 'VM']:
            # Add instance details
            elements.append(Paragraph(f"Host: {resource['name']}", header_style))
            elements.append(Spacer(1, 0.1*inch))
            
            # Host information
            host_info_data = [
                ["Instance ID", resource['id']],
                ["Type", resource['type']],
                ["Operating System", resource.get('platform', 'Unknown')],
                ["State", resource['state']]
            ]
            
            host_info_table = Table(wrap_table_data(host_info_data), colWidths=[1.5*inch, 4*inch])
            host_info_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('BACKGROUND', (0, 0), (0, -1), colors.white),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6)
            ]))
            
            elements.append(host_info_table)
            elements.append(Spacer(1, 0.3*inch))
        else:
            # Add database instance details
            elements.append(Paragraph(f"Database: {resource['name']}", header_style))
            elements.append(Spacer(1, 0.1*inch))
            
            # Database information
            db_info_data = [
                ["Instance ID", resource['id']],
                ["Type", resource['type']],
                ["Engine", resource.get('engine', 'Unknown')],
                ["State", resource['state']]
            ]
            
            db_info_table = Table(wrap_table_data(db_info_data), colWidths=[1.5*inch, 4*inch])
            db_info_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('BACKGROUND', (0, 0), (0, -1), colors.white),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6)
            ]))
            
            elements.append(db_info_table)
            elements.append(Spacer(1, 0.3*inch))
        
        # Check if resource has metrics
        if 'metrics' in resource:
            # Process CPU metrics
            if 'cpu' in resource['metrics']:
                cpu_data = resource['metrics']['cpu']
                
                if cpu_data.get('timestamps'):
                    # CPU utilization title
                    elements.append(Paragraph("CPU UTILIZATION", label_style))
                    
                    # Add remarks about CPU utilization
                    avg_val = cpu_data['average']
                    
                    if avg_val > 85:
                        remarks = "Average utilisation is high. Explore possibility of optimising the resources."
                    else:
                        remarks = "Average utilisation is normal. No action needed at the time."
                    
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Create and add CPU chart
                    cpu_chart = create_chart(
                        cpu_data['timestamps'],
                        cpu_data['values'],
                        "CPU Utilization",
                        resource['name'],
                        cpu_data['average'],
                        cpu_data['min'],
                        cpu_data['max']
                    )
                    
                    elements.append(Image(io.BytesIO(cpu_chart), width=6.5*inch, height=3*inch))
                    elements.append(Spacer(1, 0.2*inch))
            
            # Process Memory metrics
            if 'memory' in resource['metrics']:
                memory_data = resource['metrics']['memory']
                
                if memory_data.get('timestamps'):
                    # Memory utilization title
                    elements.append(Paragraph("MEMORY UTILIZATION", label_style))
                    
                    # Add remarks about memory utilization
                    avg_val = memory_data['average']
                    
                    if 'GB' in str(avg_val):  # This is for RDS instances where memory is reported in GB
                        if avg_val < 1:
                            remarks = "Memory availability is low. Consider upgrading the instance."
                        else:
                            remarks = "Memory availability is normal."
                    else:
                        if avg_val > 90:
                            remarks = "Memory utilization is high. Consider upgrading the instance."
                        else:
                            remarks = "Memory utilization is normal."
                    
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Create and add Memory chart
                    memory_chart = create_chart(
                        memory_data['timestamps'],
                        memory_data['values'],
                        "Memory Utilization",
                        resource['name'],
                        memory_data['average'],
                        memory_data['min'],
                        memory_data['max']
                    )
                    
                    elements.append(Image(io.BytesIO(memory_chart), width=6.5*inch, height=3*inch))
                    elements.append(Spacer(1, 0.2*inch))
            
            # Process Disk metrics
            if 'disk' in resource['metrics']:
                disk_data = resource['metrics']['disk']
                
                if disk_data.get('timestamps'):
                    # Disk utilization title
                    elements.append(Paragraph("DISK UTILIZATION", label_style))
                    
                    # Add remarks about disk utilization
                    avg_val = disk_data['average']
                    
                    if 'GB' in str(avg_val):  # This is for RDS instances where disk is reported in GB
                        if avg_val < 5:
                            remarks = "Storage availability is low. Consider increasing storage."
                        else:
                            remarks = "Storage availability is normal."
                    else:
                        if avg_val > 85:
                            remarks = "Disk utilization is high. Consider increasing storage."
                        else:
                            remarks = "Disk utilization is normal."
                    
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Create and add Disk chart
                    disk_chart = create_chart(
                        disk_data['timestamps'],
                        disk_data['values'],
                        "Disk Utilization",
                        resource['name'],
                        disk_data['average'],
                        disk_data['min'],
                        disk_data['max']
                    )
                    
                    elements.append(Image(io.BytesIO(disk_chart), width=6.5*inch, height=3*inch))
                    elements.append(Spacer(1, 0.2*inch))

def create_billing_report(doc, elements, account_name, cloud_provider, month, year):
    """Create billing report content"""
    styles = getSampleStyleSheet()
    
    # Define custom styles
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Title'],
        fontSize=18,
        alignment=1,  # Center alignment
        spaceAfter=0.2*inch
    )
    
    header_style = ParagraphStyle(
        name='HeaderStyle',
        parent=styles['Heading1'],
        fontSize=14,
        spaceAfter=0.1*inch
    )
    
    subheader_style = ParagraphStyle(
        name='SubHeaderStyle',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=0.1*inch
    )
    
    warning_style = ParagraphStyle(
        name='WarningStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.red,
        alignment=1,  # Center alignment
        spaceAfter=0.2*inch
    )
    
    month_name = datetime(year, month, 1).strftime('%B')
    
    # Cover page
    elements.append(Paragraph(f"{cloud_provider.upper()} BILLING<br/>REPORT", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Add report information table
    report_data = [
        ["Account", account_name],
        ["Report", "Billing Report"],
        ["Period", f"{month_name} {year}"],
        ["Date Generated", datetime.now().strftime("%Y-%m-%d")]
    ]
    
    report_table = Table(wrap_table_data(report_data), colWidths=[1.5*inch, 3*inch])
    report_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6)
    ]))
    
    elements.append(report_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # In a real implementation, this would contain real billing data from AWS Cost Explorer
    # or Azure Cost Management API. For now, we'll add a placeholder.
    elements.append(Paragraph("This is a placeholder for the billing report. In a real implementation, this would contain actual billing data retrieved from the cloud provider's cost management API.", warning_style))
    elements.append(Spacer(1, 0.4*inch))
    
    # Add monthly overview section
    elements.append(Paragraph("Monthly Cost Overview", header_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Create a sample monthly overview table
    overview_data = [
        ["Service Category", "Cost"],
        ["Compute", "$0.00"],
        ["Storage", "$0.00"],
        ["Database", "$0.00"],
        ["Networking", "$0.00"],
        ["Other", "$0.00"],
        ["Total", "$0.00"]
    ]
    
    overview_table = Table(wrap_table_data(overview_data), colWidths=[3*inch, 1.5*inch])
    overview_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(overview_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # Add a note about generating real billing data
    elements.append(Paragraph(
        "Note: To retrieve real billing data, you would need to implement integration with the AWS Cost Explorer API or Azure Cost Management API. " +
        "This would require appropriate permissions in your credentials to access cost data.",
        styles['Normal']
    ))

def generate_pdf_report(account_name, metrics_data=None, cloud_provider='AWS', 
                       report_type='utilization', month=None, year=None):
    """Generate a PDF report with metrics data or billing information."""
    logger.info("Generating PDF report...")
    
    # Create a buffer for the PDF
    buffer = io.BytesIO()
    
    # Define header function for all pages
    def header(canvas, doc):
        canvas.saveState()
        # Draw border around page
        canvas.rect(doc.leftMargin - 10, doc.bottomMargin - 10,
                   doc.width + 20, doc.height + 20)
        
        # Add website URL on the left
        canvas.setFont('Helvetica', 8)
        canvas.drawString(doc.leftMargin, doc.height + doc.topMargin - 12, "www.nubinix.com")
        
        # Add logo on the right
        logo_path = os.path.join(os.getcwd(), 'public', 'nubinix-icon.png')
        if os.path.exists(logo_path):
            canvas.drawImage(logo_path, doc.width + doc.leftMargin - 60, 
                           doc.height + doc.topMargin - 40, width=40, height=40)
        canvas.restoreState()
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.8*inch,  # Increased top margin for header
        bottomMargin=0.5*inch
    )
    
    # Initialize the list of flowables
    elements = []
    
    # Create appropriate report content based on report type
    if report_type == 'utilization':
        create_utilization_report(doc, elements, account_name, metrics_data, cloud_provider)
    else:  # billing report
        create_billing_report(doc, elements, account_name, cloud_provider, month, year)
    
    # Build the PDF document with header template
    doc.build(elements, onFirstPage=header, onLaterPages=header)
    
    # Get the PDF data
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data
