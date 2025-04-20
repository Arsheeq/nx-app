
import React from 'react';
import { NubinixLogo } from './ui/nubinix-logo';

export const Header: React.FC = () => {
  return (
    <header className="border-b py-4 px-6 flex items-center justify-between bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <NubinixLogo height={40} />
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent">
          Cloud Insights
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://www.nubinix.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium bg-gradient-to-r from-[#3DB3E3] via-[#6866C1] to-[#E865A0] bg-clip-text text-transparent drop-shadow-md"
        >
          www.nubinix.com
        </a>
      </div>
    </header>
  );
};
