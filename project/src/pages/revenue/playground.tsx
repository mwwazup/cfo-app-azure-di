import React from 'react';
import { PlaygroundChart } from '../../components/RevenueChart/PlaygroundChart';

export function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-gray-100">
            CFO Playground
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Explore scenarios and run "what if" analysis without affecting your real data
          </p>
        </div>
      </div>
      
      <PlaygroundChart />
    </div>
  );
}