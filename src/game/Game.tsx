import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from './MainScene';

interface GameProps {
  pointerPos: { x: number; y: number } | null;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setTimeLeft: React.Dispatch<React.SetStateAction<number | null>>;
  playerName: string;
  onGameOver: (data: { score: number, name: string, reason: string }) => void;
}




const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Switched back to AUTO (WebGL) for best performance with Images
  scale: {
    mode: Phaser.Scale.FIT, // Fit explicitly inside container width/height
    parent: 'phaser-container',
    width: 800,
    height: 600
  },
  transparent: false,
  backgroundColor: '#2d1b14',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 700, x: 0 }, // Further decreased world gravity for a very relaxed feel
      debug: false
    }



  },
  scene: MainScene
};

const PhaserGame = ({ pointerPos, setScore, setTimeLeft, playerName, onGameOver }: GameProps) => {


  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game({
        ...config,
        callbacks: {
          postBoot: (game) => {
            const scene = game.scene.getScene('MainScene') as MainScene;
            if (scene) {
              scene.init({ pointerPos, playerName });
            }
          }
        }
      });


      gameRef.current.events.on('score_updated', (newScore: number) => {
        setScore(newScore);
      });
      
      gameRef.current.events.on('time_updated', (newTime: number | null) => {
        setTimeLeft(newTime);
      });

      gameRef.current.events.on('game_over', (data: { score: number, name: string, reason: string }) => {
        onGameOver(data);
      });

    }


    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [setScore, setTimeLeft]);

  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene('MainScene') as MainScene;
      if (scene && typeof scene.updatePointer === 'function') {
        scene.updatePointer(pointerPos);
      }
    }
  }, [pointerPos]);

  return <div id="phaser-container" className="w-full h-full border-1 border-white/0"></div>;
};

export default PhaserGame;
