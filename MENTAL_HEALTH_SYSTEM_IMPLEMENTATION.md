# BeaverBuddy 3-Layer Mental Health Check-in System

## Overview
A comprehensive progressive mental health assessment system designed for immigrant and refugee communities. The system uses a non-clinical, warm approach to detect mental health concerns and route users to appropriate support.

## System Architecture

### Layer 1: Initial Check-in (Dashboard)
**File:** `frontend/app/dashboard/page.tsx`

**Purpose:** Daily emotional check-in with initial feeling capture

**Features:**
- Beaver mascot greeting with personalized message
- Text input for sharing how user is feeling (minimum 20 characters)
- Real-time character count feedback
- Post-submission breathing exercise prompt
- Growth & streak tracking button

**Flow:**
1. User enters `/dashboard`
2. User types response to "How are you feeling today?"
3. User clicks "SUBMIT & VIEW QUESTS"
4. System displays breathing exercise prompt: "Would you like to pause for a moment?"
   - **Yes** → Routes to `/breathing-exercise?feeling=[encodedFeeling]`
   - **Skip** → Routes to `/quests`

**Data Storage:**
- Feeling text stored in component state during submission
- Quest data persisted to sessionStorage after successful submission

**Crisis Detection:**
- Backend analyzes submitted feeling text for crisis indicators
- If crisis detected: user locked out for 24 hours with access to emergency resources

---

### Layer 2: Severity Assessment (Screening)
**File:** `frontend/app/screening/page.tsx`

**Purpose:** Progressive severity assessment based on initial feeling

**Features:**
- 3 progressive screening questions with color-coded options
- Smooth question transitions with progress indicator
- Support context from Layer 1 check-in
- Routing based on responses

**Questions:**

**Question 1: Duration** (Color-coded severity)
- "How long has this been going on?"
- Options:
  - 🟢 "Just Today" (green) - Safe
  - 🟡 "A Few Days" (yellow) - Moderate
  - 🔴 "A Long Time" (red) - Prolonged → **Routes to crisis-followup**

**Question 2: Category** (Support area identification)
- "What area of life is this connected to?"
- Options:
  - 👨‍👩‍👧 "Family" (green)
  - 📚 "School/Work" (yellow)
  - 🌍 "Immigration" (red)
  - 💔 "Loneliness" (purple)
  - ✨ "Other" (blue)

**Question 3: Immediate Need** (Support routing)
- "Would you like something to help right now?"
- Options:
  - ⏃ "Short Exercise" → Routes to `/breathing-exercise`
  - 📝 "Reflection Time" → Routes to `/reflection`
  - ⏸️ "Not Now" → Routes to `/quests`

**Data Storage:**
- All responses saved to localStorage key: `mentalHealthScreening_${userId}`
- Includes timestamp and feeling context from Layer 1

**Access Points:**
- Can be accessed after breathing exercise (`/breathing-exercise`)
- Can be triggered from growth page trends analysis
- Can be accessed manually from navigation

---

### Layer 3: Crisis Detection & Support Routing
**File:** `frontend/app/crisis-followup/page.tsx`

**Purpose:** Crisis assessment and emergency support routing for users with prolonged issues

**Features:**
- 3-stage crisis assessment flow
- Support resource routing
- Crisis lockout system (24-hour pause on check-ins)
- Follow-up permission tracking
- Emergency information display

**Stage 1: Assessment**
- "How are you feeling now?"
- Options:
  - 🟢 "Better" → Proceed to Stage 3
  - 🟡 "Alright" → Proceed to Stage 3
  - 🟠 "Worse" → Show support resources (Stage 2)
  - 🔴 "I need help now" (CRISIS) → Show crisis resources immediately

**Stage 2: Support Resources**
- Shown if "Worse" or "I need help now" selected
- Options:
  - "Find Community Resources" → Routes to `/resources`
  - "Talk To Someone Locally" → Routes to `/local-help`
  - "Continue" → Proceed to Stage 3

**Stage 3: Follow-up Permission**
- "Can we check in with you later?"
- Options:
  - "Yes, please check in" → `permitFollowup: true`
  - "Not right now" → `permitFollowup: false`
