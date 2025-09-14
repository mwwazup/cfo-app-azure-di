# Voice Assistant Implementation

This document provides an overview of the voice assistant feature implemented in the application, including setup instructions, architecture, and usage guidelines.

## Features

- **Voice Input**: Users can speak to the assistant using their device's microphone
- **AI-Powered Responses**: Integration with AI services for intelligent responses
- **Text-to-Speech**: Natural-sounding voice responses
- **Conversation History**: Maintains context across multiple interactions
- **Responsive UI**: Works on both desktop and mobile devices
- **Secure**: Implements proper authentication and authorization

## Architecture

```
src/
├── components/
│   ├── VoiceInput.tsx        # Handles speech recognition
│   ├── GeminiTTS.tsx         # Text-to-speech component
│   ├── VoiceAssistant.tsx    # Main voice assistant UI
│   └── ...
├── hooks/
│   └── useVoiceAssistant.ts  # Manages conversation state
├── pages/
│   └── api/
│       └── chat.ts           # API route for AI processing
└── types/
    └── speech.d.ts           # TypeScript declarations for Web Speech API
```

## Setup Instructions

### Prerequisites

1. Node.js 16+ and npm/yarn
2. Supabase project with authentication enabled
3. Web Speech API support in the browser (most modern browsers)

### Environment Variables

Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=your_supabase_functions_url
```

### Database Setup

Run the database migration to create the required tables:

```sql
-- Run this in your Supabase SQL editor
\i migrations/20230913_create_chat_interactions.sql
```

## Usage

### Basic Usage

1. Click the microphone icon in the bottom-right corner to open the voice assistant
2. Click the microphone button and speak your query
3. The assistant will process your request and respond with voice and text

### Available Voice Commands

- "What can you help me with?" - List available features
- "Search for [query]" - Search for information
- "Navigate to [page]" - Navigate to different sections
- "Clear conversation" - Start a new conversation

## Customization

### Changing the Voice

You can modify the voice in `GeminiTTS.tsx` by changing the `voiceName` prop. Available voices depend on the TTS service you're using.

### Extending Functionality

To add new commands or modify behavior:

1. Update the `generateAIResponse` function in `pages/api/chat.ts`
2. Add new handlers for specific command patterns
3. Update the UI in `VoiceAssistant.tsx` as needed

## Error Handling

Common issues and solutions:

- **Microphone Access Denied**: Ensure the browser has permission to access the microphone
- **No Speech Detected**: Check your microphone and try speaking louder
- **Network Errors**: Verify your internet connection and API endpoints

## Security Considerations

- All API endpoints require authentication
- User data is stored securely in Supabase with RLS policies
- Audio data is processed client-side and not stored without consent

## Performance

- Audio processing happens in Web Workers to prevent UI blocking
- Responses are cached to reduce API calls
- Large responses are streamed when possible

## Testing

Run the test suite:

```bash
npm test
```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to your hosting provider (Vercel, Netlify, etc.)

## Troubleshooting

Check the browser console for error messages. Common issues include:

- Missing environment variables
- CORS issues with the API
- Microphone permissions

## License

[Your License Here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
