chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[BACKGROUND] Message received:', {
    type: request.type,
    gamesCount: request.games?.length,
    username: request.username
  });
  
  if (request.type === 'calculateStats') {
    try {      
      const moveTimeCalc = calculateAverageMoveTime(request.games);
      const precision = calculatePrecision(request.games, request.username);
      
      console.log('[BACKGROUND] Calculations complete:', {
        avgMoveTime: moveTimeCalc.result,
        gamesProcessed: request.games?.length
      });
      
      // Send the detailed logs to content script
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'debugLog',
        data: moveTimeCalc.logs
      });

      sendResponse({
        precision,
        avgMoveTime: moveTimeCalc.result
      });
    } catch (error) {
      console.error('[BACKGROUND] Error:', error);
      sendResponse({ precision: '-', avgMoveTime: '-' });
    }
    return true;
  }
});

function calculateAverageMoveTime(games) {
  const logs = [];
  const addLog = (msg, data) => {
    logs.push(`[MOVE-TIME] ${msg}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`);
  };

  addLog('Starting calculation', {
    totalGames: games?.length,
    sampleGame: games?.[0] ? {
      white: games[0].white?.username,
      black: games[0].black?.username,
      timeControl: games[0].time_control,
      pgnSample: games[0].pgn?.substring(0, 200)
    } : null
  });

  if (!games || !games.length) {
    addLog('No games provided');
    return { result: '-', logs: logs.join('\n') };
  }

  let totalTime = 0;
  let totalMoves = 0;

  games.slice(0, 20).forEach((game, index) => {
    addLog(`Game ${index + 1} analysis`, {
      white: game.white?.username,
      black: game.black?.username,
      timeControl: game.time_control,
      pgnLength: game.pgn?.length,
      fullPgn: game.pgn
    });

    if (!game.pgn) {
      addLog(`Game ${index + 1}: No PGN data`);
      return;
    }

    const clockTimes = game.pgn.match(/\{?\[%clk (\d+):(\d+\.\d+)\]\}?/g);
    addLog(`Game ${index + 1} clock times`, {
      found: clockTimes?.length || 0,
      samples: clockTimes?.slice(0, 5)
    });

    if (!clockTimes || clockTimes.length < 2) {
      addLog(`Game ${index + 1}: Insufficient clock times`);
      return;
    }

    const firstTime = clockTimes[0].match(/(\d+):(\d+\.\d+)/);
    const lastTime = clockTimes[clockTimes.length - 1].match(/(\d+):(\d+\.\d+)/);

    addLog(`Game ${index + 1} time matches`, {
      first: firstTime?.[0],
      last: lastTime?.[0],
      totalMatches: clockTimes.length
    });

    if (!firstTime || !lastTime) {
      addLog(`Game ${index + 1}: Invalid time format`);
      return;
    }

    const startSeconds = parseInt(firstTime[1]) * 60 + parseFloat(firstTime[2]);
    const endSeconds = parseInt(lastTime[1]) * 60 + parseFloat(lastTime[2]);
    const timeSpent = startSeconds - endSeconds;

    const moves = game.pgn
      .replace(/\{[^}]*\}/g, '')
      .replace(/\d+\./g, '')
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
      .trim()
      .split(/\s+/)
      .filter(move => /^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8]=?[QRBN]?\+?#?$/.test(move));

    addLog(`Game ${index + 1} calculation`, {
      startSeconds,
      endSeconds,
      timeSpent,
      moveCount: moves.length,
      sampleMoves: moves.slice(0, 5),
      avgPerMove: moves.length ? (timeSpent / moves.length).toFixed(2) : 0
    });

    if (moves.length > 0 && timeSpent > 0) {
      totalMoves += moves.length;
      totalTime += timeSpent;
      addLog(`Game ${index + 1} contribution`, {
        addedMoves: moves.length,
        addedTime: timeSpent,
        runningTotal: {
          moves: totalMoves,
          time: totalTime,
          currentAvg: (totalTime / totalMoves).toFixed(2)
        }
      });
    }
  });

  addLog('Final calculation', {
    totalGamesProcessed: Math.min(20, games.length),
    totalMoves,
    totalTime,
    finalAverage: totalMoves > 0 ? Math.round(totalTime / totalMoves) : '-'
  });

  return {
    result: totalMoves > 0 ? Math.round(totalTime / totalMoves) : '-',
    logs: logs.join('\n')
  };
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