# CSV Upload UX Improvements

## Features Implemented

### 1. Pulsating "Calculate All" Button
**When:** After successfully importing CSV data
**Why:** Alerts the user that they need to recalculate bonuses and LER for the imported records
**How it works:**
- After CSV import completes successfully, the "Calculate All" button:
  - Pulsates with `animate-pulse` animation
  - Gets a highlighted border (`border-accent border-2`)
  - Background changes to `bg-accent/10`
  - Icon turns accent color
- The pulsating stops when the user clicks "Calculate All"

**Code changes:**
- Added `needsCalculation` state to track when CSV was imported
- Set `needsCalculation = true` after successful CSV import
- Set `needsCalculation = false` when "Calculate All" is clicked
- Applied conditional styling to the button

### 2. Surf-Themed Loading Animation
**When:** While CSV data is being imported/processed
**Why:** Provides visual feedback that the system is working and keeps the user engaged
**How it works:**
- Import button text rotates through surf-themed words:
  - "surfing"
  - "swimming"
  - "board"
  - "paddling"
  - "riding"
- Each word displays for 500ms with a pulse animation
- Rotation continues until import completes

**Code changes:**
- Added `loadingText` state to track current surf word
- Added `useEffect` hook to rotate through messages every 500ms while `isProcessing` is true
- Updated button text to show animated loading state

## Files Modified

### 1. `project/src/components/employee/CSVUploadDialog.tsx`
- Added `loadingText` state
- Added `useEffect` for rotating surf messages
- Updated Import button to show animated loading text

### 2. `project/src/pages/EmployeeLERPage.tsx`
- Added `needsCalculation` state
- Set state to true after successful CSV import
- Clear state when "Calculate All" is clicked
- Applied pulsating styles to "Calculate All" button when needed

## User Experience Flow

1. **User uploads CSV** → File is parsed and validated
2. **User clicks "Import X Records"** → Button shows rotating surf words ("surfing...", "swimming...", etc.)
3. **Import completes** → Success message appears
4. **"Calculate All" button pulsates** → User sees they need to take action
5. **User clicks "Calculate All"** → Pulsating stops, calculations run
6. **Done!** → All records updated with correct bonuses and LER

## Benefits

- **Clear visual feedback** during processing
- **Fun, on-brand** loading animation (surf theme)
- **Obvious next step** (pulsating Calculate All button)
- **Prevents user confusion** about what to do after import
- **Reduces support questions** about "why aren't my bonuses calculated?"
