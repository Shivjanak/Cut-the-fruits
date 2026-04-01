import { useState } from 'react';
import PhaserGame from './game/Game';
import { useMediaPipe } from './hooks/useMediaPipe';

import './home.css';


function App() {
  const { videoRef, canvasRef, isLoaded, fingerPos } = useMediaPipe();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState<false | string>(false); // false or the reason
  const [tempName, setTempName] = useState('');

  const [gameKey, setGameKey] = useState(0); // For forcing remount on restart



  return (
    <div className="w-screen min-h-screen bg-emerald-400 flex flex-col items-center justify-between text-gray-900 font-sans">

      {/* HEADER */}
      <header className="w-full h-16 md:h-20 bg-white border-b-4 border-emerald-600/20 flex items-center justify-between px-3 md:px-8 shadow-sm z-30">
        <h1 className="text-lg md:text-3xl font-black text-emerald-600 tracking-tighter md:tracking-wider uppercase italic">
          Cut the fruits
        </h1>

        <div className="flex gap-1 md:gap-4 items-center">
          {playerName && !gameOver && (
            <div className="hidden sm:flex text-xs md:text-sm font-bold bg-emerald-50 px-3 md:px-4 py-1 md:py-2 rounded-xl border border-emerald-200 items-center text-emerald-700 uppercase tracking-widest shadow-sm">
              {playerName}
            </div>
          )}
          <div className="text-sm md:text-xl font-bold bg-white px-3 py-1.5 md:px-6 md:py-2 rounded-xl border-2 border-emerald-500 flex items-center shadow-sm">
            <span className="text-[8px] md:text-[10px] text-emerald-700 uppercase font-black tracking-widest mr-1.5 md:mr-3 leading-none">Score</span>
            <span className="text-emerald-600 leading-none">{score}</span>
          </div>
          {timeLeft !== null && (
            <div className="text-sm md:text-xl font-bold bg-white px-3 py-1.5 md:px-6 md:py-2 rounded-xl border-2 border-rose-500 flex items-center shadow-sm">
              <span className="text-[8px] md:text-[10px] text-rose-700 uppercase font-black tracking-widest mr-1.5 md:mr-3 leading-none">Time</span>
              <span className="text-rose-500 leading-none">{timeLeft}s</span>
            </div>
          )}
        </div>
      </header>



      {/* MAIN GAME AREA */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 w-full h-full overflow-hidden">
        {/* Game Board Container - Responsive aspect ratio */}
        <div className="relative w-full max-w-4xl aspect-[3/4] md:aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border-2 md:border-4 border-orange-900/50 bg-[#2d1b14] h-auto max-h-[80vh]">


          {/* PiP Video Feed (Top Left) - Smaller on mobile */}
          <div className="absolute top-2 left-2 md:top-4 md:left-4 w-32 h-24 md:w-48 md:h-36 rounded-lg md:rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-lg z-30 bg-black">

            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="hidden" // No need to show raw video if we have the canvas debug
            />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              width="640"
              height="480"
            />
            {/* Mirror Overlay Label */}
            <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 font-bold uppercase">
              Live Cam
            </div>
          </div>

          {/* Phaser Game Board Canvas */}
          <div className="absolute inset-0 z-10">
            {gameStarted ? (
              <PhaserGame 
                key={gameKey}
                pointerPos={fingerPos} 
                setScore={setScore} 
                setTimeLeft={setTimeLeft} 
                playerName={playerName} 
                onGameOver={(data) => setGameOver(data.reason)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-emerald-400 p-4 md:p-8">
                <div className="home-container p-8 md:p-12 space-y-6 max-w-lg animate-in zoom-in duration-500 shadow-2xl">
                  <h2 className="title-text text-center">Cut the fruits</h2>
                  
                  <div className="w-full flex flex-col items-center gap-3">
                    <label className="text-[11px] uppercase font-black text-emerald-800 tracking-widest block text-center">Warrior Name</label>
                    <input 
                      type="text" 
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="ENTER YOUR NAME..."
                      className="input-field text-center mx-auto"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      if (tempName.trim()) {
                        setPlayerName(tempName.trim());
                        setGameStarted(true);
                      }
                    }}
                    disabled={!tempName.trim()}
                    className="start-btn"
                  >
                    Start Training
                  </button>

                  <p className="footer-note">
                    Show your hand to the camera to begin your fruit slicing mastery!
                  </p>
                </div>
              </div>
            )}


            {/* GAME OVER OVERLAY - Bright Theme */}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-emerald-900/40 backdrop-blur-md p-8 animate-in fade-in duration-500">
                <div className="w-full max-w-sm bg-white p-8 rounded-3xl border-4 border-emerald-500 shadow-2xl space-y-8">
                  <div className="text-center space-y-2">
                    <h2 className={`text-4xl font-black ${gameOver === 'BOMB' ? 'text-rose-600' : 'text-emerald-600'} uppercase tracking-tighter italic`}>
                      {gameOver === 'BOMB' ? 'BOMB!' : 'TIME OVER'}
                    </h2>
                    <p className="text-emerald-800 text-xs font-bold uppercase tracking-widest">{playerName}'s Training Complete</p>
                  </div>

                  <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-800 uppercase font-black tracking-widest block mb-1">Final Score</span>
                    <span className="text-5xl font-black text-emerald-600">{score}</span>
                  </div>


                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setScore(0);
                        setTimeLeft(60);
                        setGameOver(false);
                        setGameKey(prev => prev + 1);
                      }}
                      className="py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-widest rounded-xl transition-all transform active:scale-95 shadow-lg shadow-emerald-500/20"
                    >
                      Restart
                    </button>
                    <button
                      onClick={() => {
                        setGameStarted(false);
                        setGameOver(false);
                        setPlayerName('');
                        setTempName('');
                        setScore(0);
                        setTimeLeft(null);
                      }}
                      className="py-4 bg-gray-800 hover:bg-gray-700 text-rose-400 font-black uppercase tracking-widest rounded-xl transition-all transform active:scale-95 border border-rose-500/30"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* Status Badge - Bright Theme */}
          <div className="absolute top-2 right-2 md:top-4 md:right-4 z-40 bg-white/90 px-2 py-1 md:px-4 md:py-2 text-[8px] md:text-[10px] rounded-full border-2 border-emerald-500 shadow-lg backdrop-blur-sm flex items-center gap-1 md:gap-2">
            {fingerPos ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]"></div>
                <span className="text-emerald-700 font-black uppercase tracking-widest">Hand Connected</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-rose-600 font-black uppercase tracking-widest">No Hand Seen</span>
              </>
            )}
          </div>


        </div>
      </main>

      {/* FOOTER - Hidden or compact on very small screens */}
      <footer className="w-full h-auto min-h-16 py-3 bg-gray-900 border-t border-gray-800 flex items-center justify-center text-gray-400 text-xs md:text-sm z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] px-4 text-center">

        <p className="tracking-wide">
          <strong className="text-white">HOW TO PLAY:</strong> Step back, raise your hand, and slice the falling fruits using your <strong className="text-emerald-400">Index Finger</strong>. Beware of the <strong className="text-red-400">Bombs!</strong>
        </p>
      </footer>

    </div>
  );
}

export default App;
