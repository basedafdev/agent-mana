# Agent Mana

AI usage monitoring desktop app - track Anthropic and OpenAI API usage from your system tray.

## Features

- **System Tray Widget**: Monitor AI API usage without opening a full application window
- **Multi-Provider Support**: Track usage across Anthropic (Claude) and OpenAI (GPT) APIs
- **Secure Credential Storage**: API keys stored securely in OS keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- **OAuth 2.0 Support**: Authenticate via OAuth for supported providers
- **Usage Tracking**: Monitor token usage, costs, and API call history
- **Desktop Notifications**: Get alerts for usage thresholds
- **Local Database**: SQLite database for usage history and settings
- **Cross-Platform**: Works on macOS and Linux

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development and building
- **Tauri 2.0** for native desktop integration

### Backend (Rust)
- **Tauri 2.0** core framework
- **tokio** for async runtime
- **reqwest** for HTTP API calls
- **oauth2** for OAuth 2.0 flows
- **keyring** for secure credential storage
- **sqlx** with SQLite for local database
- **axum** for OAuth callback server

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** 1.70+ and Cargo
- **System Dependencies** (Linux only):
  - `libwebkit2gtk-4.1-dev`
  - `libgtk-3-dev`
  - `libayatana-appindicator3-dev`
  - `librsvg2-dev`

### Linux Setup
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg
```

## Installation

### Quick Install (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/tommyldev/agent-mana/main/install/install.sh | sh
```

### Package Managers

#### macOS (Homebrew)
```bash
brew tap tommyldev/agent-mana https://github.com/tommyldev/agent-mana
brew install --cask tommyldev/agent-mana/agent-mana
```

#### Linux (Debian/Ubuntu)
```bash
wget https://github.com/tommyldev/agent-mana/releases/latest/download/agent-mana_amd64.deb
sudo dpkg -i agent-mana_amd64.deb
```

#### From Source
```bash
git clone https://github.com/tommyldev/agent-mana.git
cd agent-mana
npm install
npm run build
npm run tauri build
```

## Development

### 1. Clone the Repository
```bash
git clone https://github.com/tommyldev/agent-mana.git
cd agent-mana
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run tauri dev
```

This will:
- Start the Vite development server
- Compile the Rust backend
- Launch the desktop application

### 4. Build for Production
```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`

## Project Structure

```
agent-mana/
├── src/                      # React frontend
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main React component
│   ├── main.tsx             # React entry point
│   └── index.css            # Tailwind CSS imports
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── api/             # API client modules
│   │   │   ├── anthropic.rs
│   │   │   └── openai.rs
│   │   ├── auth/            # Authentication modules
│   │   │   └── oauth.rs
│   │   ├── storage/         # Storage modules
│   │   │   └── keychain.rs
│   │   ├── lib.rs           # Library entry point
│   │   └── main.rs          # Binary entry point
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── package.json             # npm dependencies
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── vite.config.ts           # Vite configuration
```

## Development

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build frontend for production
- `npm run tauri dev` - Run Tauri app in development mode
- `npm run tauri build` - Build Tauri app for production

### Key Dependencies

#### Frontend (package.json)
- `@tauri-apps/api` - Tauri JavaScript API
- `@tauri-apps/plugin-*` - Tauri plugins (sql, notification, store, shell)
- `react` & `react-dom` - React framework
- `tailwindcss` - Utility-first CSS framework

#### Backend (Cargo.toml)
- `tauri` - Core framework with system tray support
- `tauri-plugin-sql` - SQLite database support
- `tauri-plugin-notification` - Desktop notifications
- `tauri-plugin-store` - Persistent configuration
- `tauri-plugin-shell` - System shell integration
- `oauth2` - OAuth 2.0 authentication
- `keyring` - Secure credential storage
- `reqwest` - HTTP client for API calls
- `tokio` - Async runtime
- `axum` - HTTP server for OAuth callbacks

## Configuration

The app stores configuration in:
- **macOS**: `~/Library/Application Support/com.agentmana.app/`
- **Linux**: `~/.config/agent-mana/`

API keys are stored securely in:
- **macOS**: Keychain
- **Linux**: Secret Service (GNOME Keyring, KWallet, etc.)

## Next Steps

1. **Implement API Clients**: Complete the Anthropic and OpenAI client implementations
2. **Add OAuth Flow**: Implement OAuth 2.0 authentication for supported providers
3. **Build UI Components**: Create monitoring dashboard, settings panel, and usage charts
4. **Database Schema**: Design SQLite schema for usage tracking
5. **Background Polling**: Implement periodic usage data fetching
6. **Notifications**: Set up usage threshold alerts
7. **System Tray Menu**: Design tray icon menu and interactions

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
