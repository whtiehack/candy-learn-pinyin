import React, { useState, useEffect } from 'react';
import { GameState, PinyinCategory } from './types';
import { INITIALS, FINALS, OVERALL } from './constants';
import PinyinCard from './components/PinyinCard';
import QuizGame from './components/QuizGame';
import MemoryGame from './components/MemoryGame';
import { unlockAudio } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [activeTab, setActiveTab] = useState<PinyinCategory>(PinyinCategory.INITIALS);

  // Combine lists for quiz
  const allItems = [...INITIALS, ...FINALS, ...OVERALL];

  // Helper to get items for current tab
  const getCurrentItems = () => {
    switch (activeTab) {
      case PinyinCategory.INITIALS: return INITIALS;
      case PinyinCategory.FINALS: return FINALS;
      case PinyinCategory.OVERALL: return OVERALL;
      default: return [];
    }
  };

  // Unlock audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto px-4 animate-fade-in">
      {/* Title Section */}
      <div className="text-center mb-10 md:mb-16 relative">
        <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-purple-400 to-teal-400 drop-shadow-2xl font-serif py-4">
          糖果拼音
        </h1>
        <div className="absolute -top-10 -right-10 text-6xl animate-bounce delay-1000">🍭</div>
        <div className="absolute -bottom-4 -left-8 text-6xl animate-bounce delay-500">🍬</div>
        <p className="text-2xl md:text-3xl text-gray-500 font-bold tracking-wider bg-white/50 px-6 py-2 rounded-full inline-block backdrop-blur-sm font-pinyin">
          Candy Pinyin Land
        </p>
      </div>

      {/* Menu Buttons - 3 Columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4 md:px-0">
        
        {/* Mode 1: Learn */}
        <button
          onClick={() => setGameState(GameState.LEARNING)}
          className="
            group relative bg-white p-6 md:p-8 rounded-[2rem] 
            border-b-[12px] border-pink-200 active:border-b-0 active:translate-y-3
            hover:-translate-y-1 hover:border-pink-300
            transition-all duration-200
            flex flex-col items-center
          "
        >
          <div className="bg-pink-100 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <span className="text-6xl">📖</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-pink-500 mb-2">学习模式</h2>
          <span className="text-gray-400 font-bold font-pinyin">Learn Pinyin</span>
        </button>

        {/* Mode 2: Quiz */}
        <button
          onClick={() => setGameState(GameState.QUIZ)}
          className="
            group relative bg-white p-6 md:p-8 rounded-[2rem] 
            border-b-[12px] border-yellow-200 active:border-b-0 active:translate-y-3
            hover:-translate-y-1 hover:border-yellow-300
            transition-all duration-200
            flex flex-col items-center
          "
        >
          <div className="bg-yellow-100 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <span className="text-6xl">🎮</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-yellow-500 mb-2">听音辨字</h2>
          <span className="text-gray-400 font-bold font-pinyin">Quiz Challenge</span>
        </button>

        {/* Mode 3: Memory */}
        <button
          onClick={() => setGameState(GameState.MEMORY)}
          className="
            group relative bg-white p-6 md:p-8 rounded-[2rem] 
            border-b-[12px] border-teal-200 active:border-b-0 active:translate-y-3
            hover:-translate-y-1 hover:border-teal-300
            transition-all duration-200
            flex flex-col items-center
          "
        >
          <div className="bg-teal-100 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <span className="text-6xl">🧠</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-teal-500 mb-2">记忆配对</h2>
          <span className="text-gray-400 font-bold font-pinyin">Memory Match</span>
        </button>
      </div>
    </div>
  );

  const renderLearning = () => (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 pb-24">
      {/* Navigation Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
        <button 
          onClick={() => setGameState(GameState.MENU)}
          className="
            flex items-center gap-2 px-6 py-3 rounded-full 
            bg-white text-pink-500 font-black text-xl 
            border-b-4 border-pink-200
            active:border-b-0 active:translate-y-1 active:bg-gray-50
            hover:scale-105 transition-all
            shadow-sm w-full lg:w-auto justify-center
          "
        >
          <span>🏠</span> 返回主页
        </button>
        
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-sm border border-white">
          {[
            { id: PinyinCategory.INITIALS, label: '声母 (Initials)', color: 'bg-purple-500', border: 'border-purple-700', text: 'text-purple-500' },
            { id: PinyinCategory.FINALS, label: '韵母 (Finals)', color: 'bg-pink-500', border: 'border-pink-700', text: 'text-pink-500' },
            { id: PinyinCategory.OVERALL, label: '整体认读', color: 'bg-teal-500', border: 'border-teal-700', text: 'text-teal-500' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PinyinCategory)}
              className={`
                px-5 py-2 md:px-8 md:py-3 rounded-2xl font-black transition-all border-b-4 
                ${activeTab === tab.id 
                  ? `${tab.color} ${tab.border} text-white transform -translate-y-1 shadow-md` 
                  : `bg-transparent border-transparent ${tab.text} hover:bg-gray-50`
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-8 justify-items-center">
        {getCurrentItems().map((item) => (
          <PinyinCard key={item.char} item={item} />
        ))}
      </div>
      
      {/* Floating Instruction */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 
        bg-white/95 backdrop-blur px-8 py-4 rounded-full 
        shadow-xl border-2 border-pink-100 
        text-pink-500 font-bold animate-bounce 
        whitespace-nowrap z-50 pointer-events-none text-lg flex items-center gap-2"
      >
         👆 点击卡片听声音
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-pink-200">
      
      {/* Background Decor */}
      <div className="fixed top-20 left-10 text-9xl opacity-20 pointer-events-none select-none animate-pulse blur-sm">☁️</div>
      <div className="fixed top-60 right-10 text-8xl opacity-20 pointer-events-none select-none animate-pulse delay-700 blur-sm">☁️</div>
      <div className="fixed bottom-20 left-20 text-8xl opacity-20 pointer-events-none select-none animate-pulse delay-1000 blur-sm">🌸</div>
      <div className="fixed top-10 right-1/3 text-4xl opacity-30 pointer-events-none select-none animate-spin-slow">✨</div>

      <main className="relative z-10 py-6">
        {gameState === GameState.MENU && renderMenu()}
        {gameState === GameState.LEARNING && renderLearning()}
        {gameState === GameState.QUIZ && <QuizGame allItems={allItems} onBack={() => setGameState(GameState.MENU)} />}
        {gameState === GameState.MEMORY && <MemoryGame allItems={allItems} onBack={() => setGameState(GameState.MENU)} />}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-gray-400 text-sm font-bold opacity-50 relative z-10">
        Made with ❤️ for Kids
      </footer>
    </div>
  );
};

export default App;