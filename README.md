# Task Manager - Modern MERN Stack Application

A production-ready task management application with advanced focus features, real-time synchronization, and offline support.

## Features

### Core Task Management
- ⏱️ **Live Countdowns**: Non-stoppable timers with server-time synchronization
- 📋 **Three-Column Board**: Ongoing, Completed, Given-up with mobile-responsive tabs
- 🎯 **Natural Language Parsing**: "Finish slides in 2h", "Email John tomorrow 10am"
- 🏷️ **Projects & Tags**: Organize tasks with projects and contextual tags
- 📊 **Analytics Dashboard**: Track productivity and completion rates

### Focus & Timeboxing
- 🍅 **Pomodoro Mode**: Customizable work/break intervals with analytics
- 🔒 **Forced Focus**: Block navigation with emergency exit (10s confirmation)
- 🧘 **Deep Work Preset**: Auto-start countdown, disable snooze/pause
- ⚡ **Quick Actions**: Keyboard shortcuts and command palette (Cmd/Ctrl+K)

### Notes & Organization
- 📝 **Google Keep-style Notes**: Rich text, markdown, checklists
- 🎨 **Visual Customization**: Colors, labels, pinning, file attachments
- 🔗 **Task Integration**: Link notes to tasks seamlessly
- 📎 **File Attachments**: Upload and manage files (local/S3)

### Real-time & Offline
- 🔄 **Live Sync**: WebSocket-based real-time updates across devices
- 📱 **Offline-first**: IndexedDB queue with background sync
- 🔔 **Push Notifications**: Browser notifications with Service Worker
- ⚡ **Conflict Resolution**: Smart merge for offline/online changes

### Authentication & Security
- 🔐 **JWT + Refresh Tokens**: Secure authentication with auto-refresh
- 🌐 **Google OAuth**: Social sign-in integration
- 🛡️ **Rate Limiting**: Protection against abuse
- 🔒 **CORS & Helmet**: Production-ready security headers

## Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **MongoDB** with Mongoose ODM
- **Redis** + BullMQ for job scheduling
- **Socket.IO** for real-time communication
- **Web Push** for notifications (VAPID)

### Frontend
- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Socket.IO Client** for real-time updates
- **LocalForage** for offline storage
- **React Hook Form** for form handling

### Infrastructure
- **Docker** + Docker Compose for development
- **GitHub Actions** for CI/CD
- **MongoDB Atlas** for production database
- **Redis Cloud** for production queue
- **Vercel/Netlify** for frontend deployment

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd task-manager
```

2. **Install dependencies**
```bash
npm run setup
```

3. **Start with Docker (Recommended)**
```bash
npm run docker:up
```

4. **Or start manually**

Setup environment variables:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Start services:
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend  
cd client && npm run dev

# Terminal 3: MongoDB
mongod

# Terminal 4: Redis
redis-server
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## Environment Variables

### Server (.env)
```bash
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/taskmanager

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Push Notifications (VAPID)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com

# File Upload (Optional - for S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-1
```

### Client (.env)
```bash
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/google` - Google OAuth login

### Time Synchronization
- `GET /api/time` - Get server time for client sync

### Tasks
- `GET /api/tasks` - Get tasks (with filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task by ID
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/complete` - Mark task complete
- `POST /api/tasks/:id/give-up` - Give up on task
- `POST /api/tasks/:id/pause` - Pause task (if enabled)
- `POST /api/tasks/:id/resume` - Resume paused task
- `POST /api/tasks/:id/snooze` - Snooze task (if enabled)
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/analytics` - Get task analytics

### Notes
- `GET /api/notes` - Get notes
- `POST /api/notes` - Create note
- `PATCH /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### Projects
- `GET /api/projects` - Get projects
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Sync
- `POST /api/sync` - Sync offline operations
- `GET /api/sync/updates` - Get updates since timestamp

### File Upload
- `POST /api/upload` - Upload file
- `DELETE /api/upload/:filename` - Delete file

### Push Notifications
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `POST /api/notifications/unsubscribe` - Unsubscribe from push notifications

## Socket.IO Events

