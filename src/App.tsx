/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Movie } from './types';
import IntroCinematic from './components/IntroCinematic';
import MovieDashboard from './components/MovieDashboard';
import AuthModal from './components/AuthModal';
import { FirebaseProvider, useAuth } from './lib/FirebaseProvider';
import { Film, Orbit } from 'lucide-react';
import { cinematicAudio } from './lib/cinematicAudio';

// Client-side fallback if the API is slow or offline
const fallbackMovies: Movie[] = [
  {
    id: 'm1',
    title: 'Interstellar',
    type: 'movie',
    year: 2014,
    rating: 8.7,
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    description: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2Qv6157vuyY3vMaasg205vIW.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/rAiX9fS36g99ghXTI99q999gG.jpg',
    stars: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    trailer: 'zSWdZVtXT7U'
  },
  {
    id: 'm2',
    title: 'Inception',
    type: 'movie',
    year: 2010,
    rating: 8.8,
    genres: ['Action', 'Sci-Fi', 'Adventure'],
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project.',
    poster: 'https://image.tmdb.org/t/p/w500/o066i7b06QQ7uiT6vo76gR866hx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/s3Tld83g6aaH8v676gG9aSg.jpg',
    stars: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    trailer: 'YoHD9XEInc0'
  }
];

function MainAppContent() {
  const { user, isGuest, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showIntro, setShowIntro] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Start dynamic cinematic ambient drone
  useEffect(() => {
    cinematicAudio.forceStart();
  }, []);

  // 1. Initial movies list loader
  useEffect(() => {
    async function loadCatalog() {
      try {
        const response = await fetch('/api/movies');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setMovies(data);
            return;
          }
        }
        setMovies(fallbackMovies);
      } catch (err) {
        console.error('Failed to load movie collections. Using fallback catalog.', err);
        setMovies(fallbackMovies);
      } finally {
        setIsLoadingCatalog(false);
      }
    }

    loadCatalog();
  }, []);

  // 2. Decide if we show Cinematic CGI Intro (Once Per Day check)
  useEffect(() => {
    if (authLoading || (!user && !isGuest)) return;

    const lastIntroStr = localStorage.getItem('cineorbit_last_intro');
    const now = Date.now();
    
    // Check if seen in the last 24 hours
    if (lastIntroStr) {
      const lastIntro = parseInt(lastIntroStr, 10);
      const deltaHr = (now - lastIntro) / (1000 * 60 * 60);
      if (deltaHr >= 24) {
        setShowIntro(true);
        localStorage.setItem('cineorbit_last_intro', now.toString());
      } else {
        setShowIntro(false); // Skip automatically as seen today
      }
    } else {
      // First time user registration or login -> show intro!
      setShowIntro(true);
      localStorage.setItem('cineorbit_last_intro', now.toString());
    }
  }, [user, isGuest, authLoading]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    // Manually force replay (updates last Intro timestamp to now)
    localStorage.setItem('cineorbit_last_intro', Date.now().toString());
    setShowIntro(true);
  };

  // Render Loader if authentication is active
  if (authLoading || isLoadingCatalog) {
    return (
      <div id="cineorbit_initial_loader" className="min-h-screen bg-[#020205] flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Cosmos ambient glow background */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] animate-pulse duration-3000" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-6">
            <Orbit className="w-16 h-16 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
            <Film className="w-6 h-6 text-zinc-300 absolute top-5 left-5" />
          </div>
          <span className="text-xl font-light tracking-widest text-zinc-100 uppercase font-serif">
            CINE<span className="text-amber-500 font-bold">ORBIT</span>
          </span>
          <p className="text-[9px] font-mono tracking-[0.45em] text-zinc-550 uppercase mt-2">Authenticating quantum orbit logs...</p>
        </div>
      </div>
    );
  }

  // GATE A: If user is not authenticated and is not executing Guest mode: Render Auth UI
  if (!user && !isGuest) {
    return <AuthModal />;
  }

  // GATE B: If authorized, stream cinematic intro or dashboard
  return (
    <div id="cineorbit_app_frame" className="min-h-screen bg-[#020205] text-[#f2f2fa] font-sans">
      {showIntro ? (
        <IntroCinematic 
          movies={movies.length > 0 ? movies : fallbackMovies} 
          onComplete={handleIntroComplete} 
        />
      ) : (
        <MovieDashboard 
          movies={movies.length > 0 ? movies : fallbackMovies}
          onReplayIntro={handleReplayIntro}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <MainAppContent />
    </FirebaseProvider>
  );
}
