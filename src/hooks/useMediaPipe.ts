import { useEffect, useRef, useState } from 'react';
// Using global window objects loaded from CDN to avoid Vite bundler issues
declare global {
  interface Window {
    Camera: any;
    Hands: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}


export const useMediaPipe = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fingerPos, setFingerPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let camera: any = null;
    let hands: any = null;

    const initializeMediaPipe = async () => {
      if (!videoRef.current) return;
      
      const Hands = window.Hands;
      const Camera = window.Camera;
      if (!videoRef.current) return;

      hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1, // Standard complexity is better for finger definition
        minDetectionConfidence: 0.4,
        minTrackingConfidence: 0.4
      });

      hands.onResults((results: any) => {
        // DRAW VISUAL DEBUG LANDMARKS
        if (canvasRef.current && videoRef.current) {
          const canvasCtx = canvasRef.current.getContext('2d');
          if (canvasCtx) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
            
            if (results.multiHandLandmarks) {
              for (const landmarks of results.multiHandLandmarks) {
                window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
                window.drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });
              }
            }
            canvasCtx.restore();
          }
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          // Get the index finger tip of the first hand
          const indexFingerTip = results.multiHandLandmarks[0][8]; 
          // x and y are normalized between 0.0 and 1.0
          setFingerPos({ x: indexFingerTip.x, y: indexFingerTip.y });
        } else {
          setFingerPos(null);
        }
      });

      camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && hands) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      camera.start().then(() => {
        setIsLoaded(true);
      });
    };

    initializeMediaPipe();

    return () => {
      if (camera) {
        camera.stop();
      }
      if (hands) {
        hands.close();
      }
    };
  }, []);

  return { videoRef, canvasRef, isLoaded, fingerPos };
};
