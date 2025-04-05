# Xevox Mobile App

A React Native mobile application that integrates with the FastAPI health assistant backend to provide personalized health insights, recommendations, and chatbot capabilities.

## Features

- User authentication (login/registration)
- AI-powered health assistant chatbot
- Health metrics visualization and tracking
- Device connection (Fitbit, Garmin, Apple Health)
- Profile management

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- React Native development environment setup
- Running FastAPI backend (from the Python files)

## Project Structure

```
Xevox App/
├── src/
│   ├── all_screens.tsx      # All screens consolidated
│   ├── api_service.js       # API integration with backend
│   ├── context.js           # Auth context and other contexts
│   ├── components.js        # Reusable UI components
│   └── utils.js             # Helper functions and utilities
├── App.js                   # Main app component
├── index.js                 # Entry point
├── package.json
└── README.md