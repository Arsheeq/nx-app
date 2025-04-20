import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { SelectCloudProvider } from "@/components/steps/SelectCloudProvider";
import { SelectReportType } from "@/components/steps/SelectReportType";
import { SelectResources } from "@/components/steps/SelectResources";
import { EnterCredentials } from "@/components/steps/EnterCredentials";
import { YearMonthSelection } from "@/components/steps/YearMonthSelection";
import { FrequencySelection } from "@/components/steps/FrequencySelection";
import { GenerateReport } from "@/components/steps/GenerateReport";
import { getSteps } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function StepContent() {
  const {
    currentStep,
    nextStep,
    prevStep,
    reportType,
    selectedProvider,
    credentials,
    selectedResources,
    selectAllResources,
    setSelectAllResources,
    canProceed,
  } = useStore();
  const { toast } = useToast();

  const handleNext = () => {
    if (!canProceed()) {
      toast({
        title: "Required information missing",
        description: "Please complete all required fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    nextStep();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <SelectCloudProvider />;
      case 2:
        return <SelectReportType />;
      case 3:
        if (reportType === "billing") {
          return <YearMonthSelection />;
        } else if (!credentials) {
          return <EnterCredentials />;
        } else {
          return (
            <SelectResources
              selectAllResources={selectAllResources}
              setSelectAllResources={setSelectAllResources}
            />
          );
        }
      case 4:
        if (reportType === "billing") {
          return <EnterCredentials />;
        } else {
          if (selectedResources.length === 0) {
            return (
              <SelectResources
                selectAllResources={selectAllResources}
                setSelectAllResources={setSelectAllResources}
              />
            );
          } else {
            return <FrequencySelection />;
          }
        }
      case 5:
        return <GenerateReport />;
      default:
        return <SelectCloudProvider />;
    }
  };

  const isEnterCredentialsStep =
    (currentStep === 3 && !credentials && reportType !== "billing") ||
    (currentStep === 4 && reportType === "billing");

  return (
    <div className="space-y-6">
      {renderStepContent()}

      {/* Navigation Buttons */}
      {!isEnterCredentialsStep && (
        <div className="flex justify-between mt-10">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="nav-button"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentStep === getSteps(reportType).length}
            className="nav-button"
          >
            {currentStep === getSteps(reportType).length - 1 ? "Generate" : "Next"}
          </Button>
        </div>
      )}

      {/* Previous button only for EnterCredentials step */}
      {isEnterCredentialsStep && (
        <div className="flex justify-start mt-10">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="nav-button"
          >
            Previous
          </Button>
        </div>
      )}
    </div>
  );
}