import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useStore, ReportType } from "@/lib/store";

interface ReportTypeCardProps {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  isSelected: boolean;
  onSelect: () => void;
}

export const ReportTypeCard: React.FC<ReportTypeCardProps> = ({
  type,
  title,
  description,
  icon,
  features,
  isSelected,
  onSelect,
}) => {
  return (
    <Card 
      className={`p-6 flex flex-col items-center hover:shadow-md cursor-pointer transition ${isSelected ? "" : "opacity-75"}`} 
      onClick={onSelect}
    >
      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center mb-4">{description}</p>
      <ul className="text-sm text-gray-600 space-y-2 mb-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            {feature}
          </li>
        ))}
      </ul>
      <div className="w-full mt-auto">
        <Button 
          className={`w-full ${
            isSelected 
              ? "bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90 hover:opacity-100" 
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={onSelect}
        >
          {`Select ${title}`}
        </Button>
      </div>
    </Card>
  );
};

export const ReportTypeSelector: React.FC = () => {
  const { reportType, setReportType, nextStep } = useStore();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
      <ReportTypeCard
        type="utilization"
        title="Utilization Report"
        description="Track resource performance metrics across your cloud infrastructure"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#3DB3E3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        features={[
          "CPU, Memory & Storage metrics",
          "Daily or weekly frequency",
          "Performance optimization insights"
        ]}
        isSelected={reportType === "utilization"}
        onSelect={() => {
          console.log("Selecting utilization report type");
          setReportType("utilization");
          nextStep();
        }}
      />
      
      <ReportTypeCard
        type="billing"
        title="Billing Report"
        description="Monthly cost analysis of your cloud resources"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#6866C1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        features={[
          "Monthly billing breakdown",
          "Service-level cost analysis",
          "Cost saving recommendations"
        ]}
        isSelected={reportType === "billing"}
        onSelect={() => {
          console.log("Selecting billing report type");
          setReportType("billing");
          nextStep();
        }}
      />
    </div>
  );
};
