# Reform - AI-Powered Physical Therapy Platform

Reform is a web application that helps users perform physical therapy exercises at home with real-time form feedback using computer vision. The platform uses MediaPipe pose detection to analyze exercise form, count repetitions, and provide instant coaching cues.

## Features

### 🎯 Core Functionality

- **Real-time Form Analysis**: Uses MediaPipe Vision API to analyze exercise form in real-time through your webcam
- **Automatic Rep Counting**: Detects and counts exercise repetitions automatically
- **Form Scoring**: Provides quality scores for each repetition based on form analysis
- **Voice Coaching**: Audio feedback and coaching instructions during exercises
- **Exercise Plans**: Create and manage personalized PT exercise plans
- **Progress Tracking**: Session summaries with detailed analytics and improvement trends
- **Multiple Exercise Types**: Supports various exercises including:
  - Squats
  - Lunges
  - Shoulder Raise
  - Hip Hinge
  - Shoulder Press
  - Calf Raise

### 🎨 User Experience

- **Live Session Interface**: Real-time camera feed with overlay feedback
- **Coaching Panel**: Side panel showing metrics, form checks, and progress
- **Demo Mode**: Try the application without setting up a full plan
- **Session Summaries**: Detailed post-session reports with insights
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icons

### Computer Vision
- **@mediapipe/tasks-vision** - MediaPipe pose detection

### State Management
- **Zustand** (via `lib/store.ts`) - Global state management

### Forms & Validation
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Analytics
- **Vercel Analytics** - Usage analytics
- **Recharts** - Data visualization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Webcam (for exercise sessions)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── plan/          # Plan management endpoints
│   │   └── session/       # Session tracking endpoints
│   ├── login/             # Login page
│   ├── plan/              # Plan creation/editing
│   ├── profile/           # User profile
│   ├── session/           # Live exercise session
│   └── summary/           # Session summary
├── components/            # React components
│   ├── session/          # Session-specific components
│   │   ├── camera-area.tsx
│   │   ├── coaching-panel.tsx
│   │   └── demo-video.tsx
│   └── ui/               # Reusable UI components
├── lib/                  # Core libraries
│   ├── pose/            # Pose detection & analysis
│   │   ├── config.ts    # Exercise configurations
│   │   ├── poseEngine.ts
│   │   ├── angles.ts
│   │   ├── feedback.ts
│   │   ├── repCounter.ts
│   │   └── coachingFsm.ts
│   ├── voice/           # Voice coaching
│   │   ├── voiceCoach.ts
│   │   └── useVoiceCoach.ts
│   ├── analytics/       # Analytics utilities
│   ├── services/        # API service layers
│   ├── types.ts         # TypeScript type definitions
│   └── store.ts         # Global state store
└── public/              # Static assets
```

## Key Components

### Pose Detection (`lib/pose/`)
- **config.ts**: Exercise-specific configurations including angle checks, thresholds, and coaching instructions
- **poseEngine.ts**: Main pose detection engine using MediaPipe
- **angles.ts**: Angle calculation utilities
- **feedback.ts**: Form feedback generation
- **repCounter.ts**: Rep counting logic with state machine
- **coachingFsm.ts**: Coaching state machine for exercise phases

### Voice Coaching (`lib/voice/`)
- Real-time audio feedback during exercises
- Exercise-specific coaching instructions
- Integration with session metrics

### Session Management
- Start/pause/end session tracking
- Real-time metrics streaming
- Rep event logging for analytics

## Exercise Configuration

Exercises are configured in `lib/pose/config.ts` with:
- Angle checks for form validation
- Rep counting thresholds
- Coaching instructions for each phase
- Tempo validation (slow/normal/fast)
- Injury area-specific adaptations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Tailwind CSS for styling
- Component-based architecture

## Browser Support

- Chrome/Edge (recommended for best MediaPipe performance)
- Firefox
- Safari

**Note**: MediaPipe pose detection works best in Chrome/Chromium-based browsers.

## License

This project is private and proprietary.

## Contributing

This is a private project. For questions or issues, please contact the development team.

