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
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<PinyinChar | null>(null);
  const [options, setOptions] = useState<PinyinChar[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [hasPlayed, setHasPlayed] = useState(false); // Track if user has clicked play
  const [hintShake, setHintShake] = useState(false); // Visual hint state

  const timerRef = useRef<number | null>(null);

  const generateQuestion = useCallback(() => {
    setFeedback('idle');
    setAudioState('idle');
    setHasPlayed(false); // Reset for new question

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
    
    // Auto play removed to enforce "click to listen" rule
    // setTimeout(() => {
    //     playPinyinAudio(correctItem.char).catch(() => {});
    // }, 500);

  }, [allItems]);

  useEffect(() => {
    generateQuestion();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [generateQuestion]);

  const playCurrentSound = async () => {
    if (!currentQuestion) return; 
    
    // Mark as played so user can now answer
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

  const handleOptionClick = (selected: PinyinChar) => {
    // If user hasn't listened yet, block answer and shake the speaker
    if (!hasPlayed) {
        setHintShake(true);
        setTimeout(() => setHintShake(false), 500);
        return;
    }

    if (feedback !== 'idle' || !currentQuestion) return;

    if (selected.char === currentQuestion.char) {
      setFeedback('correct');
      setScore(s => s + 10);
      setQuestionCount(c => c + 1);
      
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
      }, 1500);
    } else {
      setFeedback('wrong');
      // Play a little shake or wrong sound logic here if we had it
      setTimeout(() => {
        setFeedback('idle');
      }, 1000);
    }
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
        <div className="bg-white px-6 py-2 rounded-full border-b-4 border-yellow-200 shadow-sm flex items-center gap-2">
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
          {options.map((item, idx) => (
            <div key={`${item.char}-${idx}`} className="relative w-full flex justify-center">
               <PinyinCard 
                  item={item} 
                  size="normal"
                  onClick={() => handleOptionClick(item)}
                  // We don't use 'disabled' prop here for hasPlayed because we want to capture the click to show the hint.
                  // We only disable if we are in feedback mode.
                  disabled={feedback !== 'idle' && feedback !== 'wrong'} 
                />
                
                {/* Feedback Overlays */}
                {feedback === 'correct' && item.char === currentQuestion?.char && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span className="text-6xl animate-bounce filter drop-shadow-lg">✅</span>
                  </div>
                )}
                {feedback === 'wrong' && item.char !== currentQuestion?.char && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-gray-500/20 rounded-2xl">
                    <span className="text-6xl animate-pulse">❌</span>
                  </div>
                )}
            </div>
          ))}
        </div>

        {feedback === 'correct' && (
           <div className="mt-6 text-3xl font-black text-green-500 animate-bounce tracking-widest drop-shadow-sm">
             太棒了! 🎉
           </div>
        )}
        {feedback === 'wrong' && (
           <div className="mt-6 text-2xl font-black text-red-400 animate-shake">
             再试一次哦! 💪
           </div>
        )}
      </div>
    </div>
  );
};

export default QuizGame;