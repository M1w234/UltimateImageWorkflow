# MyAPI Studio 🔑

A powerful multi-mode AI creative suite for image editing, generation, analysis, and video creation. Use your own API keys for unlimited generation at API cost, not subscription prices.

**Open-source • Self-hosted • Built with React + Vite**

## Features

### 6 Operational Modes

1. **🔍 Analyze Mode** - Use OpenAI GPT Vision to analyze and describe images
2. **📷 Image Editor** - Edit single images with AI using Google Gemini
3. **⚡ Multi-Image Generator** - Combine multiple reference images into one output
4. **📤 Multi-Image Edit** - Batch process multiple images with the same prompt
5. **✨ Generate Mode** - Create images from text prompts
6. **🎬 Video Mode** - Generate videos using Kling AI

### Additional Features

- **History Panel** - Track all your generations with timestamps
- **Collection Panel** - Save and organize your favorite images
- **Sound Effects** - Pleasant chime on successful generation
- **Multi-Tab Support** - Works independently across browser tabs
- **Dark Theme** - Easy on the eyes UI with gradient backgrounds

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- API keys for:
  - [Google Gemini](https://aistudio.google.com/app/apikey) (Edit & Generate)
  - [OpenAI](https://platform.openai.com/api-keys) (Analyze)
  - [PiAPI/Kling](https://piapi.ai/workspace) (Video)

### Installation

```bash
# Clone or download the project
cd nana-banana-pro

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env file
# Edit .env and add your keys

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### API Key Setup

1. Click the ⚙️ Settings button in the top right
2. Enter your API keys:
   - **Gemini Key** - For image editing and generation
   - **OpenAI Key** - For image analysis
   - **Kling Key** - For video generation
3. Click "Save All Settings"

## Development

### Project Structure

```
nana-banana-pro/
├── public/               # Static assets
├── src/
│   ├── main.jsx         # Entry point
│   ├── App.jsx          # Main app component
│   ├── components/      # React components
│   │   ├── ApiKeySettings.jsx
│   │   ├── AnalyzeMode.jsx
│   │   ├── EditMode.jsx
│   │   ├── MultiEditMode.jsx
│   │   ├── CombineMode.jsx
│   │   ├── GenerateMode.jsx
│   │   ├── KlingMode.jsx
│   │   ├── HistoryPanel.jsx
│   │   ├── CollectionPanel.jsx
│   │   └── ImageModal.jsx
│   ├── services/        # API integrations
│   │   ├── geminiApi.js
│   │   ├── openaiApi.js
│   │   └── klingApi.js
│   ├── utils/           # Utility functions
│   │   ├── constants.js
│   │   ├── storage.js
│   │   ├── imageUtils.js
│   │   └── soundUtils.js
│   └── styles/
│       └── globals.css
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .cursorrules         # Cursor IDE instructions
```

### Available Scripts

```bash
npm run dev      # Start dev server with HMR
npm run build    # Build for production
npm run preview  # Preview production build
```

### Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool with fast HMR
- **Tailwind CSS** - Utility-first styling
- **IndexedDB** - Client-side storage for images
- **Web Audio API** - Sound effects
- **lucide-react** - Icon library

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` folder.

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_GEMINI_KEY`
   - `VITE_OPENAI_KEY`
   - `VITE_KLING_KEY`
4. Deploy!

### Deploy to Netlify

1. Push to GitHub
2. Connect repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Site Settings
6. Deploy!

## Troubleshooting

### Storage Issues

If you experience storage problems:

1. Click the "Reset Storage" button if visible
2. Or run in browser console: `resetNanaBananaStorage()`
3. Or manually clear IndexedDB: `indexedDB.deleteDatabase("GeminiImageToolsDB")`

### API Errors

- **Gemini**: Ensure your key has access to the selected model
- **OpenAI**: Check your API quota and billing
- **Kling**: Verify your PiAPI subscription status

### Images Not Loading

- Check browser console for CORS errors
- Ensure images are under 4MB for best results
- Try converting to JPEG format

## Model Support

### Gemini Models (Edit & Generate)
- gemini-2.0-flash-exp-image-generation (Recommended)
- gemini-3-pro-image
- gemini-3-pro-image-preview
- gemini-1.5-pro (Text/Edit only)
- gemini-1.5-flash (Text/Edit only)

### OpenAI Models (Analyze)
- GPT-5.2 (Latest)
- GPT-5.1
- GPT-5
- GPT-4o
- GPT-4o-mini (Fast)
- GPT-4-turbo

### Kling Models (Video)
- Kling 2.6 (Latest, Audio Support)
- Kling 2.5
- Kling 2.1 Master (Pro Only)
- Kling 2.1
- Kling 1.6
- Kling 1.5

## License

MIT License - Feel free to use and modify!

## Credits

Created by MW 🍌

Powered by:
- Google Gemini API
- OpenAI API
- Kling AI / PiAPI
