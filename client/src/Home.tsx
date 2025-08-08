import React from "react";

export default function Home() {
  return (
    <div className="relative h-screen text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/hero.jpg')" }}
      ></div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* Search box */}
        <div className="bg-white text-black rounded-xl shadow-lg p-4 flex flex-col md:flex-row items-center gap-4 w-full max-w-4xl mb-10">
          <input
            type="text"
            placeholder="Where can we take you?"
            className="border border-gray-300 rounded-md px-4 py-2 w-full md:w-1/3"
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-4 py-2 w-full md:w-1/4"
          />
          <input
            type="date"
            className="border border-gray-300 rounded-md px-4 py-2 w-full md:w-1/4"
          />
          <button className="bg-black text-white rounded-md px-6 py-2 w-full md:w-auto hover:bg-gray-800">
            🔍 Find Homes
          </button>
        </div>

        {/* Headline & CTA */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Save 10% on Select Home Rentals
          </h1>
          <p className="text-lg md:text-xl mb-6">
            Stay 2+ nights and earn & redeem points on select homes.
          </p>
          <button className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition">
            Browse Homes
          </button>
        </div>
      </div>
    </div>
  );
}