import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PinyinChar } from '../types';
import { playPinyinAudio } from '../services/geminiService';
import PinyinCard from './PinyinCard';
import confetti from 'canvas-confetti';

interface QuizGameProps {
  allItems: PinyinChar[];
  onBack: () => void;
}

// Animation constants
const CORRECT_ANIMS = ['animate-jelly', 'animate-tada', 'animate-rubber-band', 'animate-heart-beat'];
const WRONG_ANIMS = ['animate-head-shake', 'animate-wobble'];

const QuizGame: React.FC<QuizGameProps> = ({ allItems, onBack }) => {
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<PinyinChar | null>(null);
  const [options, setOptions] = useState<PinyinChar[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [hasPlayed, setHasPlayed] = useState(false); 
  const [hintShake, setHintShake] = useState(false); 
  
  // New state for specific animations
  const [wrongChar, setWrongChar] = useState<string | null>(null);
  const [activeAnim, setActiveAnim] = useState<string>(''); // Stores the current random animation class
  const [scorePopup, setScorePopup] = useState<{show: boolean, x: number, y: number}>({show: false, x: 0, y: 0});

  const timerRef = useRef<number | null>(null);

  const generateQuestion = useCallback(() => {
    setFeedback('idle');
    setAudioState('idle');
    setHasPlayed(false);
    setWrongChar(null);
    setActiveAnim('');
    setScorePopup({show: false, x: 0, y: 0});

    const randomIndex = Math.floor(Math.random() * allItems.length);
    const correctItem = allItems[randomIndex];

    const wrongOptions: PinyinChar[] = [];
    while (wrongOptions.length < 2) {
      const rand = Math.floor(Math.random() * allItems.length);
      const item = allItems[rand];
      if (item.char !== correctItem.char && !wrongOptions.find(o => o.char === item.char)) {
        wrongOptions.push(item);
      }
    }

    const newOptions = [correctItem, ...wrongOptions].sort(() => Math.random() - 0.5);
    setCurrentQuestion(correctItem);
    setOptions(newOptions);
  }, [allItems]);

  useEffect(() => {
    generateQuestion();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [generateQuestion]);

  const playCurrentSound = async () => {
    if (!currentQuestion) return; 
    setHasPlayed(true);
    setAudioState('loading');
    try {
      const duration = await playPinyinAudio(currentQuestion.char);
      setAudioState('playing');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setAudioState('idle');
      }, duration * 1000);
    } catch (e) {
      console.error("Audio error", e);
      setAudioState('idle');
    }
  };

  const handleOptionClick = (selected: PinyinChar, e: React.MouseEvent) => {
    if (!hasPlayed) {
        setHintShake(true);
        setTimeout(() => setHintShake(false), 500);
        return;
    }

    if (feedback !== 'idle' || !currentQuestion) return;

    if (selected.char === currentQuestion.char) {
      // Correct!
      setFeedback('correct');
      // Pick random correct animation
      const randomAnim = CORRECT_ANIMS[Math.floor(Math.random() * CORRECT_ANIMS.length)];
      setActiveAnim(randomAnim);

      setScore(s => s + 1);
      setQuestionCount(c => c + 1);
      
      // Show +1 Popup at click location
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setScorePopup({
          show: true,
          x: e.clientX - rect.left + 50, // rough offset
          y: -50 // float up
      });

      // Fun Confetti
      const colors = ['#ff69b4', '#87ceeb', '#ffd700', '#ffa500'];
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: colors,
        shapes: ['circle', 'square'],
        scalar: 1.2
      });

      setTimeout(() => {
        generateQuestion();
      }, 2000); 
    } else {
      // Wrong!
      setFeedback('wrong');
      setWrongChar(selected.char);
      // Pick random wrong animation
      const randomAnim = WRONG_ANIMS[Math.floor(Math.random() * WRONG_ANIMS.length)];
      setActiveAnim(randomAnim);
      
      setTimeout(() => {
        setFeedback('idle');
        setWrongChar(null);
        setActiveAnim('');
      }, 800);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-full w-full max-w-4xl mx-auto p-4 md:p-8">
      <style>{`
        /* Jelly */
        @keyframes jelly {
          0% { transform: scale(1, 1); }
          30% { transform: scale(1.25, 0.75); }
          40% { transform: scale(0.75, 1.25); }
          50% { transform: scale(1.15, 0.85); }
          65% { transform: scale(0.95, 1.05); }
          75% { transform: scale(1.05, 0.95); }
          100% { transform: scale(1, 1); }
        }
        /* Tada */
        @keyframes tada {
          0% { transform: scale(1); }
          10%, 20% { transform: scale(0.9) rotate(-3deg); }
          30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
          40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        /* Rubber Band */
        @keyframes rubberBand {
          0% { transform: scale3d(1, 1, 1); }
          30% { transform: scale3d(1.25, 0.75, 1); }
          40% { transform: scale3d(0.75, 1.25, 1); }
          50% { transform: scale3d(1.15, 0.85, 1); }
          65% { transform: scale3d(0.95, 1.05, 1); }
          75% { transform: scale3d(1.05, 0.95, 1); }
          100% { transform: scale3d(1, 1, 1); }
        }
        /* Heart Beat */
        @keyframes heartBeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.3); }
          28% { transform: scale(1); }
          42% { transform: scale(1.3); }
          70% { transform: scale(1); }
        }
        /* Head Shake */
        @keyframes headShake {
          0% { transform: translateX(0); }
          6.5% { transform: translateX(-6px) rotateY(-9deg); }
          18.5% { transform: translateX(5px) rotateY(7deg); }
          31.5% { transform: translateX(-3px) rotateY(-5deg); }
          43.5% { transform: translateX(2px) rotateY(3deg); }
          50% { transform: translateX(0); }
        }
        /* Wobble */
        @keyframes wobble {
          0% { transform: translateX(0%); }
          15% { transform: translateX(-25%) rotate(-5deg); }
          30% { transform: translateX(20%) rotate(3deg); }
          45% { transform: translateX(-15%) rotate(-3deg); }
          60% { transform: translateX(10%) rotate(2deg); }
          75% { transform: translateX(-5%) rotate(-1deg); }
          100% { transform: translateX(0%); }
        }
        /* Float Up Score */
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.5); }
        }

        .animate-jelly { animation: jelly 0.8s both; }
        .animate-tada { animation: tada 1s both; }
        .animate-rubber-band { animation: rubberBand 1s both; }
        .animate-heart-beat { animation: heartBeat 1.3s ease-in-out both; }
        
        .animate-head-shake { animation: headShake 0.5s both; }
        .animate-wobble { animation: wobble 0.8s both; }
        
        .animate-float-up { animation: floatUp 1s forwards ease-out; }
      `}</style>

      {/* Header Bar */}
      <div className="w-full flex justify-between items-center mb-6">
        <button 
          onClick={onBack}
          className="bg-white border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 text-pink-500 font-black px-6 py-2 rounded-full shadow-sm hover:bg-pink-50 transition-all flex items-center gap-2"
        >
          <span>🔙</span> 返回
        </button>
        <div className="bg-white px-6 py-2 rounded-full border-b-4 border-yellow-200 shadow-sm flex items-center gap-2 transition-transform duration-200"
             key={score} // Trigger re-render anim
             style={{ animation: score > 0 ? 'rubberBand 0.8s' : 'none' }}>
          <span className="text-2xl">⭐</span>
          <span className="text-2xl font-black text-yellow-500">{score}</span>
        </div>
      </div>

      {/* Question Area */}
      <div className="flex flex-col items-center w-full max-w-2xl bg-white/60 backdrop-blur-sm rounded-3xl p-8 border-4 border-white shadow-xl">
        <h2 className="text-3xl md:text-4xl font-black text-purple-600 mb-6 drop-shadow-sm">
          听音辨字 🎵
        </h2>

        {/* Big Play Button */}
        <div className={`mb-10 relative transition-transform duration-200 ${hintShake ? 'scale-110 rotate-3' : ''}`}>
          <button
            onClick={playCurrentSound}
            className={`
              w-40 h-40 rounded-full flex items-center justify-center transition-all duration-200
              border-8 
              ${audioState === 'playing'
                ? 'bg-yellow-300 border-yellow-400 scale-95'
                : 'bg-yellow-400 border-yellow-200 hover:scale-105 hover:-translate-y-1 shadow-lg active:scale-95 active:shadow-inner'
              }
              ${hintShake ? 'ring-4 ring-red-400 ring-offset-4' : ''}
            `}
          >
            <span className={`text-7xl filter drop-shadow-md ${audioState === 'playing' ? 'animate-bounce' : ''}`}>
              {audioState === 'loading' ? '⏳' : '🔊'}
            </span>
          </button>
          
          {/* Hint Text */}
          {audioState !== 'playing' && audioState !== 'loading' && (
             <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 font-bold whitespace-nowrap transition-colors duration-200 ${hintShake ? 'text-red-500 scale-110' : 'text-gray-500 animate-pulse'}`}>
               {hintShake ? '👈 先点这里听声音！' : '点击喇叭听声音'}
             </span>
          )}
        </div>
        
        {/* Options Grid */}
        <div className={`grid grid-cols-3 gap-4 md:gap-8 justify-items-center w-full transition-opacity duration-300 ${!hasPlayed ? 'opacity-70' : 'opacity-100'}`}>
          {options.map((item, idx) => {
            const isCorrect = feedback === 'correct' && item.char === currentQuestion?.char;
            const isWrong = feedback === 'wrong' && item.char === wrongChar;
            
            return (
              <div key={`${item.char}-${idx}`} 
                   className={`relative w-full flex justify-center transition-all duration-300 
                     ${isCorrect ? `z-10 ${activeAnim}` : ''} 
                     ${isWrong ? activeAnim : ''}
                   `}>
                 <PinyinCard 
                    item={item} 
                    size="normal"
                    onClick={() => {}} // Handled by wrapper div click below to capture event
                    disabled={feedback !== 'idle' && feedback !== 'wrong'} 
                  />
                  {/* Click Overlay to capture coordinates */}
                  <div 
                    className="absolute inset-0 cursor-pointer z-20" 
                    onClick={(e) => handleOptionClick(item, e)}
                  />
                  
                  {/* +1 Score Popup */}
                  {isCorrect && scorePopup.show && (
                    <div className="absolute top-0 right-0 pointer-events-none animate-float-up z-50">
                      <span className="text-4xl font-black text-yellow-400 drop-shadow-md stroke-2">+1</span>
                    </div>
                  )}

                  {/* Feedback Overlays */}
                  {isCorrect && (
                    <div className="absolute -top-4 -right-4 z-30 pointer-events-none">
                      <span className="text-5xl animate-bounce filter drop-shadow-lg">🌟</span>
                    </div>
                  )}
                  {isWrong && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-red-400/20 rounded-2xl animate-pulse">
                      <span className="text-6xl">😣</span>
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        <div className="h-16 mt-4 flex items-center justify-center">
            {feedback === 'correct' && (
            <div className="text-3xl font-black text-green-500 animate-bounce tracking-widest drop-shadow-sm flex items-center gap-2">
                🎉 太棒了!
            </div>
            )}
            {feedback === 'wrong' && (
            <div className="text-2xl font-black text-pink-400 animate-pulse flex items-center gap-2">
                💪 再试一次哦!
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuizGame;