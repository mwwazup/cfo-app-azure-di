// API endpoint for AI chat - supports both Claude and OpenAI
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, systemPrompt, userMessage } = req.body;

  try {
    let response;

    if (model.includes('claude')) {
      // Call Claude
      const claudeResponse = await anthropic.messages.create({
        model: model,
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\nUser: ${userMessage}`
          }
        ]
      });
      response = claudeResponse.content[0].text;

    } else if (model.includes('gpt')) {
      // Call OpenAI
      const openaiResponse = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: 1000
      });
      response = openaiResponse.choices[0].message.content;

    } else {
      return res.status(400).json({ error: 'Unsupported model' });
    }

    return res.status(200).json({ response });

  } catch (error) {
    console.error('AI API Error:', error);
    return res.status(500).json({ 
      error: 'AI service unavailable',
      fallback: "I'm having trouble connecting to my AI systems. Can you rephrase your question?"
    });
  }
}
