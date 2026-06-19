# Fate Ring

Fate Ring is a gesture-controlled 3D tarot reading web app. It combines a 3D tarot card ring, MediaPipe Hands gesture recognition, a three-card spread, and DeepSeek-powered AI interpretation.

## Features

- 3D circular tarot card selection
- Camera-based hand gesture interaction with MediaPipe Hands
- Swipe gestures to rotate the card ring
- Pinch or fist gesture to select focused cards
- Three-card spread: Past, Present, Future
- 78-card tarot dataset with upright / reversed positions
- Question-first reading flow
- DeepSeek AI interpretation and follow-up questions
- Vercel-ready `/api/deepseek` serverless proxy

## Local Usage

1. Install dependencies:

```bash
npm install
```

2. Create a local `.env` file:

```bash
cp .env.example .env
```

3. Put your DeepSeek key into `.env`:

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

4. Start the local web server:

```bash
npm run web:start
```

5. Open:

```text
http://localhost:8765/
```

## Deploy To Vercel

This project should not put the DeepSeek API Key in frontend code or GitHub. Add it as a Vercel environment variable instead:

```text
DEEPSEEK_API_KEY
```

The frontend calls `/api/deepseek`, and the serverless function forwards the request to DeepSeek using the server-side environment variable.

## Tech Stack

- HTML / CSS / Vanilla JavaScript
- MediaPipe Hands
- DeepSeek API
- Node.js local server
- Vercel Serverless Function
