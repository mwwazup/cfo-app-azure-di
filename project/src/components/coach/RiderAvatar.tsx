import React from 'react';

interface RiderAvatarProps {
  mood: 'celebrate' | 'cautious' | 'critical';
  size?: 'sm' | 'md' | 'lg';
}

export function RiderAvatar({ mood, size = 'md' }: RiderAvatarProps) {
  const getMoodConfig = () => {
    switch (mood) {
      case 'celebrate':
        return {
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          glowColor: 'shadow-green-200 dark:shadow-green-800/50',
          message: 'Great thinking! 🎉',
          messageColor: 'text-green-600 dark:text-green-400'
        };
      case 'cautious':
        return {
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          glowColor: 'shadow-yellow-200 dark:shadow-yellow-800/50',
          message: 'Let\'s be strategic 🤔',
          messageColor: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'critical':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          glowColor: 'shadow-red-200 dark:shadow-red-800/50',
          message: 'Hold up... 🛑',
          messageColor: 'text-red-600 dark:text-red-400'
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          containerSize: 'w-16 h-16',
          imageSize: 'w-12 h-12',
          padding: 'p-2',
          messageSize: 'text-sm'
        };
      case 'lg':
        return {
          containerSize: 'w-24 h-24',
          imageSize: 'w-20 h-20',
          padding: 'p-2',
          messageSize: 'text-xl'
        };
      default: // md
        return {
          containerSize: 'w-20 h-20',
          imageSize: 'w-16 h-16',
          padding: 'p-2',
          messageSize: 'text-lg'
        };
    }
  };

  const config = getMoodConfig();
  const sizeConfig = getSizeConfig();

  return (
    <div className="flex items-center justify-center">
      <div className={`
        ${sizeConfig.containerSize} 
        ${sizeConfig.padding} 
        rounded-full 
        ${config.bgColor} 
        ${config.borderColor} 
        border-2 
        transition-all 
        duration-300 
        shadow-lg 
        ${config.glowColor}
        hover:scale-105
        flex 
        items-center 
        justify-center
      `}>
        <div className={`${sizeConfig.imageSize} bg-blue-600 rounded-full flex items-center justify-center text-white font-bold`}>
          R
        </div>
      </div>
      <div className="ml-4">
        <p className={`${sizeConfig.messageSize} font-medium ${config.messageColor}`}>
          {config.message}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rider
        </p>
      </div>
    </div>
  );
}