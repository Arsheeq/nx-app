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
from reportlab.pdfgen import canvas
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(level=logging.DEBUG)
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
        plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%H:%M', tz=pytz.timezone('Asia/Kolkata')))
        plt.gca().xaxis.set_major_locator(mdates.HourLocator(interval=3))
        
        # Add grid
        plt.grid(True, linestyle='--', alpha=0.7)
        
        # Set labels and title
        plt.xlabel('Time', fontweight='bold')
        
        # Check if the metric is memory or disk for RDS (where we use GB)
        if 'gb' in metric_name.lower() or any(word in metric_name.lower() for word in ['memory', 'disk']):
            unit = 'GB'
            plt.ylabel(f"{metric_name} ({unit})", fontweight='bold')
        else:
            unit = 'Percent'
            plt.ylabel(f"{metric_name} ({unit})", fontweight='bold')
        
        # Find the start and end times from the available timestamps
        start_time = min(timestamps)
        end_time = max(timestamps)
        
        # Format the time span in the title
        start_str = start_time.strftime('%Y-%m-%d %H:%M')
        end_str = end_time.strftime('%Y-%m-%d %H:%M')
        plt.title(f'{instance_name}: {metric_name}\n{start_str} to {end_str}', fontweight='bold')
        
        # Set explicit x-axis range based on the data
        plt.xlim(start_time, end_time)
        
        # Add legend
        plt.legend(loc='upper right', frameon=True)
        
        # Add statistics
        if unit == 'Percent':
            stats_text = f"Min: {min_val:.2f}% | Max: {max_val:.2f}% | Avg: {avg:.2f}%"
        else:
            stats_text = f"Min: {min_val:.2f} | Max: {max_val:.2f} | Avg: {avg:.2f}"
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

def header_function(canvas, doc):
    """Draw header on each page"""
    canvas.saveState()
    canvas.setFont('Helvetica-Bold', 10)
    canvas.drawString(0.5*inch, 10.5*inch, "AWS Resource Utilization Report")
    canvas.restoreState()

def cover_page(canvas, doc, account_name):
    """Draw the cover page with account name exactly as in original application"""
    canvas.saveState()
    
    # Set page size
    width, height = A4
    
    # Add title at top
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawCentredString(width / 2, height - 70, "CLOUD UTILIZATION")
    canvas.drawCentredString(width / 2, height - 95, "REPORT")
    
    # Add account information near bottom center of page
    canvas.setFont("Helvetica-Bold", 36)
    # First draw account name
    canvas.drawCentredString(width / 2, height/2 - 70, f"{account_name}")
    # Then draw "Account Daily Report" below it
    canvas.drawCentredString(width / 2, height/2 - 120, "Account Daily Report")
    
    canvas.restoreState()

