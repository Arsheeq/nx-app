import React from 'react';

interface LogoProps {
  height?: number;
  color?: 'white' | 'blue';
}

export const Logo: React.FC<LogoProps> = ({ height = 40, color = 'blue' }) => {
  const primaryColor = color === 'white' ? '#FFFFFF' : '#3DB3E3';
  const bgColor = color === 'white' ? '#3DB3E3' : '#FFFFFF';
  
  return (
    <svg 
      width={height} 
      height={height} 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`h-${height / 10}`}
    >
      <path 
        d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" 
        fill={bgColor}
      />
      <path 
        d="M28 14L12 26" 
        stroke={primaryColor} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <path 
        d="M12 14L28 26" 
        stroke={primaryColor} 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
};
