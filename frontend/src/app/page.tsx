'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Wallet, Users, MessageSquare, Shield, User, LogOut, Plus, 
  Coins, Sparkles, Send, CheckCircle, XCircle, Share2, Clipboard, 
  Clock, MapPin, Target, Eye, RefreshCw, Flame, UserCheck, AlertTriangle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://freefire-tournament-app.onrender.com/api';

export default function Home() {
  // Authentication & State
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('tournaments');
  const [loading, setLoading] = useState<boolean>(true);

  // Auth Inputs
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');

  // Profile Inputs
  const [ffName, setFfName] = useState<string>('');
  const [ffUid, setFfUid] = useState<string>('');
  const [isEditProfile, setIsEditProfile] = useState<boolean>(false);

  // Data Lists
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [clans, setClans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [clanChatHistory, setClanChatHistory] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [depositLogs, setDepositLogs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [hostMatches, setHostMatches] = useState<any[]>([]);

  // Input states
  const [message, setMessage] = useState<string>('');
  const [clanMessage, setClanMessage] = useState<string>('');
  const [clanName, setClanName] = useState<string>('');
  const [clanTag, setClanTag] = useState<string>('');
  const [depositAmt, setDepositAmt] = useState<string>('');
  const [withdrawAmt, setWithdrawAmt] = useState<string>('');
  const [withdrawUpi, setWithdrawUpi] = useState<string>('');
  const [cfOrderId, setCfOrderId] = useState<string>('');
  const [cfSession, setCfSession] = useState<string>('');
  const [cfModal, setCfModal] = useState<boolean>(false);

  // Match Creator Inputs
  const [matchTitle, setMatchTitle] = useState<string>('');
  const [matchCategory, setMatchCategory] = useState<string>('Lone Wolf 1v1');
  const [matchDate, setMatchDate] = useState<string>('');
  const [matchTime, setMatchTime] = useState<string>('');
  const [matchEntry, setMatchEntry] = useState<number>(10);
  const [matchPrize, setMatchPrize] = useState<number>(16);
  const [matchKill, setMatchKill] = useState<number>(0);
  const [matchSlots, setMatchSlots] = useState<number>(2);
  const [matchHost, setMatchHost] = useState<string>('');
  const [skillsOn, setSkillsOn] = useState<boolean>(false);
  const [attrsOn, setAttrsOn] = useState<boolean>(false);
  const [bodyShot, setBodyShot] = useState<string>('Allowed');
  const [weaponsMode, setWeaponsMode] = useState<string>('All');
  const [ammoMode, setAmmoMode] = useState<string>('Normal');
  const [roomType, setRoomType] = useState<string>('Normal');

  // Match Resolution Inputs (Host Panel)
  const [resolveMatch, setResolveMatch] = useState<any>(null);
  const [playerScores, setPlayerScores] = useState<any[]>([]); // [{ uid, name, kills, rank }]
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [roomPassInput, setRoomPassInput] = useState<string>('');

  // Host Creator Inputs (Admin Panel)
  const [hostName, setHostName] = useState<string>('');
  const [hostPhone, setHostPhone] = useState<string>('');
  const [hostPassword, setHostPassword] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const clanChatEndRef = useRef<HTMLDivElement>(null);

  // Initialize and check token
  useEffect(() => {
    const localToken = localStorage.getItem('token');
    if (localToken) {
      setToken(localToken);
      fetchProfile(localToken);
    } else {
      setLoading(false);
    }
    fetchTournaments();

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('SW Registered successfully!', reg.scope);
        }).catch(err => {
          console.log('SW Registration failed:', err);
        });
      });
    }
  }, []);

  // Fetch lists based on active tab
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'tournaments') fetchTournaments();
    if (activeTab === 'leaderboard') fetchClans();
    if (activeTab === 'wallet') fetchWalletLogs();
    if (activeTab === 'clans') fetchClanChat();
    if (activeTab === 'chat') fetchGlobalChat();
    if (activeTab === 'host') fetchHostMatches();
    if (activeTab === 'admin') fetchAdminDashboard();
  }, [activeTab, token]);

  // Scroll to bottom on chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    clanChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clanChatHistory]);

  // Network helpers
  const getHeaders = (customToken?: string) => ({
    'Content-Type': 'application/json',
    'x-auth-token': customToken || token || ''
  });

  const fetchProfile = async (tk: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders(tk) });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setFfName(data.ffName || '');
        setFfUid(data.ffUid || '');
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const res = await fetch(`${API_URL}/tournaments`);
      const data = await res.json();
      if (res.ok) setTournaments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClans = async () => {
    try {
      const res = await fetch(`${API_URL}/clans/ranking`);
      const data = await res.json();
      if (res.ok) setClans(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWalletLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
      const profile = await res.json();
      if (res.ok) setUser(profile);

      // We populate wallet histories via auth me details or transactions API
      const txRes = await fetch(`${API_URL}/admin/deposits`, { headers: getHeaders() });
      if (txRes.ok) {
        const txData = await txRes.json();
        // filter user's transactions
        setTransactions(txData.filter((t: any) => t.user?._id === user?.id || t.user === user?.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGlobalChat = async () => {
    // We can fetch room chats using a mock endpoint or load tournament 0 as lobby
    try {
      const res = await fetch(`${API_URL}/tournaments/lobby/chat`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (err) {
      // Use fallback fake data if lobby chat does not exist yet
      setChatHistory([
        { senderName: 'System', message: 'Welcome to FragArena Global Chat Arena!', date: new Date() }
      ]);
    }
  };

  const fetchClanChat = async () => {
    if (!user?.clan) return;
    const cid = user.clan._id || user.clan;
    try {
      const res = await fetch(`${API_URL}/clans/${cid}/chat`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setClanChatHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHostMatches = async () => {
    try {
      const res = await fetch(`${API_URL}/host/matches`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setHostMatches(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/earnings`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setAdminStats(data);
        setDepositLogs(data.transactions.filter((t: any) => t.type === 'deposit'));
      }

      const usersRes = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
      if (usersRes.ok) setUsersList(await usersRes.json());

      const wRes = await fetch(`${API_URL}/admin/withdrawals`, { headers: getHeaders() });
      if (wRes.ok) setPendingWithdrawals(await wRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Operations
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? 'register' : 'login';
    const body = isRegister 
      ? { username: usernameInput, phone: phoneInput, password: passwordInput }
      : { phone: phoneInput, password: passwordInput };

    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        fetchProfile(data.token);
      } else {
        alert(data.msg || 'Authentication failed');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Profile Operations
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ffName, ffUid })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setIsEditProfile(false);
        alert('Free Fire Profile Details updated!');
      } else {
        alert(data.msg || 'Could not update profile');
      }
    } catch (err) {
      alert('Update failed.');
    }
  };

  // Tournament operations
  const handleJoinMatch = async (matchId: string) => {
    try {
      const res = await fetch(`${API_URL}/tournaments/${matchId}/join`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        alert('Successfully registered and entry fee deducted!');
        fetchTournaments();
        fetchProfile(token || '');
      } else {
        alert(data.msg || 'Registration failed');
      }
    } catch (err) {
      alert('Connection error joining lobby.');
    }
  };

  // Wallet operations
  const handleDepositInit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/wallet/deposit/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: depositAmt })
      });
      const data = await res.json();
      if (res.ok) {
        setCfOrderId(data.orderId);
        setCfSession(data.paymentSessionId);
        setCfModal(true);
      } else {
        alert(data.msg || 'Order creation failed');
      }
    } catch (err) {
      alert('Network error.');
    }
  };

  const handleDepositComplete = async (isSuccess: boolean) => {
    try {
      const res = await fetch(`${API_URL}/wallet/deposit/verify`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ orderId: cfOrderId, isSimulatedSuccess: isSuccess })
      });
      const data = await res.json();
      if (res.ok) {
        alert(isSuccess ? 'Coins credited successfully!' : 'Deposit verification cancelled.');
        setCfModal(false);
        fetchWalletLogs();
      } else {
        alert(data.msg || 'Verification failed');
      }
    } catch (err) {
      alert('Verification network issue.');
    }
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/wallet/withdraw/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: withdrawAmt, upiId: withdrawUpi })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Withdrawal request submitted for Admin Approval.');
        setWithdrawAmt('');
        setWithdrawUpi('');
        fetchWalletLogs();
      } else {
        alert(data.msg || 'Withdrawal request failed');
      }
    } catch (err) {
      alert('Transaction error.');
    }
  };

  // Clan operations
  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/clans/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: clanName, tag: clanTag })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Clan established successfully!');
        setClanName('');
        setClanTag('');
        fetchProfile(token || '');
      } else {
        alert(data.msg || 'Failed to create clan');
      }
    } catch (err) {
      alert('Network failure creating clan.');
    }
  };

  const handleJoinClan = async (clanId: string) => {
    try {
      const res = await fetch(`${API_URL}/clans/join`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ clanId })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Welcome to your new Clan!');
        fetchProfile(token || '');
      } else {
        alert(data.msg || 'Could not join clan');
      }
    } catch (err) {
      alert('Network failure joining clan.');
    }
  };

  // Host operations
  const handlePublishRoom = async (matchId: string) => {
    try {
      const res = await fetch(`${API_URL}/host/match/${matchId}/room`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ roomId: roomIdInput, roomPass: roomPassInput })
      });
      if (res.ok) {
        alert('Room credentials published to all registered players!');
        setRoomIdInput('');
        setRoomPassInput('');
        fetchHostMatches();
      } else {
        alert('Failed to publish credentials.');
      }
    } catch (err) {
      alert('Network error publishing credentials.');
    }
  };

  const handleResolveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/host/match/${resolveMatch._id}/resolve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ playerResults: playerScores })
      });
      if (res.ok) {
        alert('Match standings resolved and coins automatically credited!');
        setResolveMatch(null);
        setPlayerScores([]);
        fetchHostMatches();
      } else {
        alert('Failed to resolve match payouts.');
      }
    } catch (err) {
      alert('Resolution error.');
    }
  };

  // Admin operations
  const handleCreateHost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/hosts/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username: hostName, phone: hostPhone, password: hostPassword })
      });
      if (res.ok) {
        alert('New Host Profile Created successfully!');
        setHostName('');
        setHostPhone('');
        setHostPassword('');
        fetchAdminDashboard();
      } else {
        alert('Could not seed Host profile.');
      }
    } catch (err) {
      alert('Admin network request failed.');
    }
  };

  const handleResolveWithdrawal = async (withdrawId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${API_URL}/admin/withdrawals/${withdrawId}/resolve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`Withdrawal request successfully ${action}d!`);
        fetchAdminDashboard();
      } else {
        alert('Could not resolve request.');
      }
    } catch (err) {
      alert('Network error resolving request.');
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const settings = {
      skills: skillsOn,
      attributes: attrsOn,
      bodyShot,
      weapons: weaponsMode,
      ammo: ammoMode,
      roomType
    };

    try {
      const res = await fetch(`${API_URL}/admin/tournaments/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: matchTitle,
          category: matchCategory,
          date: matchDate,
          time: matchTime,
          entryFee: matchEntry,
          prizePool: matchPrize,
          perKill: matchKill,
          totalSlots: matchSlots,
          hostId: matchHost,
          settings
        })
      });
      if (res.ok) {
        alert('Lobby launched successfully!');
        setMatchTitle('');
        setMatchDate('');
        setMatchTime('');
        fetchTournaments();
      } else {
        alert('Lobby creation failed.');
      }
    } catch (err) {
      alert('Error launching lobby.');
    }
  };

  // Helper template config
  const applyPreset = (preset: string) => {
    if (preset === 'LW 1v1') {
      setMatchTitle('LONE WOLF 1V1 CLASH');
      setMatchCategory('Lone Wolf 1v1');
      setMatchSlots(2);
      setMatchEntry(15);
      setMatchPrize(25);
      setMatchKill(0);
    } else if (preset === 'CS 4v4') {
      setMatchTitle('CLASH SQUAD 4V4 SHOWDOWN');
      setMatchCategory('Clash Squad 4v4');
      setMatchSlots(8);
      setMatchEntry(20);
      setMatchPrize(140);
      setMatchKill(0);
    } else if (preset === 'BR Squad') {
      setMatchTitle('BATTLE ROYALE SQUAD LOBBY');
      setMatchCategory('Battle Royale Squad');
      setMatchSlots(48);
      setMatchEntry(10);
      setMatchPrize(250);
      setMatchKill(5);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-darkBg text-neonRed font-orbitron">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 animate-spin text-5xl" />
          <h1 className="text-xl tracking-widest glow-text-red">LOADING FRAGARENA LOBBIES...</h1>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-darkBg px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-xl p-8 glass-panel border border-neonRed/20"
        >
          <div className="text-center mb-8">
            <Trophy className="mx-auto text-goldGlow text-5xl animate-bounce mb-3" />
            <h1 className="text-3xl font-bold tracking-widest font-orbitron text-white">FRAGARENA</h1>
            <p className="text-sm font-rajdhani text-neonRed font-semibold tracking-wider uppercase mt-1">Play. Fight. Conquer.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1 tracking-wider">Username</label>
                <input 
                  type="text" 
                  value={usernameInput} 
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:outline-none focus:border-neonRed" 
                  placeholder="e.g. warrior_ff"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1 tracking-wider">Phone Number</label>
              <input 
                type="tel" 
                value={phoneInput} 
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:outline-none focus:border-neonRed" 
                placeholder="7017022966"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1 tracking-wider">Password</label>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2.5 text-white focus:outline-none focus:border-neonRed" 
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="w-full py-3 rounded btn-neon-red font-orbitron tracking-widest text-sm font-bold uppercase text-white">
              {isRegister ? 'JOIN ARENA' : 'AUTHENTICATE'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            {isRegister ? 'Already registered?' : 'New to FragArena?'} {' '}
            <span 
              onClick={() => setIsRegister(!isRegister)} 
              className="text-neonRed cursor-pointer hover:underline font-semibold"
            >
              {isRegister ? 'Login here' : 'Create an Account'}
            </span>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100 pb-20 md:pb-0">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-darkBg/90 border-b border-slate-800 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="text-goldGlow text-2xl animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-widest font-orbitron text-white">FRAGARENA</h1>
            <p className="text-[10px] font-rajdhani text-neonRed font-semibold tracking-widest uppercase">PLAY. FIGHT. CONQUER.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-xs">
            <User className="text-slate-400 w-3.5 h-3.5" />
            <span className="font-semibold text-slate-300">{user?.username}</span>
            <span className="px-1.5 py-0.5 rounded bg-neonRed/10 text-neonRed text-[9px] uppercase font-bold">{user?.role}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-3 py-1">
            <Coins className="text-goldGlow w-4 h-4" />
            <span className="font-orbitron font-semibold text-goldGlow text-xs">₹{(user?.coins + user?.winnings || 0).toFixed(2)}</span>
          </div>

          <button onClick={logout} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 gap-4">
        {/* DESKTOP SIDE NAVIGATION */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 gap-2">
          <div className="rounded-xl p-4 glass-panel border border-slate-800 text-center mb-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-neonRed to-goldGlow p-0.5 mb-2">
              <div className="w-full h-full rounded-full bg-darkBg flex items-center justify-center">
                <User className="text-slate-400 w-8 h-8" />
              </div>
            </div>
            <h4 className="font-bold text-sm tracking-wide text-white">{user?.username}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Character UID: {user?.ffUid || 'Not Set'}</p>
            <button 
              onClick={() => setIsEditProfile(true)} 
              className="mt-3 text-[10px] font-bold text-neonRed uppercase tracking-wider hover:underline"
            >
              Configure Profile
            </button>
          </div>

          <button 
            onClick={() => setActiveTab('tournaments')} 
            className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'tournaments' ? 'bg-neonRed text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Trophy className="w-4 h-4" /> Tournaments
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')} 
            className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'leaderboard' ? 'bg-neonRed text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Flame className="w-4 h-4" /> Clan Leaderboard
          </button>
          <button 
            onClick={() => setActiveTab('wallet')} 
            className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'wallet' ? 'bg-neonRed text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Wallet className="w-4 h-4" /> Wallet Operations
          </button>
          <button 
            onClick={() => setActiveTab('clans')} 
            className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'clans' ? 'bg-neonRed text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Users className="w-4 h-4" /> Clan Domain
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'chat' ? 'bg-neonRed text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <MessageSquare className="w-4 h-4" /> Chat Lobby
          </button>

          {(user?.role === 'host' || user?.role === 'admin') && (
            <button 
              onClick={() => setActiveTab('host')} 
              className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'host' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <UserCheck className="w-4 h-4" /> Host Console
            </button>
          )}

          {user?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')} 
              className={`w-full py-2.5 px-4 rounded text-left font-orbitron tracking-wide text-xs uppercase flex items-center gap-3 transition ${activeTab === 'admin' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Shield className="w-4 h-4" /> Admin Console
            </button>
          )}
        </aside>

        {/* MAIN DISPLAY CONTAINER */}
        <main className="flex-1 min-w-0 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 md:p-6 overflow-y-auto max-h-[85vh]">
          {/* TAB 1: TOURNAMENTS */}
          {activeTab === 'tournaments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-wide font-orbitron text-white">UPCOMING MATCH LOBBIES</h2>
                  <p className="text-xs text-slate-400">Join active custom rooms, declare results, and earn commissions.</p>
                </div>
                <button 
                  onClick={fetchTournaments} 
                  className="p-2 rounded hover:bg-slate-800 text-slate-400 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {tournaments.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Trophy className="mx-auto w-12 h-12 text-slate-600 mb-3" />
                  <p className="font-semibold text-sm">No lobbies configured by Admin yet.</p>
                  <p className="text-xs mt-1">Lobbies will appear here as soon as they are launched.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tournaments.map((m) => {
                    const slotsJoined = m.joinedPlayers.length;
                    const isFull = slotsJoined >= m.totalSlots;
                    
                    return (
                      <motion.div 
                        key={m._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-lg p-4 glass-panel border border-slate-800 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="px-2 py-0.5 rounded bg-neonRed/10 text-neonRed text-[9px] uppercase font-bold tracking-wider">{m.category}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{m.date} | {m.time}</span>
                          </div>

                          <h3 className="font-bold text-sm tracking-wide text-white mb-2">{m.title}</h3>
                          
                          {/* Match specs grid */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded border border-slate-800 mb-3 text-center">
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-slate-500">Entry Fee</span>
                              <span className="font-orbitron text-xs text-white font-semibold">₹{m.entryFee}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-slate-500">Win Pool</span>
                              <span className="font-orbitron text-xs text-goldGlow font-semibold">₹{m.prizePool}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-slate-500">Per Kill</span>
                              <span className="font-orbitron text-xs text-cyan-400 font-semibold">₹{m.perKill || 0}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 mb-4 bg-slate-950/20 p-2 rounded">
                            <span>🔋 Skills: <strong>{m.settings?.skills ? 'ON' : 'OFF'}</strong></span>
                            <span>⚔️ Gun Attrs: <strong>{m.settings?.attributes ? 'ON' : 'OFF'}</strong></span>
                            <span>🎯 Body Shots: <strong>{m.settings?.bodyShot}</strong></span>
                            <span>🔫 Gun Limit: <strong>{m.settings?.weapons}</strong></span>
                          </div>
                        </div>

                        <div>
                          {/* Slot meter */}
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Lobby Capacity:</span>
                            <span className="font-bold text-slate-200">{slotsJoined} / {m.totalSlots} Slots</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 mb-4 overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${isFull ? 'bg-neonRed' : 'bg-gradient-to-r from-neonRed to-goldGlow'}`}
                              style={{ width: `${(slotsJoined / m.totalSlots) * 100}%` }}
                            />
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedMatch(m)}
                              className="flex-1 py-1.5 rounded border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                            >
                              Details
                            </button>
                            <button 
                              onClick={() => handleJoinMatch(m._id)}
                              disabled={isFull || m.status !== 'upcoming'}
                              className={`flex-1 py-1.5 rounded text-xs font-bold font-orbitron uppercase tracking-widest text-white transition ${isFull || m.status !== 'upcoming' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'btn-neon-red'}`}
                            >
                              {isFull ? 'Lobby Full' : m.status !== 'upcoming' ? 'Closed' : 'Register'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div>
              <h2 className="text-xl font-bold tracking-wide font-orbitron text-white mb-2">CLAN DOMINATION LEADERBOARD</h2>
              <p className="text-xs text-slate-400 mb-6">Dominate custom matches with your clan and claim the top ranking points.</p>

              <div className="glass-panel border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 font-orbitron tracking-wider text-[10px] text-slate-400">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Clan Name</th>
                      <th className="p-3">Clan Tag</th>
                      <th className="p-3">Clan Leader</th>
                      <th className="p-3 text-right">Domination Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No clans registered yet. Be the first to establish a clan!
                        </td>
                      </tr>
                    ) : (
                      clans.map((c, i) => (
                        <tr key={c._id} className="border-b border-slate-800/40 hover:bg-slate-800/10">
                          <td className="p-3 font-orbitron font-semibold">
                            {i === 0 ? '🏆 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : `${i + 1}`}
                          </td>
                          <td className="p-3 font-semibold text-white">{c.name}</td>
                          <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-goldGlow/10 text-goldGlow text-[9px] uppercase font-bold">{c.tag}</span></td>
                          <td className="p-3 text-slate-300">{c.leader?.username}</td>
                          <td className="p-3 text-right font-orbitron text-cyan-400 font-bold">{c.points} XP</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: WALLET */}
          {activeTab === 'wallet' && (
            <div>
              <h2 className="text-xl font-bold tracking-wide font-orbitron text-white mb-2">WALLET GATEWAY</h2>
              <p className="text-xs text-slate-400 mb-6">Manage deposits, view transaction ledgers, and request instant withdrawals.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Deposit box */}
                <div className="rounded-lg p-5 glass-panel border border-slate-800">
                  <h3 className="font-bold text-sm tracking-wide text-white mb-1 flex items-center gap-2">
                    <Coins className="text-goldGlow" /> Deposit Wallet Coins
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">Cashfree payments verify automatically and credit your deposit balance.</p>

                  <form onSubmit={handleDepositInit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Enter Coins Amount (₹1 = 1 Coin)</label>
                      <input 
                        type="number" 
                        value={depositAmt} 
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder="e.g. 50" 
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-neonRed"
                        required
                      />
                    </div>
                    <button type="submit" className="w-full py-2 rounded btn-neon-gold text-xs font-bold uppercase tracking-wider text-black">
                      Initiate Payment Gateway
                    </button>
                  </form>
                </div>

                {/* Withdraw box */}
                <div className="rounded-lg p-5 glass-panel border border-slate-800">
                  <h3 className="font-bold text-sm tracking-wide text-white mb-1 flex items-center gap-2">
                    <Wallet className="text-neonRed" /> Withdraw Winning Wallet
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">Withdrawable Balance: <strong className="text-goldGlow font-orbitron text-xs">₹{(user?.winnings || 0).toFixed(2)}</strong>. Deposit coins cannot be withdrawn.</p>

                  <form onSubmit={handleWithdrawRequest} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Coins Amount</label>
                        <input 
                          type="number" 
                          value={withdrawAmt} 
                          onChange={(e) => setWithdrawAmt(e.target.value)}
                          placeholder="e.g. 100" 
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-neonRed"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">UPI address (VPA)</label>
                        <input 
                          type="text" 
                          value={withdrawUpi} 
                          onChange={(e) => setWithdrawUpi(e.target.value)}
                          placeholder="7017022966@ybl" 
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-neonRed"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 rounded btn-neon-red text-xs font-bold uppercase tracking-wider text-white">
                      Request UPI Withdrawal
                    </button>
                  </form>
                </div>
              </div>

              {/* Transactions list */}
              <div>
                <h3 className="font-bold text-sm tracking-wide text-white mb-3">Transaction History Ledger</h3>
                <div className="glass-panel border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400">
                      <tr>
                        <th className="p-3">Reference ID</th>
                        <th className="p-3">Transaction Type</th>
                        <th className="p-3">Details</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            No transactions recorded on this account yet.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr key={t._id} className="border-b border-slate-800/40">
                            <td className="p-3 text-[10px] font-mono">{t.cashfreeOrderId || t._id}</td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold ${t.type === 'deposit' || t.type === 'winning' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300">{t.detail}</td>
                            <td className="p-3 font-semibold text-white">₹{t.amount}</td>
                            <td className="p-3 text-right">
                              <span className={`font-bold ${t.status === 'success' ? 'text-green-400' : t.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLANS */}
          {activeTab === 'clans' && (
            <div>
              <h2 className="text-xl font-bold tracking-wide font-orbitron text-white mb-2">CLAN ARENA</h2>
              
              {!user?.clan ? (
                <div>
                  <p className="text-xs text-slate-400 mb-6">You do not belong to any clan yet. Create your own clan tag or join an existing crew.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create Clan */}
                    <div className="rounded-lg p-5 glass-panel border border-slate-800">
                      <h3 className="font-bold text-sm tracking-wide text-white mb-1">Establish New Clan</h3>
                      <p className="text-[11px] text-slate-400 mb-4">Establish your clan name and register a 4-6 letter clan tag.</p>

                      <form onSubmit={handleCreateClan} className="space-y-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Clan Name</label>
                          <input 
                            type="text" 
                            value={clanName} 
                            onChange={(e) => setClanName(e.target.value)}
                            placeholder="e.g. Soul Warriors" 
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-neonRed"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Clan Tag (Max 6 letters)</label>
                          <input 
                            type="text" 
                            value={clanTag} 
                            onChange={(e) => setClanTag(e.target.value)}
                            placeholder="e.g. SOUL" 
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-neonRed"
                            required
                          />
                        </div>
                        <button type="submit" className="w-full py-2 rounded btn-neon-red text-xs font-bold uppercase tracking-wider text-white">
                          Establish Clan Crew
                        </button>
                      </form>
                    </div>

                    {/* Join Clan instruction */}
                    <div className="rounded-lg p-5 glass-panel border border-slate-800 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm tracking-wide text-white mb-1">Join Clan Crew</h3>
                        <p className="text-[11px] text-slate-400 mb-4">Select an active clan tag from the Leaderboard tab and enter the Clan ID or submit a request to the leader.</p>
                        
                        <div className="bg-slate-950/60 p-4 rounded border border-slate-800 text-xs text-slate-400">
                          <AlertTriangle className="text-amber-500 w-4 h-4 inline-block mr-2" />
                          To join a clan, you must copy the database ID from a clan or ask the leader to add you manually inside the clan network list.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Clan Details */}
                  <div className="lg:col-span-1 rounded-lg p-5 glass-panel border border-slate-800 flex flex-col justify-between h-[450px]">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-2 py-0.5 rounded bg-goldGlow/10 text-goldGlow text-[10px] uppercase font-bold tracking-wider">
                          CLAN MEMBER
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold font-orbitron text-white mb-1 tracking-wider">{user.clan.name || 'Your Clan'}</h3>
                      <span className="px-2 py-0.5 rounded bg-neonRed/10 text-neonRed text-[10px] uppercase font-bold tracking-widest">{user.clan.tag || 'TAG'}</span>
                      
                      <div className="mt-6 space-y-3 text-xs text-slate-400">
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-500">Leader</span>
                          <span className="text-slate-200 font-semibold">{user.username}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase tracking-wider text-slate-500">Domination Points</span>
                          <span className="text-goldGlow font-orbitron font-semibold">1,250 XP</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => alert('Feature coming soon: Clan exit and transfers.')}
                      className="w-full py-2 rounded border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/5 transition"
                    >
                      Leave Clan
                    </button>
                  </div>

                  {/* Clan Chat */}
                  <div className="lg:col-span-2 rounded-lg p-4 glass-panel border border-slate-800 flex flex-col justify-between h-[450px]">
                    <div>
                      <h3 className="font-bold text-sm tracking-wide text-white mb-1 flex items-center gap-2">
                        <MessageSquare className="text-neonRed" /> Clan Crew Chat
                      </h3>
                      <p className="text-[11px] text-slate-400 mb-3">Live chat communication room shared with your clan members.</p>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded p-3 mb-4 overflow-y-auto space-y-3">
                      {clanChatHistory.length === 0 ? (
                        <div className="text-center text-slate-600 text-xs py-8">
                          No messages in clan lobby yet. Say Hello to your crew!
                        </div>
                      ) : (
                        clanChatHistory.map((c, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-bold text-goldGlow mr-1.5">{c.senderName}:</span>
                            <span className="text-slate-300">{c.message}</span>
                          </div>
                        ))
                      )}
                      <div ref={clanChatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!clanMessage.trim()) return;
                        try {
                          const cid = user.clan._id || user.clan;
                          const res = await fetch(`${API_URL}/clans/${cid}/chat`, {
                            method: 'POST',
                            headers: getHeaders(),
                            body: JSON.stringify({ message: clanMessage })
                          });
                          if (res.ok) {
                            setClanMessage('');
                            fetchClanChat();
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        type="text" 
                        value={clanMessage} 
                        onChange={(e) => setClanMessage(e.target.value)}
                        placeholder="Type message to clan crew..." 
                        className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neonRed"
                      />
                      <button type="submit" className="p-2 rounded btn-neon-red text-white">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GLOBAL CHAT */}
          {activeTab === 'chat' && (
            <div className="rounded-lg p-4 glass-panel border border-slate-800 flex flex-col justify-between h-[500px]">
              <div>
                <h2 className="text-xl font-bold tracking-wide font-orbitron text-white mb-1">WARRIORS GLOBAL CHAT</h2>
                <p className="text-xs text-slate-400 mb-4">Connect with Free Fire players, recruit members, and discuss room configurations.</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded p-4 mb-4 overflow-y-auto space-y-3">
                {chatHistory.map((c, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-bold text-neonRed mr-1.5">{c.senderName || 'Warrior'}:</span>
                    <span className="text-slate-300">{c.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!message.trim()) return;
                  try {
                    // Send to lobby chat endpoint
                    const res = await fetch(`${API_URL}/tournaments/lobby/chat`, {
                      method: 'POST',
                      headers: getHeaders(),
                      body: JSON.stringify({ message })
                    });
                    if (res.ok) {
                      setMessage('');
                      fetchGlobalChat();
                    }
                  } catch (err) {
                    // Local fallback push for instant simulator responsiveness
                    setChatHistory([...chatHistory, { senderName: user.username, message, date: new Date() }]);
                    setMessage('');
                  }
                }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type message details..." 
                  className="flex-1 bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-white focus:outline-none focus:border-neonRed"
                />
                <button type="submit" className="p-2.5 rounded btn-neon-red text-white flex items-center justify-center">
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: HOST CONSOLE */}
          {activeTab === 'host' && (
            <div>
              <h2 className="text-xl font-bold tracking-wide font-orbitron text-white mb-2">HOST MANAGER</h2>
              <p className="text-xs text-slate-400 mb-6">Manage assigned lobbies, release custom room credentials, and resolve scores.</p>

              {hostMatches.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No match lobbies currently assigned to your Host profile.
                </div>
              ) : (
                <div className="space-y-4">
                  {hostMatches.map((m) => (
                    <div key={m._id} className="rounded-lg p-5 glass-panel border border-slate-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-sm tracking-wide text-white">{m.title}</h3>
                          <span className="text-[10px] text-slate-400">{m.date} | {m.time} | Mode: {m.category}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold ${m.status === 'completed' ? 'bg-slate-800 text-slate-500' : 'bg-amber-500/10 text-amber-400'}`}>
                          {m.status}
                        </span>
                      </div>

                      {m.status === 'upcoming' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 bg-slate-950/40 p-4 rounded border border-slate-800">
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Custom Room ID</label>
                            <input 
                              type="text" 
                              value={roomIdInput} 
                              onChange={(e) => setRoomIdInput(e.target.value)}
                              placeholder="e.g. 1029384"
                              className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-xs text-white focus:outline-none focus:border-amber-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">Room Password</label>
                            <input 
                              type="text" 
                              value={roomPassInput} 
                              onChange={(e) => setRoomPassInput(e.target.value)}
                              placeholder="e.g. 9988"
                              className="w-full bg-slate-950 border border-slate-850 rounded p-1.5 text-xs text-white focus:outline-none focus:border-amber-600"
                            />
                          </div>
                          <button 
                            onClick={() => handlePublishRoom(m._id)}
                            className="md:col-span-2 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-xs font-bold uppercase tracking-wider text-white transition"
                          >
                            Release Room Credentials
                          </button>
                        </div>
                      )}

                      {m.status !== 'completed' && (
                        <button 
                          onClick={() => {
                            setResolveMatch(m);
                            // Pre-fill registered player score slots
                            setPlayerScores(m.joinedPlayers.map((p: any) => ({
                              uid: p.uid,
                              name: p.name,
                              kills: 0,
                              rank: 0
                            })));
                          }}
                          className="w-full py-1.5 rounded bg-green-600 hover:bg-green-700 text-xs font-bold uppercase tracking-wider text-white transition"
                        >
                          Resolve Standing Scores & Disburse Coins
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: ADMIN CONSOLE */}
          {activeTab === 'admin' && (
            <div>
              <h2 className="text-xl font-bold tracking-wide font-orbitron text-white mb-2">SUPER ADMIN CONTROL CENTER</h2>
              <p className="text-xs text-slate-400 mb-6">Track revenue, process host credentials, approve withdrawal request ledgers, and launch matches.</p>

              {/* Stats strips */}
              {adminStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 text-center">
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500">Today</span>
                    <span className="font-orbitron font-bold text-sm text-cyan-400">₹{adminStats.todayEarnings.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500">This Week</span>
                    <span className="font-orbitron font-bold text-sm text-cyan-400">₹{adminStats.weeklyEarnings.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500">This Month</span>
                    <span className="font-orbitron font-bold text-sm text-cyan-400">₹{adminStats.monthlyEarnings.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500">Lifetime</span>
                    <span className="font-orbitron font-bold text-sm text-goldGlow">₹{adminStats.lifetimeEarnings.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded col-span-2 md:col-span-1">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500">Total Users</span>
                    <span className="font-orbitron font-bold text-sm text-white">{adminStats.analytics?.totalUsers}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                {/* Launch Match */}
                <div className="rounded-lg p-5 glass-panel border border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-sm tracking-wide text-white">Configure & Launch Lobby</h3>
                    
                    {/* Presets */}
                    <div className="flex gap-1 text-[9px]">
                      <button onClick={() => applyPreset('LW 1v1')} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">LW 1v1</button>
                      <button onClick={() => applyPreset('CS 4v4')} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">CS 4v4</button>
                      <button onClick={() => applyPreset('BR Squad')} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">BR Squad</button>
                    </div>
                  </div>

                  <form onSubmit={handleCreateTournament} className="space-y-3">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Match Title</label>
                      <input type="text" value={matchTitle} onChange={(e) => setMatchTitle(e.target.value)} placeholder="e.g. LONE WOLF SHOWDOWN" className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-600" required />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Game Category</label>
                        <select value={matchCategory} onChange={(e) => setMatchCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none focus:border-indigo-600">
                          <option value="Lone Wolf 1v1">Lone Wolf 1v1</option>
                          <option value="Lone Wolf 2v2">Lone Wolf 2v2</option>
                          <option value="Clash Squad 1v1">Clash Squad 1v1</option>
                          <option value="Clash Squad 2v2">Clash Squad 2v2</option>
                          <option value="Clash Squad 4v4">Clash Squad 4v4</option>
                          <option value="Battle Royale Solo">Battle Royale Solo</option>
                          <option value="Battle Royale Duo">Battle Royale Duo</option>
                          <option value="Battle Royale Squad">Battle Royale Squad</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Assign Host ID</label>
                        <select value={matchHost} onChange={(e) => setMatchHost(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" required>
                          <option value="">-- Choose Host --</option>
                          {usersList.filter(u => u.role === 'host' || u.role === 'admin').map(h => (
                            <option key={h._id} value={h._id}>{h.username} ({h.role})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Lobby Slots</label>
                        <input type="number" value={matchSlots} onChange={(e) => setMatchSlots(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Entry Fee (Coins)</label>
                        <input type="number" value={matchEntry} onChange={(e) => setMatchEntry(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Winner Prize (Coins)</label>
                        <input type="number" value={matchPrize} onChange={(e) => setMatchPrize(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Per Kill Prize (Coins)</label>
                        <input type="number" value={matchKill} onChange={(e) => setMatchKill(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Date</label>
                        <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" required />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Time</label>
                        <input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white focus:outline-none" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-850">
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={skillsOn} onChange={(e) => setSkillsOn(e.target.checked)} /> Skills ON</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={attrsOn} onChange={(e) => setAttrsOn(e.target.checked)} /> Attributes ON</label>
                      <label className="flex items-center gap-1.5"><input type="checkbox" checked={ammoMode === 'Unlimited'} onChange={(e) => setAmmoMode(e.target.checked ? 'Unlimited' : 'Normal')} /> Unlimited Ammo</label>
                    </div>

                    <button type="submit" className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider text-white transition">
                      Launch Custom Match
                    </button>
                  </form>
                </div>

                {/* Create Host */}
                <div className="rounded-lg p-5 glass-panel border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-white mb-1">Register Host Profile</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Create verified host profiles to run custom rooms and verify results.</p>

                    <form onSubmit={handleCreateHost} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Host Username</label>
                        <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="e.g. host_harshit" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-600" required />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                        <input type="tel" value={hostPhone} onChange={(e) => setHostPhone(e.target.value)} placeholder="e.g. 7017022966" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-600" required />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Secret Password</label>
                        <input type="password" value={hostPassword} onChange={(e) => setHostPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-600" required />
                      </div>
                      <button type="submit" className="w-full py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-xs font-bold uppercase tracking-wider text-white transition">
                        Register Host
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Pending Withdrawals */}
              <div className="mb-6">
                <h3 className="font-bold text-sm tracking-wide text-white mb-3">Approve Pending UPI Withdrawals</h3>
                <div className="glass-panel border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400">
                      <tr>
                        <th className="p-3">Warrior</th>
                        <th className="p-3">UPI VPA</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500">
                            No pending withdrawal requests.
                          </td>
                        </tr>
                      ) : (
                        pendingWithdrawals.map((w) => (
                          <tr key={w._id} className="border-b border-slate-800/40">
                            <td className="p-3 font-semibold text-white">{w.user?.username} ({w.user?.phone})</td>
                            <td className="p-3 text-slate-300 font-mono">{w.upiId}</td>
                            <td className="p-3 font-orbitron font-semibold text-goldGlow">₹{w.amount}</td>
                            <td className="p-3 text-right flex justify-end gap-1.5">
                              <button onClick={() => handleResolveWithdrawal(w._id, 'approve')} className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-[10px] font-bold text-white transition">Approve</button>
                              <button onClick={() => handleResolveWithdrawal(w._id, 'reject')} className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-[10px] font-bold text-white transition">Reject</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deposit Logs */}
              <div>
                <h3 className="font-bold text-sm tracking-wide text-white mb-3">Successful Deposit Logs</h3>
                <div className="glass-panel border border-slate-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400">
                      <tr>
                        <th className="p-3">Warrior</th>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Method Details</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {depositLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500">
                            No successful deposits logs found.
                          </td>
                        </tr>
                      ) : (
                        depositLogs.map((d) => (
                          <tr key={d._id} className="border-b border-slate-800/40">
                            <td className="p-3 font-semibold text-white">{d.user?.username} ({d.user?.phone})</td>
                            <td className="p-3 text-slate-400 font-mono text-[10px]">{d.cashfreeOrderId}</td>
                            <td className="p-3 text-slate-300">{d.detail}</td>
                            <td className="p-3 text-right font-orbitron font-bold text-green-400">₹{d.amount}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-darkBg/95 border-t border-slate-800 flex items-center justify-around py-2">
        <button 
          onClick={() => setActiveTab('tournaments')} 
          className={`flex flex-col items-center gap-1 text-[9px] ${activeTab === 'tournaments' ? 'text-neonRed font-bold' : 'text-slate-400'}`}
        >
          <Trophy className="w-5 h-5" /> Tournaments
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')} 
          className={`flex flex-col items-center gap-1 text-[9px] ${activeTab === 'leaderboard' ? 'text-neonRed font-bold' : 'text-slate-400'}`}
        >
          <Flame className="w-5 h-5" /> Clans
        </button>
        <button 
          onClick={() => setActiveTab('wallet')} 
          className={`flex flex-col items-center gap-1 text-[9px] ${activeTab === 'wallet' ? 'text-neonRed font-bold' : 'text-slate-400'}`}
        >
          <Wallet className="w-5 h-5" /> Wallet
        </button>
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`flex flex-col items-center gap-1 text-[9px] ${activeTab === 'chat' ? 'text-neonRed font-bold' : 'text-slate-400'}`}
        >
          <MessageSquare className="w-5 h-5" /> Chat
        </button>
        {(user?.role === 'host' || user?.role === 'admin') && (
          <button 
            onClick={() => setActiveTab('host')} 
            className={`flex flex-col items-center gap-1 text-[9px] ${activeTab === 'host' ? 'text-amber-500 font-bold' : 'text-slate-400'}`}
          >
            <UserCheck className="w-5 h-5" /> Host
          </button>
        )}
        {user?.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`flex flex-col items-center gap-1 text-[9px] ${activeTab === 'admin' ? 'text-indigo-500 font-bold' : 'text-slate-400'}`}
          >
            <Shield className="w-5 h-5" /> Admin
          </button>
        )}
      </footer>

      {/* OVERLAY MODAL 1: EDIT PROFILE */}
      <AnimatePresence>
        {isEditProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-lg p-6 glass-panel border border-slate-800"
            >
              <h3 className="font-bold text-sm tracking-wide text-white mb-2">Configure Gamer Account</h3>
              <p className="text-xs text-slate-400 mb-4">Set your Free Fire IGN and character UID. Required to register for lobbies.</p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Free Fire IGN (Name)</label>
                  <input 
                    type="text" 
                    value={ffName} 
                    onChange={(e) => setFfName(e.target.value)} 
                    placeholder="e.g. ⚔️SOUL_OP⚔️" 
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neonRed" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Character UID (Number)</label>
                  <input 
                    type="text" 
                    value={ffUid} 
                    onChange={(e) => setFfUid(e.target.value)} 
                    placeholder="e.g. 1029384857" 
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:border-neonRed" 
                    required 
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsEditProfile(false)}
                    className="flex-1 py-2 rounded border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-800/20"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2 rounded btn-neon-red text-xs font-bold uppercase tracking-wider text-white">
                    Save Config
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL 2: DETAIL DRAWER */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-md rounded-lg p-6 glass-panel border border-slate-800"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-0.5 rounded bg-goldGlow/10 text-goldGlow text-[9px] uppercase font-bold tracking-wider">{selectedMatch.category}</span>
                <button onClick={() => setSelectedMatch(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
              </div>

              <h3 className="text-lg font-bold font-orbitron text-white mb-2">{selectedMatch.title}</h3>
              <p className="text-xs text-slate-400 mb-4">{selectedMatch.date} at {selectedMatch.time}</p>

              {/* Lobby details specs */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-lg space-y-2 text-xs mb-4">
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-500">Skills Status:</span>
                  <span className="font-semibold text-white">{selectedMatch.settings?.skills ? 'Skills ON' : 'Skills OFF'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-500">Gun Attributes:</span>
                  <span className="font-semibold text-white">{selectedMatch.settings?.attributes ? 'Attributes ON' : 'Attributes OFF'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-500">Body Shots:</span>
                  <span className="font-semibold text-white">{selectedMatch.settings?.bodyShot}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-500">Weapons Mode:</span>
                  <span className="font-semibold text-white">{selectedMatch.settings?.weapons}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1">
                  <span className="text-slate-500">Ammo Limit:</span>
                  <span className="font-semibold text-white">{selectedMatch.settings?.ammo}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500">Custom Room ID:</span>
                  <span className="font-mono font-semibold text-cyan-400">
                    {selectedMatch.roomId ? (
                      <span className="flex items-center gap-1.5">
                        {selectedMatch.roomId} 
                        <Clipboard className="w-3 h-3 cursor-pointer text-slate-400" onClick={() => { navigator.clipboard.writeText(selectedMatch.roomId); alert('Room ID copied!'); }} />
                      </span>
                    ) : 'Released 10m before match'}
                  </span>
                </div>
              </div>

              {/* List of registered players */}
              <div className="mb-4">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Registered Roster ({selectedMatch.joinedPlayers.length})</span>
                <div className="bg-slate-950/20 max-h-[120px] overflow-y-auto rounded border border-slate-850 p-2 space-y-1">
                  {selectedMatch.joinedPlayers.length === 0 ? (
                    <div className="text-center text-[10px] text-slate-600 py-4">No players registered in lobby yet.</div>
                  ) : (
                    selectedMatch.joinedPlayers.map((p: any, idx: number) => (
                      <div key={idx} className="text-[10px] text-slate-300 flex justify-between">
                        <span>{idx+1}. {p.name || p.user?.username}</span>
                        <span className="font-mono text-slate-500">{p.uid || p.user?.ffUid}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 py-2 rounded border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-800/30"
                >
                  Close
                </button>
                <button 
                  onClick={() => { handleJoinMatch(selectedMatch._id); setSelectedMatch(null); }}
                  disabled={selectedMatch.joinedPlayers.length >= selectedMatch.totalSlots || selectedMatch.status !== 'upcoming'}
                  className="flex-1 py-2 rounded btn-neon-red text-xs font-bold uppercase tracking-wider text-white"
                >
                  Register (₹{selectedMatch.entryFee})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL 3: CASHFREE GATEWAY SIMULATOR */}
      <AnimatePresence>
        {cfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-lg p-6 glass-panel border border-slate-800 text-center"
            >
              <Trophy className="mx-auto text-goldGlow text-4xl mb-3 animate-spin" />
              <h3 className="font-bold text-sm tracking-wide text-white mb-1 font-orbitron">CASHFREE CHECKOUT GATEWAY</h3>
              <p className="text-[11px] text-slate-400 mb-4">Initiating Secure payment session for Order ID: <code className="text-slate-200">{cfOrderId}</code></p>

              {/* UPI Dynamic QR Code representation */}
              <div className="bg-white p-4 rounded-lg w-44 h-44 mx-auto mb-4 border-2 border-goldGlow flex items-center justify-center shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=7017022966@ibl%26pn=FragArena%26am=${depositAmt}%26cu=INR`} 
                  alt="UPI QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded text-xs text-slate-400 mb-5">
                Scan using any UPI App (GPay, Paytm, PhonePe) to complete the transaction of <strong className="text-goldGlow font-orbitron">₹{depositAmt}</strong>.
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleDepositComplete(false)}
                  className="flex-1 py-2 rounded border border-red-500/20 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/5 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDepositComplete(true)}
                  className="flex-1 py-2 rounded btn-neon-gold text-xs font-bold uppercase tracking-wider text-black transition"
                >
                  I Have Paid
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL 4: MATCH RESOLUTION (HOST PANEL) */}
      <AnimatePresence>
        {resolveMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg rounded-lg p-6 glass-panel border border-slate-800"
            >
              <h3 className="font-bold text-sm tracking-wide text-white mb-1 font-orbitron">Resolve Match Standings</h3>
              <p className="text-xs text-slate-400 mb-4">{resolveMatch.title} | Set ranks and kills for joined players.</p>

              <form onSubmit={handleResolveMatch} className="space-y-4">
                <div className="space-y-2 max-h-[250px] overflow-y-auto bg-slate-950/60 rounded border border-slate-850 p-3">
                  {playerScores.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 items-center text-xs border-b border-slate-800/50 pb-2">
                      <span className="font-semibold text-slate-300 truncate">{p.name}</span>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-500 uppercase">Kills</span>
                        <input 
                          type="number" 
                          value={p.kills} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const updated = [...playerScores];
                            updated[idx].kills = val;
                            setPlayerScores(updated);
                          }}
                          className="w-12 bg-slate-900 border border-slate-750 text-white rounded p-1 text-center" 
                          required
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-500 uppercase">Rank</span>
                        <input 
                          type="number" 
                          value={p.rank} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const updated = [...playerScores];
                            updated[idx].rank = val;
                            setPlayerScores(updated);
                          }}
                          className="w-12 bg-slate-900 border border-slate-750 text-white rounded p-1 text-center" 
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setResolveMatch(null)}
                    className="flex-1 py-2 rounded border border-slate-800 text-xs font-semibold text-slate-400 hover:bg-slate-850"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-xs font-bold uppercase tracking-wider text-white transition">
                    Resolve Payouts
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
