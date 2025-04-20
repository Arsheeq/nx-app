import React from 'react';
import Button from './Button'; // Assuming a Button component exists

function CloudProviderCard({ cloudProvider, isSelected, onSelect, nextStep }) {
  return (
    <div className="flex flex-col items-center max-w-[800px] mx-auto mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {cloudProvider && cloudProvider.map((provider) => (
          <div key={provider.id} className="border rounded-lg p-4 shadow-md cursor-pointer" onClick={() => onSelect(provider.id)}>
            <h3 className="text-xl font-medium">{provider.name}</h3>
            <p>{provider.description}</p>
            {isSelected && isSelected.includes(provider.id) && (
              <div className="flex justify-center mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      {cloudProvider && (
        <Button 
          className="mt-8 bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] text-white opacity-90 hover:opacity-100"
          onClick={nextStep}
        >
          Next
        </Button>
      )}
    </div>
  );
}

export default CloudProviderCard;