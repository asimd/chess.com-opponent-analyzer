# Chess.com Opponent Analyzer

A Chrome extension that provides instant analysis of your opponent's statistics during Chess.com games.

## Installation

1. Download this extension from the Chrome Web Store
2. Click "Add to Chrome"
3. That's it! Visit Chess.com and start analyzing

## Usage

1. Visit Chess.com
2. Start or join a game
3. Click the extension icon
4. View your opponent's stats

## Features

- Real-time opponent analysis
- Comprehensive statistics
- Performance metrics
- Dark mode support
- Guest player detection

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


## Buy Me a Coffee

If you find Opponent Analyzer useful and want to support its development, you can buy me a coffee:

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/asimd)

Your support is greatly appreciated and helps maintain and improve Opponent Analyzer!