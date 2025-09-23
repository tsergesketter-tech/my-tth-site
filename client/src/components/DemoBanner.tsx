import React from 'react';

const DemoBanner: React.FC = () => {
  return (
    <div className="bg-orange-500 text-white text-center py-2 px-4 text-sm font-medium sticky top-0 z-50">
      🚀 This is a Salesforce demo site - Not a real travel booking platform
    </div>
  );
};

export default DemoBanner;