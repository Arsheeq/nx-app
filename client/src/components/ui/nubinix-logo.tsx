
import React from 'react';

interface NubinixLogoProps {
  height?: number;
  className?: string;
}

export const NubinixLogo: React.FC<NubinixLogoProps> = ({ height = 40, className }) => {
  return (
    <div style={{ height: height }} className={className}>
      <img 
        src="/nubinix-icon.png" 
        alt="Nubinix Logo"
        style={{ height: '100%', width: 'auto' }}
      />
    </div>
  );
};
