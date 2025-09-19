# ReplySage UX Mockups and Design System

This document contains UX mockups, design guidelines, and user flow diagrams for the ReplySage browser extension.

## Design Principles

### 1. Privacy-First Design
- **Clear Consent**: Explicit opt-in for all data processing
- **Transparency**: Always show what data is being processed
- **Control**: Easy access to privacy settings and data controls

### 2. Local-First Experience
- **Fast Response**: Immediate feedback for local processing
- **Offline Capable**: Works without internet connection
- **Progressive Enhancement**: Cloud features as optional upgrades

### 3. Minimal Intrusion
- **Non-Disruptive**: Doesn't interfere with normal email workflow
- **Contextual**: Appears when relevant
- **Dismissible**: Easy to hide or minimize

## Color Palette

### Primary Colors
```css
--primary-50: #eff6ff
--primary-500: #3b82f6
--primary-600: #2563eb
--primary-700: #1d4ed8
```

### Neutral Colors
```css
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-800: #1f2937
--gray-900: #111827
```

### Status Colors
```css
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

### Font Sizes
```css
--text-xs: 12px
--text-sm: 14px
--text-base: 16px
--text-lg: 18px
--text-xl: 20px
--text-2xl: 24px
--text-3xl: 32px
```

## Component Library

### 1. Sidebar Component

```
┌─────────────────────────────────┐
│ ReplySage                [×]   │
├─────────────────────────────────┤
│ 📧 Meeting Follow-up            │
│ From: john@company.com          │
│ To: you@company.com             │
│ Attachments: 2                  │
├─────────────────────────────────┤
│ [🔍 Analyze Email]              │
├─────────────────────────────────┤
│ 📝 Summary                      │
│ This email is about the project │
│ deadline and next steps...      │
├─────────────────────────────────┤
│ ✅ Action Items                 │
│ • Review proposal by Friday     │
│ • Schedule follow-up meeting    │
│ • Send updated timeline         │
├─────────────────────────────────┤
│ 💬 Suggested Replies            │
│ [Formal] [Casual] [Concise]     │
│ ┌─────────────────────────────┐ │
│ │ Thanks for the update. I'll │ │
│ │ review the proposal and get │ │
│ │ back to you by Friday.      │ │
│ └─────────────────────────────┘ │
│ [Use This Reply]                │
└─────────────────────────────────┘
```

### 2. Popup Component

```
┌─────────────────────────────────┐
│ ReplySage                ● Ready│
├─────────────────────────────────┤
│ [🔍 Analyze Current Email]      │
│ [⚙️ Settings]                   │
├─────────────────────────────────┤
│ Today's Activity                │
│ ┌─────┬─────┬─────┐             │
│ │  12 │  5  │  8  │             │
│ │Emails│Items│Replies│           │
│ └─────┴─────┴─────┘             │
├─────────────────────────────────┤
│ Recent Analysis                 │
│ • Project update - 2:30 PM      │
│ • Meeting request - 1:15 PM     │
│ • Budget approval - 11:45 AM    │
├─────────────────────────────────┤
│ Quick Help                      │
│ • Click "Analyze" to process    │
│ • Use sidebar for details       │
│ • Configure in settings         │
└─────────────────────────────────┘
```

### 3. Settings Page

```
┌─────────────────────────────────┐
│ ReplySage Settings              │
├─────────────────────────────────┤
│ Processing Options              │
│ ☑ Enable Local Processing       │
│ ☐ Enable Cloud Fallback         │
│   ┌─────────────────────────────┐│
│   │ API Key: [••••••••••••••••]││
│   └─────────────────────────────┘│
├─────────────────────────────────┤
│ Privacy & Security              │
│ ☑ Enable PII Redaction          │
│ ☑ Enable Caching                │
│ ☐ Enable Analytics              │
├─────────────────────────────────┤
│ AI Preferences                  │
│ Tone: [Casual ▼]                │
│ Length: [████████░░] 200 words  │
│ ☐ Enable Thread Analysis        │
│ ☐ Enable Similarity Search      │
├─────────────────────────────────┤
│ Data Management                 │
│ [Clear Cache] [Export Data]     │
│ [Import Data]                   │
├─────────────────────────────────┤
│ [Save Settings] [Reset Defaults]│
└─────────────────────────────────┘
```

## User Flows

### 1. First-Time User Flow

```
User installs extension
         ↓
Welcome modal appears
         ↓
Privacy consent screen
         ↓
Choose processing mode
    (Local/Cloud/Both)
         ↓
Configure basic settings
         ↓
Extension ready to use
```

### 2. Email Analysis Flow

```
User opens email in Gmail
         ↓
ReplySage sidebar appears
         ↓
User clicks "Analyze Email"
         ↓
Local processing starts
         ↓
Results displayed in sidebar
         ↓
User can interact with results
    (Use reply, Add to calendar)
```

### 3. Cloud Fallback Flow

```
Local processing fails or
user requests heavy task
         ↓
Show consent modal with
redacted text preview
         ↓
User confirms cloud processing
         ↓
Send to cloud with user's API key
         ↓
