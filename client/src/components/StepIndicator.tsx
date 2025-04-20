
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { getSteps } from "@/lib/store";
import { CheckIcon } from "lucide-react";

export function StepIndicator() {
  const { currentStep, reportType } = useStore();
  const steps = getSteps(reportType);

  return (
    <div className="relative flex w-full justify-between">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={step.id} className="relative flex flex-col items-center">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                isActive && "border-none bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white",
                isCompleted ? "border-none bg-green-500 text-white" : "border-gray-300 bg-white"
              )}
            >
              {isCompleted ? (
                <CheckIcon className="h-5 w-5" />
              ) : (
                <span className="font-semibold">{stepNumber}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-[calc(60%+60px)] h-[2px] w-[calc(100%)] top-5",
                  isCompleted ? "bg-green-500" : "bg-gray-200"
                )}
              />
            )}
            <span
              className={cn(
                "absolute top-12 whitespace-nowrap text-sm font-medium",
                isActive && "text-primary"
              )}
            >
              {step.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