- Routes to `/quests` after completion

**Crisis Lockout Logic:**
When user selects "I need help now":
- Set `crisisLockout_${userId}` = `true`
- Set `crisisLockoutTime_${userId}` = `Date.now() + 24 hours`
- User cannot access daily check-in for 24 hours
- Dashboard shows: "Crisis support active until [time]"
- Instead of check-in form, shows "🆘 VIEW EMERGENCY HELP" button

**Data Storage:**
```javascript
{
  "crisisFollowup_${userId}": {
    "timestamp": ISO8601,
    "stage1Assessment": "better|alright|worse|help",
    "resourcesChosen": ["community-resources", "local-help"],
    "permitFollowup": boolean,
    "crisisDetected": boolean
  },
  "crisisLockout_${userId}": "true|false",
  "crisisLockoutTime_${userId}": timestamp
}
```

---

## Supporting Pages

### Breathing Exercise (`/breathing-exercise/page.tsx`)
**Purpose:** Guided 4-minute breathing exercise for calming

**Features:**
- Animated circle that expands/contracts with breathing
- 5-breath guided exercise (40 seconds each cycle)
- Progress indicator (5 dots)
- Pre-exercise intro with skip option
- Post-exercise completion message
- Routes to either screening or quests

**Breathing Pattern:**
- Inhale: 2 seconds
- Hold: 2 seconds
- Exhale: 2 seconds
- Hold: 2 seconds

**Completion Routes:**
- "Continue to Quests" → Routes to `/quests`
- Can be skipped at intro stage

---

### Reflection (`/reflection/page.tsx`)
**Purpose:** Guided self-reflection through prompts

**Features:**
- 4 progressive reflection prompts
- Optional journaling section
- Gentle, supportive tone
- Saves reflection data

**Prompts:**
1. 💭 "What is one thing that happened today that surprised you?"
2. 🌱 "What is one small thing you did well today?"
3. 💪 "How did you handle something difficult today?"
4. 💗 "Is there someone who made you feel supported?"

**Data Storage:**
```javascript
{
  "reflection_${userId}": [
    {
      "date": ISO8601,
      "feeling": "original check-in feeling",
      "journalEntry": "user's reflection",
      "timestamp": timestamp
    }
  ]
}
```

---

### Community Resources (`/resources/page.tsx`)
**Purpose:** Directory of mental health and settlement resources

**Categories:**
- Mental Health Support (crisis lines, helplines)
- Immigration & Settlement Services
- Community Support Groups
- Education & Employment Resources

**Features:**
- Color-coded by category
- Emergency hotline crisis banner
- Emergency room finder
- Local emergency help routing

---

### Local Help (`/local-help/page.tsx`)
**Purpose:** Location-based emergency resources and helplines

**Features:**
- Emergency services (911)
- Crisis text/chat lines (24/7)
- Provincial hotlines (Canada-wide)
- Hospital/ER finder
- Immigrant-specific support
- Telehealth services
- Tips for seeking help

**Emergency Contacts:**
- 🚨 911 (Emergency)
- 💬 Text HOME to 741741 (Crisis Text Line)
- 📞 1-833-456-4566 (Canada Suicide Prevention)
- Provincial hotlines with 24/7 availability

---

## User Flow Diagram

```
Dashboard (Layer 1)
    ↓ [Submit Feeling]
Breathing Prompt
    ├─→ [Yes] → Breathing Exercise → Quests
    └─→ [Skip] → Quests

Optional from Breathing Exercise or Growth Page:
Screening (Layer 2)
    ↓ [Q1: Duration]
    ├─→ "Long Time" → Crisis Followup
    ├─→ "Just Today/Few Days"
    │   ↓ [Q2: Category]
    │   ↓ [Q3: Immediate Need]
    │   ├─→ "Short Exercise" → Breathing Exercise
    │   ├─→ "Reflection" → Reflection
    │   └─→ "Not Now" → Quests
    └─→ Quests

Crisis Followup (Layer 3)
    ↓ [Stage 1: Assessment]
    ├─→ "Better/Alright" → Stage 3 (Followup)
    ├─→ "Worse" → Stage 2 (Resources) → Stage 3
    └─→ "I need help now" → Stage 2 (Crisis Resources) → Stage 3
    ↓ [Stage 2: Resource Selection]
    ├─→ "Community Resources" → Resources Page
    ├─→ "Local Help" → Local Help Page
    └─→ "Continue" → Stage 3
    ↓ [Stage 3: Followup Permission]
    └─→ "Yes/No" → Quests (with 24hr lockout active)
```

