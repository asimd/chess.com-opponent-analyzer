# Chess.com Opponent Analyzer

![image](https://github.com/user-attachments/assets/8717b009-e6aa-4649-a7dd-4b07e765377e)

A Chrome extension that provides instant analysis of your opponent's statistics during Chess.com games. Get valuable insights about your opponent's playing style, ratings, and performance metrics.

## Features

- 🏃‍♂️ **Real-time Analysis**: Instantly view opponent stats when a game starts
- 📊 **Comprehensive Stats**: View Blitz, Rapid, and Bullet ratings with win/loss records
- 📈 **Performance Metrics**: See precision and average move time from last 20 games
- 🌍 **Player Details**: Country, join date, followers, and league information
- 🎯 **Auto-Detection**: Automatically detects new opponents during gameplay
- 💫 **Smooth UI**: Clean, modern interface with smooth animations

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Visit [Chess.com](https://chess.com)
2. Start or join a game
3. Click the extension icon in your browser toolbar
4. View your opponent's comprehensive statistics

## Technical Details

### Architecture

The extension consists of three main components:
- **Content Script**: Handles DOM manipulation and data display
- **Background Script**: Manages API calls and data processing
- **Popup**: User interface for non-chess.com pages

### API Integration

Uses Chess.com's public API endpoints:
- Player Profile: `/pub/player/{username}`
- Player Stats: `/pub/player/{username}/stats`
- Games History: `/pub/player/{username}/games/{YYYY}/{MM}`

### Performance

- Caches API responses to minimize requests
- Uses MutationObserver for efficient DOM updates
- Implements debouncing for API calls
- Lazy loads components for better performance

## Development

### Prerequisites
- Node.js (v14 or higher)
- Chrome Browser

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/asimd/chess-analyzer
   cd chess-analyzer
   ```

2. Open Chrome and navigate to `chrome://extensions/`.

3. Enable "Developer mode" in the top right corner.

4. Click "Load unpacked" and select the `chess-analyzer` directory.

### Project Structure

## Usage

1. Visit [Chess.com](https://chess.com)
2. Start or join a game
3. Click the extension icon in your browser toolbar
4. View your opponent's comprehensive statistics 
