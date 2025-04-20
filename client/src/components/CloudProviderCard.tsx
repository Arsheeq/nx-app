import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore, CloudProvider } from "@/lib/store";
import AWSLogo from "@/assets/logos/aws.svg"; // Import AWS logo
import AzureLogo from "@/assets/logos/azure.svg"; // Import Azure logo
import Image from "next/image"; // Import Image component

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
      <Image src={AzureLogo} alt="Azure Logo" width={80} height={80} /> // Use Azure logo
    ) : (
      <Image src={AWSLogo} alt="AWS Logo" width={80} height={80} /> // Use AWS logo
    );

  return (
    <Card
      className={`p-6 flex flex-col items-center transition cursor-pointer relative group ${
        isSelected ? "border-blue-400" : "border-gray-200"
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute top-4 right-4">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-blue-500"
            fill="currentColor"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
      )}
      <div className="h-20 mb-4 logo-bounce">
        <Logo />
      </div>
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center mb-4">{description}</p>
    </Card>
  );
};

export const CloudProviderSelector: React.FC = () => {
  const { cloudProvider, setCloudProvider } = useStore();

  return (
    <div className="flex flex-col items-center max-w-[800px] mx-auto mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <CloudProviderCard
          provider="AWS"
          title="Amazon Web Services"
          description="Generate reports for EC2 & RDS resources"
          isSelected={cloudProvider === "AWS"}
          onSelect={() => {
            console.log("Selecting AWS provider");
            setCloudProvider("AWS");
          }}
        />

        <CloudProviderCard
          provider="Azure"
          title="Microsoft Azure"
          description="Generate reports for VMs & Database resources"
          isSelected={cloudProvider === "Azure"}
          onSelect={() => {
            console.log("Selecting Azure provider");
            setCloudProvider("Azure");
          }}
        />
      </div>
      {cloudProvider && (
        <Button
          className="mt-8 bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90 hover:opacity-100"
          onClick={() => useStore.getState().nextStep()}
        >
          Next
        </Button>
      )}
    </div>
  );
};
