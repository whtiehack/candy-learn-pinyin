import React, { useState } from 'react';
import { GameState, PinyinCategory } from './types';
import { INITIALS, FINALS, OVERALL } from './constants';
import PinyinCard from './components/PinyinCard';
import QuizGame from './components/QuizGame';

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

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in-up">
      <div className="text-center space-y-4">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-sm font-serif p-2">
          糖果学拼音
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 font-bold">
          Candy Pinyin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-8">
        <button
          onClick={() => setGameState(GameState.LEARNING)}
          className="group relative bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all border-4 border-pink-200 hover:border-pink-400 transform hover:-translate-y-2"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📖</div>
          <h2 className="text-2xl font-bold text-pink-500">学习模式 (Learn)</h2>
          <p className="text-gray-400 mt-2">点点卡片学发音</p>
        </button>

        <button
          onClick={() => setGameState(GameState.QUIZ)}
          className="group relative bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all border-4 border-yellow-200 hover:border-yellow-400 transform hover:-translate-y-2"
        >
          <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🎮</div>
          <h2 className="text-2xl font-bold text-yellow-500">游戏挑战 (Quiz)</h2>
          <p className="text-gray-400 mt-2">听音辨字大闯关</p>
        </button>
      </div>
    </div>
  );

  const renderLearning = () => (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-4 rounded-3xl shadow-sm border border-pink-100">
        <button 
          onClick={() => setGameState(GameState.MENU)}
          className="mb-4 md:mb-0 text-gray-500 hover:text-pink-500 font-bold flex items-center gap-2 px-4 py-2 rounded-full hover:bg-pink-50 transition-colors"
        >
          🏠 主页 (Home)
        </button>
        
        <div className="flex bg-gray-100 p-1 rounded-full">
          <button
            onClick={() => setActiveTab(PinyinCategory.INITIALS)}
            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === PinyinCategory.INITIALS ? 'bg-purple-500 text-white shadow-md' : 'text-gray-500 hover:text-purple-500'}`}
          >
            声母 (Initials)
          </button>
          <button
            onClick={() => setActiveTab(PinyinCategory.FINALS)}
            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === PinyinCategory.FINALS ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:text-pink-500'}`}
          >
            韵母 (Finals)
          </button>
          <button
            onClick={() => setActiveTab(PinyinCategory.OVERALL)}
            className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === PinyinCategory.OVERALL ? 'bg-teal-500 text-white shadow-md' : 'text-gray-500 hover:text-teal-500'}`}
          >
            整体认读
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center pb-20">
        {getCurrentItems().map((item) => (
          <PinyinCard key={item.char} item={item} />
        ))}
      </div>
      
      {/* Floating Instruction */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-pink-200 text-pink-500 font-bold animate-bounce">
         👆 点击卡片听声音 (Click to Listen)
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 overflow-x-hidden selection:bg-pink-200">
      {/* Top Decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-teal-400"></div>
      
      {/* Clouds Background (CSS Only) */}
      <div className="fixed top-20 left-10 text-9xl opacity-10 pointer-events-none select-none animate-pulse">☁️</div>
      <div className="fixed top-40 right-10 text-8xl opacity-10 pointer-events-none select-none animate-pulse delay-700">☁️</div>
      <div className="fixed bottom-20 left-20 text-8xl opacity-10 pointer-events-none select-none animate-pulse delay-1000">🌸</div>

      <main className="relative z-10 py-8">
        {gameState === GameState.MENU && renderMenu()}
        {gameState === GameState.LEARNING && renderLearning()}
        {gameState === GameState.QUIZ && <QuizGame allItems={allItems} onBack={() => setGameState(GameState.MENU)} />}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-2 right-4 text-xs text-gray-300 pointer-events-none">
        Powered by Gemini 2.5 Flash
      </footer>
    </div>
  );
};

export default App;