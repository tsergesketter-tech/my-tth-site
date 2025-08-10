import React from 'react';

const SearchBar = () => {
  return (
    <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-4 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
      <input
        type="text"
        placeholder="Where can we take you?"
        className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="date"
        className="px-4 py-3 border border-gray-300 rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="date"
        className="px-4 py-3 border border-gray-300 rounded-md text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800">
        Find Homes
      </button>
    </div>
  );
};

export default SearchBar;
