import React, { useEffect, useState } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Trophy,
  Users,
  Bot,
  GraduationCap,
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  Zap,
  Calendar,
  LineChart,
  Puzzle,
  Send,
} from 'lucide-react';
import { dbApi, type AuthUser, type FriendRelationItem, type PrivateRoomInfo, type TournamentItem } from '../services/dbApi';
import type { PlayerColor, SkillLevelOption } from '../types/chess';
import { useI18n } from '../i18n/I18nContext';

export interface TimeControlOption {
  id: string;
  label: string;
  seconds: number;
  increment: number;
  category: 'Siêu chớp' | 'Cờ chớp' | 'Cờ nhanh';
}

export const TIME_CONTROLS: TimeControlOption[] = [
  { id: '1m', label: '1 phút', seconds: 60, increment: 0, category: 'Siêu chớp' },
  { id: '1|1', label: '1 | 1', seconds: 60, increment: 1, category: 'Siêu chớp' },
  { id: '3m', label: '3 phút', seconds: 180, increment: 0, category: 'Cờ chớp' },
  { id: '3|2', label: '3 | 2', seconds: 180, increment: 2, category: 'Cờ chớp' },
  { id: '5m', label: '5 phút', seconds: 300, increment: 0, category: 'Cờ chớp' },
  { id: '10m', label: '10 phút', seconds: 600, increment: 0, category: 'Cờ nhanh' },
  { id: '15|10', label: '15 | 10', seconds: 900, increment: 10, category: 'Cờ nhanh' },
  { id: '30m', label: '30 phút', seconds: 1800, increment: 0, category: 'Cờ nhanh' },
];

export interface BotProfile {
  id: string;
  name: string;
  elo: number;
  stockfishSkill: number;
  depth: number;
  moveTimeMs: number;
  personality: string;
  avatar: string;
  badgeColor: string;
}

export const BOT_PROFILES: BotProfile[] = [
  {
    id: 'bot-250',
    name: 'Mèo Tí Hon',
    elo: 250,
    stockfishSkill: 0,
    depth: 2,
    moveTimeMs: 180,
    personality: 'Thân thiện, hay đi nước ngẫu nhiên, phù hợp người mới.',
    avatar: '🐱',
    badgeColor: 'text-emerald-700 bg-emerald-500/15 border-emerald-500/30',
  },
  {
    id: 'bot-600',
    name: 'Học Viên Minh',
    elo: 600,
    stockfishSkill: 2,
    depth: 4,
    moveTimeMs: 250,
    personality: 'Biết phát triển quân cơ bản nhưng dễ mắc bẫy chiến thuật.',
    avatar: '🎓',
    badgeColor: 'text-blue-600 bg-sky-500/15 border-sky-500/30',
  },
  {
    id: 'bot-1000',
    name: 'Chiến Thuật Gia',
    elo: 1000,
    stockfishSkill: 6,
    depth: 6,
    moveTimeMs: 350,
    personality: 'Chơi chắc chắn, biết tận dụng đòn xiên và chĩa đôi.',
    avatar: '🛡️',
    badgeColor: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30',
  },
  {
    id: 'bot-1400',
    name: 'Sói Tấn Công',
    elo: 1400,
    stockfishSkill: 10,
    depth: 9,
    moveTimeMs: 450,
    personality: 'Ưa thích thí quân tấn công trực diện vào thành Vua.',
    avatar: '🐺',
    badgeColor: 'text-amber-700 bg-amber-500/15 border-amber-500/30',
  },
  {
    id: 'bot-1900',
    name: 'Kiện Tướng Ánh',
    elo: 1900,
    stockfishSkill: 15,
    depth: 12,
    moveTimeMs: 600,
    personality: 'Khai cuộc bài bản, tính toán sâu và tàn cuộc cực chuẩn.',
    avatar: '👑',
    badgeColor: 'text-purple-700 bg-purple-500/15 border-purple-500/30',
  },
  {
    id: 'bot-2500',
    name: 'Stockfish Tối Thượng',
    elo: 2500,
    stockfishSkill: 20,
    depth: 15,
    moveTimeMs: 850,
    personality: 'Sức mạnh Đại Kiện Tướng tối đa, gần như không sai sót.',
    avatar: '🤖',
    badgeColor: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
  },
];