def generate_pdf_report(account_name, metrics_data):
    """Generate a PDF report with metrics data."""
    logger.debug("Generating PDF report...")
    
    # Create a buffer for the PDF
    buffer = io.BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
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
    
    normal_style = ParagraphStyle(
        name='NormalStyle',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=0.05*inch
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
    
    # Initialize the list of flowables
    elements = []
    
    # First page with cover
    elements.append(Paragraph("CLOUD UTILIZATION<br/>REPORT", title_style))
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
    
    # Add instances summary
    elements.append(Spacer(1, 0.4*inch))
    
    # Group metrics by service type
    ec2_resources = [resource for resource in metrics_data if resource['service_type'] == 'EC2']
    rds_resources = [resource for resource in metrics_data if resource['service_type'] == 'RDS']
    
    # Add EC2 instances summary
    if ec2_resources:
        elements.append(Paragraph("Instances Covered in Report:", header_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Create a table for EC2 instance summary
        ec2_summary_data = [["Instance ID", "Name", "Type", "Status"]]
        
        for resource in ec2_resources:
            ec2_summary_data.append([
                resource['id'],
                resource['name'],
                resource['type'],
                resource['state']
            ])
        
        # Create and add the EC2 instances summary table
        ec2_summary_table = Table(wrap_table_data(ec2_summary_data), colWidths=[1.59*inch, 3*inch, 1.5*inch, 1*inch])
        ec2_summary_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(ec2_summary_table)
    
    # Add RDS instances summary
    if rds_resources:
        elements.append(Spacer(1, 0.4*inch))
        elements.append(Paragraph("RDS Instances Covered in Report:", header_style))
        elements.append(Spacer(1, 0.2*inch))
        
        # Create a table for RDS instance summary
        rds_summary_data = [["Instance Name", "Type", "Status", "Engine"]]
        
        for resource in rds_resources:
            rds_summary_data.append([
                resource['id'],
                resource['type'],
                resource['state'],
                resource['engine']
            ])
        
        # Create and add the RDS instances summary table
        rds_summary_table = Table(wrap_table_data(rds_summary_data), colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        rds_summary_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(rds_summary_table)
    
    # Process each resource
    for resource in metrics_data:
        # Start a new page for each resource
        elements.append(PageBreak())
        
        service_type = resource['service_type']
        
        if service_type == 'EC2':
            # Add EC2 instance details
            elements.append(Paragraph(f"Host: {resource['name']}", header_style))
            elements.append(Spacer(1, 0.1*inch))
            
            # Host information
            host_info_data = [
                ["Instance ID", resource['id']],
                ["Type", resource['type']],
                ["Operating System", resource['platform']],
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
            
            # Check OS type
            os_type = resource['platform'].lower()
            
            # Process CPU metrics
            if 'cpu' in resource['metrics']:
                cpu_data = resource['metrics']['cpu']
                
                if cpu_data['timestamps']:
                    # CPU utilization title
                    elements.append(Paragraph("CPU UTILIZATION", label_style))
                    
                    # Add remarks about CPU utilization
                    avg_val = cpu_data['average']
                    
                    if avg_val > 85:
                        remarks = "Average utilisation is high. Explore possibility of optimising the resources."
                    else:
                        remarks = "Average utilisation is normal. No action needed at the time."
                    
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Add CPU utilization data
                    table_data = [
                        ["Average", f"{avg_val:.2f}%"]
                    ]
                    
                    util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                    util_table.setStyle(TableStyle([
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                        ('BACKGROUND', (0, 0), (0, -1), colors.white),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('PADDING', (0, 0), (-1, -1), 6)
                    ]))
                    
                    elements.append(util_table)
                    elements.append(Spacer(1, 0.2*inch))
                    
                    # Generate CPU chart
                    cpu_chart = create_chart(
                        cpu_data['timestamps'],
                        cpu_data['values'],
                        'CPU',
                        resource['name'],
                        cpu_data['average'],
                        cpu_data['min'],
                        cpu_data['max']
                    )
                    
                    if cpu_chart:
                        cpu_img = Image(io.BytesIO(cpu_chart), width=6*inch, height=2*inch)
                        elements.append(cpu_img)
                        elements.append(Spacer(1, 0.2*inch))
            
            # Process memory metrics
            if 'memory' in resource['metrics']:
                memory_data = resource['metrics']['memory']
                
                if memory_data['timestamps']:
                    # Memory utilization title
                    elements.append(Paragraph("MEMORY UTILIZATION", label_style))
                    
                    # Add remarks about memory utilization
                    avg_val = memory_data['average']
                    
                    if avg_val > 85:
                        remarks = "Average utilisation is high. Explore possibility of optimising the resources."
                    else:
                        remarks = "Average utilisation is normal. No action needed at the time."
                    
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Add memory utilization data
                    table_data = [
                        ["Average", f"{avg_val:.2f}%"]
                    ]
                    
                    util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                    util_table.setStyle(TableStyle([
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                        ('BACKGROUND', (0, 0), (0, -1), colors.white),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('PADDING', (0, 0), (-1, -1), 6)
                    ]))
                    
                    elements.append(util_table)
                    elements.append(Spacer(1, 0.2*inch))
                    
                    # Generate memory chart
                    memory_chart = create_chart(
                        memory_data['timestamps'],
                        memory_data['values'],
                        'Memory',
                        resource['name'],
                        memory_data['average'],
                        memory_data['min'],
                        memory_data['max']
                    )
                    
                    if memory_chart:
                        memory_img = Image(io.BytesIO(memory_chart), width=6*inch, height=2*inch)
                        elements.append(memory_img)
                        elements.append(Spacer(1, 0.2*inch))
            
            # Process disk metrics
            if os_type == 'windows':
                # Handle Windows disk metrics (C:, D:, E:)
                disk_keys = ['disk C', 'disk D', 'disk E']
                for disk_key in disk_keys:
                    if disk_key in resource['metrics']:
                        disk_data = resource['metrics'][disk_key]
                        
                        if disk_data['timestamps']:
                            # Disk utilization title - Windows shows free space %
                            elements.append(Paragraph(f"{disk_key.upper()} FREE PERCENTAGE", label_style))
                            
                            # Add remarks about disk utilization
                            avg_val = disk_data['average']
                            
                            if avg_val < 10:
                                remarks = "Average utilisation is high. Explore possibility of optimising the resources."
                            else:
                                remarks = "Average Disk utilisation is normal. No action needed at the time."
                            
                            elements.append(Spacer(1, 0.1*inch))
                            elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                            
                            # Add disk utilization data
                            table_data = [
                                ["Average", f"{avg_val:.2f}%"]
                            ]
                            
                            util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                            util_table.setStyle(TableStyle([
                                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                                ('BACKGROUND', (0, 0), (0, -1), colors.white),
                                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                ('PADDING', (0, 0), (-1, -1), 6)
                            ]))
                            
                            elements.append(util_table)
                            elements.append(Spacer(1, 0.2*inch))
                            
                            # Generate disk chart
                            disk_chart = create_chart(
                                disk_data['timestamps'],
                                disk_data['values'],
                                disk_key,
                                resource['name'],
                                disk_data['average'],
                                disk_data['min'],
                                disk_data['max']
                            )
                            
                            if disk_chart:
                                disk_img = Image(io.BytesIO(disk_chart), width=6*inch, height=2*inch)
                                elements.append(disk_img)
                                elements.append(Spacer(1, 0.2*inch))
            else:
                # Handle Linux disk metrics
                if 'disk' in resource['metrics']:
                    disk_data = resource['metrics']['disk']
                    
                    if disk_data['timestamps']:
                        # Disk utilization title - Linux shows usage %
                        elements.append(Paragraph("DISK UTILIZATION", label_style))
                        
                        # Add remarks about disk utilization
                        avg_val = disk_data['average']
                        
                        if 30 <= avg_val <= 60:
                            remarks = "Average Disk utilisation is Normal."
                        elif avg_val < 10:
                            remarks = "Average Disk utilisation is low. No action needed at the time."
                        else:
                            remarks = "Average utilisation is high. Explore possibility of optimising the resources."
                        
                        elements.append(Spacer(1, 0.1*inch))
                        elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                        
                        # Add disk utilization data
                        table_data = [
                            ["Average", f"{avg_val:.2f}%"]
                        ]
                        
                        util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                        util_table.setStyle(TableStyle([
                            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                            ('BACKGROUND', (0, 0), (0, -1), colors.white),
                            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                            ('PADDING', (0, 0), (-1, -1), 6)
                        ]))
                        
                        elements.append(util_table)
                        elements.append(Spacer(1, 0.2*inch))
                        
                        # Generate disk chart
                        disk_chart = create_chart(
                            disk_data['timestamps'],
                            disk_data['values'],
                            'Disk',
                            resource['name'],
                            disk_data['average'],
                            disk_data['min'],
                            disk_data['max']
                        )
                        
                        if disk_chart:
                            disk_img = Image(io.BytesIO(disk_chart), width=6*inch, height=2*inch)
                            elements.append(disk_img)
                            elements.append(Spacer(1, 0.2*inch))
        
        elif service_type == 'RDS':
            # Add RDS instance details
            elements.append(Paragraph(f"RDS Instance: {resource['name']}", header_style))
            elements.append(Spacer(1, 0.1*inch))
            
            # Instance information
            instance_info_data = [
                ["Instance ID", resource['id']],
                ["Type", resource['type']],
                ["Status", resource['state']],
                ["Engine", resource['engine']]
            ]
            
            instance_info_table = Table(wrap_table_data(instance_info_data), colWidths=[1.5*inch, 4*inch])
            instance_info_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('BACKGROUND', (0, 0), (0, -1), colors.white),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 6)
            ]))
            
            elements.append(instance_info_table)
            elements.append(Spacer(1, 0.3*inch))
            
            # Process CPU metrics
            if 'cpu' in resource['metrics']:
                cpu_data = resource['metrics']['cpu']
                
                if cpu_data['timestamps']:
                    # CPU utilization title
                    elements.append(Paragraph("CPU UTILIZATION", label_style))
                    
                    # Add remarks about CPU utilization
                    avg_val = cpu_data['average']
                    
                    if avg_val > 85:
                        remarks = "Average utilisation is high. Explore possibility of optimising the resources"
                    else:
                        remarks = "Average utilization is normal"
                    
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Add CPU utilization data
                    table_data = [
                        ["Average", f"{avg_val:.2f}%"]
                    ]
                    
                    util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                    util_table.setStyle(TableStyle([
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                        ('BACKGROUND', (0, 0), (0, -1), colors.white),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('PADDING', (0, 0), (-1, -1), 6)
                    ]))
                    
                    elements.append(util_table)
                    elements.append(Spacer(1, 0.2*inch))
                    
                    # Generate CPU chart
                    cpu_chart = create_chart(
                        cpu_data['timestamps'],
                        cpu_data['values'],
                        'CPU',
                        resource['name'],
                        cpu_data['average'],
                        cpu_data['min'],
                        cpu_data['max']
                    )
                    
                    if cpu_chart:
                        cpu_img = Image(io.BytesIO(cpu_chart), width=6*inch, height=2*inch)
                        elements.append(cpu_img)
                        elements.append(Spacer(1, 0.2*inch))
            
            # Process memory metrics
            if 'memory' in resource['metrics']:
                memory_data = resource['metrics']['memory']
                
                if memory_data['timestamps']:
                    # Memory utilization title
                    elements.append(Paragraph("AVAILABLE MEMORY (in GB)", label_style))
                    
                    # Add remarks about memory utilization
                    avg_val = memory_data['average']
                    
                    if avg_val < 10:
                        remarks = "Available memory is low. Recommend increasing resources"
                    else:
                        remarks = "Available memory capacity is sufficient"
                    
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Add memory utilization data
                    table_data = [
                        ["Average", f"{avg_val:.2f}"]
                    ]
                    
                    util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                    util_table.setStyle(TableStyle([
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                        ('BACKGROUND', (0, 0), (0, -1), colors.white),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('PADDING', (0, 0), (-1, -1), 6)
                    ]))
                    
                    elements.append(util_table)
                    elements.append(Spacer(1, 0.2*inch))
                    
                    # Generate memory chart
                    memory_chart = create_chart(
                        memory_data['timestamps'],
                        memory_data['values'],
                        'Available Memory (GB)',
                        resource['name'],
                        memory_data['average'],
                        memory_data['min'],
                        memory_data['max']
                    )
                    
                    if memory_chart:
                        memory_img = Image(io.BytesIO(memory_chart), width=6*inch, height=2*inch)
                        elements.append(memory_img)
                        elements.append(Spacer(1, 0.2*inch))
            
            # Process disk metrics
            if 'disk' in resource['metrics']:
                disk_data = resource['metrics']['disk']
                
                if disk_data['timestamps']:
                    # Disk utilization title
                    elements.append(Paragraph("AVAILABLE DISK (in GB)", label_style))
                    
                    # Add remarks about disk utilization
                    avg_val = disk_data['average']
                    
                    if avg_val < 10:
                        remarks = "Available disk space is low. Recommend increasing storage"
                    else:
                        remarks = "Available disk capacity is sufficient"
                    
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(f"Remarks: {remarks}", remark_style))
                    
                    # Add disk utilization data
                    table_data = [
                        ["Average", f"{avg_val:.2f}"]
                    ]
                    
                    util_table = Table(wrap_table_data(table_data), colWidths=[1.5*inch, 1*inch])
                    util_table.setStyle(TableStyle([
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                        ('BACKGROUND', (0, 0), (0, -1), colors.white),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('PADDING', (0, 0), (-1, -1), 6)
                    ]))
                    
                    elements.append(util_table)
                    elements.append(Spacer(1, 0.2*inch))
                    
                    # Generate disk chart
                    disk_chart = create_chart(
                        disk_data['timestamps'],
                        disk_data['values'],
                        'Available Disk (GB)',
                        resource['name'],
                        disk_data['average'],
                        disk_data['min'],
                        disk_data['max']
                    )
                    
                    if disk_chart:
                        disk_img = Image(io.BytesIO(disk_chart), width=6*inch, height=2*inch)
                        elements.append(disk_img)
                        elements.append(Spacer(1, 0.2*inch))
    
    # Build the PDF
    doc.build(elements, onFirstPage=lambda c, d: cover_page(c, d, account_name), onLaterPages=header_function)
    
    # Get the PDF data
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data