Display enhanced results
```

## Responsive Design

### Desktop (1200px+)
- Sidebar: 400px width
- Full feature set available
- Hover states and animations

### Tablet (768px - 1199px)
- Sidebar: 350px width
- Simplified interactions
- Touch-friendly controls

### Mobile (320px - 767px)
- Sidebar: Full width, bottom sheet
- Essential features only
- Large touch targets

## Accessibility

### Keyboard Navigation
- Tab order follows logical flow
- All interactive elements accessible
- Skip links for screen readers

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for dynamic content

### Visual Accessibility
- High contrast mode support
- Scalable text and icons
- Color-blind friendly palette

## Animation and Transitions

### Micro-interactions
- Button hover states (0.2s ease)
- Loading spinners (1s linear)
- Success/error notifications (0.3s ease)

### Page Transitions
- Sidebar slide-in (0.3s ease-out)
- Modal fade-in (0.2s ease)
- Content updates (0.15s ease)

## Error States

### 1. Model Loading Failed
```
┌─────────────────────────────────┐
│ ⚠️ Model Loading Failed         │
├─────────────────────────────────┤
│ The AI model couldn't be loaded.│
│ This might be due to:           │
│ • Slow internet connection      │
│ • Browser compatibility issues  │
│ • Missing model files           │
├─────────────────────────────────┤
│ [Retry] [Download Models]       │
│ [Use Basic Mode]                │
└─────────────────────────────────┘
```

### 2. Cloud Processing Failed
```
┌─────────────────────────────────┐
│ ❌ Cloud Processing Failed      │
├─────────────────────────────────┤
│ Unable to process with cloud AI.│
│ Possible causes:                │
│ • Invalid API key               │
│ • Rate limit exceeded           │
│ • Network connection issue      │
├─────────────────────────────────┤
│ [Check API Key] [Retry]         │
│ [Use Local Processing]          │
└─────────────────────────────────┘
```

### 3. No Email Detected
```
┌─────────────────────────────────┐
│ 📧 No Email Detected            │
├─────────────────────────────────┤
│ ReplySage couldn't find an      │
│ email to analyze. Make sure:    │
│ • You're viewing an email       │
│ • The email is fully loaded     │
│ • Gmail is in standard view     │
├─────────────────────────────────┤
│ [Refresh] [Try Again]           │
└─────────────────────────────────┘
```

## Loading States

### 1. Initial Loading
```
┌─────────────────────────────────┐
│ ReplySage                ⏳ Loading│
├─────────────────────────────────┤
│ [████████████████████████████]  │
│ Loading AI models...            │
│ This may take a few moments     │
└─────────────────────────────────┘
```

### 2. Analysis in Progress
```
┌─────────────────────────────────┐
│ ReplySage                ⏳ Analyzing│
├─────────────────────────────────┤
│ 📧 Meeting Follow-up            │
│ From: john@company.com          │
├─────────────────────────────────┤
│ [████████████████████████████]  │
│ Analyzing email content...      │
│ Generating summary and actions  │
└─────────────────────────────────┘
```

## Success States

### 1. Analysis Complete
```
┌─────────────────────────────────┐
│ ReplySage                ✅ Complete│
├─────────────────────────────────┤
│ 📧 Meeting Follow-up            │
│ From: john@company.com          │
├─────────────────────────────────┤
│ ✅ Analysis complete!           │
│ Found 3 action items and        │
│ generated 2 reply suggestions.  │
└─────────────────────────────────┘
```

### 2. Settings Saved
```
┌─────────────────────────────────┐
│ ✅ Settings Saved Successfully  │
├─────────────────────────────────┤
│ Your preferences have been      │
│ updated and will take effect    │
│ immediately.                    │
└─────────────────────────────────┘
```

## Dark Mode Support

### Color Adjustments
- Background: Dark gray (#1a1a1a)
- Text: Light gray (#e5e5e5)
- Borders: Medium gray (#333)
- Accents: Maintained for accessibility

### Component Examples
```
┌─────────────────────────────────┐
│ ReplySage                [×]   │
├─────────────────────────────────┤
│ 📧 Meeting Follow-up            │
│ From: john@company.com          │
│ To: you@company.com             │
├─────────────────────────────────┤
│ [🔍 Analyze Email]              │
├─────────────────────────────────┤
│ 📝 Summary                      │
│ This email is about the project │
│ deadline and next steps...      │
└─────────────────────────────────┘
```

## Implementation Notes

### CSS Custom Properties
```css
:root {
  --sidebar-width: 400px;
  --sidebar-width-mobile: 100%;
  --border-radius: 8px;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  --transition: all 0.2s ease;
}
```

### Responsive Breakpoints
```css
@media (max-width: 1200px) {
  --sidebar-width: 350px;
}

@media (max-width: 768px) {
  --sidebar-width: 100%;
}
```

### Animation Classes
```css
.slide-in {
  animation: slideIn 0.3s ease-out;
}

.fade-in {
  animation: fadeIn 0.2s ease;
}

.pulse {
  animation: pulse 2s infinite;
}
```

This design system ensures consistency across all ReplySage components while maintaining a focus on privacy, usability, and accessibility.
