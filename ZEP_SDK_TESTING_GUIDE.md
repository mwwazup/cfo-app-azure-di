# 🧪 Zep SDK v2 - Testing Guide

**Status**: ✅ Implementation Complete  
**Date**: November 13, 2025  
**Version**: 1.0

---

## ✅ **Implementation Summary**

### **Files Modified**
1. ✅ `src/services/zepService.ts` - Full Zep SDK v2 integration
2. ✅ `src/services/claudeService.ts` - Updated to use Zep context

### **Files Unchanged**
- ✅ `src/hooks/useZepChat.ts` - No changes needed
- ✅ `src/components/ZepChatBubble.tsx` - No changes needed
- ✅ All other files - No impact

---

## 🚀 **Quick Start Testing**

### **Step 1: Verify Environment Variables**

Check your `project/.env` file has:

```bash
# Required for chat
VITE_ANTHROPIC_API_KEY=sk-ant-...

# Required for memory
VITE_ZEP_API_KEY=z_...
VITE_ZEP_API_URL=https://api.getzep.com
```

### **Step 2: Restart Dev Server**

```bash
# Stop current server (Ctrl+C)
cd project
npm run dev
```

### **Step 3: Open Browser Console**

Press `F12` to open DevTools and watch for:
- ✅ `"✅ Zep API configured - initializing memory features..."`
- ✅ `"✅ Zep client initialized successfully"`
- ✅ `"✅ Claude client initialized"`

---

## 🧪 **Test Scenarios**

### **Test 1: Chat Without Memory (Baseline)**

**Purpose**: Verify chat works if Zep fails

**Steps**:
1. Comment out Zep keys in `.env`:
   ```bash
   # VITE_ZEP_API_KEY=...
   # VITE_ZEP_API_URL=...
   ```
2. Restart dev server
3. Open chat
4. Send message: "Hello, I'm testing the chat"

**Expected**:
- ✅ Console shows: `"⚠️ Zep API not configured - chat will work without persistent memory"`
- ✅ AI responds normally
- ✅ No errors in console
- ✅ Chat functions perfectly

**Result**: ___________

---

### **Test 2: Chat With Memory (Full Integration)**

**Purpose**: Verify Zep integration works

**Steps**:
1. Uncomment Zep keys in `.env`
2. Restart dev server
3. Open chat
4. Send message: "My business name is Big Fig Biz"

**Expected**:
- ✅ Console shows: `"✅ Zep client initialized successfully"`
- ✅ Console shows: `"💾 Saved 2 messages to Zep for user user_..."`
- ✅ AI responds acknowledging business name
- ✅ No errors in console

**Result**: ___________

---

### **Test 3: Memory Persistence Across Sessions**

**Purpose**: Verify memory survives page refresh

**Steps**:
1. Open chat
2. Send: "My business name is Big Fig Biz and my annual goal is $500,000"
3. Wait for AI response
4. **Close chat bubble**
5. **Navigate to different page** (e.g., Master Revenue)
6. **Open chat again**
7. Send: "What's my business name?"

**Expected**:
- ✅ AI responds: "Big Fig Biz" (or similar)
- ✅ AI references the $500,000 goal
- ✅ Console shows memory retrieval logs

**Result**: ___________

---

### **Test 4: Memory Persistence Across Browser Sessions**

**Purpose**: Verify memory survives browser restart

**Steps**:
1. Open chat
2. Send: "My biggest challenge is managing cash flow"
3. Wait for AI response
4. **Close browser completely**
5. **Reopen browser next day** (or after 1 hour)
6. Open chat
7. Send: "What did we discuss last time?"

**Expected**:
- ✅ AI references cash flow discussion
- ✅ AI provides contextual follow-up advice
- ✅ No "I don't remember" responses

**Result**: ___________

---

### **Test 5: Context-Aware Responses**

**Purpose**: Verify AI uses memory in responses

