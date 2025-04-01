# Health Assistant Mobile App

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
influencer_chatbot_mobile/
│── src/                 # Main app source code
│   ├── screens/         # App Screens
│   │   ├── ChatbotScreen.js   # Chat interface
│   │   ├── ProfileScreen.js   # Influencer profile setup
│   │   ├── HomeScreen.js      # Landing page
│   │   ├── HealthDataScreen.js # Health data visualization
│   │   ├── LoginScreen.js     # Login screen
│   │   ├── RegisterScreen.js  # Registration screen
│   ├── components/      # Reusable UI Components
│   ├── api/             # API calls to backend
│   │   ├── chatbot.js        # Sends user queries to chatbot
│   │   ├── profile.js        # Handles profile data
│   │   ├── healthData.js     # Handles health data
│   │   ├── config.js         # API configuration
│   ├── context/         # React Context
│   │   ├── AuthContext.js    # Authentication context
│   ├── App.js           # Main React Native entry point
│   ├── package.json     # Dependencies and scripts
│   ├── README