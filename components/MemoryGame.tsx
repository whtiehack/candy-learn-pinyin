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
  justMatched?: boolean; // Temporary state for match animation
  matchAnim?: string; // Store specific animation class for this pair
}

// Random animations for successful match
const MATCH_ANIMS = ['animate-pop-success', 'animate-spin-success', 'animate-jump-success'];

// Win Display Constants
const WIN_ICONS = ['🏆', '👑', '🌟', '🍭', '🎁', '💖', '🦄', '🌈'];
const WIN_ANIMS = ['animate-bounce', 'animate-tada', 'animate-jelly', 'animate-heart-beat', 'animate-wobble'];

const MemoryGame: React.FC<MemoryGameProps> = ({ allItems, onBack }) => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  
  // New state for random win display
  const [winDisplay, setWinDisplay] = useState({ icon: '🏆', anim: 'animate-bounce' });

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
        justMatched: false,
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
    // Ignore if processing, already flipped, or matched
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
      const randomAnim = MATCH_ANIMS[Math.floor(Math.random() * MATCH_ANIMS.length)];

      setTimeout(() => {
        const matchedCards = [...currentCards];
        // Trigger "Just Matched" animation first
        matchedCards[id1].justMatched = true;
        matchedCards[id2].justMatched = true;
        matchedCards[id1].isMatched = true;
        matchedCards[id2].isMatched = true;
        
        // Assign the random animation
        matchedCards[id1].matchAnim = randomAnim;
        matchedCards[id2].matchAnim = randomAnim;

        setCards(matchedCards);
        setFlippedIds([]);
        setIsProcessing(false);

        // Remove "justMatched" flag after animation
        setTimeout(() => {
             setCards(prev => prev.map(c => 
                 (c.id === id1 || c.id === id2) ? { ...c, justMatched: false } : c
             ));
        }, 1000);

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

  // --- Confetti Strategies ---
  const runFireworks = (duration: number) => {
    const end = Date.now() + duration;
    const interval: any = setInterval(function() {
      if (Date.now() > end) return clearInterval(interval);
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 100,
        particleCount: 50,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const runSideCannons = (duration: number) => {
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
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const runStars = () => {
    const defaults = { spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30, shapes: ['star'], colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'] };
    const shoot = () => {
      confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] });
      confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] });
    };
    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  };

  const handleWin = () => {
    setGameWon(true);
    
    // 1. Randomize Win Display
    setWinDisplay({
      icon: WIN_ICONS[Math.floor(Math.random() * WIN_ICONS.length)],
      anim: WIN_ANIMS[Math.floor(Math.random() * WIN_ANIMS.length)]
    });

    // 2. Randomize Confetti Effect
    const effects = [
        () => runSideCannons(3000), 
        () => runFireworks(3000), 
        runStars
    ];
    const selectedEffect = effects[Math.floor(Math.random() * effects.length)];
    selectedEffect();
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-full w-full max-w-4xl mx-auto p-4 md:p-8">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        /* Match Animations */
        @keyframes popSuccess {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes spinSuccess {
            0% { transform: rotateY(180deg) scale(1); }
            100% { transform: rotateY(540deg) scale(0.95); opacity: 0.8; }
        }
        @keyframes jumpSuccess {
            0% { transform: translateY(0); }
            40% { transform: translateY(-30px) scale(1.1); }
            100% { transform: translateY(0) scale(0.95); opacity: 0.8; }
        }

        /* Win Modal Animations */
        @keyframes tada {
          0% { transform: scale(1); }
          10%, 20% { transform: scale(0.9) rotate(-3deg); }
          30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
          40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        @keyframes jelly {
          0% { transform: scale(1, 1); }
          30% { transform: scale(1.25, 0.75); }
          40% { transform: scale(0.75, 1.25); }
          50% { transform: scale(1.15, 0.85); }
          65% { transform: scale(0.95, 1.05); }
          75% { transform: scale(1.05, 0.95); }
          100% { transform: scale(1, 1); }
        }
        @keyframes heartBeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.3); }
          28% { transform: scale(1); }
          42% { transform: scale(1.3); }
          70% { transform: scale(1); }
        }
        @keyframes wobble {
          0% { transform: translateX(0%); }
          15% { transform: translateX(-25%) rotate(-5deg); }
          30% { transform: translateX(20%) rotate(3deg); }
          45% { transform: translateX(-15%) rotate(-3deg); }
          60% { transform: translateX(10%) rotate(2deg); }
          75% { transform: translateX(-5%) rotate(-1deg); }
          100% { transform: translateX(0%); }
        }

        .animate-pop-success { animation: popSuccess 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-spin-success { animation: spinSuccess 0.8s ease-in-out forwards; }
        .animate-jump-success { animation: jumpSuccess 0.8s ease-out forwards; }
        
        .animate-tada { animation: tada 1s both; }
        .animate-jelly { animation: jelly 0.8s both; }
        .animate-heart-beat { animation: heartBeat 1.3s ease-in-out infinite; }
        .animate-wobble { animation: wobble 0.8s both; }

        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px #2dd4bf; transform: scale(1); }
            50% { box-shadow: 0 0 40px #2dd4bf; transform: scale(1.05); }
        }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }
      `}</style>

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
                  ${card.isMatched && !card.justMatched ? 'opacity-60 scale-95' : ''}
                  ${card.justMatched && card.matchAnim ? `${card.matchAnim} z-20` : ''}
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
                   {/* We wrap PinyinCard in a div that fills the space. */}
                   <div className="w-full h-full pointer-events-none">
                     <PinyinCard 
                        item={card.item} 
                        size="normal"
                      />
                   </div>
                   
                   {/* Match Effect Overlay */}
                   {card.justMatched && (
                      <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                         <span className="text-6xl animate-bounce filter drop-shadow-lg">✨</span>
                         <span className="absolute text-4xl animate-ping opacity-75">🌟</span>
                      </div>
                   )}

                   {/* Permanent Match Indicator */}
                   {card.isMatched && !card.justMatched && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                         <span className="text-5xl animate-bounce delay-100">⭐</span>
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
            <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full text-center border-8 border-teal-200 shadow-2xl animate-bounce-in overflow-hidden">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-teal-50 animate-pulse-glow -z-10 opacity-50"></div>
              
              <div className={`text-7xl mb-4 ${winDisplay.anim}`}>{winDisplay.icon}</div>
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
    </div>
  );
};

export default MemoryGame;