### Task Events
- `task:created` - New task created
- `task:updated` - Task updated
- `task:completed` - Task completed
- `task:given_up` - Task given up
- `task:deleted` - Task deleted
- `task:reminder` - Scheduled reminder

### Focus Events
- `focus:started` - Focus session started
- `focus:ended` - Focus session ended

### Connection Events
- `heartbeat` - Keep connection alive
- `task:subscribe` - Subscribe to task updates
- `task:unsubscribe` - Unsubscribe from task updates

## Testing

### Run Tests
```bash
# All tests
npm test

# Backend tests only
cd server && npm test

# Frontend tests only
cd client && npm test

# Watch mode
npm run test:watch
```

### Test Coverage
- Backend: Jest + Supertest for API testing
- Frontend: Vitest + React Testing Library
- Target: 80%+ code coverage

## Deployment

### Production Checklist

1. **Set up MongoDB Atlas**
   - Create cluster and database
   - Configure network access and users
   - Update MONGODB_URI

2. **Set up Redis Cloud**
   - Create Redis instance
   - Update REDIS_URL

3. **Configure Push Notifications**
   - Generate VAPID keys: `npx web-push generate-vapid-keys`
   - Update VAPID environment variables

4. **Set up Google OAuth**
   - Create Google Cloud Project
   - Configure OAuth consent screen
   - Create OAuth 2.0 credentials
   - Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

5. **File Storage (Optional)**
   - Create S3 bucket
   - Configure IAM user with appropriate permissions
   - Update AWS environment variables

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd client
vercel --prod
```

### Backend Deployment (Railway/Render/Heroku)

```bash
# Example for Railway
railway login
railway new
railway add
railway up
```

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Development

### Project Structure
```
├── server/                 # Backend Express.js API
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # Express routes
│   │   ├── middleware/    # Custom middleware
│   │   ├── jobs/          # Background jobs
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # App entry point
│   ├── uploads/           # Local file uploads (dev)
│   └── tests/             # Backend tests
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── stores/        # Zustand stores
│   │   ├── api/           # API client functions
│   │   ├── sync/          # Offline sync logic
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   ├── public/            # Static assets
│   └── tests/             # Frontend tests
├── docker-compose.yml     # Development services
└── docker-compose.prod.yml # Production services
```

### Code Quality

#### ESLint + Prettier
```bash
npm run lint        # Check linting
npm run lint:fix    # Fix linting issues
npm run format      # Format code
```

#### TypeScript
```bash
npm run type-check  # Check TypeScript
npm run build       # Build production
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│   Express API    │◄──►│    MongoDB      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐               │
         │              │   Socket.IO     │               │
         │              │  (Real-time)    │               │
         │              └─────────────────┘               │
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   IndexedDB     │    │   Redis/BullMQ   │    │  Push Service   │
│ (Offline Queue) │    │ (Job Scheduler)  │    │    (VAPID)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Features Implementation

#### 1. Task Countdown System
- Server stores `endsAt` timestamp as single source of truth
- Client syncs time with server via `/api/time` endpoint
- Live countdown uses `setInterval` with server time correction
- Socket.IO broadcasts status changes to all connected clients

#### 2. Offline Sync
- Operations queued in IndexedDB when offline
- Background sync processes queue when online
- Conflict resolution for concurrent updates
- Optimistic updates with rollback on failure

#### 3. Focus Modes
- **Pomodoro**: Configurable work/break cycles
- **Forced Focus**: Modal overlay blocks navigation
- **Deep Work**: Extended focus with disabled interruptions
- Emergency exit with 10-second confirmation

#### 4. Real-time Updates
- Socket.IO rooms for user-specific and project-specific updates
- Event-driven architecture for task lifecycle changes
- Heartbeat mechanism for connection health

#### 5. Push Notifications
- Service Worker registration for background notifications
- VAPID-based web push for cross-platform support
- Scheduled reminders via BullMQ job queue
- Permission handling and subscription management

## Support & Contribution

- 📧 **Email**: support@taskmanager.com
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📖 **Wiki**: GitHub Wiki

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ using the MERN stack and modern web technologies.