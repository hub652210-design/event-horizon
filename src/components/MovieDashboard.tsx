import React, { useEffect, useState, useMemo } from 'react';
import { 
  Film, 
  Tv, 
  Search, 
  Sparkles, 
  Plus, 
  Check, 
  Star, 
  Clock, 
  RotateCcw, 
  X, 
  Play, 
  ChevronRight, 
  Bookmark, 
  Eye, 
  SlidersHorizontal,
  BookmarkCheck,
  TrendingUp,
  Award,
  Video,
  Database,
  Send,
  UserCheck,
  Compass,
  ArrowRight,
  LogOut,
  Sliders,
  Sparkle,
  Dna,
  History,
  Volume2,
  VolumeX,
  Orbit
} from 'lucide-react';
import { Movie, TrackedItem, TrackStatus } from '../types';
import { useAuth } from '../lib/FirebaseProvider';
import TrackingBoard from './TrackingBoard';
import { cinematicAudio } from '../lib/cinematicAudio';
import { motion, AnimatePresence } from 'motion/react';

interface MovieDashboardProps {
  movies: Movie[];
  onReplayIntro: () => void;
}

export default function MovieDashboard({ movies, onReplayIntro }: MovieDashboardProps) {
  const { 
    user, 
    isGuest, 
    trackedItems, 
    preferences, 
    trackItem, 
    updateTrackItem, 
    untrackItem, 
    savePreferences, 
    logout 
  } = useAuth();

  // Application Data States
  const [allMovies, setAllMovies] = useState<Movie[]>(movies);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'board' | 'movies' | 'tv' | 'assistant' | 'dna' | 'wrapped'>('all');
  const [isMuted, setIsMuted] = useState(cinematicAudio.getMuteStatus());
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  
  // Setup dynamic audio auto-playing on mount
  useEffect(() => {
    cinematicAudio.forceStart();
    setIsMuted(cinematicAudio.getMuteStatus());
  }, []);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    cinematicAudio.setMuted(nextMute);
    setIsMuted(nextMute);
  };
  
  // Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatLogs, setChatLogs] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    { sender: 'ai', text: 'Greetings, commander. I am CineOrbit AI, your personal galactic film coordinator. Ask me to discover rare, mind-bending masterpieces, suggest watchlists, or analyze your Cinema DNA vectors.', time: '00:00' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Mood Discovery States
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [moodRecommendations, setMoodRecommendations] = useState<Array<{ title: string; year: number; reason: string; matchPercentage: number }>>([]);
  const [isMoodLoading, setIsMoodLoading] = useState(false);

  // Detail Modal view
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);

  // Extra feedback metrics for Auto-Save Detail Inputs
  const [localUserRating, setLocalUserRating] = useState<number>(8);
  const [localReview, setLocalReview] = useState('');
  const [localSeason, setLocalSeason] = useState(1);
  const [localEpisode, setLocalEpisode] = useState(1);

  // Dynamically mute background drone during film trailers so we play the "given film's audio/video"
  useEffect(() => {
    if (showTrailer) {
      cinematicAudio.setMuted(true);
    } else {
      cinematicAudio.setMuted(isMuted);
    }
  }, [showTrailer, isMuted]);

  // Synchronize internal catalog when movies prop updates
  useEffect(() => {
    if (movies && movies.length > 0) {
      setAllMovies(movies);
    }
  }, [movies]);

  // Extract genre lists dynamically
  const genresList = useMemo(() => {
    const genres = new Set<string>();
    genres.add('All');
    allMovies.forEach(m => {
      m.genres.forEach(g => genres.add(g));
    });
    return Array.from(genres);
  }, [allMovies]);

  // Sync details from DB is selected movie changes
  useEffect(() => {
    if (!selectedMovie) return;

    // Fetch extra trailer keys
    let active = true;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/movies/${selectedMovie.id}/details`);
        if (res.ok) {
          const details = await res.json();
          if (active) {
            setSelectedMovie(prev => {
              if (prev && prev.id === selectedMovie.id) {
                return {
                  ...prev,
                  trailer: details.trailer || prev.trailer,
                  stars: details.stars || prev.stars
                };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error('Error fetching film trailers:', err);
      }
    };
    fetchDetails();

    // Map matched items inputs
    const trackedRecord = trackedItems.find(item => item.itemId === selectedMovie.id);
    if (trackedRecord) {
      setLocalUserRating(trackedRecord.userRating || 8);
      setLocalReview(trackedRecord.review || trackedRecord.notes || '');
      setLocalSeason(trackedRecord.seasonProgress || 1);
      setLocalEpisode(trackedRecord.episodeProgress || 1);
    } else {
      setLocalUserRating(8);
      setLocalReview('');
      setLocalSeason(1);
      setLocalEpisode(1);
    }

    return () => { active = false; };
  }, [selectedMovie?.id, trackedItems]);

  // Dynamic Query searching linking TMDB
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setAllMovies(movies);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/movies/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const results = await response.json();
          setAllMovies(results);
        }
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, movies]);

  // Fast-trigger instant DB tracks
  const handleToggleTrack = async (movie: Movie, targetStatus: TrackStatus) => {
    const existing = trackedItems.find(i => i.itemId === movie.id);
    if (existing && existing.status === targetStatus) {
      // Toggle untrack if already matching status
      await untrackItem(movie.id);
    } else {
      await trackItem({
        itemId: movie.id,
        title: movie.title,
        type: movie.type,
        status: targetStatus,
        userRating: 8,
        review: '',
        seasonProgress: 1,
        episodeProgress: 1,
        // Extra fallback fields for robust lookup
        poster: movie.poster,
        year: movie.year,
        genres: movie.genres || [],
        description: movie.description || '',
        rating: movie.rating || 0,
        backdrop: movie.backdrop || '',
        trailer: movie.trailer || ''
      } as any);
    }
  };

  // Direct select status selection save (avoids destructive untrack on status click)
  const handleSelectStatus = async (movie: Movie, targetStatus: TrackStatus) => {
    const existing = trackedItems.find(i => i.itemId === movie.id);
    if (existing) {
      if (existing.status === targetStatus) {
        // Toggle untrack if clicking the same status
        await untrackItem(movie.id);
      } else {
        await updateTrackItem(movie.id, { status: targetStatus });
      }
    } else {
      await trackItem({
        itemId: movie.id,
        title: movie.title,
        type: movie.type,
        status: targetStatus,
        userRating: 8,
        review: '',
        seasonProgress: 1,
        episodeProgress: 1,
        // Extra fallback fields for robust lookup
        poster: movie.poster,
        year: movie.year,
        genres: movie.genres || [],
        description: movie.description || '',
        rating: movie.rating || 0,
        backdrop: movie.backdrop || '',
        trailer: movie.trailer || ''
      } as any);
    }
  };

  // Chat Trigger
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userPrompt = chatInput;
    setChatInput('');
    
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedChats = [...chatLogs, { sender: 'user' as const, text: userPrompt, time: formattedTime }];
    setChatLogs(updatedChats);
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userPrompt, history: updatedChats })
      });
      if (response.ok) {
        const result = await response.json();
        setChatLogs(prev => [...prev, {
          sender: 'ai',
          text: result.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        throw new Error('API server down');
      }
    } catch (e) {
      setChatLogs(prev => [...prev, {
        sender: 'ai',
        text: 'A minor solar weather storm blockaded my communication relay node. Please send that beacon query again, commander!',
        time: formattedTime
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Mood Discovery recommendation trigger
  const handleSelectMood = async (moodId: string) => {
    setActiveMood(moodId);
    setIsMoodLoading(true);
    setMoodRecommendations([]);
    try {
      const response = await fetch('/api/discovery/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: moodId })
      });
      if (response.ok) {
        const data = await response.json();
        setMoodRecommendations(data.recommendations || []);
      }
    } catch (e) {
      console.error('Mood discovery failed:', e);
    } finally {
      setIsMoodLoading(false);
    }
  };

  // Instant details Auto-Save handler
  const handleAutoSaveField = async (fields: Partial<TrackedItem>) => {
    if (!selectedMovie) return;
    const existing = trackedItems.some(i => i.itemId === selectedMovie.id);
    if (!existing) {
      // Must track it first
      await trackItem({
        itemId: selectedMovie.id,
        title: selectedMovie.title,
        type: selectedMovie.type,
        status: 'watching',
        userRating: fields.userRating || 8,
        review: fields.review || '',
        seasonProgress: fields.seasonProgress || 1,
        episodeProgress: fields.episodeProgress || 1
      });
    } else {
      await updateTrackItem(selectedMovie.id, fields);
    }
  };

  // Calculated Analytics DNA variables
  const dnaStats = useMemo(() => {
    const watched = trackedItems.filter(i => i.status === 'watched');
    const watching = trackedItems.filter(i => i.status === 'watching');
    const planToWatch = trackedItems.filter(i => i.status === 'plan_to_watch');

    // Genre count mapping
    const genreMap: Record<string, number> = {};
    watched.forEach(w => {
      const associatedMovie = allMovies.find(m => m.id === w.itemId);
      if (associatedMovie) {
        associatedMovie.genres.forEach(g => {
          genreMap[g] = (genreMap[g] || 0) + 1;
        });
      }
    });

    let topGenre = 'Sci-Fi';
    let maxCount = 0;
    Object.entries(genreMap).forEach(([g, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topGenre = g;
      }
    });

    // Profile aura vibe selection
    let vibeBadge = '🎬 Classic Cinephile';
    if (topGenre === 'Sci-Fi') vibeBadge = '🚀 Sci-Fi Void Explorer';
    else if (topGenre === 'Action') vibeBadge = '⚡ Cosmic Heat Addict';
    else if (topGenre === 'Drama') vibeBadge = '🎭 Atmospheric Philosopher';
    else if (topGenre === 'Crime' || topGenre === 'Mystery') vibeBadge = '🕵️ Quantum Mystery Detective';
    else if (topGenre === 'Horror') vibeBadge = '👻 Dark Horizon Specter';

    // Calculate completed hours
    const estimatedMinutes = watched.length * 132 + watching.length * 45;
    const computedHours = Math.round(estimatedMinutes / 60);

    const averageRating = watched.length > 0
      ? parseFloat((watched.reduce((acc, current) => acc + (current.userRating || 8), 0) / watched.length).toFixed(1))
      : 8.8;

    // Achievements evaluation list
    const achievementsList = [
      { id: 'a1', title: 'First Contact Logged', desc: 'Securely logged first cosmic tracking star', unlocked: trackedItems.length >= 1 },
      { id: 'a2', title: 'Multiverse Specialist', desc: 'Syncing watchlists containing 5+ entries', unlocked: trackedItems.length >= 5 },
      { id: 'a3', title: 'Celestial Watcher Master', desc: 'Reached 10 records synced under other devices', unlocked: trackedItems.length >= 10 },
      { id: 'a4', title: 'Perfect Symmetry Score', desc: 'Logged a perfect 10/10 star review', unlocked: trackedItems.some(i => i.userRating === 10) },
      { id: 'a5', title: 'Deep Space Negotiator', desc: 'Engaged AI chatbot logs regarding theater tips', unlocked: chatLogs.length >= 4 }
    ];

    return {
      watchedCount: watched.length,
      watchingCount: watching.length,
      planToWatchCount: planToWatch.length,
      vibeBadge,
      computedHours,
      averageRating,
      genreDistribution: Object.entries(genreMap).map(([name, val]) => ({ name, value: val })),
      achievements: achievementsList
    };
  }, [trackedItems, allMovies, chatLogs]);

  // Filtering catalogue movies
  const filteredMovies = useMemo(() => {
    return allMovies.filter(movie => {
      // Tab limits
      if (activeTab === 'movies' && movie.type !== 'movie') return false;
      if (activeTab === 'tv' && movie.type !== 'tv') return false;

      // Class genre
      if (selectedGenre !== 'All' && !movie.genres.includes(selectedGenre)) return false;

      return true;
    });
  }, [allMovies, activeTab, selectedGenre]);

  // Curated slider lists
  const sectionSliders = useMemo(() => {
    return {
      trendingMovies: filteredMovies.filter(m => m.category === 'trending_movies' || (m.type === 'movie' && m.rating >= 8.6)),
      popularMovies: filteredMovies.filter(m => m.category === 'popular_movies' || (m.type === 'movie' && m.rating < 8.6)),
      topRatedMovies: filteredMovies.filter(m => m.category === 'top_rated_movies'),
      trendingTv: filteredMovies.filter(m => m.category === 'trending_tv' || (m.type === 'tv' && m.rating >= 8.8)),
      popularTv: filteredMovies.filter(m => m.category === 'popular_tv' || (m.type === 'tv' && m.rating < 8.8)),
      topRatedTv: filteredMovies.filter(m => m.category === 'top_rated_tv'),
    };
  }, [filteredMovies]);

  // Highlight poster
  const featuredMovie = useMemo(() => {
    return allMovies.find(m => m.title === 'Interstellar') || allMovies[0] || movies[0];
  }, [allMovies, movies]);

  const welcomeName = preferences?.username || 'Member Space Cadet';

  return (
    <div id="cineorbit_dashboard_body" className="min-h-screen bg-[#020204] text-zinc-100 font-sans antialiased overflow-x-hidden relative">
      
      {/* Background celestial stars overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-amber-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-[80%] right-[5%] w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-[110px]" />
      </div>

      {/* NAVBAR */}
      <nav id="cineorbit_navbar" className="sticky top-0 z-40 bg-[#020204]/90 border-b border-zinc-900 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl flex items-center justify-center p-[1px] shadow-lg shadow-orange-500/10">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Orbit className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div>
              <span className="text-base font-light tracking-tight text-white uppercase block leading-none font-serif">
                CINE<span className="italic font-bold text-amber-400">ORBIT</span>
              </span>
              <span className="text-[8px] font-mono tracking-[0.4em] uppercase text-zinc-500 block mt-1">Galactic Cinema Grid</span>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="hidden md:flex items-center gap-6 text-[10px] font-mono text-zinc-400">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/40 border border-zinc-900">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>LOGGED DAYS: <strong className="text-white font-bold">{Math.round(dnaStats.computedHours / 2.3)}d</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/40 border border-zinc-900">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>EST SCORE: <strong className="text-white font-bold">{dnaStats.averageRating}★</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/40 border border-zinc-900">
              <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span>COSMOS: <strong className="text-white font-bold">{trackedItems.length} OBJECTS</strong></span>
            </div>
          </div>

          {/* Profile controls */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-zinc-400">Welcome,</p>
              <p className="text-xs font-bold text-zinc-200 truncate max-w-[120px]">{welcomeName}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
              title="Logout / Disconnect Server"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </nav>

      {/* SUB-TAB NAV SYSTEM */}
      <div className="border-b border-zinc-900 sticky top-20 z-30 bg-[#020204]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 md:gap-4 flex-nowrap">
            {(['all', 'board', 'movies', 'tv', 'assistant', 'dna', 'wrapped'] as const).map(tab => {
              const tabLabels: Record<string, string> = {
                all: 'Catalog',
                board: 'My Tracking Board',
                movies: 'Movies Only',
                tv: 'TV series',
                assistant: 'AI Coach Assistant',
                dna: 'Cinema DNA & Milestones',
                wrapped: 'Year In Review'
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap tracking-wider transition-all duration-300 relative cursor-pointer ${
                    activeTab === tab
                      ? 'bg-zinc-950 border border-amber-500/30 text-amber-500 shadow-md shadow-amber-500/5'
                      : 'text-zinc-550 border border-transparent hover:text-zinc-300'
                  }`}
                >
                  {tab === 'board' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping mr-1.5" />}
                  {tab === 'assistant' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-1.5" />}
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleMute}
              className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest transition cursor-pointer mr-3 ${
                !isMuted ? 'text-amber-500 font-bold' : 'text-zinc-550 hover:text-amber-450'
              }`}
              title={isMuted ? "Unmute Ambient sound drone" : "Mute Ambient sound drone"}
            >
              {!isMuted ? <Volume2 className="w-3.5 h-3.5 animate-bounce" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{!isMuted ? 'SOUNDS: ON' : 'SOUNDS: MUTEd'}</span>
            </button>

            <button
              onClick={onReplayIntro}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-zinc-550 hover:text-amber-500 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-zinc-550" />
              <span>REPLAY INTRO</span>
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD CONTENT CHANNELS */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 space-y-12">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: INTERACTIVE PERSONAL TRAJECTORY WATCH BOARD */}
          {activeTab === 'board' && (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <TrackingBoard 
                trackedItems={trackedItems}
                movieCatalog={allMovies}
                onSelectMovie={(m) => setSelectedMovie(m)}
                onUpdateStatus={async (itemId, status) => {
                  await updateTrackItem(itemId, { status });
                }}
                onUpdateFields={async (itemId, fields) => {
                  await updateTrackItem(itemId, fields);
                }}
                onUntrack={async (itemId) => {
                  await untrackItem(itemId);
                }}
              />
            </motion.div>
          )}

          {/* TAB 2: AI REVIEWS, COACH AND MOOD SELECTION DISCOVERY */}
          {activeTab === 'assistant' && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Mood Selection discovery */}
              <div className="lg:col-span-4 space-y-6 bg-zinc-950/60 border border-zinc-900 p-6 rounded-3xl backdrop-blur-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Compass className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '8s' }} />
                    <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-bold">Atmospheric Discovery</span>
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-snug">MOOD DISCOVERY ENGINE</h3>
                  <p className="text-xs text-zinc-500 leading-normal mt-1">Select your current spatial vibe cluster and CineOrbit will formulate matches directly from Gemini catalogs.</p>
                </div>

                {/* Mood Selectors */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'happy', label: '😊 Joyous & Laughs', color: 'hover:border-amber-400 hover:text-amber-400' },
                    { id: 'relaxed', label: '😌 Cozy & Chill', color: 'hover:border-emerald-450 hover:text-emerald-400' },
                    { id: 'mind-bending', label: '🤯 Infinity Loops', color: 'hover:border-indigo-400 hover:text-indigo-400' },
                    { id: 'romantic', label: '💖 Warm Romance', color: 'hover:border-rose-400 hover:text-rose-450' },
                    { id: 'horror', label: '👻 Nightmare Fears', color: 'hover:border-orange-500 hover:text-orange-500' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMood(m.id)}
                      className={`p-3.5 border rounded-xl text-xs font-mono text-left transition transition-all duration-300 transform active:scale-95 cursor-pointer ${
                        activeMood === m.id 
                          ? 'bg-amber-500/10 border-amber-500 text-amber-450' 
                          : 'bg-zinc-950/50 border-zinc-900 text-zinc-400 ' + m.color
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Recommendations matched */}
                <div className="border-t border-zinc-900 pt-5 space-y-4">
                  <h4 className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">MATChED FLUX FLUIDS</h4>
                  
                  {isMoodLoading ? (
                    <div className="flex flex-col items-center py-10">
                      <div className="w-8 h-8 rounded-full border-2 border-t-amber-500 border-zinc-800 animate-spin mb-4" />
                      <span className="text-[9px] font-mono tracking-widest text-zinc-650 uppercase animate-pulse">Consulting Gemini Cortex...</span>
                    </div>
                  ) : moodRecommendations.length > 0 ? (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-none">
                      {moodRecommendations.map((mr, idx) => (
                        <div key={idx} className="p-3 bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-850/60 rounded-xl transition duration-300">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-white line-clamp-1">{mr.title} <span className="text-[10px] text-zinc-550 font-normal">({mr.year})</span></h5>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded leading-none">
                              {mr.matchPercentage}%
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-450 leading-relaxed mt-1">{mr.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <Compass className="w-8 h-8 text-zinc-700 mx-auto stroke-1" />
                      <p className="text-[11px] text-zinc-550 mt-2 font-mono uppercase">Vibe matching scanner offline. Strike a mood filter above.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Chatbot assistant */}
              <div className="lg:col-span-8 bg-zinc-950/60 border border-zinc-900 rounded-3xl flex flex-col h-[520px] lg:h-[580px] backdrop-blur-lg overflow-hidden">
                <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">CINEMATIC AI OPERATING SYSTEM</h4>
                      <p className="text-[9px] font-mono tracking-widest text-emerald-450 uppercase">MODEL STATUS: ONLINE • GEMINI STREAM ACTIVE</p>
                    </div>
                  </div>
                  <Volume2 className="w-4 h-4 text-zinc-650" />
                </div>

                {/* Message display area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 pr-3 scrollbar-none">
                  {chatLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`flex gap-3 max-w-[85%] ${log.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-mono select-none ${
                        log.sender === 'user' ? 'bg-amber-400 text-black font-bold' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-550/20'
                      }`}>
                        {log.sender === 'user' ? 'U' : 'AI'}
                      </div>
                      <div>
                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          log.sender === 'user' 
                            ? 'bg-amber-400 text-black font-medium rounded-tr-none' 
                            : 'bg-zinc-900/60 text-zinc-200 border border-zinc-850/60 rounded-tl-none font-light'
                        }`}>
                          <p className="whitespace-pre-wrap">{log.text}</p>
                        </div>
                        <span className="block text-[8px] text-zinc-600 mt-1 font-mono text-right">{log.time}</span>
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-450 flex items-center justify-center animate-spin">
                        <Sparkle className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="p-3 bg-zinc-900/60 rounded-2xl rounded-tl-none border border-zinc-850 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                    placeholder="Describe what you want to watch or ask CineOrbit to analyze your history..."
                    className="flex-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-cyan-500 px-4 py-3 rounded-xl text-xs text-zinc-100 placeholder-zinc-550 focus:outline-none transition duration-300"
                  />
                  <button
                    onClick={handleSendChat}
                    className="p-3 bg-cyan-500 hover:bg-cyan-600 text-black hover:scale-105 active:scale-95 rounded-xl transition duration-200 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-black font-bold" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: CINEMA DNA, METRICS AND MILESTONES */}
          {activeTab === 'dna' && (
            <motion.div
              key="dna"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-10"
            >
              {/* Vibe and primary metrics grids */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Visual Vibe display badge */}
                <div className="bg-gradient-to-tr from-indigo-950/40 to-zinc-950/40 border border-zinc-850 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-56">
                  <div className="absolute top-[-20px] right-[-20px] w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-[#a200ff] uppercase font-semibold">CineOrbit DNA Tag</span>
                    <h4 className="text-lg font-bold text-white mt-2">COSMIC ORBIT VIBE</h4>
                    <span className="inline-flex mt-3 bg-zinc-900/60 border border-amber-500/25 text-amber-550 font-bold font-mono text-[11px] uppercase tracking-wider py-1.5 px-3 rounded-xl">
                      {dnaStats.vibeBadge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal font-sans">
                    Computed based on heaviest genre weight coefficients synced inside your profile core.
                  </p>
                </div>

                {/* hours watched completed gauge */}
                <div className="bg-zinc-950/50 border border-zinc-850 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-56">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-emerald-450 uppercase font-semibold">Galactic Projection time</span>
                    <h4 className="text-lg font-bold text-white mt-2">SCREEN TIME</h4>
                    <div className="text-4xl font-extrabold text-white mt-3 font-mono">
                      {dnaStats.computedHours} <span className="text-xs font-normal text-zinc-400">HRS</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900/50 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-450 to-cyan-400 h-full w-[65%]" />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Fictional timeline tracking including series episode progress records.
                  </p>
                </div>

                {/* Galaxy complete objects counts */}
                <div className="bg-zinc-950/50 border border-zinc-850 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-56">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-orange-450 uppercase font-semibold">Universe Coeffs</span>
                    <h4 className="text-lg font-bold text-white mt-2">DENSITY COUNTS</h4>
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="p-2.5 bg-zinc-900/40 border border-zinc-850/60 rounded-xl">
                        <span className="block text-lg font-black font-mono text-white leading-none">{dnaStats.watchedCount}</span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase mt-1 block">Watched</span>
                      </div>
                      <div className="p-2.5 bg-zinc-900/40 border border-zinc-850/60 rounded-xl">
                        <span className="block text-lg font-black font-mono text-emerald-400 leading-none">{dnaStats.watchingCount}</span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase mt-1 block">Watching</span>
                      </div>
                      <div className="p-2.5 bg-zinc-900/40 border border-zinc-850/60 rounded-xl">
                        <span className="block text-lg font-black font-mono text-cyan-400 leading-none">{dnaStats.planToWatchCount}</span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase mt-1 block">Plan</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Secure real-time synchronization keeps catalogs restored on any other device.
                  </p>
                </div>

              </div>

              {/* Achievements collection list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                
                {/* Achievement Cards wrapper */}
                <div className="bg-zinc-950/30 border border-zinc-900 p-6 rounded-3xl space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-xs uppercase font-mono tracking-widest text-zinc-350 font-bold">Unlocking Achievements</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 scrollbar-none">
                    {dnaStats.achievements.map((a, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition duration-300 ${
                          a.unlocked 
                            ? 'bg-amber-400/5 border-amber-500/20 text-white' 
                            : 'bg-zinc-950/20 border-zinc-900 text-zinc-550'
                        }`}
                      >
                        <div>
                          <h5 className={`text-xs font-bold ${a.unlocked ? 'text-amber-450' : 'text-zinc-500'}`}>{a.title}</h5>
                          <p className="text-[10px] text-zinc-450 mt-0.5 leading-snug">{a.desc}</p>
                        </div>
                        {a.unlocked ? (
                          <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center text-black font-extrabold text-[9px]">
                            ✓
                          </div>
                        ) : (
                          <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-650 font-semibold">Locked</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Movie Life Journey Timeline milestones */}
                <div className="bg-zinc-950/30 border border-zinc-900 p-6 rounded-3xl space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs uppercase font-mono tracking-widest text-zinc-350 font-bold">Movie Life Journey Milestone Timeline</span>
                  </div>

                  <div className="space-y-6 relative border-l border-zinc-850 pl-5 ml-2 max-h-[360px] overflow-y-auto pr-2 scrollbar-none">
                    {trackedItems.length > 0 ? (
                      trackedItems.map((item, idx) => {
                        const dateFormatted = new Date(item.updatedAt || '').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <div key={idx} className="relative space-y-1">
                            {/* Pin marker */}
                            <span className="absolute left-[-25.5px] top-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-4 ring-[#020204]" />
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-mono text-zinc-550 leading-none uppercase">{dateFormatted}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold leading-none ${
                                item.status === 'watched' ? 'bg-amber-500/10 text-amber-550' : 'bg-emerald-450/10 text-emerald-450'
                              }`}>
                                {item.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-white mt-1">{item.title}</h5>
                            {item.review && (
                              <p className="text-[11px] text-zinc-450 italic font-serif leading-relaxed">"{item.review}"</p>
                            )}
                            {item.userRating && (
                              <div className="flex items-center gap-0.5 text-[10px] text-amber-400">
                                <Star className="w-3 h-3 fill-current" />
                                <span>RATED {item.userRating}/10</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-24 text-center">
                        <Compass className="w-8 h-8 text-zinc-700 mx-auto animate-spin" style={{ animationDuration: '10s' }} />
                        <p className="text-[11px] text-zinc-550 mt-2 font-mono uppercase">Timeline empty. Secure some items on watchlist first.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 4: YEAR IN REVIEW (SPOTIFY-WRAPPED DESIGN) */}
          {activeTab === 'wrapped' && (
            <motion.div
              key="wrapped"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="p-8 rounded-3xl bg-gradient-to-tr from-[#12002b] via-[#040409] to-[#041e2a] border border-violet-900/30 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[440px] shadow-[0_0_80px_rgba(138,43,226,0.15)]">
                {/* Glow rings nested */}
                <div className="absolute w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />
                
                <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-3.5 py-1 rounded-full font-mono font-bold uppercase tracking-[0.2em] mb-4">
                  CINEORBIT WRAPPED
                </span>
                
                <h2 className="text-4xl md:text-5xl font-black text-white font-serif tracking-tight leading-tight uppercase">
                  Your Year In Review
                </h2>
                <p className="text-zinc-500 max-w-sm text-xs mt-3 leading-relaxed">
                  Analyzing annual orbit cycles and tracking coordinates to generate your personal cinematic capsule card.
                </p>

                {/* Annual wrapped dashboard layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full mt-10">
                  <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-900 relative">
                    <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider block">Completed stars</span>
                    <strong className="text-3xl font-extrabold text-[#00ffcc] font-mono block mt-1.5">{dnaStats.watchedCount}</strong>
                    <span className="text-[9px] text-zinc-450 mt-1 block">Masterpieces logged</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-900 relative">
                    <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider block">Cosmic Title Vibe</span>
                    <strong className="text-base font-extrabold text-amber-500 font-mono block mt-3 truncate">{preferences?.preferredVibe || 'Void Explorer'}</strong>
                    <span className="text-[9px] text-zinc-450 mt-1 block">Your primary style aura</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-900 relative">
                    <span className="text-[8.5px] font-mono text-zinc-550 uppercase tracking-wider block">Screen Duration</span>
                    <strong className="text-3xl font-extrabold text-pink-500 font-mono block mt-1.5">{dnaStats.computedHours}</strong>
                    <span className="text-[9px] text-zinc-450 mt-1 block">Estimated Hours</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-900 relative">
                    <span className="text-[8.5px] font-mono text-zinc-550 uppercase tracking-wider block">Galaxy Density</span>
                    <strong className="text-3xl font-extrabold text-blue-400 font-mono block mt-1.5">{trackedItems.length}</strong>
                    <span className="text-[9px] text-zinc-450 mt-1 block">Active Objects in grid</span>
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => {
                      const shareText = `My CineOrbit year in review is ready! Smashed ${dnaStats.computedHours} hours of cinematic density on my ${preferences?.preferredVibe || 'Space Explorer'} profile. Sync your galaxy!`;
                      navigator.clipboard.writeText(shareText);
                      alert('Share telemetry specifications copied back to clipboard!');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-amber-500 hover:to-orange-500 text-white hover:text-black font-semibold text-xs rounded-full uppercase tracking-widest transition transform hover:scale-105 cursor-pointer"
                  >
                    Share Galactic Review
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: DEFAULT GRID SECTIONS LIST (CATALOG OR CORE TABS) */}
          {(activeTab === 'all' || activeTab === 'movies' || activeTab === 'tv') && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* FEATURED BANNER */}
              {featuredMovie && (
                <div id="cineorbit_featured_billboard" className="relative w-full rounded-3xl overflow-hidden aspect-[21/9] min-h-[220px] max-h-[380px] bg-zinc-950 border border-zinc-900 shadow-xl group">
                  <img 
                    src={featuredMovie.backdrop} 
                    alt={featuredMovie.title} 
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.45] transition-transform duration-1000 scale-100 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6 sm:p-10" />
                  
                  {/* billboard specs details */}
                  <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 z-10 max-w-lg space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[8.5px] font-mono tracking-widest bg-amber-500 text-black font-bold uppercase rounded-lg">
                      <Sparkles className="w-3 h-3 fill-current" />
                      FEATURED SELECTIONS
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-white font-serif tracking-tight leading-none uppercase">
                      {featuredMovie.title}
                    </h2>
                    <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                      {featuredMovie.description}
                    </p>
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setSelectedMovie(featuredMovie)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-zinc-100 to-zinc-200 hover:from-amber-500 hover:to-orange-500 text-black border border-white font-bold text-xs uppercase tracking-wider rounded-xl hover:shadow-lg transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-black" />
                        Explore specs
                      </button>

                      <button
                        onClick={(e) => handleToggleTrack(featuredMovie, 'plan_to_watch')}
                        className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-xs text-zinc-300 hover:text-white bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-xl transition cursor-pointer`}
                      >
                        {trackedItems.some(item => item.itemId === featuredMovie.id && item.status === 'plan_to_watch') ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>In Watchlist!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 text-zinc-400" />
                            <span>Watchlist</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SEARCH FLUX ELEMENT */}
              <div className="relative w-full max-w-xl mx-auto">
                <Search className="absolute left-4 top-[14px] w-4 h-4 text-zinc-550" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan galaxy catalog by titles, actors, or genres..."
                  className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-850 px-12 py-3.5 text-sm rounded-2xl text-zinc-200 placeholder-zinc-550 focus:outline-none focus:border-amber-500 transition duration-300"
                />
              </div>

              {/* GENRE SLIDER LIST */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 flex-nowrap">
                {genresList.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 border cursor-pointer ${
                      selectedGenre === genre
                        ? 'bg-amber-400 text-black border-amber-500 shadow-md shadow-orange-500/10'
                        : 'bg-zinc-950/45 border-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* CURATED SECTION CHANNELS SLIDERS (GRID bento layouts) */}
              <div className="space-y-12">
                {[
                  { title: '🍿 Trending Movies', list: sectionSliders.trendingMovies },
                  { title: '📺 Hot Space TV series', list: sectionSliders.trendingTv },
                  { title: '🏛️ Top Rated Masterpieces', list: sectionSliders.topRatedMovies },
                  { title: '📡 Highest Estimated Series', list: sectionSliders.topRatedTv }
                ].map((sec, secIdx) => {
                  if (sec.list.length === 0) return null;
                  return (
                    <div key={secIdx} className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <h4 className="text-base font-bold text-white tracking-snug uppercase font-serif">{sec.title}</h4>
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{sec.list.length} mapped</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {sec.list.slice(0, 12).map(movie => {
                          const trackedRecord = trackedItems.find(i => i.itemId === movie.id);
                          const isWatchlisted = trackedRecord && (trackedRecord.status === 'plan_to_watch' || trackedRecord.status === 'watching');
                          const isWatched = trackedRecord && (trackedRecord.status === 'watched');

                          return (
                            <MovieCard
                              key={movie.id}
                              movie={movie}
                              watchlist={isWatchlisted ? [movie.id] : []}
                              watchedList={isWatched ? [movie.id] : []}
                              onToggleWatchlist={async (id, e) => {
                                e.stopPropagation();
                                await handleToggleTrack(movie, 'plan_to_watch');
                              }}
                              onToggleWatched={async (id, e) => {
                                e.stopPropagation();
                                await handleToggleTrack(movie, 'watched');
                              }}
                              onClick={() => setSelectedMovie(movie)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* DETAILED DIALOG MODAL (Overlays glassmorphism specs) */}
      <AnimatePresence>
        {selectedMovie && (
          <div id="specs_modal_portal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            
            {/* Modal Box */}
            <div className="relative w-full max-w-4xl bg-[#04040a]/95 border border-zinc-850 rounded-3xl overflow-hidden shadow-2xl relative animate-scale-up">
              
              {/* Close Button */}
              <button 
                onClick={() => { setSelectedMovie(null); setShowTrailer(false); }}
                className="absolute top-4 right-4 z-30 p-2 text-zinc-400 bg-black/50 border border-white/5 hover:text-white hover:bg-zinc-800 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* TRAILER PLAYER COVER LAYER */}
              {showTrailer && selectedMovie.trailer ? (
                <div className="relative w-full aspect-video bg-black z-10">
                  <iframe 
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${selectedMovie.trailer}?autoplay=1&rel=0&modestbranding=1`}
                    title={`${selectedMovie.title} Trailer`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button 
                    onClick={() => setShowTrailer(false)}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-black text-[10px] font-bold uppercase tracking-widest text-white rounded-lg transition"
                  >
                    <Video className="w-4 h-4 text-amber-505" />
                    <span>Show Details</span>
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-[220px] sm:h-[350px]">
                  <img 
                    src={selectedMovie.backdrop || "https://image.tmdb.org/t/p/original/rAiX9fS36g99ghXTI99q999gG.jpg"} 
                    alt={selectedMovie.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-[0.35]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04040a] to-transparent" />
                  
                  {selectedMovie.trailer && (
                    <button 
                      onClick={() => setShowTrailer(true)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-amber-400 text-black flex items-center justify-center hover:scale-110 transition cursor-pointer"
                    >
                      <Play className="w-7 h-7 fill-current ml-1 text-black" />
                    </button>
                  )}

                  <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
                    <img 
                      src={selectedMovie.poster} 
                      alt={selectedMovie.title} 
                      referrerPolicy="no-referrer"
                      className="hidden sm:block w-24 aspect-[2/3] object-cover rounded-xl border border-white/5 shadow-2xl"
                    />
                    <div>
                      <h2 className="text-2xl sm:text-4xl font-black font-serif text-white tracking-tight uppercase">
                        {selectedMovie.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-350 font-mono mt-1">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-4 h-4 fill-amber-400" />
                          {selectedMovie.rating}
                        </span>
                        <span>•</span>
                        <span>{selectedMovie.year}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-zinc-850 text-[9px] text-zinc-300 rounded uppercase font-bold">{selectedMovie.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DETAIL SPECS BODY PART */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 max-h-[420px] overflow-y-auto">
                <div className="md:col-span-7 space-y-6">
                  <div>
                    <h4 className="text-zinc-550 text-[10px] font-mono tracking-widest uppercase mb-1.5">Overview / Synopsis</h4>
                    <p className="text-zinc-300 text-xs leading-relaxed text-left">
                      {selectedMovie.description}
                    </p>
                  </div>

                  {selectedMovie.stars && selectedMovie.stars.length > 0 && (
                    <div>
                      <h4 className="text-zinc-550 text-[10px] font-mono tracking-widest uppercase mb-1.5">Cast Starring</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMovie.stars.map(star => (
                          <span key={star} className="px-2.5 py-1 bg-zinc-900/60 border border-zinc-850/40 text-[10.5px] text-zinc-300 rounded-lg">
                            {star}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CHRONOLOGICAL METRIC DETAIL LOG - AUTO-SAVE INPUT FORM FIELDS */}
                  <div className="border-t border-zinc-900 pt-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-[10px] font-mono font-bold tracking-widest text-[#00ffcc] uppercase">METRIC DATA & AUTO-SAVE ENTRIES</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Rating input */}
                      <div>
                        <label className="block text-[9px] text-zinc-500 font-mono uppercase mb-1">Your Personal Rating (★ 1-10)</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={localUserRating}
                          onChange={async (e) => {
                            const val = parseInt(e.target.value, 10);
                            setLocalUserRating(val);
                            await handleAutoSaveField({ userRating: val });
                          }}
                          className="w-full accent-amber-500 bg-zinc-900 rounded-lg cursor-pointer h-1.5"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-450 font-mono mt-1">
                          <span>1 (Awful)</span>
                          <span className="text-amber-450 font-bold font-mono">Current: ★ {localUserRating}</span>
                          <span>10 (Masterpiece!)</span>
                        </div>
                      </div>

                      {/* Episode track progress shown only if TV */}
                      {selectedMovie.type === 'tv' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase mb-1">Season</label>
                            <input
                              type="number"
                              min="1"
                              value={localSeason}
                              onChange={async (e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setLocalSeason(val);
                                await handleAutoSaveField({ seasonProgress: val });
                              }}
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-350 p-2 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-zinc-500 font-mono uppercase mb-1">Episode</label>
                            <input
                              type="number"
                              min="1"
                              value={localEpisode}
                              onChange={async (e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setLocalEpisode(val);
                                await handleAutoSaveField({ episodeProgress: val });
                              }}
                              className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-350 p-2 rounded-xl focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Review notes feedback */}
                    <div>
                      <label className="block text-[9px] text-zinc-500 font-mono uppercase mb-1">Galactic Log Notes / Review</label>
                      <textarea
                        value={localReview}
                        rows={2}
                        onChange={async (e) => {
                          const val = e.target.value;
                          setLocalReview(val);
                          await handleAutoSaveField({ review: val, notes: val });
                        }}
                        placeholder="Write dynamic film theory notes... updates save cleanly upon keystroke syncs!"
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-300 p-3 rounded-xl focus:outline-none focus:border-cyan-500 placeholder-zinc-550 leading-relaxed font-light"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-zinc-950/50 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between gap-5 self-start">
                  <div className="space-y-4">
                    <h4 className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase mb-1 text-center">Galaxy Telemetries</h4>
                    
                    {/* Switch status directly */}
                    <div className="space-y-2 col-span-1">
                      {[
                        { id: 'watched', label: 'Watched', activeColor: 'bg-amber-400 text-black border-amber-500' },
                        { id: 'watching', label: 'Watching', activeColor: 'bg-emerald-500 text-black border-emerald-555' },
                        { id: 'plan_to_watch', label: 'Plan to Watch', activeColor: 'bg-cyan-500 text-black border-cyan-555' }
                      ].map(statusItem => {
                        const isMatch = trackedItems.some(item => item.itemId === selectedMovie.id && item.status === statusItem.id);
                        return (
                          <button
                            key={statusItem.id}
                            onClick={async () => {
                              await handleSelectStatus(selectedMovie, statusItem.id as TrackStatus);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 border text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                              isMatch 
                                ? statusItem.activeColor + ' shadow-md scale-[1.01]' 
                                : 'bg-zinc-950/40 text-zinc-400 border-zinc-900 hover:border-zinc-800 hover:text-white'
                            }`}
                          >
                            <span>{statusItem.label}</span>
                            {isMatch ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-4 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-[8.5px] text-zinc-550 font-mono tracking-wide">
                      <Database className="w-3.5 h-3.5 text-zinc-650" />
                      <span>COSMIC RECOVERY ACTIVE</span>
                    </div>
                    <div className="text-[9px] text-[#00ffcc] font-mono">Auto-save completed instantly</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// -------------------------------------------------------------
// SECURE MOVIE CARD SUB-VIEW RENDERS WITH CORNER LOGS
// -------------------------------------------------------------
interface MovieCardProps {
  key?: React.Key;
  movie: Movie;
  watchlist: string[];
  watchedList: string[];
  onToggleWatchlist: (id: string, e: React.MouseEvent) => void | Promise<void>;
  onToggleWatched: (id: string, e: React.MouseEvent) => void | Promise<void>;
  onClick: () => void;
}

function MovieCard({ 
  movie, 
  watchlist, 
  watchedList, 
  onToggleWatchlist, 
  onToggleWatched, 
  onClick 
}: MovieCardProps) {
  const isWatchlisted = watchlist.includes(movie.id);
  const isWatched = watchedList.includes(movie.id);

  return (
    <div 
      className="group relative cursor-pointer select-none transition-all duration-300"
      onClick={onClick}
    >
      <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-b from-transparent via-zinc-850 to-transparent group-hover:from-amber-400/30 group-hover:to-orange-500/30 opacity-100 transition duration-300 blur-sm group-hover:blur-md" />
      
      <div className="relative overflow-hidden bg-zinc-950/70 border border-zinc-900 rounded-2xl aspect-[2/3] backdrop-blur-md">
        <img 
          src={movie.poster} 
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 scale-100 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
          <div className="flex justify-end gap-1.5">
            {isWatchlisted && (
              <div className="p-1.5 rounded-full bg-amber-400 text-black shadow-lg">
                <Bookmark className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
            {isWatched && (
              <div className="p-1.5 rounded-full bg-emerald-500 text-black shadow-lg">
                <Eye className="w-3.5 h-3.5 fill-current" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-white text-xs font-bold leading-tight tracking-wide truncate">
              {movie.title}
            </h4>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>{movie.year}</span>
              <span className="flex items-center text-amber-400 font-bold">
                <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                {movie.rating}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-zinc-850">
              <button
                onClick={(e) => onToggleWatchlist(movie.id, e)}
                className={`p-2 rounded-lg border text-center flex justify-center items-center transition-all duration-250 cursor-pointer ${
                  isWatchlisted ? 'bg-amber-400 border-amber-500 text-black' : 'bg-black/40 text-zinc-300 border-zinc-850 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
              </button>

              <button
                onClick={(e) => onToggleWatched(movie.id, e)}
                className={`p-2 rounded-lg border text-center flex justify-center items-center transition-all duration-250 cursor-pointer ${
                  isWatched ? 'bg-[#122b10] border-emerald-500 text-emerald-400' : 'bg-black/40 text-zinc-300 border-zinc-850 hover:border-zinc-500 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        </div>

        {/* Small corner tags if not hovered */}
        {!isWatchlisted && !isWatched && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
            {movie.type}
          </div>
        )}

        {(isWatchlisted || isWatched) && (
          <div className="absolute top-2.5 left-2.5 flex gap-1 group-hover:opacity-0 transition-opacity">
            {isWatchlisted && (
              <span className="px-1.5 py-0.5 bg-amber-400 text-black font-mono font-black text-[8px] rounded border border-amber-500/20 shadow-md">
                WLIST
              </span>
            )}
            {isWatched && (
              <span className="px-1.5 py-0.5 bg-emerald-500 text-black font-mono font-black text-[8px] rounded border border-emerald-650/20 shadow-md">
                SEEN
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
