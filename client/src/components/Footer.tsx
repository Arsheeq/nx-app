import React from 'react';
import { NubinixLogo } from './ui/nubinix-logo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t py-4 px-6 bg-gradient-to-t from-black to-transparent mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <NubinixLogo height={24} />
          <span className="text-sm text-white">
            © {new Date().getFullYear()} Nubinix Cloud Insights. All rights reserved.
          </span>
        </div>
        <div className="flex gap-6">
          <a
            href="https://nubinix.com/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:text-gray-300"
          >
            Privacy Policy
          </a>
          <a
            href="https://nubinix.com/terms-of-use/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:text-gray-300"
          >
            Terms of Service
          </a>
          <a
            href="https://nubinix.com/contact-us/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:text-gray-300"
          >
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  );
};
