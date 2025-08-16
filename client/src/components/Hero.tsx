import React from 'react';
import SearchBar from './SearchBar';

const Hero = () => {
  return (
    <section
      className="relative w-full h-[600px] bg-cover bg-center"
      style={{ backgroundImage: "url('/images/santorini.jpg')" }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-30" />

      <div className="relative z-10 flex flex-col justify-center items-start h-full px-8 max-w-screen-xl mx-auto text-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Save 10% on Select Stays with Palonia
        </h1>
        <p className="text-lg md:text-xl mb-6">
          Stay 2+ nights and earn & redeem points on select rooms.
        </p>
        <button className="bg-white text-black font-semibold px-6 py-3 rounded hover:bg-gray-100 mb-8">
          Browse Rooms
        </button>

        {/* Embed SearchBar in the flow */}
        <SearchBar />
      </div>
    </section>
  );
};

export default Hero;