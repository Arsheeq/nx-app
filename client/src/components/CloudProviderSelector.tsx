import React from "react";
import Button from "./Button"; // Assuming a Button component exists

function CloudProviderCard({ cloudProvider, isSelected, onSelect, nextStep }) {
  return (
    <div className="flex flex-col items-center max-w-[800px] mx-auto mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {cloudProvider &&
          cloudProvider.map((provider) => (
            <div
              key={provider.id}
              className="border rounded-lg p-4 shadow-md cursor-pointer"
              onClick={() => onSelect(provider.id)}
            >
              <h3 className="text-xl font-medium">{provider.name}</h3>
              <p>{provider.description}</p>
              {isSelected && isSelected.includes(provider.id) && (
                <div className="flex justify-center mt-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
      </div>
      <div className="flex justify-between items-center mt-8">
        <div className="text-gray-500 cursor-pointer">Previous</div>
        {cloudProvider && (
          <Button 
            className="bg-[#0A0F1C] text-white px-6 py-2 rounded"
            onClick={nextStep}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export default CloudProviderCard;