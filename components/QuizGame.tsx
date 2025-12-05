import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PinyinChar } from '../types';
import { playPinyinAudio } from '../services/geminiService';
import PinyinCard from './PinyinCard';
import confetti from 'canvas-confetti';

interface QuizGameProps {
  allItems: PinyinChar[];
  onBack: () => void;
}

const QuizGame: React.FC<QuizGameProps> = ({ allItems, onBack }) => {
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<PinyinChar | null>(null);
  const [options, setOptions] = useState<PinyinChar[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  // Audio states: idle -> loading (fetching) -> playing (sound active) -> idle
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const timerRef = useRef<number | null>(null);

  // Generate a new question
  const generateQuestion = useCallback(() => {
    setFeedback('idle');
    setAudioState('idle');
    const randomIndex = Math.floor(Math.random() * allItems.length);
    const correctItem = allItems[randomIndex];

    // Generate 2 wrong answers
    const wrongOptions: PinyinChar[] = [];
    while (wrongOptions.length < 2) {
      const rand = Math.floor(Math.random() * allItems.length);
      const item = allItems[rand];
      if (item.char !== correctItem.char && !wrongOptions.find(o => o.char === item.char)) {
        wrongOptions.push(item);
      }
    }

    // Shuffle options
    const newOptions = [correctItem, ...wrongOptions].sort(() => Math.random() - 0.5);
    
    setCurrentQuestion(correctItem);
    setOptions(newOptions);
  }, [allItems]);

  // Initial load
  useEffect(() => {
    generateQuestion();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [generateQuestion]);

  const playCurrentSound = async () => {
    if (!currentQuestion || audioState !== 'idle') return;
    
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

  const handleOptionClick = (selected: PinyinChar) => {
    if (feedback !== 'idle' || !currentQuestion) return;

    if (selected.char === currentQuestion.char) {
      setFeedback('correct');
      setScore(s => s + 10);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffb6c1', '#87ceeb', '#ffd700']
      });
      setTimeout(() => {
        generateQuestion();
      }, 1500);
    } else {
      setFeedback('wrong');
      // Shake effect logic handled by UI classes
      setTimeout(() => {
        setFeedback('idle');
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-4xl mx-auto p-4">
      {/* Header Bar */}
      <div className="w-full flex justify-between items-center mb-8 bg-white p-4 rounded-full shadow-md">
        <button 
          onClick={onBack}
          className="text-pink-500 font-bold hover:bg-pink-50 px-4 py-2 rounded-full transition-colors"
        >
          ← 返回 (Back)
        </button>
        <div className="text-2xl font-bold text-yellow-500">
          ⭐ {score}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="text-center w-full">
        <h2 className="text-3xl font-bold text-purple-600 mb-8 font-serif">
          听音辨字 (Listen & Choose)
        </h2>

        {/* Big Play Button */}
        <div className="mb-12 flex justify-center">
          <button
            onClick={playCurrentSound}
            disabled={audioState !== 'idle'}
            className={`
              w-32 h-32 rounded-full flex items-center justify-center shadow-xl border-b-8 transition-all
              ${audioState === 'loading'
                ? 'bg-gray-200 border-gray-300 animate-pulse cursor-wait' 
                : audioState === 'playing'
                ? 'bg-yellow-400 border-yellow-600 scale-95 border-b-0 translate-y-2'
                : 'bg-yellow-300 border-yellow-500 hover:bg-yellow-400 active:border-b-0 active:translate-y-2'
              }
            `}
          >
            <span className={`text-6xl ${audioState === 'playing' ? 'animate-bounce' : ''}`}>
              {audioState === 'loading' ? '⏳' : '🔊'}
            </span>
          </button>
        </div>
        
        <p className="text-gray-500 mb-8">点击喇叭听声音，然后选出正确的拼音宝宝！</p>

        {/* Options Grid */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 justify-items-center">
          {options.map((item, idx) => (
            <div key={`${item.char}-${idx}`} className="relative">
               <PinyinCard 
                  item={item} 
                  size="normal"
                  onClick={() => handleOptionClick(item)}
                  disabled={false}
                />
                {/* Feedback Overlays */}
                {feedback === 'correct' && item.char === currentQuestion?.char && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-green-500/20 rounded-3xl animate-bounce">
                    <span className="text-4xl">✅</span>
                  </div>
                )}
                {feedback === 'wrong' && item.char !== currentQuestion?.char && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20 rounded-3xl">
                    <span className="text-4xl">❌</span>
                  </div>
                )}
            </div>
          ))}
        </div>

        {feedback === 'correct' && (
           <div className="mt-8 text-2xl font-bold text-green-500 animate-bounce">
             太棒了! (Great Job!)
           </div>
        )}
        {feedback === 'wrong' && (
           <div className="mt-8 text-xl font-bold text-red-400">
             再试一次哦! (Try Again!)
           </div>
        )}
      </div>
    </div>
  );
};

export default QuizGame;