
import React from 'react';

interface NubinixLogoProps {
  height?: number;
  className?: string;
}

export const NubinixLogo: React.FC<NubinixLogoProps> = ({ height = 400, className }) => {
  return (
    <div style={{ height: height }} className={className}>
      <img 
        src="/nubinix-logo.png" 
        alt="Nubinix Logo"
        style={{ height: '120%', width: 'auto' }}
      />
    </div>
  );
};
