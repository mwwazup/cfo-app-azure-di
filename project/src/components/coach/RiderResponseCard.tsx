import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface RiderResponseCardProps {
  results: string;
  insight: string;
  direction: string;
  repeat: string;
}

export function RiderResponseCard({ results, insight, direction, repeat }: RiderResponseCardProps) {
  const sections = [
    {
      title: 'Results',
      letter: 'R',
      content: results,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      letterBg: 'bg-blue-600 dark:bg-blue-500'
    },
    {
      title: 'Insight',
      letter: 'I',
      content: insight,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      letterBg: 'bg-yellow-600 dark:bg-yellow-500'
    },
    {
      title: 'Direction',
      letter: 'D',
      content: direction,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      letterBg: 'bg-green-600 dark:bg-green-500'
    },
    {
      title: 'Repeat',
      letter: 'R',
      content: repeat,
      color: 'text-accent dark:text-accent',
      bgColor: 'bg-accent-50 dark:bg-accent-900/20',
      borderColor: 'border-accent-200 dark:border-accent-800',
      letterBg: 'bg-accent dark:bg-accent'
    }
  ];

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            R
          </div>
          <CardTitle className="text-xl">
            Rider's Wave Analysis
          </CardTitle>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Using the RIDR Framework for strategic business decisions
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${section.bgColor} border ${section.borderColor} hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`
                  w-8 h-8 
                  ${section.letterBg} 
                  rounded-full 
                  flex 
                  items-center 
                  justify-center 
                  text-white 
                  font-bold 
                  text-lg
                  shadow-sm
                `}>
                  {section.letter}
                </div>
                <h3 className={`font-semibold ${section.color}`}>
                  {section.title}
                </h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
              R
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rider's Recommendation
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Remember: Every wave has its rhythm. Use this analysis to make informed decisions, 
            but trust your instincts as a business owner. You know your market best.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}