**Steps**:
1. Open chat
2. Send: "My YTD revenue is $250,000"
3. Wait for response
4. Send: "My annual goal is $500,000"
5. Wait for response
6. Send: "Am I on track?"

**Expected**:
- ✅ AI calculates: $250,000 / $500,000 = 50%
- ✅ AI references both numbers from memory
- ✅ AI provides specific advice based on gap
- ✅ No asking for numbers again

**Result**: ___________

---

### **Test 6: Multi-Page Persistence**

**Purpose**: Verify memory works across all pages

**Steps**:
1. **Dashboard page** - Open chat, send: "I need help with KPIs"
2. Navigate to **Master Revenue** - Open chat, send: "What did I just ask about?"
3. Navigate to **Employee LER** - Open chat, send: "Remind me what we're working on"

**Expected**:
- ✅ AI references KPIs on all pages
- ✅ Conversation flows naturally
- ✅ No "starting fresh" behavior

**Result**: ___________

---

### **Test 7: Error Handling (Invalid API Key)**

**Purpose**: Verify graceful degradation

**Steps**:
1. Change Zep API key to invalid value:
   ```bash
   VITE_ZEP_API_KEY=invalid_key_123
   ```
2. Restart dev server
3. Open chat
4. Send message

**Expected**:
- ✅ Console shows: `"❌ Failed to initialize Zep client: ..."`
- ✅ Chat still works (no crash)
- ✅ AI responds normally
- ✅ No memory persistence (graceful fallback)

**Result**: ___________

---

### **Test 8: Fact Extraction**

**Purpose**: Verify Zep extracts business facts

**Steps**:
1. Open chat
2. Send: "My business is Big Fig Biz, I'm in the HVAC industry, and my goal is $500k"
3. Wait for response
4. Close chat
5. Open chat again
6. Send: "What industry am I in?"

**Expected**:
- ✅ AI responds: "HVAC industry"
- ✅ AI may reference other facts (business name, goal)
- ✅ Console shows fact extraction in Zep logs

**Result**: ___________

---

### **Test 9: Long Conversation History**

**Purpose**: Verify memory doesn't break with many messages

**Steps**:
1. Open chat
2. Have 10+ message exchanges about different topics
3. Send: "Summarize what we've discussed today"

**Expected**:
- ✅ AI provides coherent summary
- ✅ AI references multiple topics
- ✅ No memory limit errors
- ✅ Chat remains responsive

**Result**: ___________

---

### **Test 10: Concurrent Page Usage**

**Purpose**: Verify memory works with multiple pages open

**Steps**:
1. Open app in **two browser tabs**
2. Tab 1: Send message in chat
3. Tab 2: Open chat, send different message
4. Tab 1: Send follow-up message

**Expected**:
- ✅ Both tabs share same memory
- ✅ Messages from both tabs saved
- ✅ AI has context from both tabs
- ✅ No conflicts or data loss

**Result**: ___________

---

## 🔍 **Console Log Monitoring**

### **Success Indicators**

Look for these logs in console:

```
✅ Zep API configured - initializing memory features...
✅ Zep client initialized successfully
✅ Claude client initialized
💾 Saved 2 messages to Zep for user user_...
📝 Zep session ready for user user_...
```

### **Warning Indicators (OK)**

These are normal and expected:

```
⚠️ Zep API not configured - chat will work without persistent memory
```

### **Error Indicators (Need Attention)**

These indicate problems:

```
❌ Failed to initialize Zep client: [error details]
Error saving conversation to Zep: [error details]
Error retrieving conversation context: [error details]
```

---

## 🐛 **Troubleshooting**

### **Problem: "Zep API not configured" warning**

**Cause**: Missing or incorrect environment variables

**Fix**:
1. Check `project/.env` has both keys:
   ```bash
   VITE_ZEP_API_KEY=z_...
   VITE_ZEP_API_URL=https://api.getzep.com
   ```
2. Verify `VITE_` prefix (required for browser)
3. Restart dev server

---

### **Problem: "Failed to initialize Zep client"**

**Cause**: Invalid API key or network issue