---

## Data Flow & Storage

### LocalStorage Keys
| Key | Purpose | Value |
|-----|---------|-------|
| `mentalHealthScreening_${userId}` | Layer 2 responses | JSON object with duration, category, immediateNeed |
| `crisisFollowup_${userId}` | Layer 3 assessment data | JSON object with stage results |
| `crisisLockout_${userId}` | Crisis mode active flag | "true" or "false" |
| `crisisLockoutTime_${userId}` | When lockout expires | Timestamp (24 hours from activation) |
| `reflection_${userId}` | User reflections | Array of reflection objects |
| `growthCheckInHistory_${userId}` | Check-in history for trends | Array of check-in entries |
| `userLocation_${userId}` | User's location for resources | Object with city, province |

### SessionStorage Keys
| Key | Purpose |
|-----|---------|
| `journalPrompts_${userId}` | Daily journal prompts and responses |
| `generatedQuests_${userId}` | Today's generated quests |

---

## Integration Points

### Dashboard Integration ✅
- Added breathing exercise prompt after check-in submission
- Maintains original crisis detection from backend
- Routes to breathing exercise or quests based on user preference

### Growth Page Integration
- Can trigger screening from trends view
- Shows mental health history alongside growth metrics
- Reference point for crisis assessment

### Backend Integration
- Crisis detection happens on backend in `/api/quests/generate`
- Returns `isCrisis` flag and crisis data
- Frontend respects crisis lockout state

---

## Security & Privacy

**Confidentiality:**
- All data stored client-side in localStorage (user owns data)
- No backend storage of mental health screening data
- Location data optional and user-controlled
- Reflection entries stored locally only

**Safety:**
- Crisis detection prioritizes user safety
- 24-hour lockout after crisis detection
- Clear emergency hotlines always visible
- Supports both online and in-person resources

---

## Accessibility Features

- Clear color coding (green=safe, yellow=moderate, red=urgent)
- Large touch targets for mobile
- Readable fonts and spacing
- Emoji support for visual recognition
- Multiple routing options at each stage
- Optional prompts with skip buttons

---

## Non-Clinical Design Principles

The system is intentionally non-clinical:
- Uses warm, supportive language
- Avoids diagnostic terminology
- Emphasizes community and connection
- Shows beaver mascot as supportive companion
- Celebrates small wins
- Respects user autonomy with skip options

---

## Testing Checklist

- [ ] Dashboard breathing prompt displays correctly
- [ ] Breathing exercise animation works smoothly
- [ ] Screening questions route correctly based on answers
- [ ] Crisis followup shows for "Long Time" selection
- [ ] Crisis lockout prevents check-ins for 24 hours
- [ ] Crisis hotlines display in resources/local-help
- [ ] All localStorage data persists correctly
- [ ] Mobile touch targets are large enough
- [ ] Back buttons work on all pages
- [ ] Skip options work on all pages
- [ ] Routes work with and without query parameters

---

## Future Enhancements

1. **Backend Integration:**
   - Store screening/crisis data for follow-up
   - Analytics on mental health trends
   - Integration with external helplines

2. **Advanced Features:**
   - Daily follow-up check-ins (if user opted in)
   - Mood tracking dashboard
   - Personalized resource recommendations
   - Integration with local mental health providers

3. **Internationalization:**
   - Translate screening questions
   - Localized helpline numbers
   - Cultural considerations in prompts

4. **AI Enhancements:**
   - More sophisticated crisis detection
   - Personalized resource recommendations
   - Sentiment analysis of check-in text
   - Pattern detection in mood trends
