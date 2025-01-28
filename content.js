class ChessAnalyzer {
  constructor() {
    this.popup = null;
    this.currentOpponent = null;
    this.logs = [];
    this.addLog('ChessAnalyzer initialized');
    this.init();
  }

  init() {
    this.createPopup();
    this.observeGameStart();
  }

  createPopup() {
    const popup = document.createElement('div');
    popup.className = 'chess-analyzer-popup';
    popup.innerHTML = `
      <div class="popup-header">
        <h3>Opponent Analysis</h3>
        <button class="close-button">×</button>
      </div>
      <div class="popup-content">
        <div class="player-info">
            <img class="avatar" src="" alt="Player avatar">
            <div class="player-details">
                <div class="username-row">
                    <img class="country-flag" src="" alt="Country flag">
                    <span class="username" style="color: #262626;"></span>
                </div>
                <div class="join-date" style="font-size: 12px; color: #6b7280;"></div>
            </div>
        </div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="rating-container">
              <div class="metric-value blitz-rating">-</div>
            </div>
            <div class="metric-label">Blitz Rating</div>
            <div class="record-stats">
              <span class="win">0</span>
              <span class="draw">0</span>
              <span class="loss">0</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="rating-container">
              <div class="metric-value rapid-rating">-</div>
            </div>
            <div class="metric-label">Rapid Rating</div>
            <div class="record-stats">
              <span class="win">0</span>
              <span class="draw">0</span>
              <span class="loss">0</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-value bullet-rating">-</div>
            <div class="metric-label">Bullet Rating</div>
            <div class="record-stats">
              <span class="win">0</span>
              <span class="draw">0</span>
              <span class="loss">0</span>
            </div>
          </div>
        </div>
        <div class="metrics-grid-row2">
          <div class="metric-card-alt">
            <div class="metric-value precision">-</div>
            <div class="metric-label">Precision</div>
          </div>
          <div class="metric-card-alt">
            <div class="metric-value avg-time">-</div>
            <div class="metric-label">Avg Move Time</div>
          </div>
        </div>
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-icon">👤</div>
            <div class="stat-value followers-count">-</div>
            <div class="stat-label">Followers</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🏆</div>
            <div class="stat-value league-rank">-</div>
            <div class="stat-label">League</div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">⏰</div>
            <div class="stat-value last-online">-</div>
            <div class="stat-label">Last Activity</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    this.popup = popup;
    
    // Add click handlers after elements exist
    const username = popup.querySelector('.username');
    const avatar = popup.querySelector('.avatar');
    
    username.addEventListener('click', () => {
        if (this.currentOpponent) {
            window.open(`https://www.chess.com/member/${this.currentOpponent}`, '_blank');
        }
    });
    
    avatar.addEventListener('click', () => {
        if (this.currentOpponent) {
            window.open(`https://www.chess.com/member/${this.currentOpponent}`, '_blank');
        }
    });

    popup.querySelector('.close-button').addEventListener('click', () => {
        this.hidePopup();
    });
  }

  observeGameStart() {
    const observer = new MutationObserver(() => {
        const playerElements = document.querySelectorAll('.user-tagline-username');
        if (playerElements.length === 2) {
            // Get the username from the URL
            const urlUsername = window.location.href.split('username=')[1]?.split('&')[0];
            // If the first player matches URL username, second is opponent
            const opponentUsername = playerElements[0].textContent.trim() === urlUsername ? 
                playerElements[1].textContent.trim() : 
                playerElements[0].textContent.trim();
            
            if (opponentUsername !== this.currentOpponent) {
                this.currentOpponent = opponentUsername;
                this.fetchOpponentData(opponentUsername);
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
  }

  async fetchOpponentData(username) {
    try {
      this.setLoadingState();
      this.showPopup();

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
      const prevDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
      const prevYear = prevDate.getFullYear();
      const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');

      // Fetch both current and previous month's games
      const [profile, statsData, currentGames, prevGames] = await Promise.all([
        fetch(`https://api.chess.com/pub/player/${username}`).then(r => r.json()),
        fetch(`https://api.chess.com/pub/player/${username}/stats`).then(r => r.json()),
        fetch(`https://api.chess.com/pub/player/${username}/games/${currentYear}/${currentMonth}`).then(r => r.json()),
        fetch(`https://api.chess.com/pub/player/${username}/games/${prevYear}/${prevMonth}`).then(r => r.json())
      ]);

      const currentMonthGames = Array.isArray(currentGames.games) ? currentGames.games : [];
      const prevMonthGames = Array.isArray(prevGames.games) ? prevGames.games : [];
      
      const allGames = [...currentMonthGames, ...prevMonthGames];
      
      this.addLog('Fetched games data', {
        currentMonthCount: currentMonthGames.length,
        prevMonthCount: prevMonthGames.length,
        totalGames: allGames.length
      });

      const stats = {
        games: allGames,
        chess_rapid: statsData.chess_rapid || {},
        chess_blitz: statsData.chess_blitz || {},
        chess_bullet: statsData.chess_bullet || {}
      };

      this.updatePopup(profile, stats);
    } catch (error) {
      console.error('Error fetching opponent data:', error);
      this.addLog('Error fetching data', { error: error.message });
      const popup = this.popup;
      popup.querySelector('.username').textContent = 'Error loading data';
      popup.querySelector('.join-date').textContent = 'Please try again later';
    }
  }

  updatePopup(profile, stats) {
    const popup = this.popup;
    popup.querySelector('.avatar').src = profile.avatar || 'https://www.chess.com/bundles/web/images/user-image.svg';
    popup.querySelector('.username').textContent = profile.username;
    
    // Update flag with proper visibility
    const flagElement = popup.querySelector('.country-flag');
    if (profile.country) {
      flagElement.src = `https://flagcdn.com/w20/${profile.country.slice(-2).toLowerCase()}.png`;
      flagElement.style.display = 'inline';
    } else {
      flagElement.style.display = 'none';
    }
    
    popup.querySelector('.join-date').textContent = this.formatJoinDate(profile.joined);
    
    // Update Blitz stats
    const blitzStats = stats?.chess_blitz || stats?.blitz || {};
    popup.querySelector('.blitz-rating').textContent = blitzStats?.last?.rating || '-';
    popup.querySelector('.metric-card .win').textContent = blitzStats?.record?.win || '0';
    popup.querySelector('.metric-card .draw').textContent = blitzStats?.record?.draw || '0';
    popup.querySelector('.metric-card .loss').textContent = blitzStats?.record?.loss || '0';
    
    // Update Rapid stats
    const rapidStats = stats?.chess_rapid || stats?.rapid || {};
    popup.querySelector('.rapid-rating').textContent = rapidStats?.last?.rating || '-';
    const rapidRecordStats = popup.querySelectorAll('.metric-card')[1].querySelectorAll('.record-stats span');
    rapidRecordStats[0].textContent = rapidStats?.record?.win || '0';
    rapidRecordStats[1].textContent = rapidStats?.record?.draw || '0';
    rapidRecordStats[2].textContent = rapidStats?.record?.loss || '0';
    
    // Update Bullet stats
    const bulletStats = stats?.chess_bullet || stats?.bullet || {};
    popup.querySelector('.bullet-rating').textContent = bulletStats?.last?.rating || '-';
    const bulletRecordStats = popup.querySelectorAll('.metric-card')[2].querySelectorAll('.record-stats span');
    bulletRecordStats[0].textContent = bulletStats?.record?.win || '0';
    bulletRecordStats[1].textContent = bulletStats?.record?.draw || '0';
    bulletRecordStats[2].textContent = bulletStats?.record?.loss || '0';
    
    // Send message to background
    chrome.runtime.sendMessage({
      type: 'calculateStats',
      games: stats.games || [],
      username: this.currentOpponent
    }, response => {
      this.addLog('Sent message to background:', {
        type: 'calculateStats',
        gamesCount: stats.games?.length,
        username: this.currentOpponent
      });
      
      if (chrome.runtime.lastError) {
        this.addLog('Chrome runtime error:', chrome.runtime.lastError);
        return;
      }

      if (response) {
        this.addLog('Received response from background:', response);
        popup.querySelector('.precision').textContent = response.precision === '-' ? '-' : `${response.precision}%`;
        popup.querySelector('.avg-time').textContent = response.avgMoveTime === '-' ? '-' : `${response.avgMoveTime}s`;
      } else {
        this.addLog('No response received from background');
      }
    });
    
    popup.querySelector('.join-date').textContent = this.formatJoinDate(profile.joined);
    popup.querySelector('.followers-count').textContent = profile.followers || 0;
    popup.querySelector('.league-rank').textContent = profile.league || '-';
    popup.querySelector('.last-online').textContent = this.formatLastOnline(profile.last_online);
  }

  showPopup() {
    this.popup.classList.add('visible');
  }

  hidePopup() {
    this.popup.classList.remove('visible');
  }

  setLoadingState() {
    const popup = this.popup;
    popup.querySelector('.avatar').src = 'https://www.chess.com/bundles/web/images/user-image.svg';
    popup.querySelector('.username').textContent = 'Loading...';
    popup.querySelector('.country-flag').style.display = 'none';
    popup.querySelector('.join-date').textContent = '';
    
    // Clear all stats
    popup.querySelector('.blitz-rating').textContent = '-';
    popup.querySelector('.rapid-rating').textContent = '-';
    popup.querySelector('.bullet-rating').textContent = '-';
    popup.querySelector('.precision').textContent = '-';
    popup.querySelector('.avg-time').textContent = '-';
    
    // Clear record stats
    const recordStats = popup.querySelectorAll('.record-stats span');
    recordStats.forEach(stat => stat.textContent = '0');
    
    // Clear social stats
    popup.querySelector('.followers-count').textContent = '-';
    popup.querySelector('.league-rank').textContent = '-';
    popup.querySelector('.last-online').textContent = '-';
  }

  formatJoinDate(timestamp) {
    if (!timestamp) return '-';
    const joinDate = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24)); // days difference
    
    return `Joined ${diff} days ago - ${joinDate.toLocaleDateString()}`;
  }

  formatLastOnline(timestamp) {
    if (!timestamp) return '-';
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

  addLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    
    this.logs.push(logEntry);
    console.debug(`[${timestamp}] ${message}`, data || '');
    
    // Create download link if it doesn't exist
    if (!document.getElementById('chess-analyzer-log')) {
      const downloadLink = document.createElement('a');
      downloadLink.id = 'chess-analyzer-log';
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
    }
    
    // Update download link with latest logs
    const blob = new Blob([this.logs.map(log => 
      `[${log.timestamp}] ${log.message}\n${log.data ? log.data + '\n' : ''}`
    ).join('\n')], {type: 'text/plain'});
    
    const downloadLink = document.getElementById('chess-analyzer-log');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'chess-analyzer-debug.log';
  }
}

// Initialize the analyzer
new ChessAnalyzer();

// Add this right after the ChessAnalyzer class definition
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'debugLog') {
    const analyzer = window.chessAnalyzer;
    if (analyzer) {
      analyzer.addLog('Move Time Debug Log', message.data);
    }
  }
}); 