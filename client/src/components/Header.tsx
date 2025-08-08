import React from "react";

export default function Header() {
  return (
    <header className="w-full bg-white text-black shadow-md px-6 py-4 flex justify-between items-center">
      {/* Left: Logo */}
      <div className="font-bold text-xl tracking-wide">
        MyTravelSite
      </div>

      {/* Center: Nav Links */}
      <nav className="hidden md:flex space-x-6 text-sm font-medium">
        <a href="#" className="hover:text-blue-600">Book</a>
        <a href="#" className="hover:text-blue-600">Offers</a>
        <a href="#" className="hover:text-blue-600">Brands</a>
        <a href="#" className="hover:text-blue-600">Credit Cards</a>
        <a href="#" className="hover:text-blue-600">Meetings</a>
        <a href="#" className="hover:text-blue-600">Events</a>
      </nav>

      {/* Right: Utility */}
      <div className="hidden md:flex space-x-4 text-sm items-center">
        <a href="#" className="hover:text-blue-600">Help</a>
        <a href="#" className="hover:text-blue-600">English</a>
        <a href="#" className="hover:text-blue-600">Sign In</a>
      </div>
    </header>
  );
}
