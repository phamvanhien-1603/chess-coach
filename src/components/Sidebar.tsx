import React from 'react';
import {
  Swords,
  BookOpen,
  Puzzle,
  LineChart,
  Trophy,
  ShoppingBag,
  Users,
  Database,
  Settings,
  Shield,
  Flame,
  Coins,
  LogIn,
  X,
  Globe,
  Target,
  Crown,
  ChevronRight,
  Star,
} from 'lucide-react';
import type { AppMode } from '../types/chess';
import type { AuthUser } from '../services/dbApi';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/translations';

interface SidebarProps {
  mode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  currentUser: AuthUser | null;
  dbConnected: boolean;
  incomingFriendCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenLeaderboard: () => void;
  onOpenShop: () => void;
  onOpenQuests: () => void;
  onOpenFriends: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
}

const NAV_MODES: {
  id: AppMode;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  orbClass: string;
}[] = [
  {
    id: 'play',
    labelKey: 'modePlay',
    icon: Swords,
    orbClass: 'from-sky-500/35 to-blue-600/35 border-sky-400/50 text-sky-200 shadow-sky-500/20',
  },
  {
    id: 'openings',
    labelKey: 'modeOpenings',
    icon: BookOpen,
    orbClass: 'from-emerald-500/35 to-teal-600/35 border-emerald-400/50 text-emerald-200 shadow-emerald-500/20',
  },
  {
    id: 'puzzles',
    labelKey: 'modePuzzles',
    icon: Puzzle,
    orbClass: 'from-indigo-500/35 to-blue-600/35 border-indigo-400/50 text-indigo-200 shadow-indigo-500/20',
  },
  {
    id: 'analyze',
    labelKey: 'modeAnalyze',
    icon: LineChart,
    orbClass: 'from-cyan-500/35 to-violet-600/35 border-cyan-400/50 text-cyan-200 shadow-cyan-500/20',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  onSelectMode,
  currentUser,
  dbConnected,
  incomingFriendCount,
  mobileOpen,
  onCloseMobile,
  onOpenLeaderboard,
  onOpenShop,
  onOpenQuests,
  onOpenFriends,
  onOpenHistory,
  onOpenSettings,
  onOpenAdmin,
  onOpenAuth,
}) => {
  const { lang, setLang, t } = useI18n();

  const content = (
    <div className="relative flex flex-col h-full w-[252px] bg-gradient-to-b from-[#0b152c] via-[#091224] to-[#060b18] text-white select-none shadow-2xl border-r border-cyan-400/15 overflow-hidden">
      {/* Ambient corner light flares */}
      <div className="pointer-events-none absolute -top-14 -left-14 w-40 h-40 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 -left-12 w-40 h-40 rounded-full bg-emerald-400/10 blur-3xl" />

      {/* Subtle faded chessboard grid watermark */}
      <div
        className="pointer-events-none absolute inset-x-4 top-36 bottom-44 opacity-[0.045] rounded-xl overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #94a3b8 25%, transparent 25%), linear-gradient(-45deg, #94a3b8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #94a3b8 75%), linear-gradient(-45deg, transparent 75%, #94a3b8 75%)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0px',
        }}
      />

      {/* Brand Header with Gold-Rimmed Circular Knight */}
      <div className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#162544] to-[#0b1326] border-2 border-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.3)] flex items-center justify-center text-white text-2xl font-black shrink-0">
            ♞
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-white leading-none">
                Cờ Vua
              </span>
              <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow" />
            </div>
            <div className="text-xs font-extrabold tracking-wide bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent mt-0.5 leading-none">
              AI COACH
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-none">
              {lang === 'en' ? 'Smart Chess Trainer' : 'Học cờ thông minh'}
            </div>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-3.5">
        <div>
          <div className="px-2 mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300/80 shrink-0">
              {t('navSectionModes')}
            </span>
            <span className="h-[1px] flex-1 bg-gradient-to-r from-cyan-400/70 via-blue-500/30 to-transparent" />
          </div>
          <div className="space-y-1">
            {NAV_MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectMode(item.id);
                    onCloseMobile();
                  }}
                  className={`group w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/30 via-blue-600/45 to-violet-600/45 text-white border border-cyan-400/60 shadow-[0_0_18px_rgba(56,189,248,0.28)]'
                      : 'text-slate-200/85 hover:text-white hover:bg-white/[0.07] border border-transparent'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full bg-gradient-to-br border flex items-center justify-center shadow-sm transition shrink-0 ${item.orbClass}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1 text-left truncate">{t(item.labelKey)}</span>
                  {active && <ChevronRight className="w-4 h-4 text-cyan-200 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-2 mb-2 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300/80 shrink-0">
              {t('navSectionCommunity')}
            </span>
            <span className="h-[1px] flex-1 bg-gradient-to-r from-cyan-400/70 via-blue-500/30 to-transparent" />
          </div>
          <div className="space-y-1">
            {[
              {
                label: t('navLeaderboard'),
                icon: Trophy,
                orbClass: 'from-amber-400/35 to-orange-500/35 border-amber-400/50 text-amber-300',
                onClick: onOpenLeaderboard,
              },
              {
                label: t('navShop'),
                icon: ShoppingBag,
                orbClass: 'from-fuchsia-500/35 to-purple-600/35 border-fuchsia-400/50 text-fuchsia-300',
                onClick: onOpenShop,
              },
              {
                label: lang === 'en' ? 'Daily Quests' : 'Nhiệm vụ hằng ngày',
                icon: Target,
                orbClass: 'from-emerald-500/35 to-teal-600/35 border-emerald-400/50 text-emerald-300',
                onClick: onOpenQuests,
              },
              {
                label: t('navFriends'),
                icon: Users,
                orbClass: 'from-sky-500/35 to-blue-600/35 border-sky-400/50 text-sky-300',
                badge: incomingFriendCount,
                onClick: onOpenFriends,
              },
              {
                label: t('navHistory'),
                icon: Database,
                orbClass: dbConnected
                  ? 'from-teal-500/35 to-emerald-600/35 border-teal-400/50 text-teal-300'
                  : 'from-rose-500/35 to-red-600/35 border-rose-400/50 text-rose-300',
                onClick: onOpenHistory,
              },
              {
                label: t('navSettings'),
                icon: Settings,
                orbClass: 'from-slate-400/30 to-slate-600/30 border-slate-400/40 text-slate-200',
                onClick: onOpenSettings,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    onCloseMobile();
                  }}
                  className="group w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200/85 hover:text-white hover:bg-white/[0.07] transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full bg-gradient-to-br border flex items-center justify-center shrink-0 transition ${item.orbClass}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  onOpenAdmin();
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500/20 to-amber-500/15 hover:from-rose-500/30 hover:to-amber-500/25 border border-rose-400/40 text-rose-200 transition cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500/40 to-amber-500/30 border border-rose-400/50 flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5 text-rose-200" />
                </span>
                <span className="truncate">{t('navAdmin')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Language Pill + Gold-Bordered Profile Card + Stat Pills */}
      <div className="relative z-10 p-3 border-t border-white/10 bg-[#060b18]/90 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-200">
            <Globe className="w-3.5 h-3.5 text-sky-300" />
            {t('languageLabel')}
          </span>
          <div className="inline-flex p-0.5 rounded-full bg-slate-950/70 border border-white/10">
            <button
              type="button"
              onClick={() => setLang('vi')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                lang === 'vi' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                lang === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {currentUser ? (
          <div className="space-y-1.5">
            <button
              onClick={() => {
                onOpenAuth();
                onCloseMobile();
              }}
              className="w-full text-left px-3 py-2 rounded-2xl bg-gradient-to-r from-[#121e3a] to-[#0b1328] hover:from-[#162547] hover:to-[#0f1933] border border-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.12)] transition cursor-pointer flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center text-xs font-extrabold text-slate-950 shrink-0 shadow-md">
                {currentUser.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {currentUser.displayName}
                  </span>
                  {currentUser.role === 'admin' && (
                    <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-extrabold uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-300/80 truncate">
                  @{currentUser.username} · ELO {currentUser.elo}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-300/80 shrink-0" />
            </button>

            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold text-center">
              <span className="inline-flex items-center justify-center gap-1 py-1 rounded-full bg-white/[0.06] border border-orange-400/25 text-amber-300">
                <Flame className="w-3 h-3 text-orange-400" />
                {currentUser.winStreak}
              </span>
              <span className="inline-flex items-center justify-center gap-1 py-1 rounded-full bg-white/[0.06] border border-amber-400/25 text-yellow-300">
                <Coins className="w-3 h-3 text-amber-400" />
                {currentUser.coins}
              </span>
              <span className="inline-flex items-center justify-center gap-1 py-1 rounded-full bg-white/[0.06] border border-emerald-400/25 text-emerald-300">
                <Star className="w-3 h-3 text-emerald-400 fill-current" />
                {currentUser.points}
                {t('pointsUnit')}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              onOpenAuth();
              onCloseMobile();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-xs font-extrabold text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/25"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('loginRegister')}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
