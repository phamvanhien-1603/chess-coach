import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  RotateCw,
  Plus,
  Trophy,
  Flag,
  Save,
  Box,
  User as UserIcon,
  Menu,
  Clock,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Undo2,
} from 'lucide-react';
import type {
  AppMode,
  ArrowOverlay,
  BoardTheme,
  EngineLine,
  MoveRecord,
  OpeningLine,
  PlayerColor,
  SkillLevelOption,
  TacticalPuzzle,
} from './types/chess';
import { ChessBoard } from './components/ChessBoard';
import { EvalBar } from './components/EvalBar';
import { CoachPanel } from './components/CoachPanel';
import { AuthModal } from './components/AuthModal';
import { FriendsModal } from './components/FriendsModal';
import { Sidebar } from './components/Sidebar';
import { useI18n } from './i18n/I18nContext';
import { generateChess960Fen } from './utils/chess960';

const ChessBoard3D = lazy(() =>
  import('./components/ChessBoard3D').then((m) => ({ default: m.ChessBoard3D }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const HistoryModal = lazy(() =>
  import('./components/HistoryModal').then((m) => ({ default: m.HistoryModal }))
);
const LeaderboardModal = lazy(() =>
  import('./components/LeaderboardModal').then((m) => ({ default: m.LeaderboardModal }))
);
const ShopModal = lazy(() =>
  import('./components/ShopModal').then((m) => ({ default: m.ShopModal }))
);
const AdminModal = lazy(() =>
  import('./components/AdminModal').then((m) => ({ default: m.AdminModal }))
);
const QuestsModal = lazy(() =>
  import('./components/QuestsModal').then((m) => ({ default: m.QuestsModal }))
);
import { dbApi, type AuthUser, type SavedGameSummary, type TournamentItem, type UserProgress } from './services/dbApi';
import {
  BotSelectionScreen,
  FriendLobbyScreen,
  PlayLobbyScreen,
  TIME_CONTROLS,
  TournamentListScreen,
} from './components/PlayHubScreens';
import { stockfishService } from './engine/stockfishService';
import {
  SKILL_LEVELS,
  askGeminiCoach,
  classifyMove,
  explainBestMoveHintVi,
  explainMoveVi,
} from './utils/chessCoach';
import { OPENINGS } from './data/openings';
import { PUZZLES } from './data/puzzles';
import { soundService } from './utils/sound';

const INITIAL_FEN = new Chess().fen();

function getGameStatusText(chess: Chess): string | null {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? 'Chiếu hết! Quân Đen thắng.' : 'Chiếu hết! Quân Trắng thắng.';
  }
  if (chess.isStalemate()) return 'Hòa cờ (Hết nước đi - Stalemate).';
  if (chess.isThreefoldRepetition()) return 'Hòa cờ (Lặp lại thế cờ 3 lần).';
  if (chess.isInsufficientMaterial()) return 'Hòa cờ (Không đủ quân chiếu hết).';
  if (chess.isDraw()) return 'Hòa cờ.';
  return null;
}

export function App() {
  const { lang, setLang, t } = useI18n();
  const [mode, setMode] = useState<AppMode>('play');
  const [skillLevel, setSkillLevel] = useState<SkillLevelOption>(SKILL_LEVELS[1]);
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('emerald');
  const [appearance, setAppearance] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('chess_coach_appearance') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [is3D, setIs3D] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoShowArrows, setAutoShowArrows] = useState(false);
  const [showHintArrows, setShowHintArrows] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [incomingFriendCount, setIncomingFriendCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Play Hub & Matchmaking state
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('1 phút');
  const [playScreen, setPlayScreen] = useState<'lobby' | 'tournaments' | 'friend-lobby' | 'bots' | 'game'>('lobby');
  const [isMatching, setIsMatching] = useState(false);
  const [isCoachMode, setIsCoachMode] = useState(true);
  const [isSelfPlay, setIsSelfPlay] = useState(false);
  const [autoFlipSelfPlay, setAutoFlipSelfPlay] = useState(false);
  const [matchedOpponent, setMatchedOpponent] = useState<{ name: string; elo: number } | null>(null);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [whiteTimeMs, setWhiteTimeMs] = useState(60000);
  const [blackTimeMs, setBlackTimeMs] = useState(60000);
  const [timeoutWinner, setTimeoutWinner] = useState<'w' | 'b' | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const matchmakingTimerRef = useRef<number | null>(null);

  // MongoDB state
  const [dbConnected, setDbConnected] = useState(false);
  const [dbName, setDbName] = useState<string | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGameSummary[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const autoSavedSessionRef = useRef<number>(-1);

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('chess_coach_gemini_key') || '';
    } catch {
      return '';
    }
  });

  // Core game state
  const [startFen, setStartFen] = useState<string>(INITIAL_FEN);
  const [currentFen, setCurrentFen] = useState<string>(INITIAL_FEN);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [viewPly, setViewPly] = useState<number | null>(null);

  // Engine & Coach state
  const [engineLines, setEngineLines] = useState<EngineLine[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [coachHint, setCoachHint] = useState<string | null>(null);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Openings state
  const [activeOpening, setActiveOpening] = useState<OpeningLine>(OPENINGS[0]);
  const [openingStep, setOpeningStep] = useState(0);

  // Puzzles state
  const [activePuzzle, setActivePuzzle] = useState<TacticalPuzzle>(PUZZLES[0]);
  const [puzzleStep, setPuzzleStep] = useState(0);
  const [puzzleStatus, setPuzzleStatus] = useState<'solving' | 'solved' | 'wrong'>('solving');

  const engineLinesRef = useRef<EngineLine[]>([]);
  engineLinesRef.current = engineLines;

  const gameSessionRef = useRef(0);

  useEffect(() => {
    soundService.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appearance);
    try {
      localStorage.setItem('chess_coach_appearance', appearance);
    } catch {
      // ignore
    }
  }, [appearance]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      return next;
    });
  };

  const refreshDbHealth = useCallback(async () => {
    const h = await dbApi.getHealth();
    setDbConnected(h.dbConnected);
    setDbName(h.dbName);
    return h.dbConnected;
  }, []);

  const loadHistoryData = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const ok = await refreshDbHealth();
      if (ok) {
        const [games, progress] = await Promise.all([dbApi.getGames(), dbApi.getProgress()]);
        setSavedGames(games);
        setUserProgress(progress);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [refreshDbHealth]);

  useEffect(() => {
    refreshDbHealth();
    dbApi.getMe().then((u) => {
      if (u) {
        setCurrentUser(u);
        dbApi
          .getFriends()
          .then((d) => setIncomingFriendCount(d.incoming.length))
          .catch(() => {});
      }
    });
  }, [refreshDbHealth]);

  const saveCurrentGameToDb = useCallback(
    async (silent = false) => {
      if (!dbConnected || moves.length === 0) {
        if (!silent) {
          setSaveToast(dbConnected ? 'Chưa có nước đi để lưu.' : 'Chưa kết nối MongoDB!');
          setTimeout(() => setSaveToast(null), 2500);
        }
        return;
      }

      const c = new Chess(currentFen);
      let result = 'Đang chơi';
      let winner: 'player' | 'ai' | 'draw' | 'none' = 'none';

      if (c.isCheckmate()) {
        const winnerColor = c.turn() === 'w' ? 'b' : 'w';
        winner = mode === 'play' ? (winnerColor === playerColor ? 'player' : 'ai') : 'none';
        result = winnerColor === 'w' ? 'Trắng thắng (Chiếu hết)' : 'Đen thắng (Chiếu hết)';
      } else if (c.isDraw()) {
        winner = 'draw';
        result = 'Hòa cờ';
      }

      const playerMoves = moves.filter((m) => (mode === 'play' ? m.color === playerColor : true));
      const blunders = playerMoves.filter((m) => m.quality === 'blunder').length;
      const mistakes = playerMoves.filter((m) => m.quality === 'mistake').length;
      const cpList = playerMoves.map((m) => m.cpLoss ?? 0);
      const avgCpLoss = cpList.length > 0 ? Math.round(cpList.reduce((a, b) => a + b, 0) / cpList.length) : 0;

      try {
        const saved = await dbApi.saveGame({
          title: mode === 'play' ? `Đấu AI (${skillLevel.label})` : 'Ván phân tích',
          mode,
          playerColor,
          aiElo: skillLevel.elo,
          result,
          winner,
          startFen,
          finalFen: currentFen,
          blunders,
          mistakes,
          avgCpLoss,
          moves,
        });
        if (saved.user) {
          setCurrentUser(saved.user);
        }
        if (saved.reward) {
          const r = saved.reward;
          setSaveToast(`+${r.coinsEarned} Xu · +${r.pointsEarned}đ · Chuỗi ${r.winStreak} 🔥`);
          setTimeout(() => setSaveToast(null), 4500);
        } else if (!silent) {
          setSaveToast('Đã lưu vào MongoDB!');
          setTimeout(() => setSaveToast(null), 2500);
        }
      } catch {
        if (!silent) {
          setSaveToast('Lỗi khi lưu vào MongoDB');
          setTimeout(() => setSaveToast(null), 2500);
        }
      }
    },
    [dbConnected, moves, currentFen, mode, playerColor, skillLevel, startFen]
  );

  const handleSaveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    try {
      localStorage.setItem('chess_coach_gemini_key', key);
    } catch {
      // ignore storage errors
    }
  };

  // Displayed FEN (supports clicking move history)
  const displayedFen = useMemo(() => {
    if (viewPly === null || viewPly === moves.length) return currentFen;
    if (viewPly === 0) return startFen;
    return moves[viewPly - 1]?.fenAfter || currentFen;
  }, [viewPly, moves, currentFen, startFen]);

  const displayedLastMove = useMemo(() => {
    const idx = viewPly === null ? moves.length - 1 : viewPly - 1;
    if (idx < 0 || !moves[idx]) return null;
    return { from: moves[idx].from, to: moves[idx].to };
  }, [viewPly, moves]);

  const displayedChess = useMemo(() => new Chess(displayedFen), [displayedFen]);
  const gameOverText = useMemo(() => getGameStatusText(displayedChess), [displayedChess]);

  // Auto-save completed game to MongoDB
  useEffect(() => {
    if (
      mode === 'play' &&
      dbConnected &&
      gameOverText &&
      moves.length > 0 &&
      autoSavedSessionRef.current !== gameSessionRef.current
    ) {
      autoSavedSessionRef.current = gameSessionRef.current;
      saveCurrentGameToDb(true);
    }
  }, [mode, dbConnected, gameOverText, moves.length, saveCurrentGameToDb]);

  // Run Stockfish analysis whenever displayedFen changes (unless AI is currently thinking)
  useEffect(() => {
    if (isAiThinking) return;
    if (displayedChess.isGameOver()) {
      setEngineLines([]);
      setIsAnalyzing(false);
      return;
    }

    let cancelled = false;
    setIsAnalyzing(true);

    stockfishService
      .analyzePosition(displayedFen, 12, 3, (lines) => {
        if (!cancelled) setEngineLines(lines);
      })
      .then((finalLines) => {
        if (!cancelled) {
          if (finalLines.length > 0) setEngineLines(finalLines);
          setIsAnalyzing(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsAnalyzing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [displayedFen, isAiThinking, displayedChess]);

  const playMoveSound = (move: { captured?: string; san: string }, chessAfter: Chess) => {
    if (chessAfter.isGameOver()) {
      soundService.playGameOver();
    } else if (chessAfter.inCheck()) {
      soundService.playCheck();
    } else if (move.san === 'O-O' || move.san === 'O-O-O') {
      soundService.playCastle();
    } else if (move.captured) {
      soundService.playCapture();
    } else {
      soundService.playMove();
    }
  };

  // Start a new Play vs AI game
  const startNewPlayGame = useCallback(
    async (color: PlayerColor = playerColor) => {
      gameSessionRef.current++;
      const sessionId = gameSessionRef.current;
      await stockfishService.stopSearch();

      const fresh = new Chess();
      const fen = fresh.fen();
      setStartFen(fen);
      setCurrentFen(fen);
      setMoves([]);
      setViewPly(null);
      setCoachHint(null);
      setGeminiResponse(null);
      setShowHintArrows(false);
      setFlipped(color === 'b');

      if (color === 'b') {
        setIsAiThinking(true);
        const aiUci = await stockfishService.getAiMove(fen, skillLevel.stockfishSkill, skillLevel.moveTimeMs);
        if (sessionId !== gameSessionRef.current || !aiUci) {
          setIsAiThinking(false);
          return;
        }
        const c = new Chess(fen);
        const move = c.move({
          from: aiUci.slice(0, 2) as Square,
          to: aiUci.slice(2, 4) as Square,
          promotion: aiUci.length > 4 ? aiUci[4] : undefined,
        });
        if (move) {
          playMoveSound(move, c);
          const afterFen = c.fen();
          setCurrentFen(afterFen);
          setMoves([
            {
              ply: 1,
              moveNumber: 1,
              color: 'w',
              san: move.san,
              uci: aiUci,
              from: move.from,
              to: move.to,
              fenBefore: fen,
              fenAfter: afterFen,
              quality: 'book',
              explanation: 'AI mở đầu ván đấu.',
            },
          ]);
        }
        setIsAiThinking(false);
      }
    },
    [playerColor, skillLevel]
  );

  // Start an Opening training session
  const startOpeningSession = useCallback(async (opening: OpeningLine) => {
    gameSessionRef.current++;
    await stockfishService.stopSearch();

    const fresh = new Chess();
    const initialFen = fresh.fen();
    setStartFen(initialFen);
    setMoves([]);
    setViewPly(null);
    setGeminiResponse(null);
    setShowHintArrows(false);
    setActiveOpening(opening);
    setFlipped(opening.playerColor === 'b');

    if (opening.playerColor === 'b' && opening.moves.length > 0) {
      const first = opening.moves[0];
      const move = fresh.move(first.san);
      if (move) {
        const afterFen = fresh.fen();
        setCurrentFen(afterFen);
        setMoves([
          {
            ply: 1,
            moveNumber: 1,
            color: 'w',
            san: move.san,
            uci: `${move.from}${move.to}${move.promotion || ''}`,
            from: move.from,
            to: move.to,
            fenBefore: initialFen,
            fenAfter: afterFen,
            quality: 'book',
            explanation: first.comment,
          },
        ]);
        setOpeningStep(1);
        setCoachHint(`Đối thủ đi ${move.san}. ${first.comment}`);
        return;
      }
    }

    setCurrentFen(initialFen);
    setOpeningStep(0);
    setCoachHint(`Hãy thực hiện nước đầu tiên theo mũi tên xanh: ${opening.moves[0]?.san || ''}.`);
  }, []);

  // Start a Tactical Puzzle
  const startPuzzleSession = useCallback(async (puzzle: TacticalPuzzle) => {
    gameSessionRef.current++;
    await stockfishService.stopSearch();

    const c = new Chess(puzzle.fen);
    setStartFen(puzzle.fen);
    setCurrentFen(puzzle.fen);
    setMoves([]);
    setViewPly(null);
    setGeminiResponse(null);
    setShowHintArrows(false);
    setActivePuzzle(puzzle);
    setPuzzleStep(0);
    setPuzzleStatus('solving');
    setFlipped(c.turn() === 'b');
    setCoachHint(
      `Thế cờ ${c.turn() === 'w' ? 'Trắng' : 'Đen'} đi trước. Hãy tìm nước đi chiến thuật mạnh nhất!`
    );
  }, []);

  // Switch app mode
  const handleModeChange = (nextMode: AppMode) => {
    setMode(nextMode);
    setCoachHint(null);
    setGeminiResponse(null);
    setShowHintArrows(false);
    if (nextMode === 'play') {
      startNewPlayGame(playerColor);
    } else if (nextMode === 'openings') {
      startOpeningSession(activeOpening);
    } else if (nextMode === 'puzzles') {
      startPuzzleSession(activePuzzle);
    } else if (nextMode === 'analyze') {
      gameSessionRef.current++;
      const fresh = new Chess();
      setStartFen(fresh.fen());
      setCurrentFen(fresh.fen());
      setMoves([]);
      setViewPly(null);
      setFlipped(false);
    }
  };

  // Handle a player move on the board
  const handlePlayerMove = (from: string, to: string, promotion?: string): boolean => {
    if (viewPly !== null && viewPly !== moves.length) {
      setViewPly(null);
      return false;
    }

    const chess = new Chess(currentFen);
    const fenBefore = currentFen;
    const moverColor = chess.turn();

    let move;
    try {
      move = chess.move({ from: from as Square, to: to as Square, promotion });
    } catch {
      return false;
    }
    if (!move) return false;

    const uci = `${move.from}${move.to}${move.promotion || ''}`;
    const fenAfter = chess.fen();

    // Mode: Openings
    if (mode === 'openings') {
      const expected = activeOpening.moves[openingStep];
      if (expected && move.san !== expected.san) {
        soundService.playBlunder();
        setCoachHint(`Chưa đúng bài! Trong ${activeOpening.viName}, nước chuẩn là ${expected.san}. Hãy đi theo mũi tên xanh.`);
        return false;
      }

      playMoveSound(move, chess);
      const nextStep = openingStep + 1;
      const newRecord: MoveRecord = {
        ply: moves.length + 1,
        moveNumber: Math.floor(moves.length / 2) + 1,
        color: moverColor,
        san: move.san,
        uci,
        from: move.from,
        to: move.to,
        fenBefore,
        fenAfter,
        quality: 'book',
        explanation: expected?.comment || 'Nước khai cuộc chuẩn.',
      };

      const updatedMoves = [...moves, newRecord];
      setCurrentFen(fenAfter);
      setMoves(updatedMoves);
      setOpeningStep(nextStep);
      setCoachHint(expected?.comment || 'Rất tốt!');

      // Auto-play opponent's next book move
      const oppExpected = activeOpening.moves[nextStep];
      if (oppExpected) {
        const sessionId = gameSessionRef.current;
        setTimeout(() => {
          if (sessionId !== gameSessionRef.current) return;
          const c2 = new Chess(fenAfter);
          const oppMove = c2.move(oppExpected.san);
          if (oppMove) {
            playMoveSound(oppMove, c2);
            const oppFenAfter = c2.fen();
            setCurrentFen(oppFenAfter);
            setMoves((prev) => [
              ...prev,
              {
                ply: prev.length + 1,
                moveNumber: Math.floor(prev.length / 2) + 1,
                color: oppMove.color,
                san: oppMove.san,
                uci: `${oppMove.from}${oppMove.to}${oppMove.promotion || ''}`,
                from: oppMove.from,
                to: oppMove.to,
                fenBefore: fenAfter,
                fenAfter: oppFenAfter,
                quality: 'book',
                explanation: oppExpected.comment,
              },
            ]);
            setOpeningStep(nextStep + 1);
            if (nextStep + 1 >= activeOpening.moves.length && dbConnected) {
              dbApi.markOpeningCompleted(activeOpening.id).catch(() => {});
            }
            setCoachHint(
              activeOpening.moves[nextStep + 1]
                ? `Đối thủ đáp trả ${oppMove.san}. ${oppExpected.comment}`
                : `Hoàn thành! ${oppExpected.comment}`
            );
          }
        }, 380);
      } else if (nextStep >= activeOpening.moves.length && dbConnected) {
        dbApi.markOpeningCompleted(activeOpening.id).catch(() => {});
      }
      return true;
    }

    // Mode: Puzzles
    if (mode === 'puzzles') {
      const expectedUci = activePuzzle.solutionUci[puzzleStep];
      if (uci !== expectedUci) {
        soundService.playBlunder();
        setPuzzleStatus('wrong');
        setCoachHint('Nước đi này chưa phải phương án tối ưu. Hãy thử tìm lại!');
        return false;
      }

      playMoveSound(move, chess);
      const nextStep = puzzleStep + 1;
      const newRecord: MoveRecord = {
        ply: moves.length + 1,
        moveNumber: Math.floor(moves.length / 2) + 1,
        color: moverColor,
        san: move.san,
        uci,
        from: move.from,
        to: move.to,
        fenBefore,
        fenAfter,
        quality: 'best',
        explanation: 'Chính xác!',
      };
      setCurrentFen(fenAfter);
      setMoves((prev) => [...prev, newRecord]);

      if (nextStep >= activePuzzle.solutionUci.length) {
        setPuzzleStatus('solved');
        soundService.playSuccess();
        setCoachHint(activePuzzle.explanation);
        setPuzzleStep(nextStep);
        if (dbConnected) {
          dbApi.markPuzzleSolved(activePuzzle.id).catch(() => {});
        }
      } else {
        setPuzzleStatus('solving');
        const oppUci = activePuzzle.solutionUci[nextStep];
        const sessionId = gameSessionRef.current;
        setTimeout(() => {
          if (sessionId !== gameSessionRef.current) return;
          const c2 = new Chess(fenAfter);
          const oppMove = c2.move({
            from: oppUci.slice(0, 2) as Square,
            to: oppUci.slice(2, 4) as Square,
            promotion: oppUci.length > 4 ? oppUci[4] : undefined,
          });
          if (oppMove) {
            playMoveSound(oppMove, c2);
            const oppFenAfter = c2.fen();
            setCurrentFen(oppFenAfter);
            setMoves((prev) => [
              ...prev,
              {
                ply: prev.length + 1,
                moveNumber: Math.floor(prev.length / 2) + 1,
                color: oppMove.color,
                san: oppMove.san,
                uci: oppUci,
                from: oppMove.from,
                to: oppMove.to,
                fenBefore: fenAfter,
                fenAfter: oppFenAfter,
              },
            ]);
            setPuzzleStep(nextStep + 1);
            setCoachHint('Tuyệt vời! Hãy tiếp tục tìm nước kết thúc.');
          }
        }, 380);
      }
      return true;
    }

    // Mode: Play vs AI or Analyze
    playMoveSound(move, chess);
    setShowHintArrows(false);
    setCoachHint(null);
    setGeminiResponse(null);

    const bestLineBefore = engineLinesRef.current[0];
    const ply = moves.length + 1;
    const baseRecord: MoveRecord = {
      ply,
      moveNumber: Math.floor(moves.length / 2) + 1,
      color: moverColor,
      san: move.san,
      uci,
      from: move.from,
      to: move.to,
      fenBefore,
      fenAfter,
      bestMoveUci: bestLineBefore?.pvUci[0],
      bestMoveSan: bestLineBefore?.pvSan[0],
    };

    setCurrentFen(fenAfter);
    setMoves((prev) => [...prev, baseRecord]);

    // Add time increment to the mover
    const tcObj = TIME_CONTROLS.find((item) => item.label === selectedTimeControl);
    if (mode === 'play' && tcObj && tcObj.increment > 0) {
      const incMs = tcObj.increment * 1000;
      if (moverColor === 'w') setWhiteTimeMs((ms) => ms + incMs);
      else setBlackTimeMs((ms) => ms + incMs);
    }

    // Broadcast move over WebSocket if in a private multiplayer room
    if (activeRoomId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'move',
          from: move.from,
          to: move.to,
          promotion: move.promotion,
          fen: fenAfter,
        })
      );
    }

    const sessionId = gameSessionRef.current;

    // Evaluate player's move & trigger AI response in Play mode
    (async () => {
      let afterLines: EngineLine[] = [];
      if (!chess.isGameOver()) {
        afterLines = await stockfishService.analyzePosition(fenAfter, 10, 1);
      }
      if (sessionId !== gameSessionRef.current) return;

      const bestLineAfter = afterLines[0];
      const { quality, cpLoss } = chess.isCheckmate()
        ? { quality: 'best' as const, cpLoss: 0 }
        : classifyMove(moverColor, bestLineBefore, bestLineAfter, uci);

      const explanation = explainMoveVi(fenBefore, uci, quality, cpLoss, bestLineBefore?.pvSan[0]);

      if (quality === 'blunder') {
        soundService.playBlunder();
      }

      setMoves((prev) =>
        prev.map((m) =>
          m.ply === ply
            ? {
                ...m,
                quality,
                cpLoss,
                evalAfterCp: bestLineAfter?.scoreCp ?? null,
                evalAfterMate: bestLineAfter?.mate ?? null,
                explanation,
              }
            : m
        )
      );

      if (mode === 'play' && isSelfPlay && autoFlipSelfPlay && !chess.isGameOver()) {
        setFlipped(chess.turn() === 'b');
      }

      if (mode === 'play' && !isSelfPlay && !activeRoomId && !chess.isGameOver() && chess.turn() !== playerColor) {
        setIsAiThinking(true);
        const aiUci = await stockfishService.getAiMove(
          fenAfter,
          skillLevel.stockfishSkill,
          skillLevel.moveTimeMs
        );
        if (sessionId !== gameSessionRef.current) {
          setIsAiThinking(false);
          return;
        }
        if (aiUci) {
          const c2 = new Chess(fenAfter);
          const aiMove = c2.move({
            from: aiUci.slice(0, 2) as Square,
            to: aiUci.slice(2, 4) as Square,
            promotion: aiUci.length > 4 ? aiUci[4] : undefined,
          });
          if (aiMove) {
            playMoveSound(aiMove, c2);
            const aiFenAfter = c2.fen();
            setCurrentFen(aiFenAfter);
            setMoves((prev) => [
              ...prev,
              {
                ply: prev.length + 1,
                moveNumber: Math.floor(prev.length / 2) + 1,
                color: aiMove.color,
                san: aiMove.san,
                uci: aiUci,
                from: aiMove.from,
                to: aiMove.to,
                fenBefore: fenAfter,
                fenAfter: aiFenAfter,
                explanation: `AI (${skillLevel.label}) đi ${aiMove.san}.`,
              },
            ]);
          }
        }
        setIsAiThinking(false);
      }
    })();

    return true;
  };

  // Undo last move (in Play mode, undoes back to player's turn)
  const handleUndo = async () => {
    if (moves.length === 0 || isAiThinking) return;
    gameSessionRef.current++;
    await stockfishService.stopSearch();

    let targetMoves = [...moves];
    if (mode === 'play') {
      // Pop until it's player's turn again
      while (targetMoves.length > 0 && targetMoves[targetMoves.length - 1].color !== playerColor) {
        targetMoves.pop();
      }
      if (targetMoves.length > 0 && targetMoves[targetMoves.length - 1].color === playerColor) {
        targetMoves.pop();
      }
    } else {
      targetMoves.pop();
    }

    const lastFen = targetMoves.length > 0 ? targetMoves[targetMoves.length - 1].fenAfter : startFen;
    setMoves(targetMoves);
    setCurrentFen(lastFen);
    setViewPly(null);
    setCoachHint(null);
    setShowHintArrows(false);
  };

  const handleRequestHint = () => {
    if (mode === 'openings') {
      const next = activeOpening.moves[openingStep];
      if (next) {
        setCoachHint(`Nước chuẩn tiếp theo: ${next.san}. ${next.comment}`);
      }
      return;
    }
    if (mode === 'puzzles') {
      setCoachHint(activePuzzle.hint);
      setShowHintArrows(true);
      return;
    }
    if (engineLines[0]) {
      setShowHintArrows(true);
      setCoachHint(explainBestMoveHintVi(displayedFen, engineLines[0]));
    } else {
      setCoachHint('Stockfish đang tính toán nước đi tốt nhất, vui lòng đợi 1 giây...');
    }
  };

  const handleAskGemini = async (question?: string) => {
    if (!geminiApiKey.trim()) return;
    setGeminiLoading(true);
    try {
      const historySan = moves.map((m) => m.san);
      const reply = await askGeminiCoach(geminiApiKey, displayedFen, historySan, engineLines, question);
      setGeminiResponse(reply);
    } catch (err) {
      setGeminiResponse(err instanceof Error ? err.message : 'Không thể kết nối Gemini AI.');
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleLoadFenOrPgn = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) return false;

    // Try FEN first
    try {
      const c = new Chess(trimmed);
      const fen = c.fen();
      gameSessionRef.current++;
      setStartFen(fen);
      setCurrentFen(fen);
      setMoves([]);
      setViewPly(null);
      setCoachHint('Đã nạp thế cờ FEN thành công!');
      return true;
    } catch {
      // Try PGN
      try {
        const c = new Chess();
        c.loadPgn(trimmed);
        const history = c.history({ verbose: true });
        const replay = new Chess();
        const loadedMoves: MoveRecord[] = [];
        for (let i = 0; i < history.length; i++) {
          const h = history[i];
          const fb = replay.fen();
          replay.move(h.san);
          loadedMoves.push({
            ply: i + 1,
            moveNumber: Math.floor(i / 2) + 1,
            color: h.color,
            san: h.san,
            uci: `${h.from}${h.to}${h.promotion || ''}`,
            from: h.from,
            to: h.to,
            fenBefore: fb,
            fenAfter: replay.fen(),
          });
        }
        gameSessionRef.current++;
        setStartFen(INITIAL_FEN);
        setCurrentFen(replay.fen());
        setMoves(loadedMoves);
        setViewPly(null);
        setCoachHint(`Đã nạp ván đấu PGN (${loadedMoves.length} nước).`);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Compute SVG arrows to display on the board
  const arrows: ArrowOverlay[] = useMemo(() => {
    const list: ArrowOverlay[] = [];

    if (mode === 'openings' && openingStep < activeOpening.moves.length) {
      const nextSan = activeOpening.moves[openingStep].san;
      const c = new Chess(currentFen);
      try {
        const m = c.move(nextSan);
        if (m) {
          list.push({ from: m.from, to: m.to, color: 'emerald', opacity: 0.9 });
        }
      } catch {
        // ignore
      }
      return list;
    }

    if ((autoShowArrows || showHintArrows) && engineLines.length > 0 && !isAiThinking) {
      const top1 = engineLines[0]?.pvUci[0];
      if (top1 && top1.length >= 4) {
        list.push({ from: top1.slice(0, 2), to: top1.slice(2, 4), color: 'emerald', opacity: 0.9 });
      }
      const top2 = engineLines[1]?.pvUci[0];
      if (top2 && top2.length >= 4 && top2 !== top1) {
        list.push({ from: top2.slice(0, 2), to: top2.slice(2, 4), color: 'sky', opacity: 0.55 });
      }
    }

    return list;
  }, [mode, openingStep, activeOpening, currentFen, autoShowArrows, showHintArrows, engineLines, isAiThinking]);

  const topEval = engineLines[0];
  const allowedColor: PlayerColor | 'both' =
    mode === 'play' ? (isSelfPlay ? 'both' : playerColor) : mode === 'openings' ? activeOpening.playerColor : 'both';

  const capturedInfo = useMemo(() => {
    const startCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const symbolsW: Record<string, string> = { q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
    const symbolsB: Record<string, string> = { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const curW: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const curB: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    for (const row of displayedChess.board()) {
      for (const p of row) {
        if (!p || p.type === 'k') continue;
        if (p.color === 'w') curW[p.type] = (curW[p.type] || 0) + 1;
        else curB[p.type] = (curB[p.type] || 0) + 1;
      }
    }
    const order = ['q', 'r', 'b', 'n', 'p'];
    const capturedByW: string[] = [];
    const capturedByB: string[] = [];
    let matW = 0;
    let matB = 0;
    for (const t of order) {
      const lostB = Math.max(0, startCounts[t] - curB[t]);
      const lostW = Math.max(0, startCounts[t] - curW[t]);
      for (let i = 0; i < lostB; i++) capturedByW.push(symbolsB[t]);
      for (let i = 0; i < lostW; i++) capturedByB.push(symbolsW[t]);
      matW += curW[t] * values[t];
      matB += curB[t] * values[t];
    }
    return {
      capturedByW,
      capturedByB,
      advW: matW - matB,
      advB: matB - matW,
    };
  }, [displayedChess]);

  const resetClocksForTimeControl = useCallback((tcLabel: string) => {
    const found = TIME_CONTROLS.find((item) => item.label === tcLabel) || TIME_CONTROLS[0];
    const ms = found.seconds * 1000;
    setWhiteTimeMs(ms);
    setBlackTimeMs(ms);
    setTimeoutWinner(null);
  }, []);

  const joinRoomWs = useCallback((roomId: string, timeControl: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;
    setActiveRoomId(roomId);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join_room', roomId }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'joined') {
          const assigned = msg.color === 'b' ? 'b' : 'w';
          setPlayerColor(assigned);
          setFlipped(assigned === 'b');
          setCoachHint(`Đã vào phòng #${roomId} (${timeControl}). Bạn cầm quân ${assigned === 'w' ? 'Trắng' : 'Đen'}.`);
        } else if (msg.type === 'peer_joined') {
          setCoachHint('Đối thủ đã vào phòng! Trận đấu bắt đầu.');
        } else if (msg.type === 'move' && msg.from && msg.to) {
          setCurrentFen((prevFen) => {
            const c = new Chess(prevFen);
            const mv = c.move({ from: msg.from, to: msg.to, promotion: msg.promotion });
            if (!mv) return prevFen;
            playMoveSound(mv, c);
            const nextFen = c.fen();
            setMoves((prevMoves) => [
              ...prevMoves,
              {
                ply: prevMoves.length + 1,
                moveNumber: Math.floor(prevMoves.length / 2) + 1,
                color: mv.color,
                san: mv.san,
                uci: `${mv.from}${mv.to}${mv.promotion || ''}`,
                from: mv.from,
                to: mv.to,
                fenBefore: prevFen,
                fenAfter: nextFen,
              },
            ]);
            return nextFen;
          });
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Auto-join room if ?room=XXXX is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      dbApi
        .getRoom(roomParam)
        .then((room) => {
          setSelectedTimeControl(room.timeControl);
          resetClocksForTimeControl(room.timeControl);
          setMatchedOpponent({ name: `Phòng #${room.roomId}`, elo: 1200 });
          setIsCoachMode(false);
          setIsSelfPlay(false);
          startNewPlayGame('w');
          setPlayScreen('game');
          joinRoomWs(room.roomId, room.timeControl);
        })
        .catch(() => {});
    }
    return () => {
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown clock when actively in a timed match
  useEffect(() => {
    if (mode !== 'play' || playScreen !== 'game' || displayedChess.isGameOver() || timeoutWinner) return;
    const interval = window.setInterval(() => {
      const activeTurn = new Chess(currentFen).turn();
      if (activeTurn === 'w') {
        setWhiteTimeMs((ms) => {
          const next = Math.max(0, ms - 1000);
          if (next === 0) setTimeoutWinner('b');
          return next;
        });
      } else {
        setBlackTimeMs((ms) => {
          const next = Math.max(0, ms - 1000);
          if (next === 0) setTimeoutWinner('w');
          return next;
        });
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [mode, playScreen, currentFen, displayedChess, timeoutWinner]);

  const formatClock = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartMatchmaking = () => {
    if (isMatching) return;
    setIsMatching(true);
    matchmakingTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await dbApi.findMatch(selectedTimeControl);
        setMatchedOpponent(res.opponent);
        setIsCoachMode(false);
        setIsSelfPlay(false);
        setPlayerColor(res.playerColor);
        resetClocksForTimeControl(selectedTimeControl);
        startNewPlayGame(res.playerColor);
        setPlayScreen('game');
        setCoachHint(`Đã ghép trận (${selectedTimeControl}) với ${res.opponent.name} (ELO ${res.opponent.elo})!`);
      } catch {
        setCoachHint('Không thể kết nối máy chủ ghép trận.');
      } finally {
        setIsMatching(false);
      }
    }, 1100);
  };

  const handleCancelMatchmaking = () => {
    if (matchmakingTimerRef.current) {
      clearTimeout(matchmakingTimerRef.current);
      matchmakingTimerRef.current = null;
    }
    setIsMatching(false);
  };

  const handleOpenTournaments = async () => {
    setPlayScreen('tournaments');
    setTournamentsLoading(true);
    try {
      const list = await dbApi.getTournaments();
      setTournaments(list);
    } catch {
      setTournaments([]);
    } finally {
      setTournamentsLoading(false);
    }
  };

  const handleStartCoachMode = () => {
    setIsCoachMode(true);
    setIsSelfPlay(false);
    setMatchedOpponent(null);
    setAutoShowArrows(true);
    resetClocksForTimeControl(selectedTimeControl);
    startNewPlayGame(playerColor);
    setPlayScreen('game');
    setCoachHint('Chế độ Huấn luyện viên đã bật! Stockfish 19 sẽ gợi ý nước đi và cảnh báo sai lầm.');
  };

  const handleStartSelfPlay = () => {
    setIsSelfPlay(true);
    setIsCoachMode(true);
    setMatchedOpponent({ name: 'Tự chơi (2 bên)', elo: 1200 });
    resetClocksForTimeControl(selectedTimeControl);
    startNewPlayGame('w');
    setFlipped(false);
    setPlayScreen('game');
    setCoachHint('Chế độ Tự chơi: Bạn có thể tự đi cả quân Trắng và quân Đen trên cùng bàn cờ.');
  };

  return (
    <div className="app-shell min-h-screen bg-[#eef3f9] text-slate-900 flex">
      {/* Left Navigation Sidebar */}
      <Sidebar
        mode={mode}
        onSelectMode={handleModeChange}
        currentUser={currentUser}
        dbConnected={dbConnected}
        incomingFriendCount={incomingFriendCount}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenShop={() => setShopOpen(true)}
        onOpenQuests={() => setQuestsOpen(true)}
        onOpenFriends={() => setFriendsOpen(true)}
        onOpenHistory={() => {
          setHistoryOpen(true);
          loadHistoryData();
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean White Top Header (Desktop + Mobile) */}
        <header className="app-header border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-none">
                Cờ Vua AI Coach
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                Học cờ thông minh • Nâng cao kỹ năng
              </p>
            </div>
          </div>

          {/* Active Mode Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold text-[#2563eb]">
            <span>
              {mode === 'play'
                ? t('modePlay')
                : mode === 'openings'
                  ? t('modeOpenings')
                  : mode === 'puzzles'
                    ? t('modePuzzles')
                    : t('modeAnalyze')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAppearance((a) => (a === 'light' ? 'dark' : 'light'))}
              title={appearance === 'light' ? 'Chuyển sang chế độ Tối' : 'Chuyển sang chế độ Sáng'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 cursor-pointer"
            >
              {appearance === 'light' ? (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
            >
              {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setIs3D((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                is3D
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{is3D ? '3D' : '2D'}</span>
            </button>
            <button
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a2e52] hover:bg-[#233d6b] text-xs font-bold text-white cursor-pointer shadow-xs"
            >
              <UserIcon className="w-3.5 h-3.5 text-amber-300" />
              <span className="max-w-[90px] truncate">
                {currentUser ? currentUser.displayName : t('loginShort')}
              </span>
            </button>
          </div>
        </header>

        {/* Main 2-Column Stage (Board + Analysis / Play Hub) */}
        <main className="app-main flex-1 max-w-[1380px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 grid grid-cols-1 xl:grid-cols-[minmax(0,630px)_minmax(340px,1fr)] gap-6 items-start">
          {/* Center: Board + Eval Bar + Player Bars */}
          <div className="flex flex-col gap-2.5 w-full max-w-[630px] mx-auto">
            {/* Top Player Info + Compact Board Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm shrink-0">
                  {flipped ? '♔' : '♚'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 truncate">
                      {mode === 'play'
                        ? flipped === (playerColor === 'w')
                          ? matchedOpponent
                            ? `${matchedOpponent.name} (~${matchedOpponent.elo})`
                            : `AI Stockfish 19 (${skillLevel.label} ~${skillLevel.elo})`
                          : currentUser?.displayName || t('you')
                        : flipped
                          ? t('whitePieces')
                          : t('blackPieces')}
                    </span>
                    {(() => {
                      const topColor: PlayerColor = flipped ? 'w' : 'b';
                      const cap = topColor === 'w' ? capturedInfo.capturedByW : capturedInfo.capturedByB;
                      const adv = topColor === 'w' ? capturedInfo.advW : capturedInfo.advB;
                      return cap.length > 0 ? (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <span className="tracking-tighter">{cap.join('')}</span>
                          {adv > 0 && <strong className="text-emerald-600">+{adv}</strong>}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {isAiThinking && (
                    <span className="text-[11px] text-blue-600 font-semibold animate-pulse">
                      {t('aiThinking')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {saveToast && (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                    {saveToast}
                  </span>
                )}
                {mode === 'play' && (() => {
                  const topColor: PlayerColor = flipped ? 'w' : 'b';
                  const topMs = topColor === 'w' ? whiteTimeMs : blackTimeMs;
                  const isTopTurn = playScreen === 'game' && displayedChess.turn() === topColor && !displayedChess.isGameOver();
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition ${
                        topMs <= 10000
                          ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                          : isTopTurn
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <Clock className="w-3 h-3 opacity-80" />
                      {formatClock(topMs)}
                    </span>
                  );
                })()}
              </div>
            </div>

          {/* EvalBar + ChessBoard */}
          <div className="flex items-stretch gap-2.5 w-full aspect-[1.06/1]">
            <EvalBar
              scoreCp={topEval?.scoreCp ?? null}
              mate={topEval?.mate ?? null}
              flipped={flipped}
            />
            <div className="flex-1 min-w-0">
              {is3D ? (
                <Suspense fallback={<div className="w-full h-full rounded-xl bg-slate-900/20 animate-pulse" />}>
                  <ChessBoard3D
                    fen={displayedFen}
                    flipped={flipped}
                    theme={boardTheme}
                    pieceSkin={currentUser?.equippedPieceSkin || 'classic'}
                    boardSkin={currentUser?.equippedBoardSkin || 'default'}
                    effectSkin={currentUser?.equippedEffectSkin || 'none'}
                    interactive={!isAiThinking && !timeoutWinner && (viewPly === null || viewPly === moves.length)}
                    allowedColor={allowedColor}
                    lastMove={displayedLastMove}
                    arrows={arrows}
                    onMove={handlePlayerMove}
                  />
                </Suspense>
              ) : (
                <ChessBoard
                  fen={displayedFen}
                  flipped={flipped}
                  theme={boardTheme}
                  boardSkin={currentUser?.equippedBoardSkin || 'default'}
                  interactive={!isAiThinking && (viewPly === null || viewPly === moves.length)}
                  allowedColor={allowedColor}
                  lastMove={displayedLastMove}
                  arrows={arrows}
                  onMove={handlePlayerMove}
                />
              )}
            </div>
          </div>

          {/* Bottom Player Info + Captured Pieces */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 text-xs shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 flex items-center justify-center text-sm shrink-0">
                {flipped ? '♚' : '♔'}
              </span>
              <span className="font-bold text-slate-800 truncate">
                {mode === 'play'
                  ? flipped !== (playerColor === 'w')
                    ? matchedOpponent
                      ? `${matchedOpponent.name} (~${matchedOpponent.elo})`
                      : `AI Stockfish 19 (${skillLevel.label} ~${skillLevel.elo})`
                    : currentUser?.displayName || t('you')
                  : flipped
                    ? t('blackPieces')
                    : t('whitePieces')}
              </span>
              {(() => {
                const bottomColor: PlayerColor = flipped ? 'b' : 'w';
                const cap = bottomColor === 'w' ? capturedInfo.capturedByW : capturedInfo.capturedByB;
                const adv = bottomColor === 'w' ? capturedInfo.advW : capturedInfo.advB;
                return cap.length > 0 ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <span className="tracking-tighter">{cap.join('')}</span>
                    {adv > 0 && <strong className="text-emerald-600">+{adv}</strong>}
                  </span>
                ) : null;
              })()}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-slate-500">
                {t('turnLabel')}{' '}
                <strong className="text-slate-900">
                  {displayedChess.turn() === 'w' ? t('turnWhite') : t('turnBlack')}
                </strong>
              </span>
              {mode === 'play' && (() => {
                const bottomColor: PlayerColor = flipped ? 'b' : 'w';
                const bottomMs = bottomColor === 'w' ? whiteTimeMs : blackTimeMs;
                const isBottomTurn = playScreen === 'game' && displayedChess.turn() === bottomColor && !displayedChess.isGameOver();
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition ${
                      bottomMs <= 10000
                        ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                        : isBottomTurn
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Clock className="w-3 h-3 opacity-80" />
                    {formatClock(bottomMs)}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Dedicated Bottom Board Controls Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={moves.length === 0 || isAiThinking || mode === 'puzzles'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{t('btnUndo')}</span>
              </button>
              <button
                onClick={() => setFlipped((f) => !f)}
                title={t('flipBoard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('flipBoard')}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => saveCurrentGameToDb(false)}
                title={t('saveGame')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-amber-600 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lưu</span>
              </button>
              <button
                onClick={toggleFullscreen}
                title="Toàn màn hình"
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleModeChange(mode)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('newGame')}</span>
              </button>
            </div>
          </div>

          {/* Game Over Banner + Accuracy Review */}
          {(gameOverText || timeoutWinner) && (() => {
            const wMoves = moves.filter((m) => m.color === 'w' && typeof m.cpLoss === 'number');
            const bMoves = moves.filter((m) => m.color === 'b' && typeof m.cpLoss === 'number');
            const wAvg = wMoves.length ? wMoves.reduce((s, m) => s + (m.cpLoss || 0), 0) / wMoves.length : 0;
            const bAvg = bMoves.length ? bMoves.reduce((s, m) => s + (m.cpLoss || 0), 0) / bMoves.length : 0;
            const wAcc = Math.max(15, Math.min(99, Math.round(100 - wAvg * 0.35)));
            const bAcc = Math.max(15, Math.min(99, Math.round(100 - bAvg * 0.35)));
            const statusMsg = timeoutWinner
              ? `Hết giờ! Quân ${timeoutWinner === 'w' ? 'Trắng' : 'Đen'} thắng.`
              : gameOverText;
            return (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-blue-500/15 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {displayedChess.isCheckmate() || timeoutWinner ? (
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                    ) : (
                      <Flag className="w-5 h-5 text-sky-500 shrink-0" />
                    )}
                    <span className="text-sm font-bold text-slate-900">{statusMsg}</span>
                  </div>
                  <button
                    onClick={() => handleModeChange(mode)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Chơi lại
                  </button>
                </div>
                {moves.length > 0 && (
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 pt-1 border-t border-emerald-500/20">
                    <span>Độ chính xác (Accuracy):</span>
                    <span className="text-slate-900">♔ Trắng: <strong className="text-emerald-600">{wAcc}%</strong></span>
                    <span className="text-slate-900">♚ Đen: <strong className="text-blue-600">{bAcc}%</strong></span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Right: Play Hub Screens OR Coach & Analysis Panel */}
        <div className="xl:max-h-[calc(100vh-88px)] xl:overflow-y-auto pr-0.5">
        {mode === 'play' && playScreen === 'lobby' ? (
          <PlayLobbyScreen
            selectedTimeControl={selectedTimeControl}
            onSelectTimeControl={(tc) => {
              setSelectedTimeControl(tc);
              resetClocksForTimeControl(tc);
            }}
            isMatching={isMatching}
            onStartMatchmaking={handleStartMatchmaking}
            onCancelMatchmaking={handleCancelMatchmaking}
            onOpenTournaments={handleOpenTournaments}
            onOpenFriendLobby={() => setPlayScreen('friend-lobby')}
            onOpenBotSelection={() => setPlayScreen('bots')}
            onStartCoachMode={handleStartCoachMode}
            onStartSelfPlay={handleStartSelfPlay}
            onSelectExtraMode={(extra) => {
              if (extra === 'puzzles') handleModeChange('puzzles');
              else if (extra === 'analyze') handleModeChange('analyze');
              else if (extra === 'chess960') {
                const fen960 = generateChess960Fen();
                gameSessionRef.current++;
                setSelectedTimeControl('3 phút');
                resetClocksForTimeControl('3 phút');
                setMatchedOpponent({ name: 'Cờ 960 (Fischer)', elo: skillLevel.elo });
                setIsCoachMode(false);
                setIsSelfPlay(false);
                setActiveRoomId(null);
                setStartFen(fen960);
                setCurrentFen(fen960);
                setMoves([]);
                setViewPly(null);
                setPlayScreen('game');
                setCoachHint('Đã khởi tạo thế cờ Chess960 ngẫu nhiên!');
              } else {
                setSelectedTimeControl('30 phút');
                resetClocksForTimeControl('30 phút');
                setMatchedOpponent(null);
                setIsCoachMode(false);
                setIsSelfPlay(false);
                setActiveRoomId(null);
                startNewPlayGame('w');
                setPlayScreen('game');
              }
            }}
          />
        ) : mode === 'play' && playScreen === 'tournaments' ? (
          <TournamentListScreen
            tournaments={tournaments}
            loading={tournamentsLoading}
            onJoin={async (id) => {
              const res = await dbApi.joinTournament(id);
              setTournaments((prev) =>
                prev.map((item) =>
                  item.id === id ? { ...item, joined: true, playersCount: res.playersCount } : item
                )
              );
            }}
            onBack={() => setPlayScreen('lobby')}
          />
        ) : mode === 'play' && playScreen === 'friend-lobby' ? (
          <FriendLobbyScreen
            selectedTimeControl={selectedTimeControl}
            currentUser={currentUser}
            onStartRoomGame={(room) => {
              setMatchedOpponent({ name: `Phòng #${room.roomId}`, elo: 1200 });
              setIsCoachMode(false);
              setIsSelfPlay(false);
              resetClocksForTimeControl(room.timeControl);
              startNewPlayGame('w');
              setPlayScreen('game');
              joinRoomWs(room.roomId, room.timeControl);
            }}
            onBack={() => setPlayScreen('lobby')}
          />
        ) : mode === 'play' && playScreen === 'bots' ? (
          <BotSelectionScreen
            onSelectBot={(botSkill, chosenColor) => {
              setSkillLevel(botSkill);
              setMatchedOpponent({ name: botSkill.label, elo: botSkill.elo });
              setIsCoachMode(true);
              setIsSelfPlay(false);
              setPlayerColor(chosenColor);
              resetClocksForTimeControl(selectedTimeControl);
              startNewPlayGame(chosenColor);
              setPlayScreen('game');
            }}
            onBack={() => setPlayScreen('lobby')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {mode === 'play' && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 text-xs shadow-xs">
                <button
                  onClick={() => setPlayScreen('lobby')}
                  className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                >
                  ← Quay lại Sảnh chơi
                </button>
                <div className="flex items-center gap-2 font-mono font-bold">
                  {isSelfPlay && (
                    <button
                      type="button"
                      onClick={() => setAutoFlipSelfPlay((v) => !v)}
                      className={`px-2 py-0.5 rounded border font-sans text-[10px] font-semibold cursor-pointer ${
                        autoFlipSelfPlay
                          ? 'bg-teal-50 border-teal-300 text-teal-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {autoFlipSelfPlay ? 'Tự xoay: Bật' : 'Tự xoay: Tắt'}
                    </button>
                  )}
                  {isCoachMode && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-700 font-sans text-[10px]">
                      Coach ON
                    </span>
                  )}
                </div>
              </div>
            )}
            <CoachPanel
              mode={mode}
              moves={moves}
              viewPly={viewPly}
              onSelectPly={setViewPly}
              engineLines={engineLines}
              isAnalyzing={isAnalyzing}
              isAiThinking={isAiThinking}
              coachHint={coachHint}
              geminiResponse={geminiResponse}
              geminiLoading={geminiLoading}
              hasGeminiKey={Boolean(geminiApiKey.trim())}
              onRequestHint={handleRequestHint}
              onAskGemini={handleAskGemini}
              onUndo={handleUndo}
              canUndo={moves.length > 0 && !isAiThinking && mode !== 'puzzles'}
              openings={OPENINGS}
              activeOpening={activeOpening}
              openingStep={openingStep}
              onSelectOpening={startOpeningSession}
              onResetOpening={() => startOpeningSession(activeOpening)}
              puzzles={PUZZLES}
              activePuzzle={activePuzzle}
              puzzleStatus={puzzleStatus}
              onSelectPuzzle={startPuzzleSession}
              onNextPuzzle={() => {
                const idx = PUZZLES.findIndex((p) => p.id === activePuzzle.id);
                const next = PUZZLES[(idx + 1) % PUZZLES.length];
                startPuzzleSession(next);
              }}
              onShowPuzzleHint={() => {
                setCoachHint(activePuzzle.hint);
              }}
              currentFen={displayedFen}
              onLoadFenOrPgn={handleLoadFenOrPgn}
            />
          </div>
        )}
        </div>
      </main>

      <AuthModal
        open={authOpen}
        currentUser={currentUser}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          loadHistoryData();
          dbApi
            .getFriends()
            .then((d) => setIncomingFriendCount(d.incoming.length))
            .catch(() => {});
        }}
        onLogout={() => {
          dbApi.logout();
          setCurrentUser(null);
          setIncomingFriendCount(0);
          loadHistoryData();
        }}
      />

      <FriendsModal
        open={friendsOpen}
        currentUser={currentUser}
        onClose={() => setFriendsOpen(false)}
        onOpenAuth={() => setAuthOpen(true)}
        onFriendsUpdated={setIncomingFriendCount}
        onChallengeFriend={async (friendName) => {
          const room = await dbApi.createRoom(selectedTimeControl, 'w');
          setMode('play');
          setMatchedOpponent({ name: `${friendName} (#${room.roomId})`, elo: 1200 });
          setIsCoachMode(false);
          setIsSelfPlay(false);
          resetClocksForTimeControl(selectedTimeControl);
          startNewPlayGame('w');
          setPlayScreen('game');
          joinRoomWs(room.roomId, selectedTimeControl);
        }}
      />

      <Suspense fallback={null}>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          skillLevel={skillLevel}
          onChangeSkillLevel={setSkillLevel}
          playerColor={playerColor}
          onChangePlayerColor={(c) => {
            setPlayerColor(c);
            if (mode === 'play') startNewPlayGame(c);
          }}
          boardTheme={boardTheme}
          onChangeBoardTheme={setBoardTheme}
          appearance={appearance}
          onChangeAppearance={setAppearance}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((s) => !s)}
          autoShowArrows={autoShowArrows}
          onToggleAutoArrows={() => setAutoShowArrows((a) => !a)}
          geminiApiKey={geminiApiKey}
          onChangeGeminiApiKey={handleSaveGeminiKey}
          dbConnected={dbConnected}
          dbName={dbName}
          onConnectMongo={async (uri) => {
            const res = await dbApi.connectMongo(uri);
            await refreshDbHealth();
            return res;
          }}
        />

        <HistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          dbConnected={dbConnected}
          dbName={dbName}
          games={savedGames}
          progress={userProgress}
          loading={historyLoading}
          onLoadGame={async (id) => {
            try {
              const full = await dbApi.getGameById(id);
              gameSessionRef.current++;
              setMode('analyze');
              setStartFen(full.startFen);
              setCurrentFen(full.finalFen);
              setMoves(full.moves || []);
              setViewPly(null);
              setFlipped(full.playerColor === 'b');
              setCoachHint(`Đã tải ván "${full.title}" (${full.result}) từ MongoDB.`);
              setHistoryOpen(false);
            } catch {
              // ignore
            }
          }}
          onDeleteGame={async (id) => {
            await dbApi.deleteGame(id);
            loadHistoryData();
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <LeaderboardModal
          open={leaderboardOpen}
          currentUser={currentUser}
          onClose={() => setLeaderboardOpen(false)}
        />

        <ShopModal
          open={shopOpen}
          currentUser={currentUser}
          onClose={() => setShopOpen(false)}
          onOpenAuth={() => setAuthOpen(true)}
          onUserUpdated={setCurrentUser}
        />

        <QuestsModal
          open={questsOpen}
          currentUser={currentUser}
          onClose={() => setQuestsOpen(false)}
          onOpenAuth={() => setAuthOpen(true)}
          onUserUpdated={setCurrentUser}
        />

        <AdminModal
          open={adminOpen}
          currentUser={currentUser}
          onClose={() => setAdminOpen(false)}
          onCurrentUserUpdated={setCurrentUser}
        />
      </Suspense>

      {/* Fullscreen Board-Only Mode */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0b1120] flex items-center justify-center p-2 sm:p-4">
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Thu nhỏ / Thoát toàn màn hình (Esc)"
            className="fixed top-3 left-3 z-50 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-100 backdrop-blur-sm shadow-lg transition cursor-pointer"
          >
            <Minimize2 className="w-4 h-4 text-emerald-400" />
            <span>Thoát toàn màn hình</span>
          </button>

          <div className={is3D ? 'w-full h-full' : 'w-[min(94vh,94vw)] aspect-square'}>
            {is3D ? (
              <Suspense fallback={<div className="w-full h-full bg-slate-900/40 animate-pulse" />}>
                <ChessBoard3D
                  fen={displayedFen}
                  flipped={flipped}
                  theme={boardTheme}
                  pieceSkin={currentUser?.equippedPieceSkin || 'classic'}
                  boardSkin={currentUser?.equippedBoardSkin || 'default'}
                  effectSkin={currentUser?.equippedEffectSkin || 'none'}
                  interactive={!isAiThinking && !timeoutWinner && (viewPly === null || viewPly === moves.length)}
                  allowedColor={allowedColor}
                  lastMove={displayedLastMove}
                  arrows={arrows}
                  onMove={handlePlayerMove}
                />
              </Suspense>
            ) : (
              <ChessBoard
                fen={displayedFen}
                flipped={flipped}
                theme={boardTheme}
                boardSkin={currentUser?.equippedBoardSkin || 'default'}
                interactive={!isAiThinking && (viewPly === null || viewPly === moves.length)}
                allowedColor={allowedColor}
                lastMove={displayedLastMove}
                arrows={arrows}
                onMove={handlePlayerMove}
              />
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default App;
