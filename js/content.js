if (!window.chessAnalyzer) {
  class ChessAnalyzer {
    constructor() {
      console.log('ChessAnalyzer Constructor - Starting initialization');
      this.popup = null;
      this.currentOpponent = null;    
      
    // Initialize on any chess.com page
    if (window.location.hostname.includes('chess.com')) {
      console.log('Chess.com domain detected - calling init()');
      this.init();
    } else {
      console.log('Not on Chess.com domain');
    }
      
      // Listen for extension button click
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "togglePopup") {
          console.log('Toggle popup action received');
          
          try {
            const pageCheckResult = this.isChessComPage();
            console.log('isChessComPage completed with result:', pageCheckResult);
            
            if (!pageCheckResult) {
              console.log('Not on chess.com game page');
              this.createRedirectOverlay();
              sendResponse({status: 'not_chess_page'});
            } else {
              console.log('Valid chess.com game page detected');
              if (this.popup && this.popup.classList.contains('visible')) {
                this.hidePopup();
                sendResponse({status: 'hidden'});
              } else {
                this.findPlayers().then(players => {
                  if (players && players.length >= 2) {
                    this.currentOpponent = players[1];
                    this.fetchOpponentData(this.currentOpponent, true);
                    sendResponse({status: 'shown'});
                  } else {
                    console.log('No players found');
                    this.createRedirectOverlay();
                    sendResponse({status: 'no_players'});
                  }
                });
              }
            }
          } catch (error) {
            console.error('Error in togglePopup handler:', error);
            sendResponse({status: 'error', message: error.toString()});
          }
          return true; // Keep the message channel open for async response
        }
      });
    }

    init() {
      console.log('Init function called');
      // Always create popup
      this.createPopup();
      
      // Start observer if not snoozed
      chrome.storage.local.get(['snoozeUntil'], (result) => {
        console.log('Checking snooze state:', result);
        if (result.snoozeUntil && result.snoozeUntil > Date.now()) {
          console.log('Extension is snoozed - observer not started');
        } else {
          console.log('Starting observer');
          this.observeGameStart();
        }
      });
    }

    createPopup() {
      const popup = document.createElement('div');
      popup.className = 'chess-analyzer-popup';
      popup.innerHTML = `
        <div class="popup-header">
          <h3>Opponent Analysis</h3>
          <button class="settings-toggle">⚙️</button>
        </div>
        <div class="settings-menu">
          <div class="settings-title">Settings</div>
          <div class="settings-content">
            <label class="setting-item">
              <span>Dark Mode</span>
              <input type="checkbox" id="darkMode">
            </label>
            <label class="setting-item">
              <span>Snooze</span>
              <select id="snoozeTime">
                <option value="0">Off</option>
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
              </select>
            </label>
          </div>
        </div>
        <div class="popup-content">
          <div class="player-info">
              <img class="avatar" src="" alt="Player avatar">
              <div class="player-details">
                  <div class="username-row">
                      <img class="country-flag" src="" alt="Country flag">
                      <span class="username""></span>
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
              <div class="metric-label">
                Precision
                <div class="metric-sublabel">(last 20 games)</div>
              </div>
            </div>
            <div class="metric-card-alt">
              <div class="metric-value avg-time">-</div>
              <div class="metric-label">
                Avg Move Time
                <div class="metric-sublabel">(last 20 games)</div>
              </div>
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
          <div class="acknowledge-section">
            <button class="acknowledge-btn" id="acknowledgeStats">
              Accept
            </button>
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

      const settingsToggle = popup.querySelector('.settings-toggle');
      const settingsMenu = popup.querySelector('.settings-menu');

      settingsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('visible');
      });

      // Close settings when clicking outside
      document.addEventListener('click', (e) => {
        if (!settingsMenu.contains(e.target) && !settingsToggle.contains(e.target)) {
          settingsMenu.classList.remove('visible');
        }
      });

      const darkModeToggle = popup.querySelector('#darkMode');
      const snoozeSelect = popup.querySelector('#snoozeTime');

      // Load saved preferences
      chrome.storage.local.get(['darkMode', 'snoozeUntil'], (result) => {
        console.log('Initial dark mode state:', result.darkMode); // Debug log
        if (result.darkMode) {
          darkModeToggle.checked = true;
          popup.classList.add('dark-mode');
        } else {
          darkModeToggle.checked = false;
          popup.classList.remove('dark-mode');
        }
        
        if (result.snoozeUntil && result.snoozeUntil > Date.now()) {
          // Extension is snoozed
          const remainingTime = Math.ceil((result.snoozeUntil - Date.now()) / (1000 * 60 * 60));
          showSnoozeConfirmation(`Opponent analyzer snoozed for ${remainingTime} more hour${remainingTime > 1 ? 's' : ''}`);
          return;
        }
      });

      darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
          popup.classList.add('dark-mode');
        } else {
          popup.classList.remove('dark-mode');
        }
        console.log('Dark mode:', darkModeToggle.checked); // Debug log
        console.log('Classes:', popup.className); // Debug log
        chrome.storage.local.set({ darkMode: darkModeToggle.checked });
      });

      snoozeSelect.addEventListener('change', () => {
        const hours = parseInt(snoozeSelect.value);
        if (hours > 0) {
          const snoozeUntil = Date.now() + (hours * 60 * 60 * 1000);
          chrome.storage.local.set({ 
            snoozeUntil,
            snoozeTime: snoozeSelect.value 
          }, () => {
            // Show feedback and close popup
            const feedbackText = `Opponent analyzer snoozed for ${hours} hour${hours > 1 ? 's' : ''}`;
            showSnoozeConfirmation(feedbackText);
            this.hidePopup();
          });
        } else {
          chrome.storage.local.remove(['snoozeUntil', 'snoozeTime'], () => {
            showSnoozeConfirmation('Snooze disabled');
          });
        }
      });

      const acknowledgeBtn = popup.querySelector('#acknowledgeStats');
      acknowledgeBtn.addEventListener('click', () => {
        this.hidePopup();
        settingsMenu.classList.remove('visible');
      });
    }

    observeGameStart() {
      const observer = new MutationObserver(() => {
          // Add a small delay to ensure DOM is stable
          setTimeout(() => {
              const playerElements = document.querySelectorAll('.user-tagline-username');
              if (playerElements.length === 2) {
                  // Get the username from the URL
                  const urlUsername = window.location.href.split('username=')[1]?.split('&')[0];
                  
                  // Get both usernames
                  const player1 = playerElements[0].textContent.trim();
                  const player2 = playerElements[1].textContent.trim();
                  
                  // Only proceed if we have valid usernames
                  if (player1 && player2 && player1 !== 'Opponent' && player2 !== 'Opponent') {
                      const opponentUsername = player1 === urlUsername ? player2 : player1;
                      
                      if (opponentUsername !== this.currentOpponent) {
                          this.currentOpponent = opponentUsername;
                          this.fetchOpponentData(opponentUsername);
                      }
                  }
              }
          }, 500); // 500ms delay
      });

      observer.observe(document.body, {
          childList: true,
          subtree: true
      });
    }

    async fetchOpponentData(username, force = true) {
      try {
        this.setLoadingState();
        this.showPopup(force);

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
        
        const stats = {
          games: allGames,
          chess_rapid: statsData.chess_rapid || {},
          chess_blitz: statsData.chess_blitz || {},
          chess_bullet: statsData.chess_bullet || {}
        };

        this.updatePopup(profile, stats);
      } catch (error) {
        console.error('Error fetching opponent data:', error);
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
        if (chrome.runtime.lastError) {
          return;
        }

        if (response) {
          popup.querySelector('.precision').textContent = response.precision === '-' ? '-' : `${response.precision}%`;
          popup.querySelector('.avg-time').textContent = response.avgMoveTime === '-' ? '-' : `${response.avgMoveTime}s`;
        }
      });
      
      popup.querySelector('.join-date').textContent = this.formatJoinDate(profile.joined);
      popup.querySelector('.followers-count').textContent = profile.followers || 0;
      popup.querySelector('.league-rank').textContent = profile.league || '-';
      popup.querySelector('.last-online').textContent = this.formatLastOnline(profile.last_online);
    }

    showPopup(force = false) {
      if (force) {
        this.forceShowPopup();
        return;
      }
      
      chrome.storage.local.get(['snoozeUntil'], (result) => {
        if (result.snoozeUntil && result.snoozeUntil > Date.now()) {
          const remainingTime = Math.ceil((result.snoozeUntil - Date.now()) / (1000 * 60 * 60));
          showSnoozeConfirmation(`Opponent analyzer snoozed for ${remainingTime} more hour${remainingTime > 1 ? 's' : ''}`);
          return;
        }
        if (this.popup) {
          this.popup.classList.add('visible');
          // Reset settings menu state
          this.popup.querySelector('.settings-menu').classList.remove('visible');
        }
      });
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

    createRedirectOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'chess-analyzer-overlay';
      overlay.innerHTML = `
        <div class="overlay-card">
          <h2>Chess.com Opponent Analyzer</h2>
          <p>This extension only works on Chess.com game pages.</p>
          <a href="https://chess.com/play" class="redirect-button" target="_blank">
            Play on Chess.com
          </a>
        </div>
      `;

      document.body.appendChild(overlay);

      // Remove overlay when clicking outside the card
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
        }
      });
    }

    findPlayers() {
      console.log('DEBUG - Finding players...');
      
      // Wait for page load
      if (document.readyState !== 'complete') {
        console.log('DEBUG - Page not fully loaded, waiting...');
        return null;
      }

      // Add a small delay to ensure dynamic content is loaded
      return new Promise(resolve => {
        setTimeout(() => {
          // Try different selectors in order of specificity
          const selectors = [
            '.user-username-component.user-tagline-username',
            '.user-tagline-username',
            '.user-username-white.user-tagline-username, .user-username-black.user-tagline-username'
          ];

          for (const selector of selectors) {
            console.log(`DEBUG - Trying selector: ${selector}`);
            const elements = document.querySelectorAll(selector);
            console.log(`DEBUG - Found ${elements.length} elements`);

            if (elements.length >= 2) {
              const players = Array.from(elements)
                .map(el => el.textContent.trim())
                .filter(text => text && text !== 'Opponent');

              if (players.length >= 2) {
                console.log('DEBUG - Found players:', players);
                resolve(players);
                return;
              }
            }
          }

          console.log('DEBUG - No players found');
          resolve(null);
        }, 1000); // 1 second delay
      });
    }

    isChessComPage() {
      console.log('isChessComPage called');
      const isChessDomain = window.location.hostname.includes('chess.com');
      const fullUrl = window.location.href;
      const pathname = window.location.pathname;
      
      // More comprehensive game URL detection
      const isGameUrl = pathname.includes('/game/live/') || 
                       pathname.includes('/live/') ||
                       pathname.includes('/play/online/') ||
                       pathname.includes('/play/computer/') ||
                       fullUrl.includes('?username=');
      
      const matches = {
        gameLive: pathname.includes('/game/live/'),
        live: pathname.includes('/live/'),
        playOnline: pathname.includes('/play/online/'),
        playComputer: pathname.includes('/play/computer/'),
        hasUsername: fullUrl.includes('?username=')
      };
      
      console.log('Chess.com Page Check:', {
        isChessDomain,
        isGameUrl,
        fullUrl,
        pathname,
        matches
      });
      
      const result = isChessDomain && isGameUrl;
      console.log('Final result:', result);
      
      return result;
    }

    showGuestMessage() {
      const popup = this.popup;
      popup.querySelector('.avatar').src = 'https://www.chess.com/bundles/web/images/user-image.svg';
      popup.querySelector('.username').textContent = 'Guest Player';
      popup.querySelector('.country-flag').style.display = 'none';
      popup.querySelector('.join-date').textContent = 'Guest accounts have limited data';
      
      const statsToHide = [
        '.blitz-rating', '.rapid-rating', '.bullet-rating',
        '.precision', '.avg-time', '.followers-count',
        '.league-rank', '.last-online'
      ];
      
      statsToHide.forEach(selector => {
        const el = popup.querySelector(selector);
        if (el) el.textContent = 'N/A';
      });
      
      const recordStats = popup.querySelectorAll('.record-stats span');
      recordStats.forEach(stat => stat.textContent = 'N/A');
    }

    forceShowPopup() {
      if (this.popup) {
        this.popup.classList.add('visible');
        // Reset settings menu state
        this.popup.querySelector('.settings-menu').classList.remove('visible');
      }
    }
  }
  
  window.chessAnalyzer = new ChessAnalyzer();
}

// Add this new function
function showSnoozeConfirmation(message) {
  // Remove any existing confirmation
  const existing = document.querySelector('.snooze-confirmation');
  if (existing) existing.remove();

  const confirmation = document.createElement('div');
  confirmation.className = 'snooze-confirmation';
  confirmation.textContent = message;
  document.body.appendChild(confirmation);
  
  setTimeout(() => {
    confirmation.classList.add('fade-out');
    setTimeout(() => confirmation.remove(), 300);
  }, 2000);
}