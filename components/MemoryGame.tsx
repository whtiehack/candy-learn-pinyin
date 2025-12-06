import React, { useState, useEffect, useCallback } from 'react';
import { PinyinChar } from '../types';
import { playPinyinAudio } from '../services/geminiService';
import PinyinCard from './PinyinCard';
import confetti from 'canvas-confetti';

interface MemoryGameProps {
  allItems: PinyinChar[];
  onBack: () => void;
}

interface CardState {
  id: number;
  item: PinyinChar;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ allItems, onBack }) => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  // Initialize Game
  const startNewGame = useCallback(() => {
    // 1. Pick 6 random unique items
    const shuffledItems = [...allItems].sort(() => Math.random() - 0.5);
    const selectedItems = shuffledItems.slice(0, 6);

    // 2. Duplicate to make pairs
    const deck = [...selectedItems, ...selectedItems];

    // 3. Shuffle deck and map to CardState
    const newCards = deck
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({
        id: index,
        item,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(newCards);
    setFlippedIds([]);
    setIsProcessing(false);
    setMoves(0);
    setGameWon(false);
  }, [allItems]);

  // Initial load
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleCardClick = (id: number) => {
    // Ignore if processing (waiting for mismatch flip back), already flipped, or matched
    if (isProcessing || flippedIds.includes(id) || cards[id].isMatched) return;

    // 1. Flip the card visually
    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    // 2. Play Audio
    playPinyinAudio(newCards[id].item.char).catch(console.error);

    // 3. Game Logic
    const newFlippedIds = [...flippedIds, id];
    setFlippedIds(newFlippedIds);

    if (newFlippedIds.length === 2) {
      setMoves((m) => m + 1);
      setIsProcessing(true);
      checkForMatch(newFlippedIds, newCards);
    }
  };

  const checkForMatch = (currentFlippedIds: number[], currentCards: CardState[]) => {
    const [id1, id2] = currentFlippedIds;
    const card1 = currentCards[id1];
    const card2 = currentCards[id2];

    if (card1.item.char === card2.item.char) {
      // MATCH!
      setTimeout(() => {
        const matchedCards = [...currentCards];
        matchedCards[id1].isMatched = true;
        matchedCards[id2].isMatched = true;
        setCards(matchedCards);
        setFlippedIds([]);
        setIsProcessing(false);

        // Check Win Condition
        if (matchedCards.every((c) => c.isMatched)) {
          handleWin();
        }
      }, 500);
    } else {
      // NO MATCH
      setTimeout(() => {
        const resetCards = [...currentCards];
        resetCards[id1].isFlipped = false;
        resetCards[id2].isFlipped = false;
        setCards(resetCards);
        setFlippedIds([]);
        setIsProcessing(false);
      }, 1200);
    }
  };

  const handleWin = () => {
    setGameWon(true);
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-full w-full max-w-4xl mx-auto p-4 md:p-8">
      {/* Header Bar */}
      <div className="w-full flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="bg-white border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 text-pink-500 font-black px-6 py-2 rounded-full shadow-sm hover:bg-pink-50 transition-all flex items-center gap-2"
        >
          <span>🔙</span> 返回
        </button>
        <div className="bg-white px-6 py-2 rounded-full border-b-4 border-teal-200 shadow-sm flex items-center gap-2">
          <span className="text-xl md:text-2xl font-black text-teal-500">
             步数: {moves}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center w-full max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-black text-teal-600 mb-6 drop-shadow-sm">
          记忆配对 🧠
        </h2>

        {/* Game Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-6 w-full px-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`aspect-[3/4] relative cursor-pointer perspective-1000 group`}
              onClick={() => handleCardClick(card.id)}
            >
              <div
                className={`
                  w-full h-full transition-all duration-500 transform-style-3d
                  ${card.isFlipped || card.isMatched ? 'rotate-y-180' : ''}
                  ${card.isMatched ? 'scale-90 opacity-0 md:opacity-100 md:scale-95' : ''}
                `}
              >
                {/* Front (Card Back Design) */}
                <div className="absolute inset-0 backface-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-teal-300 to-blue-300 rounded-2xl border-4 border-white shadow-md flex items-center justify-center hover:brightness-105 active:scale-95 transition-transform">
                     {/* Pattern overlay */}
                     <div className="absolute inset-0 opacity-20" 
                          style={{backgroundImage: 'radial-gradient(#fff 20%, transparent 20%)', backgroundSize: '10px 10px'}}>
                     </div>
                     <span className="text-4xl md:text-5xl filter drop-shadow-md z-10">🍬</span>
                  </div>
                </div>

                {/* Back (Pinyin Content) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180">
                   {/* We wrap PinyinCard in a div that fills the space. 
                       We force 'active' look if it's matched to look nice. */}
                   <div className="w-full h-full pointer-events-none">
                     <PinyinCard 
                        item={card.item} 
                        size="normal"
                        // PinyinCard has its own margins/sizes in classes, we override slightly to fit grid
                        // Actually PinyinCard handles its internal layout well, we just let it be.
                        // We pass onClick as undefined because parent handles click
                      />
                   </div>
                   {card.isMatched && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                         <span className="text-5xl animate-bounce">⭐</span>
                      </div>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Win Overlay / Modal */}
        {gameWon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border-8 border-teal-200 shadow-2xl animate-bounce-in">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-3xl font-black text-teal-600 mb-2">挑战成功!</h3>
              <p className="text-gray-500 font-bold mb-8">你用了 {moves} 步完成了配对</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={startNewGame}
                  className="w-full bg-teal-400 hover:bg-teal-500 text-white font-black py-3 rounded-xl shadow-lg border-b-4 border-teal-600 active:border-b-0 active:translate-y-1 transition-all"
                >
                  再玩一次
                </button>
                <button 
                  onClick={onBack}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-3 rounded-xl transition-colors"
                >
                  返回主页
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default MemoryGame;