interface PlayLobbyProps {
  selectedTimeControl: string;
  onSelectTimeControl: (tc: string) => void;
  isMatching: boolean;
  onStartMatchmaking: () => void;
  onCancelMatchmaking: () => void;
  onOpenTournaments: () => void;
  onOpenFriendLobby: () => void;
  onOpenBotSelection: () => void;
  onStartCoachMode: () => void;
  onStartSelfPlay: () => void;
  onSelectExtraMode: (extra: 'chess960' | 'daily' | 'analyze' | 'puzzles') => void;
}

export const PlayLobbyScreen: React.FC<PlayLobbyProps> = ({
  selectedTimeControl,
  onSelectTimeControl,
  isMatching,
  onStartMatchmaking,
  onCancelMatchmaking,
  onOpenTournaments,
  onOpenFriendLobby,
  onOpenBotSelection,
  onStartCoachMode,
  onStartSelfPlay,
  onSelectExtraMode,
}) => {
  const [tcOpen, setTcOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useI18n();

  const currentTc = TIME_CONTROLS.find((tc) => tc.label === selectedTimeControl) || TIME_CONTROLS[0];

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t('lobbyTitle')}</h2>
          <p className="text-xs text-slate-500">{t('lobbySub')}</p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700">
          {t('onlineBadge')}
        </span>
      </div>

      {/* Time Control Selector */}
      <div className="relative">
        <button
          type="button"
          disabled={isMatching}
          onClick={() => setTcOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-900 transition cursor-pointer disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>{currentTc.label}</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-500">
              {currentTc.category}
            </span>
          </span>
          {tcOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {tcOpen && !isMatching && (
          <div className="mt-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 z-20">
            {TIME_CONTROLS.map((tc) => {
              const active = tc.label === selectedTimeControl;
              return (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => {
                    onSelectTimeControl(tc.label);
                    setTcOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer flex flex-col items-center ${
                    active
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-700'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-700'
                  }`}
                >
                  <span>{tc.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{tc.category}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary CTA: Bắt đầu ván cờ (Matchmaking) */}
      {isMatching ? (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
            <div>
              <div className="text-sm font-bold text-emerald-800">
                {t('searchingOpponent')} ({selectedTimeControl})...
              </div>
              <div className="text-[11px] text-emerald-700/80">
                {t('searchingSub')}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelMatchmaking}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-500/20 border border-slate-200 hover:border-rose-500/40 text-xs font-semibold text-slate-700 hover:text-rose-600 cursor-pointer"
          >
            {t('cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartMatchmaking}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{t('startMatchBtn')} ({selectedTimeControl})</span>
        </button>
      )}

      {/* 4 Main Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          disabled={isMatching}
          onClick={onOpenTournaments}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-amber-500/40 text-left transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">{t('tournamentsTitle')}</div>
            <div className="text-[11px] text-slate-500">{t('tournamentsSub')}</div>
          </div>
        </button>

        <button
          type="button"
          disabled={isMatching}
          onClick={onOpenFriendLobby}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-sky-500/40 text-left transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">{t('playFriendTitle')}</div>
            <div className="text-[11px] text-slate-500">{t('playFriendSub')}</div>
          </div>
        </button>

        <button
          type="button"
          disabled={isMatching}
          onClick={onOpenBotSelection}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-purple-500/40 text-left transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">{t('playBotTitle')}</div>
            <div className="text-[11px] text-slate-500">{t('playBotSub')}</div>
          </div>
        </button>

        <button
          type="button"
          disabled={isMatching}
          onClick={onStartCoachMode}
          className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-emerald-500/40 text-left transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">{t('coachModeTitle')}</div>
            <div className="text-[11px] text-slate-500">{t('coachModeSub')}</div>
          </div>
        </button>

        <button
          type="button"
          disabled={isMatching}
          onClick={onStartSelfPlay}
          className="sm:col-span-2 flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-teal-500/40 text-left transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{t('selfPlayTitle')}</div>
              <div className="text-[11px] text-slate-500">{t('selfPlaySub')}</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 text-[10px] font-bold shrink-0">
            {t('twoSidesBadge')}
          </span>
        </button>
      </div>

      {/* Expandable "Thêm nữa" */}
      <div>
        <button
          type="button"
          disabled={isMatching}
          onClick={() => setIsExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 text-xs font-semibold text-slate-600 transition cursor-pointer disabled:opacity-45"
        >
          <span>{isExpanded ? t('lessBtn') : t('moreBtn')}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="mt-2.5 grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={isMatching}
              onClick={() => onSelectExtraMode('chess960')}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-700">{t('chess960Title')}</div>
                <div className="text-[10px] text-slate-500">{t('chess960Sub')}</div>
              </div>
            </button>
            <button
              type="button"
              disabled={isMatching}
              onClick={() => onSelectExtraMode('daily')}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-700">{t('dailyChessTitle')}</div>
                <div className="text-[10px] text-slate-500">{t('dailyChessSub')}</div>
              </div>
            </button>
            <button
              type="button"
              disabled={isMatching}
              onClick={() => onSelectExtraMode('puzzles')}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left cursor-pointer"
            >
              <Puzzle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-700">{t('puzzlesExtraTitle')}</div>
                <div className="text-[10px] text-slate-500">{t('puzzlesExtraSub')}</div>
              </div>
            </button>
            <button
              type="button"
              disabled={isMatching}
              onClick={() => onSelectExtraMode('analyze')}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left cursor-pointer"
            >
              <LineChart className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-700">{t('analyzeExtraTitle')}</div>
                <div className="text-[10px] text-slate-500">{t('analyzeExtraSub')}</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface TournamentListScreenProps {
  tournaments: TournamentItem[];
  loading: boolean;
  onJoin: (id: string) => void;
  onBack: () => void;
}

export const TournamentListScreen: React.FC<TournamentListScreenProps> = ({
  tournaments,
  loading,
  onJoin,
  onBack,
}) => {
  const { t } = useI18n();
  return (
  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{t('tournamentsHeader')}</h2>
          <p className="text-[11px] text-slate-500">{t('tournamentsHeaderSub')}</p>
        </div>
      </div>
      <Trophy className="w-5 h-5 text-amber-400" />
    </div>

    {loading ? (
      <div className="py-10 flex justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    ) : (
      <div className="space-y-2.5">
        {tournaments.map((tour) => (
          <div
            key={tour.id}
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{tour.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {tour.timeControl} · {tour.format} · {tour.playersCount}/{tour.maxPlayers}
              </div>
              <div className="mt-1 inline-flex items-center gap-2 text-[10px] font-semibold">
                <span className="text-amber-700">{tour.prizeCoins} {t('coinsUnit')}</span>
                <span className="text-emerald-600">· {tour.status}</span>
              </div>
            </div>
            <button
              onClick={() => onJoin(tour.id)}
              disabled={tour.joined}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                tour.joined
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 cursor-default'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              }`}
            >
              {tour.joined ? t('joinedBtn') : t('joinBtn')}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

interface FriendLobbyScreenProps {
  selectedTimeControl: string;
  currentUser: AuthUser | null;
  onStartRoomGame: (room: PrivateRoomInfo) => void;
  onBack: () => void;
}

export const FriendLobbyScreen: React.FC<FriendLobbyScreenProps> = ({
  selectedTimeControl,
  currentUser,
  onStartRoomGame,
  onBack,
}) => {
  const [room, setRoom] = useState<PrivateRoomInfo | null>(null);
  const [friends, setFriends] = useState<FriendRelationItem[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dbApi.createRoom(selectedTimeControl, 'w'),
      currentUser ? dbApi.getFriends().catch(() => ({ friends: [] })) : Promise.resolve({ friends: [] }),
    ])
      .then(([createdRoom, friendsRes]) => {
        setRoom(createdRoom);
        setFriends(friendsRes.friends || []);
      })
      .finally(() => setLoading(false));
  }, [selectedTimeControl, currentUser]);

  const inviteUrl = room ? `${window.location.origin}/?room=${room.roomId}` : '';

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Chơi Với Một Người Bạn</h2>
            <p className="text-[11px] text-slate-500">
              Phòng riêng · Thời gian {selectedTimeControl}
            </p>
          </div>
        </div>
        <Users className="w-5 h-5 text-sky-400" />
      </div>

      {loading || !room ? (
        <div className="py-10 flex justify-center text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Mã phòng:</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">{room.roomId}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 font-mono"
              />
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {friends.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mời bạn bè trực tiếp
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {friends.map((f) => {
                  const invited = invitedIds.has(f.user.id);
                  return (
                    <div
                      key={f.friendshipId}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="text-xs font-semibold text-slate-700">
                        {f.user.displayName}{' '}
                        <span className="text-[11px] text-slate-500">({f.user.elo})</span>
                      </div>
                      <button
                        onClick={() => setInvitedIds((s) => new Set(s).add(f.user.id))}
                        disabled={invited}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-[11px] font-semibold text-emerald-700 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{invited ? 'Đã mời' : 'Gửi lời mời'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => onStartRoomGame(room)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
          >
            Vào bàn cờ phòng #{room.roomId}
          </button>
        </>
      )}
    </div>
  );
};

interface BotSelectionScreenProps {
  onSelectBot: (skill: SkillLevelOption, color: PlayerColor) => void;
  onBack: () => void;
}

export const BotSelectionScreen: React.FC<BotSelectionScreenProps> = ({
  onSelectBot,
  onBack,
}) => {
  const [selectedBot, setSelectedBot] = useState<BotProfile>(BOT_PROFILES[2]);
  const [color, setColor] = useState<PlayerColor>('w');
  const { t } = useI18n();

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('botSelectHeader')}</h2>
            <p className="text-[11px] text-slate-500">{t('botSelectSub')}</p>
          </div>
        </div>
        <Bot className="w-5 h-5 text-purple-400" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {BOT_PROFILES.map((bot) => {
          const active = selectedBot.id === bot.id;
          return (
            <button
              key={bot.id}
              type="button"
              onClick={() => setSelectedBot(bot)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                active
                  ? 'bg-purple-500/15 border-purple-500/60'
                  : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <span className="text-2xl leading-none shrink-0">{bot.avatar}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">{bot.name}</span>
                  <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${bot.badgeColor}`}>
                    {bot.elo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{bot.personality}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setColor('w')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
              color === 'w' ? 'bg-slate-100 text-slate-950' : 'text-slate-500'
            }`}
          >
            ♔ {t('whitePieces')}
          </button>
          <button
            type="button"
            onClick={() => setColor('b')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
              color === 'b' ? 'bg-slate-800 text-white' : 'text-slate-500'
            }`}
          >
            ♚ {t('blackPieces')}
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            onSelectBot(
              {
                id: selectedBot.id,
                label: selectedBot.name,
                elo: selectedBot.elo,
                stockfishSkill: selectedBot.stockfishSkill,
                depth: selectedBot.depth,
                moveTimeMs: selectedBot.moveTimeMs,
                description: selectedBot.personality,
              },
              color
            )
          }
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('playVsBotBtn')} {selectedBot.name}</span>
        </button>
      </div>
    </div>
  );
};
