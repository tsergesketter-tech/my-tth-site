import React from 'react';
import SearchBar from './SearchBar';

const Hero = () => {
  // Handle background image updates from Evergage
  const handleEvergageBackgroundUpdate = (imageUrl: string) => {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      heroSection.style.backgroundImage = `url('${imageUrl}')`;
    }
  };

  // Expose function globally for Evergage to call
  React.useEffect(() => {
    (window as any).updateHeroBackground = handleEvergageBackgroundUpdate;
    return () => {
      delete (window as any).updateHeroBackground;
    };
  }, []);

  return (
    <section
      id="hero-section"
      className="relative w-full bg-cover bg-center evergage-hero-section"
      style={{
        backgroundImage: "url('/images/santorini.jpg')",
        height: '600px'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30" />

      {/* Main content container */}
      <div className="relative z-10 flex flex-col justify-center items-start h-full px-8 max-w-screen-xl mx-auto text-white">

        {/* Personalizable text zone - Evergage can replace this entire div */}
        <div
          id="hero-personalizable-zone"
          className="evergage-personalizable-zone mb-8"
          data-evergage-zone="hero-text"
        >
          {/* Default content - will be replaced by Evergage */}
          <div id="hero-default-content">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Save 10% on Select Stays with Palonia
            </h1>
            <p className="text-lg md:text-xl mb-6">
              Stay 2+ nights and earn & redeem points on select rooms.
            </p>
            <button className="bg-white text-black font-semibold px-6 py-3 rounded hover:bg-gray-100">
              Browse Rooms
            </button>
          </div>
        </div>

        {/* Protected SearchBar area - Evergage should NOT touch this */}
        <div
          id="hero-search-protected"
          className="w-full evergage-protected-zone"
          data-evergage-protected="true"
        >
          <SearchBar />
        </div>
      </div>

      {/* Evergage injection point for custom content */}
      <div
        id="evergage-custom-content"
        className="evergage-zone"
        style={{ display: 'none' }}
      ></div>
    </section>
  );
};

export default Hero;