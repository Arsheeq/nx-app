import React from 'react';
import { NubinixLogo } from './ui/nubinix-logo';

export const Header: React.FC = () => {
  return (
    <header className="border-b bg-white py-3 px-6">
      <div className="flex items-center justify-between max-w-[1000px] mx-auto">
        <div className="flex items-center gap-3">
          <NubinixLogo height={40} /> {/* Using original NubinixLogo component */}
          <span className="text-lg font-medium text-gray-800">Cloud Insights</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://www.nubinix.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gradient"
          >
            www.nubinix.com
          </a>
        </div>
      </div>
    </header>
  );
};