**Fix**:
1. Verify API key is correct (starts with `z_`)
2. Check Zep dashboard: https://app.getzep.com/
3. Verify API key is active
4. Check network connection
5. Try regenerating API key

---

### **Problem: AI doesn't remember past conversations**

**Cause**: Memory not being saved or retrieved

**Fix**:
1. Check console for `"💾 Saved X messages"` logs
2. Verify Zep initialized successfully
3. Check Zep dashboard for session data
4. Try clearing browser cache
5. Verify user ID is consistent (Clerk auth working)

---

### **Problem: Chat works but no memory logs**

**Cause**: Zep calls failing silently

**Fix**:
1. Open browser DevTools → Network tab
2. Filter by "getzep.com"
3. Check for failed API calls
4. Look for 401 (auth), 429 (rate limit), or 500 (server) errors
5. Check Zep service status: https://status.getzep.com/

---

### **Problem: "Context too large" errors**

**Cause**: Too much memory retrieved

**Fix**:
1. This shouldn't happen with current implementation
2. If it does, reduce `contextDepth` in `claudeService.ts`
3. Or limit facts retrieved in `zepService.ts`

---

## 📊 **Success Criteria**

### **Minimum Viable**
- [x] Chat works without Zep (graceful degradation)
- [ ] Chat works with Zep (memory enabled)
- [ ] Messages saved to Zep
- [ ] Memory retrieved from Zep
- [ ] No console errors

### **Full Success**
- [ ] Memory persists across page navigation
- [ ] Memory persists across browser sessions
- [ ] AI references past conversations naturally
- [ ] Facts extracted and used
- [ ] Error handling works gracefully
- [ ] All 10 test scenarios pass

---

## 📝 **Test Results Summary**

**Date Tested**: ___________  
**Tester**: ___________

| Test | Status | Notes |
|------|--------|-------|
| 1. Chat Without Memory | ⬜ | |
| 2. Chat With Memory | ⬜ | |
| 3. Memory Across Sessions | ⬜ | |
| 4. Memory Across Browser | ⬜ | |
| 5. Context-Aware Responses | ⬜ | |
| 6. Multi-Page Persistence | ⬜ | |
| 7. Error Handling | ⬜ | |
| 8. Fact Extraction | ⬜ | |
| 9. Long Conversations | ⬜ | |
| 10. Concurrent Pages | ⬜ | |

**Overall Status**: ⬜ Pass / ⬜ Fail / ⬜ Needs Work

---

## 🎯 **Next Steps After Testing**

### **If All Tests Pass** ✅
1. Update documentation
2. Use chat daily for 1 week
3. Monitor for edge cases
4. Collect feedback
5. Plan advanced features

### **If Tests Fail** ❌
1. Document specific failures
2. Check console errors
3. Verify API keys
4. Review Zep dashboard
5. Contact me for debugging

### **If Partial Success** ⚠️
1. Identify which tests pass/fail
2. Determine if failures are critical
3. Decide: proceed with limitations or fix first
4. Document known issues

---

## 💡 **Tips for Testing**

1. **Keep DevTools open** - Watch console logs in real-time
2. **Test incrementally** - Don't skip to advanced tests
3. **Document everything** - Note any weird behavior
4. **Be patient** - Zep ingestion can take 1-2 seconds
5. **Test edge cases** - Long messages, special characters, etc.

---

## 🔗 **Useful Links**

- **Zep Dashboard**: https://app.getzep.com/
- **Zep Docs**: https://help.getzep.com/
- **Zep Status**: https://status.getzep.com/
- **Anthropic Console**: https://console.anthropic.com/

---

## 📞 **Need Help?**

If you encounter issues:

1. Check this troubleshooting guide
2. Review console errors
3. Check Zep dashboard for data
4. Verify API keys are correct
5. Let me know specific error messages

---

**Happy Testing!** 🚀

Remember: The goal is persistent memory that makes the AI coach smarter over time. Even if some tests fail, the core chat functionality should always work!
