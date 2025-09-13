// src/pages/DestinationType.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type TravelType = {
  id: string;
  name: string;
  description: string;
  image: string;
  heroImage: string; // For hero background personalization
  keywords: string[];
};

const travelTypes: TravelType[] = [
  {
    id: 'beach',
    name: 'Beach & Coastal',
    description: 'Tropical beaches, coastal resorts, and oceanfront escapes',
    image: '/images/beach-resort.jpg',
    heroImage: '/images/maldives-beach.jpg',
    keywords: ['beach', 'ocean', 'tropical', 'resort', 'coastal']
  },
  {
    id: 'mountain',
    name: 'Mountain & Ski',
    description: 'Mountain lodges, ski resorts, and alpine adventures',
    image: '/images/mountain-lodge.jpg', 
    heroImage: '/images/winter-resort.jpg',
    keywords: ['mountain', 'ski', 'alpine', 'lodge', 'winter']
  },
  {
    id: 'city',
    name: 'City & Urban',
    description: 'Downtown hotels, city breaks, and urban exploration',
    image: '/images/city-hotel.jpg',
    heroImage: '/images/urban-skyline.jpg', 
    keywords: ['city', 'urban', 'downtown', 'business', 'cultural']
  },
  {
    id: 'adventure',
    name: 'Adventure & Nature',
    description: 'National parks, eco-lodges, and outdoor adventures',
    image: '/images/nature-lodge.jpg',
    heroImage: '/images/forest-cabin.jpg',
    keywords: ['adventure', 'nature', 'outdoor', 'hiking', 'eco']
  },
  {
    id: 'luxury',
    name: 'Luxury & Spa',
    description: 'Premium resorts, spa retreats, and luxury experiences',
    image: '/images/luxury-spa.jpg',
    heroImage: '/images/luxury-resort.jpg',
    keywords: ['luxury', 'spa', 'premium', 'exclusive', 'wellness']
  },
  {
    id: 'cultural',
    name: 'Cultural & Historic',
    description: 'Historic hotels, cultural sites, and heritage destinations',
    image: '/images/historic-hotel.jpg', 
    heroImage: '/images/cultural-city.jpg',
    keywords: ['cultural', 'historic', 'heritage', 'museum', 'traditional']
  }
];

export default function DestinationType() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTypeSelection = async (travelType: TravelType) => {
    setSelectedType(travelType.id);
    setLoading(true);

    try {
      // Send preference data to MCP/Evergage
      if (window.SalesforceInteractions || window.Evergage) {
        const SDK = window.SalesforceInteractions || window.Evergage;
        
        console.log('🎯 Sending travel preference to Evergage:', {
          travelType: travelType.id,
          name: travelType.name,
          heroImage: travelType.heroImage
        });
        
        // Send event with user attributes - this is the correct way
        SDK.sendEvent({
          interaction: {
            name: 'selectTravelPreference',
            travelType: travelType.id,
            travelTypeName: travelType.name,
            preferredKeywords: travelType.keywords,
            heroImage: travelType.heroImage,
            timestamp: new Date().toISOString()
          },
          user: {
            attributes: {
              travelPreference: travelType.id,
              preferredHeroImage: travelType.heroImage,
              travelKeywords: travelType.keywords.join(','),
              preferenceUpdatedAt: new Date().toISOString()
            }
          }
        });

        // Alternative method - set user identity with attributes
        SDK.setUserIdentity({
          attributes: {
            travelPreference: travelType.id,
            preferredHeroImage: travelType.heroImage,
            travelKeywords: travelType.keywords.join(',')
          }
        });

        console.log('✅ Travel preference data sent to Evergage');
      } else {
        console.warn('⚠️ Evergage SDK not found - preference not sent');
      }

      // Store in localStorage as backup
      localStorage.setItem('travelPreference', JSON.stringify({
        type: travelType.id,
        name: travelType.name,
        heroImage: travelType.heroImage,
        keywords: travelType.keywords,
        selectedAt: new Date().toISOString()
      }));

      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to home with personalized experience
      navigate('/?preference=' + travelType.id);
      
    } catch (error) {
      console.error('Error saving travel preference:', error);
      // Still navigate on error
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              What type of travel experience interests you most?
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Help us personalize your experience by selecting your preferred travel style. 
              We'll show you the most relevant destinations and offers.
            </p>
          </div>
        </div>
      </div>

      {/* Travel Type Grid */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {travelTypes.map((type) => (
            <div
              key={type.id}
              className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                selectedType === type.id ? 'ring-4 ring-indigo-500' : ''
              } ${loading && selectedType === type.id ? 'opacity-75' : ''}`}
              onClick={() => !loading && handleTypeSelection(type)}
            >
              {/* Image */}
              <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={type.image}
                  alt={type.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    // Fallback to a default image if type-specific image fails
                    e.currentTarget.src = '/images/santorini.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all duration-300" />
                
                {/* Loading overlay */}
                {loading && selectedType === type.id && (
                  <div className="absolute inset-0 bg-indigo-600 bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-2">{type.name}</h3>
                <p className="text-sm opacity-90">{type.description}</p>
                
                {/* Selection indicator */}
                {selectedType === type.id && (
                  <div className="absolute top-4 right-4 bg-indigo-500 text-white rounded-full p-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-indigo-400 transition-colors duration-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Skip option */}
      <div className="text-center pb-8">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-700 underline"
          disabled={loading}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// Declare global types for TypeScript
declare global {
  interface Window {
    SalesforceInteractions?: any;
    Evergage?: any;
  }
}