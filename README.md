# GPT Clone - AI Chat Bot

Modern responsive chatbot interface with Gemini AI integration.

## 🚀 Features

- **Modern UI/UX**: Beautiful responsive design with dark/light themes
- **Mobile Optimized**: Full mobile support with gestures and touch optimization
- **AI Integration**: Powered by Google Gemini 1.5 Flash
- **Image Support**: Upload and analyze images with Gemini Vision
- **File Support**: Upload and process various file formats
- **Markdown Rendering**: Full markdown support with syntax highlighting
- **Chat History**: Persistent chat history with localStorage
- **Real-time Chat**: Instant responses with typing indicators

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Express.js, Node.js
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 📱 Mobile Features

- Swipe gestures for sidebar navigation
- Touch-optimized buttons and interactions
- Virtual keyboard handling
- Responsive breakpoints for all screen sizes
- iOS/Android specific optimizations

## 🔧 Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd GPT
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5500
```

4. Start the development server:
```bash
npm start
```

5. Open http://localhost:5500

## 🌐 Deploy to Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel Dashboard:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `NODE_ENV`: production

### Method 2: GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy automatically

## 🔐 Environment Variables

### Required Variables:
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- `NODE_ENV`: Set to "production" for deployment

### Getting Gemini API Key:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your environment variables

## 📁 Project Structure

```
GPT/
├── public/           # Frontend files
│   ├── index.html    # Main HTML file
│   ├── styles.css    # Responsive CSS with themes
│   └── script.js     # Chat functionality
├── api/              # Vercel serverless functions
│   └── chat.js       # Chat API endpoint
├── server.js         # Local development server
├── package.json      # Dependencies
├── vercel.json       # Vercel configuration
└── .env             # Environment variables (local)
```

## 🎨 Customization

### Themes
- Edit CSS custom properties in `styles.css`
- Add new themes in the settings modal

### AI Model
- Change model in `api/chat.js`:
```javascript
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
```

### Responsive Breakpoints
- Mobile: `max-width: 768px`
- Small Mobile: `max-width: 480px`
- Touch Devices: `pointer: coarse`

## 🐛 Troubleshooting

### Common Issues:

1. **404 Error on Vercel**:
   - Make sure `vercel.json` is configured correctly
   - Check that API routes are in `/api/` folder

2. **API Key Issues**:
   - Verify API key in Vercel environment variables
   - Check API key permissions in Google AI Studio

3. **Mobile Issues**:
   - Clear browser cache
   - Check viewport meta tag
   - Test on actual mobile devices

## 📝 License

MIT License - feel free to use and modify for your projects.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

Made with ❤️ for modern AI chat experiences
