chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'calculateStats') {
    try {      
      const moveTimeCalc = calculateAverageMoveTime(request.games);
      const precision = calculatePrecision(request.games, request.username);
      
      // Send the detailed logs to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'debugLog',
        data: moveTimeCalc.logs
      });

      sendResponse({
        precision,
        avgMoveTime: moveTimeCalc.avgMoveTime
      });
    } catch (error) {
      sendResponse({ precision: '-', avgMoveTime: '-' });
    }
    return true;
  }
});

function calculateAverageMoveTime(games) {
  if (!games || !games.length) {
    return { avgMoveTime: '-' };
  }

  let totalTime = 0;
  let totalMoves = 0;

  games.slice(0, 20).forEach((game, index) => {
    if (!game.pgn) return;

    const clockTimes = game.pgn.match(/\[%clk (\d+:\d+:\d+(?:\.\d+)?)\]/g);
    if (!clockTimes || clockTimes.length < 2) return;

    const firstTime = clockTimes[0].match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    const lastTime = clockTimes[clockTimes.length - 1].match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);

    if (!firstTime || !lastTime) return;

    const startSeconds = parseInt(firstTime[1]) * 3600 + 
                        parseInt(firstTime[2]) * 60 + 
                        parseFloat(firstTime[3]);
    const endSeconds = parseInt(lastTime[1]) * 3600 + 
                      parseInt(lastTime[2]) * 60 + 
                      parseFloat(lastTime[3]);
    const timeSpent = startSeconds - endSeconds;

    const moves = game.pgn
      .replace(/\{[^}]*\}/g, '')
      .replace(/\d+\./g, '')
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .trim()
      .split(/\s+/)
      .filter(move => /^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8]=?[QRBN]?\+?#?$/.test(move));

    const playerMoveCount = Math.ceil(moves.length / 2);

    if (playerMoveCount > 0 && timeSpent > 0) {
      totalMoves += playerMoveCount;
      totalTime += timeSpent;
    }
  });

  const finalAverage = totalMoves > 0 ? (totalTime / totalMoves).toFixed(1) : '-';
  
  return { avgMoveTime: finalAverage };
}

function calculatePrecision(games, username) {
  if (!games || !games.length) return '-';
  
  let totalAccuracy = 0;
  let count = 0;
  
  games.slice(0, 20).forEach(game => {
    if (!game.accuracies || !game.white || !game.black) return;
    
    const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
    const accuracy = isWhite ? game.accuracies.white : game.accuracies.black;
    
    if (typeof accuracy === 'number' && !isNaN(accuracy)) {
      totalAccuracy += accuracy;
      count++;
    }
  });
  
  if (count === 0) return '-';
  return Math.round(totalAccuracy / count);
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("chess.com")) {
    chrome.tabs.sendMessage(tab.id, { action: "togglePopup" });
  }
}); 