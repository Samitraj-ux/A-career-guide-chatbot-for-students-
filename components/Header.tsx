
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gemini-dark-card/50 backdrop-blur-sm p-4 border-b border-white/10 sticky top-0 z-10">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-xl font-bold text-gemini-dark-text text-center">
          Gemini Chat Bot
        </h1>
      </div>
    </header>
  );
};

export default Header;
