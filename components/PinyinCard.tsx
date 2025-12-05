import React, { useState, useEffect, useRef } from 'react';
import { PinyinChar } from '../types';
import { playPinyinAudio } from '../services/geminiService';

interface PinyinCardProps {
  item: PinyinChar;
  size?: 'normal' | 'large';
  onClick?: () => void;
  disabled?: boolean;
}

const PinyinCard: React.FC<PinyinCardProps> = ({ item, size = 'normal', onClick, disabled = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = async () => {
    if (disabled || isPlaying || isLoading) return;
    
    if (onClick) {
      onClick();
    }

    setIsLoading(true);
    setError(false);
    
    try {
      // Play audio and get duration
      const duration = await playPinyinAudio(item.char);
      
      setIsLoading(false);
      setIsPlaying(true);

      // Keep visual state active for the duration of the audio
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
      }, duration * 1000);

    } catch (e) {
      console.error(e);
      setError(true);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const baseClasses = "flex flex-col items-center justify-center rounded-3xl shadow-lg transition-all transform duration-200 border-b-4 select-none cursor-pointer relative overflow-hidden";
  
  const sizeClasses = size === 'large' 
    ? "w-40 h-40 md:w-56 md:h-56 text-6xl md:text-8xl m-4" 
    : "w-24 h-28 md:w-32 md:h-36 text-4xl md:text-5xl m-2";

  // Color coding by category
  let colorClasses = "";
  if (item.category === 'initials') {
    colorClasses = "bg-purple-100 border-purple-300 text-purple-600 hover:bg-purple-200 active:border-b-0 active:translate-y-1";
  } else if (item.category === 'finals') {
    colorClasses = "bg-pink-100 border-pink-300 text-pink-600 hover:bg-pink-200 active:border-b-0 active:translate-y-1";
  } else {
    colorClasses = "bg-teal-100 border-teal-300 text-teal-600 hover:bg-teal-200 active:border-b-0 active:translate-y-1";
  }

  if (disabled) {
    colorClasses = "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed";
  }

  // Active state style (playing or loading)
  const isActive = isPlaying || isLoading;

  return (
    <div 
      className={`${baseClasses} ${sizeClasses} ${colorClasses} ${isActive ? 'scale-95 border-b-0 translate-y-1 ring-4 ring-yellow-200' : 'hover:scale-105'}`}
      onClick={handleClick}
    >
      {/* Sparkles for active state */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-75"></span>
        </div>
      )}
      
      <span className="z-10 font-bold font-sans">{item.char}</span>
      
      {/* Visual Indicator of Type */}
      <span className="text-xs md:text-sm font-normal mt-2 opacity-60 z-10">
        {item.category === 'initials' ? '声母' : item.category === 'finals' ? '韵母' : '整体认读'}
      </span>

      {/* Play Icon / Loader */}
      <div className={`absolute top-2 right-2 text-base md:text-lg opacity-50`}>
        {isLoading ? (
          <span className="animate-spin inline-block">⏳</span>
        ) : (
          <span className={`${isPlaying ? 'text-yellow-500 animate-bounce' : ''}`}>🔊</span>
        )}
      </div>
    </div>
  );
};

export default PinyinCard;