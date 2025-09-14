import { Outlet } from 'react-router-dom';
// import VoiceCoach from '../../components/VoiceCoach'; // DISABLED - Archived for future use
import GraphSeeder from '../../components/GraphSeeder';
import CoachPanel from '../../components/CoachPanel';
// import GeminiTTS from '../../components/GeminiTTS'; // DISABLED - Archived for future use

export default function WaveRiderCoachPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">WaveRider Coach</h1>
        <p className="text-gray-400">Your AI-powered business coach with voice and text interfaces</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Voice Coach</h2>
            <p className="text-sm text-gray-300 mb-4">Press and hold to talk with your AI business coach</p>
            <div className="flex justify-center">
              {/* <VoiceCoach /> */}
              <p className="text-gray-500 text-sm">Voice Coach feature disabled</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Ask the Agent</h2>
            <p className="text-sm text-gray-300 mb-4">Type your question and get AI-powered insights</p>
            <CoachPanel />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Knowledge Base</h2>
            <p className="text-sm text-gray-300 mb-4">
              Load sample data to get started. This will populate your knowledge base with example business metrics and insights.
            </p>
            <GraphSeeder />
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Gemini TTS</h2>
            <p className="text-sm text-gray-300 mb-4">
              Test the Gemini Text-to-Speech functionality with different voices.
            </p>
            {/* <GeminiTTS /> */}
            <p className="text-gray-500 text-sm">Gemini TTS feature disabled</p>
          </div>
        </div>
      </div>
      
      {/* This Outlet is required by the DashboardLayout */}
      <Outlet />
    </div>
  );
}
