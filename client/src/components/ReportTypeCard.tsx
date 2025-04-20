import React from "react";
import { Card } from "@/components/ui/card";
import { useStore, ReportType } from "@/lib/store";
import { BarChart3, Receipt } from "lucide-react";

export const ReportTypeSelector: React.FC = () => {
  const { reportType, setReportType } = useStore();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <Card
        className={`p-6 cursor-pointer hover:shadow-lg hover:scale-105 hover:border-primary/50 transition-all duration-300 ${
          reportType === "utilization" ? "selected-card" : ""
        }`}
        onClick={() => setReportType("utilization")}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 transform transition-transform duration-300">
            <BarChart3 className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Utilization Report</h3>
          <p className="text-gray-500">
            Resource usage metrics and optimization recommendations
          </p>
        </div>
      </Card>

      <Card
        className={`p-6 cursor-pointer hover:shadow-lg hover:scale-105 hover:border-primary/50 transition-all duration-300 ${
          reportType === "billing" ? "selected-card" : ""
        }`}
        onClick={() => setReportType("billing")}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 transform transition-transform duration-300">
            <Receipt className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Billing Report</h3>
          <p className="text-gray-500">
            Detailed cost breakdown and spending analytics
          </p>
        </div>
      </Card>
    </div>
  );
};