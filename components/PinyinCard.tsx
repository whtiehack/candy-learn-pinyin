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
    if (disabled || isLoading) return; // Allow clicking again even if playing to replay
    
    if (onClick) onClick();

    setIsLoading(true);
    setError(false);
    
    try {
      const duration = await playPinyinAudio(item.char);
      
      setIsLoading(false);
      setIsPlaying(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      // Ensure animation plays for at least 500ms or duration
      const animDuration = Math.max(duration * 1000, 500);
      
      timerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
      }, animDuration);

    } catch (e) {
      console.error("Failed to play audio:", e);
      setError(true);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  // Base styles for the 3D Jelly look
  const baseClasses = "relative flex flex-col items-center justify-center rounded-2xl transition-all duration-150 select-none cursor-pointer transform";
  
  // Size variations
  const sizeClasses = size === 'large' 
    ? "w-40 h-40 md:w-56 md:h-56 text-6xl md:text-8xl m-4" 
    : "w-24 h-28 md:w-28 md:h-32 text-4xl md:text-5xl m-2";

  // Theme configuration based on category
  let theme = {
    bg: 'bg-white',
    text: 'text-gray-600',
    border: 'border-gray-200',
    shadow: 'shadow-gray-200',
    activeBg: 'active:bg-gray-50'
  };

  if (!disabled) {
    if (item.category === 'initials') {
      // Purple / Blueberry theme
      theme = {
        bg: 'bg-purple-100',
        text: 'text-purple-600',
        border: 'border-purple-300',
        shadow: 'shadow-purple-200',
        activeBg: 'active:bg-purple-200'
      };
    } else if (item.category === 'finals') {
      // Pink / Strawberry theme
      theme = {
        bg: 'bg-pink-100',
        text: 'text-pink-600',
        border: 'border-pink-300',
        shadow: 'shadow-pink-200',
        activeBg: 'active:bg-pink-200'
      };
    } else {
      // Teal / Mint theme
      theme = {
        bg: 'bg-teal-100',
        text: 'text-teal-600',
        border: 'border-teal-300',
        shadow: 'shadow-teal-200',
        activeBg: 'active:bg-teal-200'
      };
    }
  } else {
    theme = {
       bg: 'bg-gray-100',
       text: 'text-gray-300',
       border: 'border-gray-200',
       shadow: 'shadow-none',
       activeBg: ''
    };
  }
  
  // Error Override
  if (error) {
    theme.border = 'border-red-300';
    theme.bg = 'bg-red-50';
  }

  // 3D Button Logic: Border Bottom creates the depth
  const depthClass = disabled ? 'border-2' : 'border-b-[6px] md:border-b-[8px] border-x-2 border-t-2';
  
  // Active/Pressed State
  const pressedClass = (isPlaying || isLoading) 
    ? 'border-b-0 translate-y-2 brightness-95' // Physically pressed down
    : disabled ? '' : 'hover:-translate-y-1 hover:brightness-105 active:border-b-0 active:translate-y-2';

  return (
    <div 
      className={`
        ${baseClasses} ${sizeClasses} 
        ${theme.bg} ${theme.text} ${theme.border} 
        ${depthClass} ${pressedClass}
        shadow-sm
      `}
      onClick={handleClick}
    >
      {/* Sparkles (Decorative) */}
      {isPlaying && (
        <>
          <span className="absolute -top-2 -right-2 text-xl animate-bounce">✨</span>
          <span className="absolute -bottom-2 -left-2 text-xl animate-bounce delay-100">⭐</span>
        </>
      )}

      {/* Main Character - Using font-pinyin for correct glyph shapes */}
      <span className="z-10 font-black drop-shadow-sm font-pinyin">{item.char}</span>
      
      {/* Category Label */}
      <span className="absolute bottom-2 text-xs font-bold opacity-60">
        {item.category === 'initials' ? '声母' : item.category === 'finals' ? '韵母' : '整体'}
      </span>

      {/* Status Icon */}
      <div className="absolute top-1 right-1">
        {isLoading && <span className="animate-spin inline-block text-lg">🍭</span>}
        {isPlaying && !isLoading && <span className="animate-ping text-lg">🔊</span>}
      </div>
    </div>
  );
};

export default PinyinCard;