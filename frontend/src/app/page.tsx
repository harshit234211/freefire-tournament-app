// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Home as HomeIcon, Menu, Bell, ChevronLeft,
  Clock, User, LogOut, Plus,
  CheckCircle, XCircle, RefreshCw,
  TrendingUp, Gift
} from 'lucide-react';

const API_URL = 'https://freefire-tournament-app.onrender.com/api';

// Game categories with colors
const GAME_CATEGORIES = [
  { id: 'BR Survival',      label: 'BR SURVIVAL',         color: '#e74c3c', bg: 'from-red-900 to-orange-800',   icon: '🎯' },
  { id: 'BR Per Kill',      label: 'BR PER KILL',          color: '#f39c12', bg: 'from-yellow-900 to-orange-700', icon: '💀' },
  { id: 'Clash Squad 1v1',  label: 'CLASH SQUAD 1V1',      color: '#8e44ad', bg: 'from-purple-900 to-blue-800',  icon: '⚔️' },
  { id: 'Lone Wolf 1v1',    label: 'LONE WOLF 1V1',        color: '#16a085', bg: 'from-teal-900 to-cyan-800',    icon: '🐺' },
  { id: 'Clash Squad 4v4',  label: 'CLASH SQUAD 4V4',      color: '#2980b9', bg: 'from-blue-900 to-indigo-800',  icon: '🛡️' },
  { id: 'Lone Wolf 2v2',    label: 'LONE WOLF 2V2',        color: '#27ae60', bg: 'from-green-900 to-teal-800',   icon: '🔥' },
  { id: 'CS Headshot',      label: 'CS HEADSHOT',          color: '#c0392b', bg: 'from-red-950 to-rose-800',     icon: '🎯' },
  { id: 'Only UMP',         label: 'ONLY UMP 1V1',         color: '#d35400', bg: 'from-orange-900 to-amber-800', icon: '🔫' },
  { id: 'CS Challenges',    label: 'CS CHALLENGES',        color: '#7f8c8d', bg: 'from-slate-800 to-gray-700',   icon: '🏆' },
  { id: 'Free Tournament',  label: 'FREE TOURNAMENT',      color: '#1abc9c', bg: 'from-emerald-900 to-green-700',icon: '🎁' },
];

