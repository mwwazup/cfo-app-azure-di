# 🚀 Zep Chat - Quick Start Guide

## ⚡ **Get Chat Working in 3 Steps**

### **Step 1: Add Your API Key** (2 minutes)

Open your `.env` file and add:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-[paste_your_key_here]
```

**Don't have a key?**
1. Go to: https://console.anthropic.com/
2. Sign up (free $5 credit)
3. Create API key
4. Copy and paste into `.env`

---

### **Step 2: Restart Dev Server** (30 seconds)

```bash
# Stop current server (Ctrl+C)
# Start again:
npm run dev
```

---

### **Step 3: Test It!** (1 minute)

1. Open app in browser
2. Look for blue chat bubble (bottom right)
3. Click it
4. Type: "What is my YTD revenue?"
5. Watch AI respond!

---

## ✅ **That's It!**

Chat is now working on ALL pages:
- Dashboard
- Master Revenue  
- Budget vs Actual
- Service Mix
- Business Intelligence
- Employee LER
- Bonus ROI
- Financial Statements
- Your Big FIG
- PERL Coach
- Momentum Tracker

---

## 🎯 **Try These Questions**

- "What is my YTD revenue?"
- "How am I tracking against my goals?"
- "Explain my profit margin"
- "What should I focus on this month?"
- "How do I improve my LER?"

---

## 🐛 **Not Working?**

### **Chat bubble doesn't appear**
- Check: Is dev server running?
- Check: Are you on a dashboard page?

### **AI doesn't respond**
- Check: Did you add `VITE_ANTHROPIC_API_KEY` to `.env`?
- Check: Did you restart dev server?
- Check: Is API key valid? (starts with `sk-ant-`)

### **Console errors**
- Zep warnings are normal (chat works without Zep)
- Other errors: Check implementation doc

---

## 📖 **Full Documentation**

See `ZEP_CHAT_IMPLEMENTATION_COMPLETE.md` for:
- Complete feature list
- Troubleshooting guide
- Architecture details
- Future enhancements

---

## 💡 **Tips**

- Chat minimizes - click minimize button
- Chat persists across pages
- Press Enter to send message
- Scroll up to see history
- Click X to close

---

**Enjoy your new AI CFO coach!** 🎉
