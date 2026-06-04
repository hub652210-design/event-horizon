import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  Star, 
  Clock, 
  AlertCircle, 
  Tv, 
  Film, 
  Bookmark, 
  Eye, 
  CheckCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import { Movie, TrackedItem, TrackStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TrackingBoardProps {
  trackedItems: TrackedItem[];
  movieCatalog: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onUpdateStatus: (itemId: string, status: TrackStatus) => Promise<void>;
  onUpdateFields: (itemId: string, fields: Partial<TrackedItem>) => Promise<void>;
  onUntrack: (itemId: string) => Promise<void>;
}

export default function TrackingBoard({
  trackedItems,
  movieCatalog,
  onSelectMovie,
  onUpdateStatus,
  onUpdateFields,
  onUntrack
}: TrackingBoardProps) {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Filter items based on type filter
  const filteredTrackedItems = trackedItems.filter(item => {
    if (selectedTypeFilter === 'all') return true;
    return item.type === selectedTypeFilter;
  });

  // Group tracked items by status
  const planToWatchList = filteredTrackedItems.filter(item => item.status === 'plan_to_watch');
  const watchingList = filteredTrackedItems.filter(item => item.status === 'watching');
  const watchedList = filteredTrackedItems.filter(item => item.status === 'watched');

  // Find movie catalog metadata helper with fallback database replication support
  const getMovieMeta = (itemId: string, item?: TrackedItem): Movie | undefined => {
    const catalogMatch = movieCatalog.find(m => m.id === itemId);
    if (catalogMatch) return catalogMatch;

    if (item && item.title) {
      return {
        id: item.itemId,
        title: item.title,
        type: item.type,
        year: (item as any).year || 2024,
        rating: (item as any).rating || 8.0,
        genres: (item as any).genres || [],
        description: (item as any).description || 'No description found.',
        poster: (item as any).poster || 'https://image.tmdb.org/t/p/w500/gEU2Qv6157vuyY3vMaasg205vIW.jpg',
        backdrop: (item as any).backdrop || '',
        stars: (item as any).stars || [],
        trailer: (item as any).trailer || ''
      };
    }
    return undefined;
  };

  // Helper to handle note editing trigger
  const handleStartNotesEdit = (item: TrackedItem) => {
    setEditingNotesId(item.id);
    setTempNotes(item.review || item.notes || '');
  };

  // Safe save notes
  const handleSaveNotes = async (itemId: string) => {
    await onUpdateFields(itemId, { review: tempNotes, notes: tempNotes });
    setEditingNotesId(null);
  };

  // Helper for quick episode increment / decrement 
  const handleEpisodeChange = async (item: TrackedItem, delta: number) => {
    const current = item.episodeProgress || 0;
    const nextVal = Math.max(0, current + delta);
    await onUpdateFields(item.itemId, { episodeProgress: nextVal });
  };

  // Helper for quick season increment / decrement 
  const handleSeasonChange = async (item: TrackedItem, delta: number) => {
    const current = item.seasonProgress || 1;
    const nextVal = Math.max(1, current + delta);
    await onUpdateFields(item.itemId, { seasonProgress: nextVal });
  };

  // Helper for quick priority change
  const handlePriorityChange = async (item: TrackedItem, priority: 'low' | 'medium' | 'high') => {
    await onUpdateFields(item.itemId, { priority });
  };

  // Helper for quick rating change on watched items (1-10)
  const handleRatingChange = async (item: TrackedItem, rating: number) => {
    await onUpdateFields(item.itemId, { userRating: rating });
  };

  // Fast column change helpers
  const handleSlideForward = async (item: TrackedItem) => {
    if (item.status === 'plan_to_watch') {
      await onUpdateStatus(item.itemId, 'watching');
    } else if (item.status === 'watching') {
      await onUpdateStatus(item.itemId, 'watched');
    }
  };

  const handleSlideBackward = async (item: TrackedItem) => {
    if (item.status === 'watched') {
      await onUpdateStatus(item.itemId, 'watching');
    } else if (item.status === 'watching') {
      await onUpdateStatus(item.itemId, 'plan_to_watch');
    }
  };

  return (
    <div id="cineorbit_board_section" className="space-y-6">
      
      {/* Header and Filter HUD */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-zinc-950/60 border border-zinc-900 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-[#cfcfd8] uppercase font-bold">Orbital Grid Watch-Board</span>
          </div>
          <h2 className="text-xl font-bold font-serif tracking-tight text-white uppercase sm:text-2xl">
            MY PERSONAL FILMS <span className="italic text-amber-400">STATUS BOARD</span>
          </h2>
          <p className="text-xs text-zinc-550 leading-relaxed mt-1">
            Sync, slide, and configure catalog items through their planetary trajectories. Auto-saves directly into your user log database.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-850 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto scrollbar-none">
          <span className="text-[9px] font-mono text-zinc-500 uppercase px-2 py-1 flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="w-3 h-3" /> Filter Type:
          </span>
          {(['all', 'movie', 'tv'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-medium tracking-wide uppercase transition cursor-pointer ${
                selectedTypeFilter === type
                  ? 'bg-amber-400 text-black font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {type === 'all' ? 'All Types' : type === 'movie' ? 'Movies Only' : 'TV Series'}
            </button>
          ))}
        </div>
      </div>

      {/* Board Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Plan to Watch (Amber Accent) */}
        <div className="flex flex-col rounded-3xl bg-zinc-950/40 border border-zinc-900 overflow-hidden min-h-[580px]">
          <div className="p-5 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-md shadow-amber-500/30" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase font-serif">Plan to Watch</h3>
                <p className="text-[10px] font-mono text-zinc-550">Trajectory Waiting</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 border border-amber-500/10 rounded-full">
              {planToWatchList.length}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[700px] scrollbar-none">
            <AnimatePresence mode="popLayout">
              {planToWatchList.length > 0 ? (
                planToWatchList.map(item => {
                  const meta = getMovieMeta(item.itemId, item);
                  if (!meta) return null;
                  return (
                    <motion.div
                      key={item.id}
                      layoutId={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 bg-zinc-950/90 border border-zinc-900 hover:border-amber-500/25 rounded-2xl transition duration-300 relative group overflow-hidden"
                    >
                      {/* Accent glow on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Header metadata row */}
                      <div className="flex gap-3 relative z-10">
                        <img 
                          src={meta.poster} 
                          alt={meta.title} 
                          referrerPolicy="no-referrer"
                          className="w-14 h-20 rounded-lg object-cover bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => onSelectMovie(meta)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 
                              className="text-xs font-bold text-zinc-100 hover:text-amber-400 transition cursor-pointer truncate"
                              onClick={() => onSelectMovie(meta)}
                            >
                              {meta.title}
                            </h4>
                            <button
                              onClick={() => onUntrack(item.itemId)}
                              className="p-1 rounded text-zinc-550 hover:text-red-400 hover:bg-zinc-900 transition flex-shrink-0"
                              title="Untrack Film"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-mono text-zinc-500">{meta.year}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[9px] font-mono text-amber-500/90 uppercase inline-flex items-center gap-0.5 bg-amber-500/5 px-1.5 py-0.2 rounded border border-amber-500/5">
                              {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />} {item.type}
                            </span>
                          </div>

                          <p className="text-[10px] text-zinc-500 line-clamp-2 mt-2 leading-normal">
                            {meta.description}
                          </p>
                        </div>
                      </div>

                      {/* Interactive Configuration Row */}
                      <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between gap-2.5 relative z-15">
                        
                        {/* Priority controller */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono text-zinc-550 uppercase">Priority:</span>
                          <div className="flex gap-1">
                            {(['low', 'medium', 'high'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => handlePriorityChange(item, p)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase border transition cursor-pointer ${
                                  (item.priority || 'medium') === p
                                    ? 'bg-amber-400/10 border-amber-500/30 text-amber-450 font-bold'
                                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                                }`}
                              >
                                {p[0]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Slide to Watching trigger */}
                        <button
                          onClick={() => handleSlideForward(item)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-amber-500 hover:text-black border border-zinc-850 hover:border-amber-450 text-[9px] font-mono text-zinc-400 transition cursor-pointer"
                          title="Start Watching"
                        >
                          <span>WATCHING</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-zinc-900 rounded-2xl p-6">
                  <Bookmark className="w-8 h-8 text-zinc-700 stroke-1 mb-3" />
                  <p className="text-[11px] font-mono text-zinc-600 uppercase">Orbit coordinates empty</p>
                  <p className="text-[10px] text-zinc-550 max-w-[200px] mt-1">Explore the film Catalog to add candidates to this track.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Watching (Cyan Accent) */}
        <div className="flex flex-col rounded-3xl bg-zinc-950/40 border border-zinc-900 overflow-hidden min-h-[580px]">
          <div className="p-5 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-450/30 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase font-serif">Currently Watching</h3>
                <p className="text-[10px] font-mono text-zinc-550">Active Gravitational Pull</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 border border-cyan-450/10 rounded-full">
              {watchingList.length}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[700px] scrollbar-none">
            <AnimatePresence mode="popLayout">
              {watchingList.length > 0 ? (
                watchingList.map(item => {
                  const meta = getMovieMeta(item.itemId, item);
                  if (!meta) return null;
                  return (
                    <motion.div
                      key={item.id}
                      layoutId={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 bg-zinc-950/90 border border-zinc-900 hover:border-cyan-500/25 rounded-2xl transition duration-300 relative group overflow-hidden"
                    >
                      {/* Accent glow on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Header metadata row */}
                      <div className="flex gap-3 relative z-10">
                        <img 
                          src={meta.poster} 
                          alt={meta.title} 
                          referrerPolicy="no-referrer"
                          className="w-14 h-20 rounded-lg object-cover bg-zinc-900/60 border border-zinc-850 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => onSelectMovie(meta)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 
                              className="text-xs font-bold text-zinc-100 hover:text-cyan-400 transition cursor-pointer truncate"
                              onClick={() => onSelectMovie(meta)}
                            >
                              {meta.title}
                            </h4>
                            <button
                              onClick={() => onUntrack(item.itemId)}
                              className="p-1 rounded text-zinc-550 hover:text-red-400 hover:bg-zinc-900 transition flex-shrink-0"
                              title="Untrack Film"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-mono text-zinc-500">{meta.year}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[9px] font-mono text-cyan-400/90 uppercase inline-flex items-center gap-0.5 bg-cyan-500/5 px-1.5 py-0.2 rounded border border-cyan-500/5">
                              {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />} {item.type}
                            </span>
                          </div>

                          {/* Quick Interactive Episode Tracker for TV/Series */}
                          {item.type === 'tv' ? (
                            <div className="mt-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-850/60 space-y-1.5">
                              {/* Season Track */}
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-mono text-zinc-500 text-[8px] uppercase">Season:</span>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleSeasonChange(item, -1)}
                                    className="w-4 h-4 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-cyan-400 flex items-center justify-center text-xs cursor-pointer transition"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="font-mono text-cyan-455 font-bold">{item.seasonProgress || 1}</span>
                                  <button 
                                    onClick={() => handleSeasonChange(item, 1)}
                                    className="w-4 h-4 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-cyan-400 flex items-center justify-center text-xs cursor-pointer transition"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Episode Track */}
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-mono text-zinc-500 text-[8px] uppercase">Episode:</span>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleEpisodeChange(item, -1)}
                                    className="w-4 h-4 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-cyan-400 flex items-center justify-center text-xs cursor-pointer transition"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="font-mono text-cyan-455 font-bold">{item.episodeProgress || 1}</span>
                                  <button 
                                    onClick={() => handleEpisodeChange(item, 1)}
                                    className="w-4 h-4 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:text-cyan-400 flex items-center justify-center text-xs cursor-pointer transition"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center gap-2 bg-zinc-900/40 p-2 border border-zinc-900 rounded-xl">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-[10px] font-mono text-zinc-400 uppercase">Single-run Feature</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Slider Navigation Controls on Board */}
                      <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between gap-2.5 relative z-15">
                        
                        <button
                          onClick={() => handleSlideBackward(item)}
                          className="flex items-center gap-1 p-1 px-2 rounded hover:bg-zinc-900 text-[9px] font-mono text-zinc-550 hover:text-white transition cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>PLAN</span>
                        </button>

                        <button
                          onClick={() => handleSlideForward(item)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-600 hover:scale-105 hover:text-black border border-cyan-400 text-[10px] font-mono text-black font-bold transition cursor-pointer shadow shadow-cyan-500/10"
                        >
                          <span>CONCLUDE</span>
                          <ArrowRight className="w-3.5 h-3.5 text-black" />
                        </button>
                      </div>

                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-zinc-900 rounded-2xl p-6">
                  <Eye className="w-8 h-8 text-zinc-700 stroke-1 mb-3" />
                  <p className="text-[11px] font-mono text-zinc-600 uppercase">No active gravity pull</p>
                  <p className="text-[10px] text-zinc-550 max-w-[200px] mt-1">Ready to explore? Promote candidates to the active watchlist above.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 3: Watched (Emerald Accent) */}
        <div className="flex flex-col rounded-3xl bg-zinc-950/40 border border-zinc-900 overflow-hidden min-h-[580px]">
          <div className="p-5 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-450/30" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase font-serif">Logged & Watched</h3>
                <p className="text-[10px] font-mono text-zinc-550">Stable Atmosphere orbit</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-450 bg-emerald-500/10 px-2 py-0.5 border border-emerald-450/10 rounded-full">
              {watchedList.length}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[700px] scrollbar-none">
            <AnimatePresence mode="popLayout">
              {watchedList.length > 0 ? (
                watchedList.map(item => {
                  const meta = getMovieMeta(item.itemId, item);
                  if (!meta) return null;
                  return (
                    <motion.div
                      key={item.id}
                      layoutId={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 bg-zinc-950/90 border border-zinc-900 hover:border-emerald-500/25 rounded-2xl transition duration-300 relative group overflow-hidden"
                    >
                      {/* Accent glow on hover */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      {/* Header metadata row */}
                      <div className="flex gap-3 relative z-10">
                        <img 
                          src={meta.poster} 
                          alt={meta.title} 
                          referrerPolicy="no-referrer"
                          className="w-14 h-20 rounded-lg object-cover bg-zinc-900/60 border border-zinc-855 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => onSelectMovie(meta)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h4 
                              className="text-xs font-bold text-zinc-100 hover:text-emerald-450 transition cursor-pointer truncate"
                              onClick={() => onSelectMovie(meta)}
                            >
                              {meta.title}
                            </h4>
                            <button
                              onClick={() => onUntrack(item.itemId)}
                              className="p-1 rounded text-zinc-550 hover:text-red-400 hover:bg-zinc-900 transition flex-shrink-0"
                              title="Untrack Film"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-mono text-zinc-500">{meta.year}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-[9px] font-mono text-emerald-400/90 uppercase inline-flex items-center gap-0.5 bg-emerald-500/5 px-1.5 py-0.2 rounded border border-emerald-500/5">
                              {item.type === 'movie' ? <Film className="w-2.5 h-2.5" /> : <Tv className="w-2.5 h-2.5" />} {item.type}
                            </span>
                          </div>

                          {/* Quick Stars Rating HUD */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-mono text-zinc-550 uppercase">My Score:</span>
                              <span className="text-[9px] font-mono text-emerald-450 font-bold">{(item.userRating || 8)}/10</span>
                            </div>
                            <div className="flex gap-1.5 mt-1 py-1 px-1.5 bg-zinc-900/60 border border-zinc-850 rounded-lg max-w-max">
                              {[2, 4, 6, 8, 10].map(ratingValue => (
                                <button
                                  key={ratingValue}
                                  onClick={() => handleRatingChange(item, ratingValue)}
                                  className="transition hover:scale-125 cursor-pointer"
                                  title={`Rate ${ratingValue}/10`}
                                >
                                  <Star 
                                    className={`w-3 h-3 ${
                                      (item.userRating || 8) >= ratingValue 
                                        ? 'text-amber-400 fill-amber-400' 
                                        : 'text-zinc-650'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Notes Preview Block */}
                          <div className="mt-3 relative">
                            {editingNotesId === item.id ? (
                              <div className="space-y-1.5 mt-1">
                                <textarea
                                  value={tempNotes}
                                  onChange={(e) => setTempNotes(e.target.value)}
                                  placeholder="Type personal cinema logs or reviews..."
                                  rows={2}
                                  className="w-full bg-zinc-900 text-[10px] text-zinc-100 placeholder-zinc-600 border border-zinc-800 p-2 rounded-lg focus:outline-none focus:border-emerald-500"
                                />
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => setEditingNotesId(null)}
                                    className="px-2 py-1 text-[8px] font-mono text-zinc-500 hover:text-zinc-350 cursor-pointer"
                                  >
                                    CANCEL
                                  </button>
                                  <button
                                    onClick={() => handleSaveNotes(item.itemId)}
                                    className="px-2.5 py-1 text-[8px] font-mono bg-emerald-500 text-black hover:bg-emerald-600 font-bold rounded cursor-pointer"
                                  >
                                    SAVE
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => handleStartNotesEdit(item)}
                                className="mt-1 p-2 bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 rounded-lg text-[10px] text-zinc-450 line-clamp-2 leading-relaxed cursor-edit italic group/note relative"
                                title="Click to log details or thoughts"
                              >
                                {item.review || item.notes || "✏️ Click here to add a review, notes or logs..."}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Slider controls to put back to watching */}
                      <div className="mt-4 pt-3 border-t border-zinc-900/60 flex items-center justify-between gap-1.5 relative z-15">
                        <button
                          onClick={() => handleSlideBackward(item)}
                          className="flex items-center gap-1 px-2 py-1.5 border border-zinc-850 hover:border-zinc-800 hover:bg-zinc-900 text-[9px] font-mono text-zinc-500 hover:text-white transition rounded-xl cursor-pointer"
                          title="Return to actively watching"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>WATCH AGAIN</span>
                        </button>
                        <span className="text-[8px] font-mono text-emerald-500/50 uppercase font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-450" />
                          STABLE
                        </span>
                      </div>

                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-zinc-900 rounded-2xl p-6">
                  <CheckCircle className="w-8 h-8 text-zinc-700 stroke-1 mb-3" />
                  <p className="text-[11px] font-mono text-zinc-600 uppercase">Orbit trajectory empty</p>
                  <p className="text-[10px] text-zinc-550 max-w-[200px] mt-1">Conclude active view sessions to archive them securely in your database logs.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
