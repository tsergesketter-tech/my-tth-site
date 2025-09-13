import React from 'react';
import SearchBar from './SearchBar';

const Hero = () => {
  return (
    <section
      id="hero-section"
      className="relative w-full bg-cover bg-center evergage-hero-section"
      style={{ 
        backgroundImage: "url('/images/santorini.jpg')",
        height: '600px'
      }}
    >
      {/* Background overlay - can be targeted by Evergage */}
      <div id="hero-background-overlay" className="absolute inset-0 bg-black bg-opacity-30" />

      {/* Main content area - Evergage can inject here */}
      <div id="hero-content" className="relative z-10 flex flex-col justify-center items-start h-full px-8 max-w-screen-xl mx-auto text-white">
        {/* Hero text content - Evergage targeting zone */}
        <div id="hero-text-content" className="evergage-hero-text">
          <h1 id="hero-title" className="text-4xl md:text-6xl font-bold mb-4">
            Save 10% on Select Stays with Palonia
          </h1>
          <p id="hero-subtitle" className="text-lg md:text-xl mb-6">
            Stay 2+ nights and earn & redeem points on select rooms.
          </p>
          <button id="hero-cta" className="bg-white text-black font-semibold px-6 py-3 rounded hover:bg-gray-100 mb-8">
            Browse Rooms
          </button>
        </div>

        {/* Search bar area - protected from Evergage injection */}
        <div id="hero-search-area" className="w-full">
          <SearchBar />
        </div>
      </div>

      {/* Evergage injection zone for full hero replacement */}
      <div id="evergage-hero-zone" className="evergage-zone" style={{ display: 'none' }}></div>
    </section>
  );
};

export default Hero;