async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await getCurrentTab();
  const isChessGame = tab?.url?.match(/^https:\/\/www\.chess\.com\/game\/(live\/)?[0-9]+$/);

  const chessContent = document.getElementById('chess-content');
  const notChessContent = document.getElementById('not-chess-content');

  if (!isChessGame) {
    if (chessContent) chessContent.style.display = 'none';
    if (notChessContent) notChessContent.style.display = 'block';
    return;
  }

  if (chessContent) {
    chessContent.style.display = 'block';
    displayLoadingState();
  }
  if (notChessContent) notChessContent.style.display = 'none';

  try {
    // Execute script to get opponent username from the page
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const playerElements = document.querySelectorAll('.user-tagline-username');
        return Array.from(playerElements).map(el => el.textContent.trim());
      }
    });

    const players = result[0].result;
    if (!players || players.length < 2) {
      displayError('Could not find opponent information');
      return;
    }

    // Get opponent stats from Chess.com API
    const opponentStats = await fetchPlayerStats(players[1]); // Assuming second player is opponent
    displayStats(opponentStats);

  } catch (error) {
    console.error('Error getting opponent stats:', error);
    displayError('Failed to load opponent statistics');
  }
}

function displayLoadingState() {
  const content = document.querySelector('.analyzer-content');
  if (!content) return;
  
  content.innerHTML = `
    <div class="loading-state">
      <div class="player-profile">
        <div class="profile-header">
          <div class="profile-top">
            <div class="player-avatar-container">
              <img class="player-avatar" src="https://www.chess.com/bundles/web/images/user-image.svg" alt="Loading...">
            </div>
            <div class="player-info">
              <div class="player-name">Loading...</div>
              <div class="player-join-date"></div>
            </div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-content">
                <span class="stat-value">-</span>
                <div class="record-stats">
                  <span class="win">0</span>
                  <span class="draw">0</span>
                  <span class="loss">0</span>
                </div>
                <span class="stat-label">Rapid Rating</span>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-content">
                <span class="stat-value">-</span>
                <div class="record-stats">
                  <span class="win">0</span>
                  <span class="draw">0</span>
                  <span class="loss">0</span>
                </div>
                <span class="stat-label">Blitz Rating</span>
              </div>
            </div>
          </div>
          <div class="stat-row">
            <div class="stat-item">
              <div class="stat-content">
                <span class="stat-value">-</span>
                <span class="stat-label">Precision</span>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-content">
                <span class="stat-value">-</span>
                <span class="stat-label">Avg Move Time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function displayError(message) {
  const content = document.querySelector('.analyzer-content');
  if (!content) return;
  
  content.innerHTML = `
    <div class="error-state">
      <div class="error-message">${message}</div>
    </div>
  `;
}

async function fetchPlayerStats(username) {
  try {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    const fetchWithRetry = async (url, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Chess.com Analyzer Extension'
            }
          });
          
          if (response.ok) {
            return await response.json();
          }
          
          if (response.status === 429) {
            await delay(1000 * (i + 1));
            continue;
          }
          
          throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
          if (i === retries - 1) throw error;
          await delay(1000 * (i + 1));
        }
      }
    };

    // Get current and previous month for more games
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();
    
    const prevDate = new Date(now.setMonth(now.getMonth() - 1));
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevYear = prevDate.getFullYear();

    const [profile, stats, currentGames, prevGames] = await Promise.all([
      fetchWithRetry(`https://api.chess.com/pub/player/${username}`),
      fetchWithRetry(`https://api.chess.com/pub/player/${username}/stats`),
      fetchWithRetry(`https://api.chess.com/pub/player/${username}/games/${currentYear}/${currentMonth}`),
      fetchWithRetry(`https://api.chess.com/pub/player/${username}/games/${prevYear}/${prevMonth}`)
    ]);

    const allGames = [
      ...(currentGames.games || []),
      ...(prevGames.games || [])
    ];

    return {
      profile,
      stats,
      recentGames: allGames
    };
  } catch (error) {
    console.error('Error fetching player stats:', error);
    throw new Error('Failed to fetch opponent data. Please try again later.');
  }
}

