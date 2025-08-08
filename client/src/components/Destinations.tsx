import React from "react";

const destinations = [
  {
    title: "Washington, District of Columbia",
    image: "/images/dc.jpg",
  },
  {
    title: "Seattle, Washington",
    image: "/images/seattle.jpg",
  },
  {
    title: "SpringHill Suites Anaheim Maingate",
    subtitle: "Anaheim, California",
    image: "/images/anaheim.jpg",
  },
  {
    title: "Marriott Marquis Houston",
    subtitle: "Houston, Texas",
    image: "/images/houston.jpg",
  },
  {
    title: "The St. Regis Bal Harbour Resort",
    subtitle: "Miami Beach, Florida",
    image: "/images/miami.jpg",
  },
];

export default function Destinations() {
  return (
    <section className="bg-gray-900 text-white px-6 py-12">
      <h2 className="text-3xl font-semibold mb-4">Your Next Trip Starts Here</h2>

      {/* Tab Row (Visual only for now) */}
      <div className="flex space-x-6 border-b border-gray-700 mb-8">
        {["Family", "Beach", "Outdoor", "Culture"].map((tab, index) => (
          <button
            key={index}
            className={`pb-2 text-sm ${
              index === 0 ? "border-b-2 border-white font-semibold" : "text-gray-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {destinations.map((dest, index) => (
          <div
            key={index}
            className="relative h-64 rounded-xl overflow-hidden group shadow-lg"
            style={{ backgroundImage: `url(${dest.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

            {/* Text Content */}
            <div className="absolute bottom-4 left-4 right-4 text-white z-10">
              {dest.subtitle && (
                <div className="text-xs uppercase tracking-wider opacity-75">{dest.subtitle}</div>
              )}
              <div className="text-lg font-semibold flex justify-between items-center">
                {dest.title}
                <span className="text-xl ml-2 group-hover:translate-x-1 transition-transform">›</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
