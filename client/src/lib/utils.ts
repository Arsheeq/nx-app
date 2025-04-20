import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatResourceName(resourceId: string, resourceName?: string): string {
  if (resourceName && resourceName.trim() !== '') {
    return resourceName;
  }
  return resourceId.split('/').pop() || resourceId;
}

export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  
  if (['running', 'available', 'active', 'online'].includes(statusLower)) {
    return 'bg-green-100 text-green-800';
  }
  
  if (['stopped', 'stopping', 'terminated', 'offline'].includes(statusLower)) {
    return 'bg-red-100 text-red-800';
  }
  
  if (['pending', 'starting', 'provisioning', 'updating'].includes(statusLower)) {
    return 'bg-yellow-100 text-yellow-800';
  }
  
  return 'bg-gray-100 text-gray-800';
}

export function getStateDisplayText(state: string): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function getMonthName(month: number): string {
  const date = new Date();
  date.setMonth(month - 1);
  return date.toLocaleString('default', { month: 'long' });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function formatResourceId(resourceId: string): string {
  if (!resourceId) return '';
  // For AWS IDs, keep them as is
  if (resourceId.startsWith('i-') || resourceId.startsWith('db-')) {
    return resourceId;
  }
  // For longer IDs (like Azure resource IDs), extract just the name
  const parts = resourceId.split('/');
  return parts[parts.length - 1];
}

export function getResourceIcon(type: string): string {
  switch (type.toUpperCase()) {
    case 'EC2':
      return 'server';
    case 'RDS':
      return 'database';
    case 'VM':
      return 'server';
    case 'DATABASE':
      return 'database';
    default:
      return 'cloud';
  }
}
