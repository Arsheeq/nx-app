
import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/lib/store';
import { getStatusColor, getStateDisplayText } from '@/lib/utils';

export const ResourceTable: React.FC = () => {
  const { resources, selectedResources, toggleResourceSelection } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'EC2' | 'RDS'>('EC2');
  
  const filteredResources = resources.filter(resource => {
    const matchesType = resource.type === activeTab;
    const matchesQuery = searchQuery === '' || 
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      resource.resourceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.region.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesQuery;
  });

  const handleSelectAll = (checked: boolean) => {
    const idsToUpdate = filteredResources.map(r => r.resourceId);
    
    if (checked) {
      const currentSelected = new Set(selectedResources);
      idsToUpdate.forEach(id => currentSelected.add(id));
      useStore.getState().setSelectedResources(Array.from(currentSelected));
    } else {
      const newSelected = selectedResources.filter(id => !idsToUpdate.includes(id));
      useStore.getState().setSelectedResources(newSelected);
    }
  };

  const allSelected = filteredResources.length > 0 && 
    filteredResources.every(resource => selectedResources.includes(resource.resourceId));

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="EC2" className="w-full" onValueChange={(value) => setActiveTab(value as 'EC2' | 'RDS')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="EC2" className="flex items-center gap-2 data-[state=active]:bg-blue-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            EC2 Instances
          </TabsTrigger>
          <TabsTrigger value="RDS" className="flex items-center gap-2 data-[state=active]:bg-blue-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            RDS Instances
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="relative mb-6">
            <Input
              type="text"
              placeholder="Search instances..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-3 text-sm font-medium grid grid-cols-12 gap-4">
              <div className="col-span-1">
                <Checkbox 
                  className="transition-transform hover:scale-110" 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="col-span-3">Instance ID</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Region</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2">State</div>
            </div>

            {filteredResources.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground">
                No {activeTab} instances found. {searchQuery && 'Try a different search term.'}
              </div>
            ) : (
              filteredResources.map((resource) => (
                <div 
                  key={resource.resourceId}
                  className="px-4 py-3 border-t grid grid-cols-12 gap-4 items-center hover:bg-blue-50/50 transition-all cursor-pointer group"
                  onClick={() => toggleResourceSelection(resource.resourceId)}
                >
                  <div className="col-span-1">
                    <Checkbox 
                      checked={selectedResources.includes(resource.resourceId)}
                      onCheckedChange={() => toggleResourceSelection(resource.resourceId)}
                      className="transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="col-span-3 font-mono text-sm">
                    {resource.resourceId}
                  </div>
                  <div className="col-span-3">
                    {resource.name || 'Unnamed'}
                  </div>
                  <div className="col-span-2">{resource.region}</div>
                  <div className="col-span-1">{resource.type}</div>
                  <div className="col-span-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resource.state)}`}>
                      {getStateDisplayText(resource.state)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">1-{filteredResources.length}</span> of <span className="font-medium">{filteredResources.length}</span> instances
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
};
