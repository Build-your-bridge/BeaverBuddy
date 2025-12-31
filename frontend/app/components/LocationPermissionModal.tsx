'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LocationPermissionModalProps {
  onClose: (success: boolean) => void;
}

export default function LocationPermissionModal({ onClose }: LocationPermissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAllow = async () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Location services not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get city and province
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
          const province = data.address?.state || data.address?.province || 'Unknown';
          
          // Save to localStorage
          localStorage.setItem('userLocation', JSON.stringify({
            latitude,
            longitude,
            city,
            province
          }));
          
          console.log('📍 Location saved:', { city, province });
          setLoading(false);
          onClose(true);
        } catch (err) {
          // If geocoding fails, still save coordinates
          localStorage.setItem('userLocation', JSON.stringify({
            latitude,
            longitude
          }));
          
          setLoading(false);
          onClose(true);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setError('Unable to get your location. Please check your browser permissions.');
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSkip = () => {
    // Save a flag that user skipped location
    localStorage.setItem('userLocation', JSON.stringify({ skipped: true }));
    console.log('📍 Location skipped by user');
    onClose(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="relative w-full max-w-md"
        style={{
          background: 'linear-gradient(135deg, #E8D4C0 0%, #F5E6D3 100%)',
          borderRadius: '32px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: '3px solid rgba(255, 255, 255, 0.5)'
        }}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 mb-4">
            Enable Location
          </h2>
          <p className="text-gray-700 mb-4">
            Help us track your location to enhance your experience and provide location-based recommendations.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="w-full py-3 px-4 bg-[#CE5C5C] text-white font-bold rounded-lg hover:bg-[#B84A4A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'ENABLING...' : 'ENABLE LOCATION'}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full py-3 px-4 bg-gray-300 text-gray-900 font-bold rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SKIP FOR NOW
          </button>
        </div>
      </div>
    </div>
  );
}