function getTimeLeft(date: string, time: string) {
  try {
    const matchTime = new Date(`${date} ${time}`);
    const now = new Date();
    const diff = matchTime.getTime() - now.getTime();
    if (diff <= 0) return '0d 0h 0m 0s';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${d}d ${h}h ${m}m ${s}s`;
  } catch { return '--'; }
}

export default function Home() {
  // Auth
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Navigation
  const [activeNav, setActiveNav] = useState<'home' | 'earn' | 'leaderboard' | 'menu'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [contestTab, setContestTab] = useState<'ongoing' | 'upcoming' | 'completed'>('upcoming');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showJoinings, setShowJoinings] = useState(false);

  // Data
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [clans, setClans] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Match detail state
  const [timeLeft, setTimeLeft] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState('');

  // Admin / Host
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    title: '', category: 'BR Survival', date: '', time: '',
    entryFee: '', prizePool: '', perKill: '0', totalSlots: '20',
    teamType: 'Solo', mode: 'Solo', map: 'Bermuda', matchType: 'Paid',
    rules: '',
    prizeDistribution: '1st:55,2nd:40,3rd:35,4th:30,5th:30'
  });

  // Wallet
  const [showWallet, setShowWallet] = useState(false);
  const [depositAmt, setDepositAmt] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [showDepositQR, setShowDepositQR] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');

  // Profile
  const [showProfile, setShowProfile] = useState(false);
  const [ffName, setFfName] = useState('');
  const [ffUid, setFfUid] = useState('');

  // Notifications
  const [notifications] = useState<string[]>(['Welcome to FragArena!', 'New tournament added']);

  const timerRef = useRef<any>(null);

  const getHeaders = useCallback((tk?: string | null) => ({
    'Content-Type': 'application/json',
    'x-auth-token': tk || token || ''
  }), [token]);

  // ─── Auth ────────────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isRegister ? 'register' : 'login';
      const body: any = { phone: phoneInput, password: passwordInput };
      if (isRegister) body.username = usernameInput;
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.msg || 'Error'); return; }
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setFfName(data.user.ffName || '');
      setFfUid(data.user.ffUid || '');
    } catch { setAuthError('Connection failed'); }
  };

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadTournaments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/tournaments`);
      const data = await res.json();
      setTournaments(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/clans/ranking`);
      const data = await res.json();
      setClans(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    const tk = localStorage.getItem('token');
    if (tk) {
      setToken(tk);
      fetch(`${API_URL}/auth/me`, { headers: { 'x-auth-token': tk } })
        .then(r => r.json()).then(d => {
          if (d._id) { setUser(d); setFfName(d.ffName || ''); setFfUid(d.ffUid || ''); }
          else { localStorage.removeItem('token'); }
        }).catch(() => { localStorage.removeItem('token'); })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
    // Load tournaments once on mount
    fetch(`${API_URL}/tournaments`)
      .then(r => r.json())
      .then(d => setTournaments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []); // eslint-disable-line

  // Timer for match detail
  useEffect(() => {
    if (selectedMatch) {
      const tick = () => setTimeLeft(getTimeLeft(selectedMatch.date, selectedMatch.time));
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [selectedMatch]);

  // Compute my matches
  useEffect(() => {
    if (user && tournaments.length) {
      setMyMatches(tournaments.filter(t => t.joinedPlayers?.some((p: any) => p.user === user.id || p.user?._id === user.id)));
    }
  }, [user, tournaments]);

  // ─── Join Match ───────────────────────────────────────────────────────────
  const handleJoin = async (matchId: string) => {
    if (!user?.ffName || !user?.ffUid) {
      setJoinSuccess('Please update your FF Name & UID in profile first!');
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/join`, {
        method: 'POST', headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setJoinSuccess('✅ Successfully joined!');
        loadTournaments();
      } else { setJoinSuccess(data.msg || 'Failed to join'); }
    } catch { setJoinSuccess('Connection error'); }
    setJoining(false);
    setTimeout(() => setJoinSuccess(''), 3000);
  };

  // ─── Create Match (Admin/Host) ────────────────────────────────────────────
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Parse prize distribution
      const prizeDist = newMatch.prizeDistribution.split(',').map((p, i) => {
        const parts = p.trim().split(':');
        return { rank: i + 1, prize: parseInt(parts[1] || '0') };
      });
      const rulesArr = newMatch.rules.split('\n').filter(r => r.trim());
      const res = await fetch(`${API_URL}/tournaments`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({
          ...newMatch,
          entryFee: parseInt(newMatch.entryFee),
          prizePool: parseInt(newMatch.prizePool),
          perKill: parseInt(newMatch.perKill),
          totalSlots: parseInt(newMatch.totalSlots),
          prizeDistribution: prizeDist,
          rules: rulesArr
        })
      });
      if (res.ok) {
        setShowCreateMatch(false);
        setNewMatch({ title: '', category: 'BR Survival', date: '', time: '', entryFee: '', prizePool: '', perKill: '0', totalSlots: '20', teamType: 'Solo', mode: 'Solo', map: 'Bermuda', matchType: 'Paid', rules: '', prizeDistribution: '1st:55,2nd:40,3rd:35,4th:30,5th:30' });
        loadTournaments();
      }
    } catch {}
  };

  // ─── Wallet ───────────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    setShowDepositQR(true);
  };
  const handleWithdraw = async () => {
    if (!withdrawAmt || !withdrawUpi) { setWalletMsg('Enter amount and UPI ID'); return; }
    try {
      const res = await fetch(`${API_URL}/wallet/withdraw/request`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ amount: parseInt(withdrawAmt), upiId: withdrawUpi })
      });
      const data = await res.json();
      setWalletMsg(res.ok ? '✅ Withdrawal requested!' : data.msg || 'Failed');
    } catch { setWalletMsg('Connection error'); }
    setTimeout(() => setWalletMsg(''), 3000);
  };

  const handleVerifyDeposit = async () => {
    try {
      const res = await fetch(`${API_URL}/wallet/deposit/verify`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ amount: parseInt(depositAmt), orderId: 'UPI_' + Date.now() })
      });
      const data = await res.json();
      if (res.ok) {
        setWalletMsg('✅ Deposit verified!');
        setShowDepositQR(false);
        const meRes = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
        const me = await meRes.json();
        if (me._id) setUser(me);
      } else { setWalletMsg(data.msg || 'Verify failed'); }
    } catch { setWalletMsg('Connection error'); }
    setTimeout(() => setWalletMsg(''), 3000);
  };

  // ─── Profile Update ───────────────────────────────────────────────────────
  const handleProfileUpdate = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ ffName, ffUid })
      });
      if (res.ok) {
        const meRes = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
        const me = await meRes.json();
        if (me._id) setUser(me);
        setShowProfile(false);
      }
    } catch {}
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null); setUser(null);
    setSelectedCategory(null); setSelectedMatch(null);
  };

  // ─── Filtered tournaments ─────────────────────────────────────────────────
  const categoryTournaments = selectedCategory
    ? tournaments.filter(t => t.category === selectedCategory)
    : [];

  const filteredByTab = categoryTournaments.filter(t => {
    if (contestTab === 'ongoing') return t.status === 'ongoing';
    if (contestTab === 'upcoming') return t.status === 'upcoming';
    if (contestTab === 'completed') return t.status === 'completed';
    return true;
  });

  // ─── Loading Screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a1628]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#f5c518] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#f5c518] font-bold text-lg tracking-widest">LOADING...</p>
        </div>
      </div>
    );
  }

  // ─── Auth Screen ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#f5c518] to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-2xl">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-widest">FRAGARENA</h1>
            <p className="text-[#f5c518] text-sm font-semibold tracking-wider mt-1">KHILADIBATTLE</p>
          </div>

          <div className="bg-[#132040] rounded-2xl p-6 shadow-2xl border border-[#1e3a6e]">
            <div className="flex rounded-xl overflow-hidden mb-6 bg-[#0a1628]">
              <button onClick={() => setIsRegister(false)}
                className={`flex-1 py-2.5 text-sm font-bold ${!isRegister ? 'bg-[#f5c518] text-black' : 'text-slate-400'}`}>
                LOGIN
              </button>
              <button onClick={() => setIsRegister(true)}
                className={`flex-1 py-2.5 text-sm font-bold ${isRegister ? 'bg-[#f5c518] text-black' : 'text-slate-400'}`}>
                REGISTER
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegister && (
                <input type="text" placeholder="Username" value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  className="w-full bg-[#0a1628] border border-[#1e3a6e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#f5c518]" required />
              )}
              <input type="tel" placeholder="Phone Number" value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                className="w-full bg-[#0a1628] border border-[#1e3a6e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#f5c518]" required />
              <input type="password" placeholder="Password" value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full bg-[#0a1628] border border-[#1e3a6e] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#f5c518]" required />
              {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
              <button type="submit"
                className="w-full bg-[#f5c518] text-black font-black py-3.5 rounded-xl text-sm tracking-widest hover:bg-yellow-400 transition">
                {isRegister ? 'CREATE ACCOUNT' : 'LOGIN'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Match Detail Screen ──────────────────────────────────────────────────
  if (selectedMatch && !showJoinings) {
    const joined = selectedMatch.joinedPlayers?.some((p: any) =>
      p.user === user.id || p.user?._id === user.id);
    const isFull = selectedMatch.joinedPlayers?.length >= selectedMatch.totalSlots;
    const spotsLeft = selectedMatch.totalSlots - (selectedMatch.joinedPlayers?.length || 0);

    return (
      <div className="min-h-screen bg-[#f0f2f5] pb-6">
        {/* Header */}
        <div className="bg-[#132040] px-4 py-4 flex items-center gap-3">
          <button onClick={() => setSelectedMatch(null)} className="text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white font-bold text-base flex-1 text-center">
            Contest Details {selectedMatch.matchId}
          </h2>
          <div className="w-6" />
        </div>

        {/* Banner */}
        <div className="relative h-48 bg-gradient-to-br from-gray-700 to-gray-900">
          <div className={`w-full h-full bg-gradient-to-br ${
            GAME_CATEGORIES.find(c => c.id === selectedMatch.category)?.bg || 'from-gray-800 to-gray-900'
          } flex items-center justify-center`}>
            <div className="text-center">
              <p className="text-5xl mb-2">{GAME_CATEGORIES.find(c => c.id === selectedMatch.category)?.icon || '🏆'}</p>
              <p className="text-white font-black text-2xl tracking-widest">
                {GAME_CATEGORIES.find(c => c.id === selectedMatch.category)?.label || selectedMatch.category}
              </p>
            </div>
          </div>
          {/* FF MAX badge */}
          <div className="absolute top-3 right-3 bg-black/60 rounded px-2 py-1">
            <span className="text-[#f5c518] text-xs font-bold">FREE FIRE MAX</span>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Time Left */}
          <div className="bg-white rounded-xl px-4 py-3 text-center shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Time Left: <span className="text-black font-bold">{timeLeft}</span></p>
          </div>

          {/* Title */}
          <p className="text-[#132040] font-bold text-sm leading-relaxed">
            {selectedMatch.title} – {selectedMatch.matchId}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `Team: ${selectedMatch.teamType}` },
              { label: `Mode: ${selectedMatch.mode}` },
              { label: `Map: ${selectedMatch.map}` },
            ].map((tag, i) => (
              <span key={i} className="border border-gray-300 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 bg-white">
                {tag.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="border border-gray-300 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 bg-white">
              Match Type: {selectedMatch.matchType}
            </span>
            <span className="border border-gray-300 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 bg-white flex items-center gap-1">
              Entry Fee: 🪙 {selectedMatch.entryFee}
            </span>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm text-center">
            <p className="text-gray-600 text-sm">
              Match Schedule: <span className="font-bold text-black">{selectedMatch.date} at {selectedMatch.time}</span>
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'PRIZE POOL', value: `🪙 ${selectedMatch.prizePool}` },
              { label: 'PER KILL', value: `🪙 ${selectedMatch.perKill}` },
              { label: 'ENTRY FEE', value: `🪙 ${selectedMatch.entryFee}` },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="font-bold text-sm text-[#132040]">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Spots */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-red-500 text-xs font-bold">Only {spotsLeft} Spot{spotsLeft !== 1 ? 's' : ''} Left</span>
              <span className="text-xs text-gray-500">{selectedMatch.joinedPlayers?.length || 0}/{selectedMatch.totalSlots}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((selectedMatch.joinedPlayers?.length || 0) / selectedMatch.totalSlots) * 100)}%` }} />
            </div>
          </div>

          {/* Prize Details */}
          {selectedMatch.prizeDistribution?.length > 0 && (
            <div>
              <p className="text-[#1a73e8] font-bold text-sm mb-2">Prize Details</p>
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                {selectedMatch.prizeDistribution.map((pd: any, i: number) => (
                  <p key={i} className="text-sm text-gray-700">
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'][i] || `${i + 1}th`} place: <span className="font-semibold">{pd.prize}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* About Match / Rules */}
          {selectedMatch.rules?.length > 0 && (
            <div>
              <p className="text-[#1a73e8] font-bold text-sm mb-2">About this Match</p>
              <div className="bg-[#eef2ff] rounded-xl p-4 shadow-sm">
                <p className="font-bold text-center text-sm text-gray-800 mb-3">Rules and Regulations</p>
                <ul className="space-y-3">
                  {selectedMatch.rules.map((rule: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-black font-bold mt-0.5">●</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Room ID (if released) */}
          {selectedMatch.roomId && (
            <div className="bg-[#132040] rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">ROOM ID</p>
              <p className="text-[#f5c518] font-black text-xl tracking-widest">{selectedMatch.roomId}</p>
              {selectedMatch.roomPass && (
                <>
                  <p className="text-gray-400 text-xs mt-2 mb-1">ROOM PASSWORD</p>
                  <p className="text-white font-bold text-lg">{selectedMatch.roomPass}</p>
                </>
              )}
            </div>
          )}

          {/* Join success msg */}
          {joinSuccess && (
            <div className={`rounded-xl p-3 text-center text-sm font-bold ${joinSuccess.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {joinSuccess}
            </div>
          )}

          {/* View All Joinings */}
          <button onClick={() => setShowJoinings(true)}
            className="w-full py-3 rounded-xl border border-[#f5c518] text-[#f5c518] font-bold text-sm hover:bg-[#f5c518]/10 transition">
            VIEW ALL JOININGS
          </button>

          {/* Join Button */}
          {isFull ? (
            <button disabled className="w-full py-4 rounded-xl bg-[#1a73e8] text-white font-black text-sm tracking-widest opacity-80">
              Joining Full
            </button>
          ) : joined ? (
            <button disabled className="w-full py-4 rounded-xl bg-green-500 text-white font-black text-sm tracking-widest">
              ✅ Already Joined
            </button>
          ) : (
            <button onClick={() => handleJoin(selectedMatch._id)} disabled={joining}
              className="w-full py-4 rounded-xl bg-green-500 text-white font-black text-sm tracking-widest hover:bg-green-600 transition active:scale-95">
              {joining ? 'Joining...' : `JOIN (🪙 ${selectedMatch.entryFee})`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── All Joinings Screen ──────────────────────────────────────────────────
  if (showJoinings && selectedMatch) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-[#132040] px-4 py-4 flex items-center gap-3">
          <button onClick={() => setShowJoinings(false)} className="text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white font-bold text-base flex-1 text-center">All Joinings</h2>
          <div className="w-6" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-3 text-left text-xs text-gray-500 font-semibold">Team No.</th>
                <th className="px-3 py-3 text-left text-xs text-gray-500 font-semibold">Pos.</th>
                <th className="px-3 py-3 text-left text-xs text-gray-500 font-semibold">In Game Name</th>
                <th className="px-3 py-3 text-left text-xs text-gray-500 font-semibold">In Game Id</th>
              </tr>
            </thead>
            <tbody>
              {selectedMatch.joinedPlayers?.map((p: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-3 text-gray-700">{p.teamNo || i + 1}</td>
                  <td className="px-3 py-3 text-gray-700">{p.position || 'A'}</td>
                  <td className="px-3 py-3 font-semibold text-gray-900">{p.name || p.user?.username || '--'}</td>
                  <td className="px-3 py-3 text-gray-500">{p.uid || p.user?.ffUid || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!selectedMatch.joinedPlayers || selectedMatch.joinedPlayers.length === 0) && (
            <div className="text-center py-12 text-gray-400">No players joined yet.</div>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="fixed bottom-0 left-0 right-0 flex">
          <button className="flex-1 py-4 bg-[#132040] text-[#f5c518] font-bold text-sm">
            MY ENTRIES
          </button>
          <button onClick={() => setShowJoinings(false)}
            className="flex-1 py-4 bg-[#1a73e8] text-white font-bold text-sm">
            SHOW DETAILS
          </button>
        </div>
      </div>
    );
  }

  // ─── Contest List Screen ──────────────────────────────────────────────────
  if (selectedCategory) {
    const cat = GAME_CATEGORIES.find(c => c.id === selectedCategory);
    return (
      <div className="min-h-screen bg-[#f0f2f5] pb-6">
        {/* Header */}
        <div className="bg-[#132040] px-4 py-4 flex items-center gap-3">
          <button onClick={() => setSelectedCategory(null)} className="text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white font-bold text-base flex-1 text-center">
            {cat?.label} Contests
          </h2>
          <div className="w-6" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white">
          {(['ongoing', 'upcoming', 'completed'] as const).map(tab => (
            <button key={tab} onClick={() => setContestTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition ${contestTab === tab ? 'text-[#1a73e8] border-b-2 border-[#1a73e8]' : 'text-gray-500'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Contest Cards */}
        <div className="px-4 py-4 space-y-4">
          {filteredByTab.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No {contestTab} contests</p>
            </div>
          ) : filteredByTab.map(match => {
            const isFull = match.joinedPlayers?.length >= match.totalSlots;
            const spotsLeft = match.totalSlots - (match.joinedPlayers?.length || 0);
            return (
              <motion.div key={match._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedMatch(match)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.99] transition">
                {/* Banner */}
                <div className={`h-44 bg-gradient-to-br ${cat?.bg || 'from-gray-800 to-gray-900'} flex items-center justify-center relative`}>
                  <div className="text-center">
                    <p className="text-5xl mb-2">{cat?.icon || '🏆'}</p>
                    <p className="text-white font-black text-xl tracking-widest">{cat?.label || selectedCategory}</p>
                    <p className="text-yellow-300 text-xs font-semibold mt-1">TOURNAMENT</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/60 rounded px-2 py-1">
                    <span className="text-[#f5c518] text-xs font-bold">FREE FIRE MAX</span>
                  </div>
                  {match.status === 'ongoing' && (
                    <div className="absolute top-3 left-3 bg-green-500 rounded px-2 py-1">
                      <span className="text-white text-xs font-bold">🔴 LIVE</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <p className="font-bold text-sm text-gray-900 mb-1 leading-snug">{match.title}</p>
                  <p className="text-gray-400 text-xs mb-3">Time : {match.date} at {match.time}</p>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] uppercase">Prize Pool</p>
                      <p className="font-bold text-sm">🪙 {match.prizePool}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] uppercase">Per Kill</p>
                      <p className="font-bold text-sm">🪙 {match.perKill}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] uppercase">Entry Fee</p>
                      <p className="font-bold text-sm">🪙 {match.entryFee}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] uppercase">Type</p>
                      <p className="font-semibold text-xs">{match.teamType}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] uppercase">Entry/Player</p>
                      <p className="font-semibold text-xs">{match.totalSlots}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] uppercase">Map</p>
                      <p className="font-semibold text-xs">{match.map}</p>
                    </div>
                  </div>

                  {/* Spots bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-red-500 text-[10px] font-bold">Only {spotsLeft} Spot Left</span>
                        <span className="text-gray-400 text-[10px]">{match.joinedPlayers?.length || 0}/{match.totalSlots}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, ((match.joinedPlayers?.length || 0) / match.totalSlots) * 100)}%` }} />
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isFull ? 'bg-[#1a73e8] text-white' : 'bg-green-500 text-white'}`}>
                      {isFull ? 'Joining Full' : 'Join Now'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Admin: Create match */}
        {(user.role === 'admin' || user.role === 'host') && (
          <div className="fixed bottom-6 right-6">
            <button onClick={() => setShowCreateMatch(true)}
              className="w-14 h-14 rounded-full bg-[#f5c518] text-black flex items-center justify-center shadow-2xl">
              <Plus className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* Create Match Modal */}
        <AnimatePresence>
          {showCreateMatch && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-end">
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-[#132040]">Create New Match</h3>
                  <button onClick={() => setShowCreateMatch(false)} className="text-gray-400">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleCreateMatch} className="space-y-4">
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Match Title" value={newMatch.title} onChange={e => setNewMatch({...newMatch, title: e.target.value})} required />
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.category} onChange={e => setNewMatch({...newMatch, category: e.target.value})}>
                    {GAME_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Date (YYYY-MM-DD)" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} required />
                    <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Time (HH:MM AM/PM)" value={newMatch.time} onChange={e => setNewMatch({...newMatch, time: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Entry Fee" value={newMatch.entryFee} onChange={e => setNewMatch({...newMatch, entryFee: e.target.value})} required />
                    <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Prize Pool" value={newMatch.prizePool} onChange={e => setNewMatch({...newMatch, prizePool: e.target.value})} required />
                    <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Per Kill" value={newMatch.perKill} onChange={e => setNewMatch({...newMatch, perKill: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Total Slots" value={newMatch.totalSlots} onChange={e => setNewMatch({...newMatch, totalSlots: e.target.value})} required />
                    <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.map} onChange={e => setNewMatch({...newMatch, map: e.target.value})}>
                      <option>Bermuda</option><option>Kalahari</option><option>Purgatory</option><option>Alpine</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.teamType} onChange={e => setNewMatch({...newMatch, teamType: e.target.value})}>
                      <option>Solo</option><option>Duo</option><option>Squad</option>
                    </select>
                    <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.mode} onChange={e => setNewMatch({...newMatch, mode: e.target.value})}>
                      <option>Solo</option><option>1v1</option><option>2v2</option><option>4v4</option>
                    </select>
                    <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.matchType} onChange={e => setNewMatch({...newMatch, matchType: e.target.value})}>
                      <option>Paid</option><option>Free</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Prize Distribution (format: 1st:55,2nd:40,...)</label>
                    <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.prizeDistribution} onChange={e => setNewMatch({...newMatch, prizeDistribution: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Rules (one per line)</label>
                    <textarea rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none" placeholder="Room Entry Recording is compulsory..." value={newMatch.rules} onChange={e => setNewMatch({...newMatch, rules: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-[#132040] text-[#f5c518] font-bold py-4 rounded-xl text-sm tracking-widest">
                    CREATE MATCH
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Main Home Screen ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-20">
      {/* Top Header */}
      <div className="bg-[#132040] px-4 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#f5c518] to-orange-500 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{user.username}</p>
            <p className="text-gray-400 text-[10px]">ID: {user.ffUid || 'Set FF UID'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#f5c518]/20 rounded-full px-3 py-1.5">
            <span className="text-[#f5c518] text-sm">🪙</span>
            <span className="text-[#f5c518] font-bold text-sm">{user.coins || 0}</span>
          </div>
          <button className="relative" onClick={() => {}}>
            <Bell className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center">
              {notifications.length}
            </span>
          </button>
        </div>
      </div>

      {activeNav === 'home' && (
        <>
          {/* My Matches */}
          <div className="px-4 py-5">
            <h2 className="text-center font-bold text-base text-[#132040] mb-4">My Matches</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Ongoing', icon: RefreshCw, color: '#4CAF50', count: myMatches.filter(m => m.status === 'ongoing').length },
                { label: 'Upcoming', icon: Clock, color: '#1a73e8', count: myMatches.filter(m => m.status === 'upcoming').length },
                { label: 'Completed', icon: CheckCircle, color: '#4CAF50', count: myMatches.filter(m => m.status === 'completed').length },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: item.color + '20', border: `2px solid ${item.color}` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <p className="text-xs font-semibold text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Esports Games */}
          <div className="px-4 pb-4">
            <h2 className="font-bold text-sm text-[#132040] mb-3">Esports Games</h2>
            <div className="grid grid-cols-2 gap-3">
              {GAME_CATEGORIES.map(cat => {
                const count = tournaments.filter(t => t.category === cat.id).length;
                return (
                  <motion.div key={cat.id} whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedCategory(cat.id); setContestTab('upcoming'); }}
                    className={`relative h-32 rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br ${cat.bg} shadow-md`}>
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                      <span className="text-3xl mb-1">{cat.icon}</span>
                      <p className="text-white font-black text-sm text-center tracking-wider leading-tight">
                        {cat.label}
                      </p>
                    </div>
                    {/* Player count */}
                    <div className="absolute bottom-2 left-3 flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <span className="text-white text-[10px] font-semibold">{count}</span>
                    </div>
                    {/* FF MAX badge */}
                    <div className="absolute top-2 right-2 bg-black/40 rounded px-1 py-0.5">
                      <span className="text-[#f5c518] text-[8px] font-bold">FF MAX</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeNav === 'leaderboard' && (
        <div className="px-4 py-5">
          <h2 className="font-bold text-base text-[#132040] mb-4 text-center">🏆 Leaderboard</h2>
          <div className="space-y-3">
            {tournaments
              .flatMap(t => t.joinedPlayers || [])
              .reduce((acc: any[], p: any) => {
                const name = p.name || p.user?.username || 'Unknown';
                const ex = acc.find(a => a.name === name);
                if (ex) { ex.kills += p.kills || 0; ex.wins += p.rank === 1 ? 1 : 0; }
                else acc.push({ name, kills: p.kills || 0, wins: p.rank === 1 ? 1 : 0 });
                return acc;
              }, [])
              .sort((a, b) => b.kills - a.kills)
              .slice(0, 20)
              .map((player, i) => (
                <div key={i} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <span className={`font-black text-sm w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#132040] to-[#1a73e8] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <p className="flex-1 font-semibold text-sm text-gray-900">{player.name}</p>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Kills: <span className="font-bold text-red-500">{player.kills}</span></p>
                    <p className="text-xs text-gray-500">Wins: <span className="font-bold text-yellow-500">{player.wins}</span></p>
                  </div>
                </div>
              ))}
            {tournaments.length === 0 && (
              <div className="text-center py-16 text-gray-400">No data yet</div>
            )}
          </div>
        </div>
      )}

      {activeNav === 'earn' && (
        <div className="px-4 py-5">
          <h2 className="font-bold text-base text-[#132040] mb-4 text-center">💰 Wallet</h2>

          {/* Balance */}
          <div className="bg-gradient-to-br from-[#132040] to-[#1a3060] rounded-2xl p-5 mb-5 shadow-lg text-center">
            <p className="text-gray-400 text-xs mb-1">Your Balance</p>
            <p className="text-[#f5c518] font-black text-4xl">🪙 {user.coins || 0}</p>
            <p className="text-gray-400 text-xs mt-1">Winnings: ₹{user.winnings || 0}</p>
          </div>

          {/* Deposit */}
          <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
            <h3 className="font-bold text-sm text-[#132040] mb-3">Deposit Coins</h3>
            <div className="flex gap-3">
              <input type="number" placeholder="Amount (₹)" value={depositAmt}
                onChange={e => setDepositAmt(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f5c518]" />
              <button onClick={handleDeposit}
                className="bg-[#132040] text-[#f5c518] font-bold px-5 py-3 rounded-xl text-sm">
                PAY
              </button>
            </div>
          </div>

          {/* QR Modal */}
          <AnimatePresence>
            {showDepositQR && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
                  <h3 className="font-bold text-lg text-[#132040] mb-2">Scan & Pay</h3>
                  <p className="text-gray-500 text-xs mb-4">Pay ₹{depositAmt} via UPI</p>
                  <div className="bg-white p-3 rounded-xl border-2 border-[#f5c518] w-44 h-44 mx-auto mb-4">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=7017022966@ibl%26pn=FragArena%26am=${depositAmt}%26cu=INR`}
                      alt="UPI QR" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-xs text-gray-500 mb-5">Scan with GPay, PhonePe, Paytm</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowDepositQR(false)}
                      className="flex-1 py-3 border border-red-200 text-red-500 font-bold rounded-xl text-sm">Cancel</button>
                    <button onClick={handleVerifyDeposit}
                      className="flex-1 py-3 bg-[#132040] text-[#f5c518] font-bold rounded-xl text-sm">I Paid</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Withdraw */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-sm text-[#132040] mb-3">Withdraw Winnings</h3>
            <div className="space-y-3">
              <input type="number" placeholder="Amount (₹)" value={withdrawAmt}
                onChange={e => setWithdrawAmt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f5c518]" />
              <input type="text" placeholder="Your UPI ID" value={withdrawUpi}
                onChange={e => setWithdrawUpi(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f5c518]" />
              <button onClick={handleWithdraw}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl text-sm">
                WITHDRAW
              </button>
            </div>
          </div>

          {walletMsg && (
            <div className={`mt-4 p-3 rounded-xl text-center text-sm font-bold ${walletMsg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {walletMsg}
            </div>
          )}
        </div>
      )}

      {activeNav === 'menu' && (
        <div className="px-4 py-5 space-y-3">
          <h2 className="font-bold text-base text-[#132040] mb-4 text-center">Menu</h2>

          {/* Profile */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#132040] to-[#1a73e8] rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.phone}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.role?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#f0f2f5] rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">FF Name</p>
                <p className="font-bold text-sm truncate">{user.ffName || 'Not set'}</p>
              </div>
              <div className="bg-[#f0f2f5] rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">FF UID</p>
                <p className="font-bold text-sm truncate">{user.ffUid || 'Not set'}</p>
              </div>
            </div>
            {/* Edit Profile */}
            <div className="space-y-3">
              <input value={ffName} onChange={e => setFfName(e.target.value)}
                placeholder="Free Fire Name" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f5c518]" />
              <input value={ffUid} onChange={e => setFfUid(e.target.value)}
                placeholder="Free Fire UID" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#f5c518]" />
              <button onClick={handleProfileUpdate}
                className="w-full bg-[#132040] text-[#f5c518] font-bold py-3 rounded-xl text-sm">
                UPDATE PROFILE
              </button>
            </div>
          </div>

          {/* Admin Panel */}
          {user.role === 'admin' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm text-[#132040] mb-3">🛡️ Admin Panel</h3>
              <button onClick={() => { setSelectedCategory('BR Survival'); setShowCreateMatch(true); }}
                className="w-full bg-[#f5c518] text-black font-bold py-3 rounded-xl text-sm mb-3">
                + Create New Match
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f0f2f5] rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Total Matches</p>
                  <p className="font-black text-xl text-[#132040]">{tournaments.length}</p>
                </div>
                <div className="bg-[#f0f2f5] rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Active</p>
                  <p className="font-black text-xl text-green-500">{tournaments.filter(t => t.status === 'ongoing').length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button onClick={handleLogout}
            className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" />
            LOGOUT
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex shadow-2xl">
        {([
          { id: 'earn', icon: Gift, label: 'Earn' },
          { id: 'leaderboard', icon: TrendingUp, label: 'Leaderboard' },
          { id: 'home', icon: HomeIcon, label: 'Home' },
          { id: 'menu', icon: Menu, label: 'Menu' },
        ] as const).map(nav => (
          <button key={nav.id} onClick={() => setActiveNav(nav.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${activeNav === nav.id ? 'text-[#132040]' : 'text-gray-400'}`}>
            <nav.icon className={`w-5 h-5 ${activeNav === nav.id ? 'text-[#132040]' : ''}`} />
            <span className="text-[10px] font-semibold">{nav.label}</span>
            {activeNav === nav.id && (
              <div className="w-1 h-1 rounded-full bg-[#132040] mt-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Create Match Modal (from admin menu) */}
      <AnimatePresence>
        {showCreateMatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-[#132040]">Create New Match</h3>
                <button onClick={() => setShowCreateMatch(false)} className="text-gray-400">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateMatch} className="space-y-4">
                <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Match Title" value={newMatch.title} onChange={e => setNewMatch({...newMatch, title: e.target.value})} required />
                <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.category} onChange={e => setNewMatch({...newMatch, category: e.target.value})}>
                  {GAME_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Date (YYYY-MM-DD)" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} required />
                  <input className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Time (09:00 AM)" value={newMatch.time} onChange={e => setNewMatch({...newMatch, time: e.target.value})} required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Entry Fee" value={newMatch.entryFee} onChange={e => setNewMatch({...newMatch, entryFee: e.target.value})} required />
                  <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Prize Pool" value={newMatch.prizePool} onChange={e => setNewMatch({...newMatch, prizePool: e.target.value})} required />
                  <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Per Kill" value={newMatch.perKill} onChange={e => setNewMatch({...newMatch, perKill: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Total Slots" value={newMatch.totalSlots} onChange={e => setNewMatch({...newMatch, totalSlots: e.target.value})} required />
                  <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.map} onChange={e => setNewMatch({...newMatch, map: e.target.value})}>
                    <option>Bermuda</option><option>Kalahari</option><option>Purgatory</option><option>Alpine</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.teamType} onChange={e => setNewMatch({...newMatch, teamType: e.target.value})}>
                    <option>Solo</option><option>Duo</option><option>Squad</option>
                  </select>
                  <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.mode} onChange={e => setNewMatch({...newMatch, mode: e.target.value})}>
                    <option>Solo</option><option>1v1</option><option>2v2</option><option>4v4</option>
                  </select>
                  <select className="border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.matchType} onChange={e => setNewMatch({...newMatch, matchType: e.target.value})}>
                    <option>Paid</option><option>Free</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prize Distribution</label>
                  <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newMatch.prizeDistribution} onChange={e => setNewMatch({...newMatch, prizeDistribution: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Rules (one per line)</label>
                  <textarea rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none" value={newMatch.rules} onChange={e => setNewMatch({...newMatch, rules: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-[#132040] text-[#f5c518] font-bold py-4 rounded-xl text-sm tracking-widest">
                  CREATE MATCH
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
