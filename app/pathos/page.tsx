'use client';

import React from 'react';
import { Quanta } from '../../src/core/Quanta';

export default function PathosPage() {
  return (
    <div className="flex h-screen">
      {/* Travel Notes Overlay */}
      <div style={{ position: 'absolute', top: '5rem', right: '5rem', zIndex: 10, backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 0 10px rgba(0,0,0,0.2)', width: '400px', height: '500px', overflow: 'auto' }}>
        <Quanta quantaId="pathos-travel-notes-f7a8b9c0-1234-5678-9abc-def012345678" userId="default-user" />
      </div>

      {/* Main content area with yellow circle */}
      <div className="w-full relative flex items-center justify-center bg-gray-900">
        <svg width="400" height="400" viewBox="0 0 400 400">
          <circle 
            cx="200" 
            cy="200" 
            r="150" 
            fill="#ffff00" 
            stroke="#ffd700" 
            strokeWidth="4"
          />
        </svg>
      </div>
    </div>
  );
} 