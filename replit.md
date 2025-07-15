# VideoCall Pro - Replit Development Guide

## Overview

VideoCall Pro is a professional video conferencing platform built with a modern full-stack architecture. The application enables real-time video and audio communication between multiple participants using WebRTC technology, with a React frontend and Express.js backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with dark theme support
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Real-time Communication**: WebSocket server for signaling
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)

### WebRTC Implementation
- **Signaling**: Custom WebSocket-based signaling server
- **Media Handling**: Native WebRTC APIs for peer-to-peer connections
- **STUN/TURN**: Google's public STUN servers for NAT traversal

## Key Components

### Database Schema
- **Users**: User profiles with authentication data
- **Rooms**: Video call rooms with settings and host information
- **Participants**: Real-time participant tracking within rooms

### Core Services
- **Storage Service**: Abstracted data layer with PostgreSQL database implementation
- **WebRTC Manager**: Handles peer connections and media streams
- **Signaling Service**: Manages WebSocket communication for call coordination

### UI Components
- **Video Grid**: Adaptive layout for multiple video streams
- **Call Controls**: Audio/video toggles, screen sharing, settings
- **Participant Management**: Real-time participant list with status indicators
- **Modal Systems**: Settings configuration and room invitation features

## Data Flow

1. **Room Creation**: Users create rooms via REST API, generating unique room IDs
2. **Participant Joining**: WebSocket connection established for real-time signaling
3. **Media Negotiation**: WebRTC peer connections established through signaling server
4. **Stream Management**: Local and remote media streams handled by React components
5. **State Synchronization**: Participant status updates propagated via WebSocket

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **@radix-ui/***: Comprehensive UI component primitives
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database ORM with schema validation
- **ws**: WebSocket server implementation

### Development Tools
- **Vite**: Fast development server with HMR support
- **ESBuild**: Production bundling for server code
- **Drizzle Kit**: Database schema migrations and management

### WebRTC Infrastructure
- **Browser APIs**: getUserMedia, RTCPeerConnection, WebSocket
- **STUN Servers**: Google's public STUN servers for connection establishment

## Deployment Strategy

### Development Environment
- **Server**: Single process running Express.js with Vite middleware
- **Database**: PostgreSQL with Drizzle ORM and Neon serverless driver
- **Hot Reload**: Vite HMR for frontend, TSX for backend development

### Production Build
- **Frontend**: Static assets built with Vite, served by Express
- **Backend**: Bundled with ESBuild for optimized Node.js execution
- **Database**: PostgreSQL with Drizzle migrations for schema management

### Infrastructure Considerations
- **Single Server**: Designed for vertical scaling on VPS infrastructure
- **Session Management**: In-memory storage for development, extensible to Redis
- **File Storage**: Prepared for MinIO object storage integration
- **Monitoring**: Structured for Prometheus metrics collection

The application follows a clean separation of concerns with shared TypeScript schemas between frontend and backend, ensuring type safety across the full stack. The modular architecture allows for easy extension of features like recording, chat, and advanced room management.

## Recent Changes

### Database Integration (January 15, 2025)
- Added PostgreSQL database support with Neon serverless driver
- Implemented DatabaseStorage class replacing in-memory storage
- Created database schema with rooms and participants tables
- All room and participant data now persists in the database
- WebRTC signaling and real-time features remain fully functional