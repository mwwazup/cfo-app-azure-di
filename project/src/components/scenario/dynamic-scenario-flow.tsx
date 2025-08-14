import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/auth-context';
import { RevenueScenarioService } from '../../services/revenueScenarioService';
import { calculationResultToDeltaPayload } from '../../models/RevenueScenario';
import { ScenarioClassifier, ScenarioClassification, UserProvidedInputs } from './scenario-classifier';
import { ScenarioInputBuilder } from './scenario-input-builder';
import { ScenarioCalculator, CalculationResult } from './scenario-calculator';


interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  classification?: ScenarioClassification;
  calculation?: CalculationResult;
}

interface DynamicScenarioFlowProps {
  onScenarioComplete?: (scenarioType: string, inputs: UserProvidedInputs, result: CalculationResult) => void;
  currentMonthlyRevenue?: number;
}

export const DynamicScenarioFlow: React.FC<DynamicScenarioFlowProps> = ({
  onScenarioComplete,
  currentMonthlyRevenue = 50000
}) => {
  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hi! I\'m your CFO assistant. I can help you analyze business scenarios like pricing changes, hiring decisions, marketing investments, and more. What would you like to explore?',
      timestamp: new Date()
    }
  ]);
  
  const [userInput, setUserInput] = useState('');
  const [currentClassification, setCurrentClassification] = useState<ScenarioClassification | null>(null);
  const [userProvidedInputs, setUserProvidedInputs] = useState<UserProvidedInputs>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Save scenario to revenue_scenarios table
  const saveScenarioToDatabase = async (
    classification: ScenarioClassification,
    inputs: UserProvidedInputs,
    calculation: CalculationResult,
    userQuestion: string
  ) => {
    if (!user?.id) return;

    try {
      // Get current revenue report as base
      const currentReport = await RevenueScenarioService.getCurrentRevenueReport(user.id);
      
      if (!currentReport) {
        console.warn('No current revenue report found for user');
        return;
      }

      // Convert calculation result to delta payload
      const deltaPayload = calculationResultToDeltaPayload(
        classification.scenarioType,
        inputs,
        calculation
      );

      // Save to revenue_scenarios table
      await RevenueScenarioService.createRevenueScenario(user.id, {
        base_report_id: currentReport.id,
        question_text: userQuestion,
        delta_payload: deltaPayload,
        generated_answer: calculation.recommendation
      });
    } catch (error) {
      console.error('Failed to save scenario to database:', error);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // Classify the user input
    const classification = ScenarioClassifier.classifyUserInput(userInput, userProvidedInputs);
    setCurrentClassification(classification);

    // Create AI response based on classification
    let aiResponse = '';
    let systemMessage: ChatMessage | null = null;

    if (classification.scenarioType === 'unknown') {
      aiResponse = classification.askUser;
    } else if (classification.missingInputs.length > 0) {
      aiResponse = `Great! I can help you analyze a ${classification.scenarioType} scenario. ${classification.askUser}`;
      
      systemMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Scenario identified: ${classification.scenarioType.toUpperCase()}`,
        timestamp: new Date(),
        classification
      };
    } else {
      // All inputs provided, calculate the scenario
      const calculation = ScenarioCalculator.calculateScenario(
        classification.scenarioType,
        userProvidedInputs,
        currentMonthlyRevenue
      );

      // Save to revenue_scenarios table
      await saveScenarioToDatabase(classification, userProvidedInputs, calculation, userInput);

      aiResponse = `Here's your ${classification.scenarioType} analysis: ${calculation.recommendation}`;
      
      systemMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Calculation complete',
        timestamp: new Date(),
        classification,
        calculation
      };

      // Notify parent component
      if (onScenarioComplete) {
        onScenarioComplete(classification.scenarioType, userProvidedInputs, calculation);
      }
    }

    const aiMessage: ChatMessage = {
      id: (Date.now() + 2).toString(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date(),
      classification
    };

    const newMessages = systemMessage ? [aiMessage, systemMessage] : [aiMessage];
    setChatMessages(prev => [...prev, ...newMessages]);
    setUserInput('');
    setIsProcessing(false);
  };

  const updateInput = async (name: keyof UserProvidedInputs, value: number) => {
    const updatedInputs = { ...userProvidedInputs, [name]: value };
    setUserProvidedInputs(updatedInputs);

    // Check if we now have all required inputs
    if (currentClassification) {
      const newClassification = ScenarioClassifier.classifyUserInput(
        '', // Empty string since we're just checking inputs
        updatedInputs
      );
      
      if (newClassification.scenarioType === currentClassification.scenarioType) {
        setCurrentClassification(newClassification);
        
        // If all inputs are now provided, auto-calculate
        if (newClassification.missingInputs.length === 0) {
          const calculation = ScenarioCalculator.calculateScenario(
            newClassification.scenarioType,
            updatedInputs,
            currentMonthlyRevenue
          );

          // Save to revenue_scenarios table
          await saveScenarioToDatabase(newClassification, updatedInputs, calculation, '');

          const calculationMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'system',
            content: 'Auto-calculation complete',
            timestamp: new Date(),
            classification: newClassification,
            calculation
          };

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: `Perfect! Here's your updated analysis: ${calculation.recommendation}`,
            timestamp: new Date()
          };

          setChatMessages(prev => [...prev, calculationMessage, aiMessage]);

          if (onScenarioComplete) {
            onScenarioComplete(newClassification.scenarioType, updatedInputs, calculation);
          }
        }
      }
    }
  };

  const renderCalculationResult = (calculation: CalculationResult) => {
    const isPositive = calculation.monthlyImpact > 0;
    
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ${Math.abs(calculation.monthlyImpact).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Monthly {isPositive ? 'Increase' : 'Decrease'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{calculation.profitChange.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Profit Change
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ${calculation.annualImpact.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Annual Impact
            </div>
          </div>
          
          {calculation.breakEvenMonths && (
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {calculation.breakEvenMonths}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Months to Break Even
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Recommendation
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {calculation.recommendation}
              </div>
            </div>
          </div>
          
          {calculation.details.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Key Details:
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {calculation.details.map((detail, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Dynamic Scenario Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((message) => (
            <div key={message.id} className="space-y-2">
              {/* Main message */}
              <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'system'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : message.type === 'system' ? (
                      <Calculator className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>

              {/* Input form for missing inputs */}
              {message.classification && 
               message.classification.missingInputs.length > 0 && 
               message.type === 'ai' && (
                <div className="ml-8 mr-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Please provide the following information:
                      </span>
                    </div>
                    <ScenarioInputBuilder
                      scenarioType={message.classification.scenarioType}
                      fieldsToDisplay={getMissingFieldsForScenario(message.classification.scenarioType, message.classification.missingInputs)}
                      values={userProvidedInputs}
                      onChange={updateInput}
                    />
                  </div>
                </div>
              )}

              {/* Calculation results */}
              {message.calculation && (
                <div className="ml-8 mr-4">
                  {renderCalculationResult(message.calculation)}
                </div>
              )}
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm">Analyzing...</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask about pricing, hiring, marketing, or any business scenario..."
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && sendMessage()}
              disabled={isProcessing}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!userInput.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <strong>Try asking:</strong> "What if I raised my prices to $200?" or "Should I hire someone at $25/hour?"
          </div>
        </div>
      </CardContent>
    </Card>
  );
};