# SMS Coach - AI Business Coach Interface

## Overview
The SMS Coach provides a modern, WhatsApp-style chat interface for interacting with your AI business coach. It combines voice recognition, text input, conversation management, and integration with your financial data.

## Features Implemented

### ✅ Core Features
- **Round Microphone Button**: Press and hold to record voice messages
- **SMS-Style Chat Interface**: Modern chat bubbles with timestamps
- **Conversation History**: Sidebar with saved conversations
- **Save Conversations**: Save important coaching sessions
- **Tags System**: Add tags to conversations for easy organization
- **Real-time Voice Recognition**: Browser-based speech-to-text
- **Backend Integration**: Connects to existing Voice Coach V2 API

### ✅ User Experience
- **Responsive Design**: Works on desktop and mobile
- **Visual Feedback**: Recording pulse animation, typing indicators
- **Accessibility**: Focus states and keyboard navigation
- **Error Handling**: Graceful fallbacks for API failures
- **Auto-scroll**: Messages automatically scroll to bottom

### ✅ Technical Features
- **TypeScript Support**: Full type safety with speech recognition
- **CSS Animations**: Smooth transitions and micro-interactions
- **Local Storage**: Conversation history persistence
- **Mobile Optimized**: Touch-friendly interface

## File Structure

```
src/
├── pages/coach/
│   └── sms-coach.tsx           # Main SMS Coach component
├── styles/
│   └── sms-coach.css           # Custom styles and animations
├── types/
│   └── speech-recognition.d.ts # TypeScript declarations
└── components/layout/
    └── dashboard-layout.tsx    # Updated navigation
```

## Navigation
- Access via: `/coach/sms`
- Navigation item: "SMS Coach" in sidebar
- Icon: MessageCircle (Lucide React)

## API Integration
- **Endpoint**: `http://localhost:8000/api/voice-coach/v2/ask-fixed`
- **Method**: POST
- **Payload**: `{ user_id: string, question: string }`
- **Response**: `{ answer: string }`

## Usage Instructions

### Voice Input
1. Press and hold the blue microphone button
2. Speak your question clearly
3. Release the button when finished
4. The system will process your speech and send to AI coach

### Text Input
1. Type your message in the text input field
2. Press Enter or click the send button
3. Your message will be sent to the AI coach

### Conversation Management
1. **Save Conversation**: Click the save icon in the header
2. **Add Tags**: Click the tag icon and type tag names
3. **View History**: Click the message icon to open sidebar
4. **New Conversation**: Click the trash icon to start fresh

### Conversation History
- **Sidebar**: Shows all saved conversations
- **Timestamps**: Each conversation shows creation date/time
- **Tags**: Up to 3 tags displayed per conversation
- **Click to Load**: Click any conversation to resume it

## Browser Compatibility
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile**: iOS Safari, Chrome Mobile

## Dependencies
- React 18+
- Lucide React (icons)
- Tailwind CSS (styling)
- Web Speech API (voice recognition)

## Styling
- **Theme**: Dark mode with gray color scheme
- **Animations**: CSS keyframes for smooth interactions
- **Responsive**: Mobile-first design approach
- **Accessibility**: WCAG compliant focus states

## Backend Requirements
- Voice Coach V2 API running on localhost:8000
- User authentication system
- Coaching history service (for saving conversations)

## Future Enhancements
- [ ] Conversation search functionality
- [ ] Export conversations to PDF
- [ ] Voice playback of coach responses
- [ ] Conversation sharing
- [ ] Advanced filtering and sorting
- [ ] Conversation analytics

## Testing
To test the SMS Coach:
1. Navigate to `/coach/sms` in the application
2. Try both voice and text input
3. Test conversation saving and tagging
4. Verify history sidebar functionality
5. Test on mobile devices

## Troubleshooting

### Voice Recognition Issues
- Ensure microphone permissions are granted
- Check browser compatibility
- Verify HTTPS connection (required for speech API)

### API Connection Issues
- Verify backend server is running on localhost:8000
- Check network connectivity
- Review browser console for error messages

### Styling Issues
- Ensure sms-coach.css is properly imported
- Verify Tailwind CSS is configured
- Check for CSS conflicts

## Performance Considerations
- Conversations are stored in component state
- Large conversation histories may impact performance
- Consider implementing pagination for history
- Voice recognition runs locally (no server processing)

---

**Status**: ✅ Production Ready
**Last Updated**: September 18, 2025
**Version**: 1.0.0
