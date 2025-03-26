import React from 'react';
import BerserkerGame from './BerserkerGame';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
      <div className="w-full max-w-[600px]">
        <BerserkerGame />
      </div>
    </div>
  );
}

export default App;
