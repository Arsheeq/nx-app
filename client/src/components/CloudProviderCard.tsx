
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore, CloudProvider } from "@/lib/store";
import AWSLogo from "@/assets/logos/aws.svg";
import AzureLogo from "@/assets/logos/azure.svg";

interface CloudProviderCardProps {
  provider: CloudProvider;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

export const CloudProviderCard: React.FC<CloudProviderCardProps> = ({
  provider,
  title,
  description,
  isSelected,
  onSelect,
}) => {
  const Logo = () =>
    provider === "Azure" ? (
      <img src={AzureLogo} alt="Azure Logo" width={80} height={80} />
    ) : (
      <img src={AWSLogo} alt="AWS Logo" width={80} height={80} />
    );

  return (
    <Card
      className={`p-6 flex flex-col items-center transition cursor-pointer relative group ${
        isSelected ? "border-2 border-black" : "border-grey-200"
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute top-4 right-4">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-black"
            fill="currentColor"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
      )}
      <div className="h-20 mb-4 group">
        <div className="logo-bounce">
          <Logo />
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </Card>
  );
};

export const CloudProviderSelector: React.FC = () => {
  const { cloudProvider, setCloudProvider } = useStore();

  return (
    <div className="flex flex-col max-w-[800px] mx-auto mt-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent inline-block">
          Select Cloud Provider
        </h2>
        <p className="text-gray-500 mt-2">
          Choose the cloud provider you want to generate reports for
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <CloudProviderCard
          provider="AWS"
          title="Amazon Web Services"
          description="AWS Cloud Platform"
          isSelected={cloudProvider === "AWS"}
          onSelect={() => setCloudProvider("AWS")}
        />

        <CloudProviderCard
          provider="Azure"
          title="Microsoft Azure"
          description="Azure Cloud Platform"
          isSelected={cloudProvider === "Azure"}
          onSelect={() => setCloudProvider("Azure")}
        />
      </div>

      {cloudProvider && (
        <div className="flex justify-end mt-8">
          <Button
            className="button-bubble"
            onClick={() => useStore.getState().nextStep()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