function displayStats(data) {
  const content = document.querySelector('.analyzer-content');
  
  // Calculate stats directly here instead of waiting for message
  const avgMoveTime = calculateAverageMoveTime(data.recentGames);
  const precision = calculatePrecision(data.recentGames, data.profile.username);
  
  const profileUrl = `https://www.chess.com/member/${data.profile.username}`;
  const defaultAvatar = 'https://www.chess.com/bundles/web/images/user-image.svg';

  // Format win/draw/loss stats
  const blitzStats = data.stats?.chess_blitz?.record || data.stats?.blitz?.record || { win: 0, loss: 0, draw: 0 };
  const rapidStats = data.stats?.chess_rapid?.record || data.stats?.rapid?.record || { win: 0, loss: 0, draw: 0 };

  const formatRecord = (record) => `
    <div class="record-stats">
      <span class="win">${record.win || 0}</span>
      <span class="draw">${record.draw || 0}</span>
      <span class="loss">${record.loss || 0}</span>
    </div>
  `;

  content.innerHTML = `
    <div class="player-profile">
      <div class="profile-header">
        <div class="profile-top">
          <a href="${profileUrl}" target="_blank" class="player-avatar-container">
            <img class="player-avatar" src="${data.profile.avatar || defaultAvatar}" alt="Player avatar">
          </a>
          <div class="username-with-flag">
            <a href="${profileUrl}" target="_blank" class="username-link">
              <h3 class="username-text">${data.profile.username}</h3>
            </a>
            ${data.profile.country ? 
              `<img src="https://flagcdn.com/w20/${data.profile.country.toLowerCase()}.png" 
                   alt="${data.profile.country}" class="country-flag">` : 
              ''}
          </div>
        </div>
      </div>

      <div class="metrics-row">
        <span class="metric">
          <div class="metric-icon">
            <svg>...</svg>
          </div>
          <div class="metric-content">
            <span class="metric-value">${data.profile.views || data.profile.profile_views || '-'}</span>
            <span class="metric-label">Views</span>
          </div>
        </span>
        <!-- Similar metrics for views, and last online -->
      </div>

      <div class="game-stats">
        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-icon rapid">
              <svg>...</svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">${data.stats?.chess_rapid?.last?.rating || data.stats?.rapid?.last?.rating || '-'}</span>
              ${formatRecord(rapidStats)}
              <span class="stat-label">Rapid Rating</span>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon blitz">
              <svg>...</svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">${data.stats?.chess_blitz?.last?.rating || data.stats?.blitz?.last?.rating || '-'}</span>
              ${formatRecord(blitzStats)}
              <span class="stat-label">Blitz Rating</span>
            </div>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-icon precision">
              <svg>...</svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">${precision === '-' ? '-' : precision + '%'}</span>
              <span class="stat-label">Precision</span>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon move-time">
              <svg>...</svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">${avgMoveTime === '-' ? '-' : avgMoveTime + 's'}</span>
              <span class="stat-label">Avg Move Time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const popup = document.querySelector('.player-profile');
  console.log('Last online timestamp:', data.profile.last_online);
  popup.querySelector('.last-online').textContent = formatLastOnline(data.profile.last_online);
}

function calculateAverageMoveTime(games) {
  console.log('calculateAverageMoveTime called with:', { gamesCount: games?.length });
  
  if (!games || !games.length) {
    console.log('No games provided');
    return '-';
  }
  
  let totalTime = 0;
  let moveCount = 0;
  
  const recentGames = games.slice(0, 20);
  console.log('Processing recent games:', recentGames.length);
  
  recentGames.forEach((game, index) => {
    console.log(`\nAnalyzing game ${index + 1} PGN:`, game.pgn?.substring(0, 100) + '...');
    
    if (!game.pgn) {
      console.log(`Game ${index + 1}: No PGN data`);
      return;
    }
    
    const clockTimes = game.pgn.match(/\{?\[%clk (\d+):(\d+\.\d+)\]\}?/g);
    console.log(`Game ${index + 1} clock times:`, clockTimes);
    
    if (!clockTimes || clockTimes.length === 0) {
      console.log(`Game ${index + 1}: No clock times found`);
      return;
    }
    
    const firstTime = clockTimes[0].match(/(\d+):(\d+\.\d+)/);
    const lastTime = clockTimes[clockTimes.length - 1].match(/(\d+):(\d+\.\d+)/);
    
    console.log(`Game ${index + 1} time matches:`, { firstTime, lastTime });
    
    if (!firstTime || !lastTime) {
      console.log(`Game ${index + 1}: Invalid time format`);
      return;
    }
    
    const startTotal = parseInt(firstTime[1]) * 60 + parseFloat(firstTime[2]);
    const endTotal = parseInt(lastTime[1]) * 60 + parseFloat(lastTime[2]);
    const duration = startTotal - endTotal;
    
    console.log(`Game ${index + 1} time calculation:`, {
      startTotal,
      endTotal,
      duration
    });
    
    const moves = game.pgn
      .replace(/\{[^}]*\}/g, '')
      .replace(/\d+\./g, '')
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .trim()
      .split(/\s+/)
      .filter(move => /^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8]=?[QRBN]?\+?#?$/.test(move));
    
    console.log(`Game ${index + 1} moves:`, {
      moveCount: moves.length,
      sampleMoves: moves.slice(0, 3)
    });
    
    if (moves.length > 0 && duration > 0) {
      moveCount += moves.length;
      totalTime += duration;
      console.log(`Game ${index + 1} added:`, {
        gameMoves: moves.length,
        gameDuration: duration,
        totalMoves: moveCount,
        totalTime
      });
    }
  });
  
  console.log('Average move time calculation complete:', {
    totalTime,
    moveCount,
    average: moveCount > 0 ? Math.round(totalTime / moveCount) : '-'
  });
  
  if (moveCount === 0) return '-';
  return Math.round(totalTime / moveCount);
}

function calculatePrecision(games, username) {
  console.log('calculatePrecision called with:', { gamesCount: games?.length, username });
  
  if (!games || !games.length) {
    console.log('No games provided');
    return '-';
  }
  
  const recentGames = games.slice(0, 20);
  console.log('Processing recent games:', recentGames.length);
  
  let totalAccuracy = 0;
  let count = 0;
  
  recentGames.forEach((game, index) => {
    console.log(`\nAnalyzing game ${index + 1}:`, {
      hasAccuracies: !!game.accuracies,
      white: game.white?.username,
      black: game.black?.username
    });
    
    if (!game.accuracies || !game.white || !game.black) {
      console.log(`Game ${index + 1}: Missing required data`);
      return;
    }
    
    const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
    const accuracy = isWhite ? game.accuracies.white : game.accuracies.black;
    
    console.log(`Game ${index + 1} analysis:`, {
      playerColor: isWhite ? 'white' : 'black',
      accuracy,
      isValidNumber: typeof accuracy === 'number' && !isNaN(accuracy)
    });
    
    if (typeof accuracy === 'number' && !isNaN(accuracy)) {
      totalAccuracy += accuracy;
      count++;
      console.log(`Game ${index + 1}: Added accuracy ${accuracy}. Running total: ${totalAccuracy}, count: ${count}`);
    }
  });
  
  console.log('Precision calculation complete:', {
    totalAccuracy,
    count,
    average: count > 0 ? Math.round(totalAccuracy / count) : '-'
  });
  
  if (count === 0) return '-';
  return Math.round(totalAccuracy / count);
}

function formatLastOnline(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

function formatJoinDate(timestamp) {
  if (!timestamp) return '-';
  const joinDate = new Date(timestamp * 1000);
  const now = new Date();
  const diff = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
  return `Joined ${diff} days ago - ${joinDate.toLocaleDateString()}`;
}

// Make sure init runs when popup opens
document.addEventListener('DOMContentLoaded', init);

// Replace the existing message listener (lines 453-474) with:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[POPUP] Message received:', {
    type: request.type,
    gamesCount: request.games?.length,
    username: request.username,
    sender
  });
  
  if (request.type === 'calculateStats') {
    try {
      console.log('[POPUP] Starting calculations for games:', request.games?.length);
      
      const avgMoveTime = calculateAverageMoveTime(request.games);
      console.log('[POPUP] Average move time calculated:', avgMoveTime);
      
      const precision = calculatePrecision(request.games, request.username);
      console.log('[POPUP] Precision calculated:', precision);
      
      const response = {
        precision: precision,
        avgMoveTime: avgMoveTime
      };
      
      console.log('[POPUP] Sending response:', response);
      sendResponse(response);
    } catch (error) {
      console.error('[POPUP] Error in calculations:', error);
      sendResponse({ precision: '-', avgMoveTime: '-' });
    }
    return true;  // Keep message channel open
  }
});

function saveLogsToFile() {
    const logs = [];
    
    // Override console.log
    const oldLog = console.log;
    console.log = function() {
        logs.push(Array.from(arguments).join(' '));
        oldLog.apply(console, arguments);
    };
    
    // Add error handler to save logs
    window.onerror = function(msg, errorUrl, lineNo, columnNo, error) {
        logs.push(`Error: ${msg} at ${lineNo}:${columnNo}`);
        
        // Create and download log file
        const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'chess-analyzer-debug.log';
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(blobUrl);
    };
}

// Call this at the start
saveLogsToFile(); 