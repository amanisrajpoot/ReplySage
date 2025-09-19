# ReplySage - AI Email Assistant

ReplySage is a browser extension that provides AI-powered email assistance with local processing and optional cloud fallback. It helps you analyze emails, extract action items, generate suggested replies, and improve your email productivity.

## Features

### Core Features
- **Local AI Processing**: Process emails locally using small, efficient AI models
- **Cloud Fallback**: Optional cloud processing for complex tasks using your own API keys
- **Email Analysis**: Extract summaries, action items, and key information
- **Suggested Replies**: Generate contextual reply suggestions with tone control
- **Grammar Checking**: Identify and suggest grammar improvements
- **Privacy-First**: Your data stays on your device unless you opt-in to cloud processing

### Advanced Features
- **Thread Summarization**: Analyze entire email conversations
- **Similarity Search**: Find related emails and group conversations
- **Action Item Tracking**: Extract and track tasks with due dates
- **Date Extraction**: Identify meeting times, deadlines, and events
- **PII Redaction**: Automatically redact personal information before cloud processing

## Architecture

ReplySage follows a local-first architecture with optional cloud fallback:

- **Browser Extension**: Chrome MV3 extension with React UI
- **Local Processing**: Small AI models running in the browser using WebAssembly
- **Cloud Fallback**: User-supplied API keys for OpenAI, Anthropic, etc.
- **Privacy**: All data processing happens locally by default

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Extension**: Chrome MV3 Manifest
- **Local AI**: ONNX Runtime Web / Transformers.js
- **Models**: Flan-T5-small, MiniLM embeddings
- **Storage**: Chrome Storage API + IndexedDB
- **Build**: Vite + Web Extension Plugin

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Chrome browser for testing

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/replysage.git
cd replysage
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Type checking
npm run type-check
```

## Project Structure

```
src/
├── background/          # Service worker
├── content/            # Content scripts
│   ├── ui/            # React UI components
│   └── styles.css     # Content script styles
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── manifest.json      # Extension manifest
├── options.html       # Options page
├── popup.html         # Extension popup
└── popup.js           # Popup logic
```

## Configuration

### Settings

The extension can be configured through the options page:

- **Local Processing**: Enable/disable local AI processing
- **Cloud Fallback**: Enable cloud processing with your API key
- **PII Redaction**: Automatically redact personal information
- **Caching**: Cache analysis results locally
- **Tone Preferences**: Set default tone for generated replies

### API Keys

To use cloud fallback features:

1. Get an API key from OpenAI, Anthropic, or Azure OpenAI
2. Open the extension options page
3. Enable "Cloud Fallback"
4. Enter your API key (stored locally and encrypted)

## Privacy & Security

- **Local-First**: All processing happens on your device by default
- **No Data Collection**: We don't collect or store your email data
- **Encrypted Storage**: API keys and sensitive data are encrypted locally
- **PII Redaction**: Personal information is automatically redacted before cloud processing
- **User Control**: You control what data is processed and where

## Roadmap

### Phase 1 - MVP (Weeks 1-4)
- [x] Extension scaffold and DOM extraction
- [x] Basic UI and settings
- [x] Local grammar checking and summarization
- [x] Caching and offline behavior

### Phase 2 - Core Features (Weeks 5-8)
- [ ] Cloud fallback with user API keys
- [ ] Action item extraction and date parsing
- [ ] Suggested replies with tone control
- [ ] Embeddings and similarity search

### Phase 3 - Polish (Weeks 9-12)
- [ ] Thread summarization
- [ ] Performance optimization
- [ ] Security and encryption
- [ ] Store submission and beta testing

### Phase 4 - Premium (Weeks 13-16)
- [ ] Hosted fallback service
- [ ] Team features and collaboration
- [ ] Advanced analytics
- [ ] Multi-domain support

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/your-username/replysage/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/replysage/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/replysage/discussions)

## Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- AI models from [Hugging Face](https://huggingface.co/)
- Extension framework by [Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- Icons by [Heroicons](https://heroicons.com/)

---

**ReplySage** - Making email smarter, one message at a time. 🚀
