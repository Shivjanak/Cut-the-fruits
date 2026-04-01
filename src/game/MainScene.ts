import Phaser from 'phaser';

import imgApple from '../assets/apple.png';
import imgBanana from '../assets/banana.png';
import imgWatermelon from '../assets/watermelon.png';
import imgBomb from '../assets/bomb.png';
import imgBoard from '../assets/board.png';

const FRUITS = ['apple', 'banana', 'watermelon'];
const BOMB = 'bomb';

export default class MainScene extends Phaser.Scene {
  private fruitsGroup!: Phaser.Physics.Arcade.Group;
  private pointerPos: { x: number; y: number } | null = null;
  private score: number = 0;
  private timeLeft: number = 60;
  private playerName: string = '';

  
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private background!: Phaser.GameObjects.Image;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private gameTimer!: Phaser.Time.TimerEvent;
  private difficultyMultiplier: number = 1.0;
  private pointerHistory: { x: number; y: number }[] = [];
  
  private gameState: 'START' | 'PLAYING' | 'GAME_OVER' = 'START';
  private startButton!: Phaser.GameObjects.Arc;
  private startProgress!: Phaser.GameObjects.Arc;
  private hoverTimer: number = 0;
  private readonly HOVER_TIME_REQUIRED = 1000;


  constructor() {
    super('MainScene');
  }

  init(data: { pointerPos: { x: number; y: number } | null, playerName?: string }) {
    this.pointerPos = data.pointerPos;
    if (data.playerName) this.playerName = data.playerName;
  }


  preload() {
    this.load.image('apple', imgApple);
    this.load.image('banana', imgBanana);
    this.load.image('watermelon', imgWatermelon);
    this.load.image('bomb', imgBomb);
    this.load.image('board', imgBoard);
  }

  create() {
    this.score = 0;
    this.timeLeft = 60;
    this.difficultyMultiplier = 1.0;
    this.gameState = 'START';
    this.hoverTimer = 0;

    // ADD WOODEN BACKGROUND
    this.background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'board');
    this.background.setDisplaySize(this.scale.width, this.scale.height);
    this.background.setDepth(-100);
    
    this.game.events.emit('score_updated', 0);
    this.game.events.emit('time_updated', null);

    this.fruitsGroup = this.physics.add.group();
    
    this.trailGraphics = this.add.graphics();
    this.trailGraphics.setDepth(10);

    this.scale.on('resize', this.resize, this);
    this.createStartMenu();

    // Fallback: Click to start
    this.input.on('pointerdown', () => {
      if (this.gameState === 'START') {
        this.startGame();
      }
    });

  }

  resize(gameSize: Phaser.Structs.Size) {
    if (this.gameState === 'START' && this.startButton) {
      const cx = gameSize.width / 2;
      const cy = gameSize.height / 2;
      this.startButton.setPosition(cx, cy);
      this.startProgress.setPosition(cx, cy);
      const startText = this.startButton.getData('text') as Phaser.GameObjects.Text;
      if (startText) startText.setPosition(cx, cy);
    }
  }

  createStartMenu() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.startButton = this.add.circle(cx, cy, 100, 0x10b981, 0.3)
      .setStrokeStyle(4, 0x10b981)
      .setDepth(5);
    
    this.startProgress = this.add.circle(cx, cy, 0, 0x10b981, 0.8)
      .setDepth(6);


    const startText = this.add.text(cx, cy, 'HOVER\nTO START', { 
      fontSize: '28px', 
      fontFamily: 'Inter, sans-serif',
      fontStyle: '900',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(7);

    this.tweens.add({
      targets: this.startButton,
      scale: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.startButton.setData('text', startText);
  }

  startGame() {
    this.gameState = 'PLAYING';
    
    const text = this.startButton.getData('text') as Phaser.GameObjects.Text;
    if (text) text.destroy();
    
    this.tweens.add({
      targets: [this.startButton, this.startProgress],
      scale: 2,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        if (this.startButton) this.startButton.destroy();
        if (this.startProgress) this.startProgress.destroy();
      }
    });

    this.game.events.emit('time_updated', this.timeLeft);
    this.gameTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.game.events.emit('time_updated', this.timeLeft);
        if (this.timeLeft <= 0) {
          this.endGame(false);
        }
      },
      callbackScope: this,
      loop: true
    });

    this.scheduleNextSpawn(1000);
  }

  endGame(exploded = false) {
    this.gameState = 'GAME_OVER';
    if (this.spawnTimer) this.spawnTimer.destroy();
    if (this.gameTimer) this.gameTimer.destroy();
    
    this.fruitsGroup.clear(true, true);
    this.trailGraphics.clear();
    
    // Emit event to React with final score and reason
    this.game.events.emit('game_over', { 
      score: this.score, 
      name: this.playerName,
      reason: exploded ? 'BOMB' : 'TIME'
    });
  }


  restartGame() {
    this.scene.restart();
  }


  scheduleNextSpawn(delay: number) {
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
    }
    
    this.spawnTimer = this.time.addEvent({
      delay: delay,
      callback: () => {
        if (this.gameState !== 'PLAYING') return;
        this.spawnFruit();
        this.difficultyMultiplier += 0.05;
        // Keep minimum delay slower so fruits don't cluster in rapid succession
        const nextDelay = Math.max(600, 1500 / this.difficultyMultiplier);
        this.scheduleNextSpawn(nextDelay);
      },
      callbackScope: this
    });
  }

  spawnFruit() {
    // SPAWN FROM THE BOTTOM CORNERS AND THROW TO THE CENTER TOP
    // This creates the classic Fruit Ninja "X" pattern crossing the camera middle
    const side = Phaser.Math.Between(0, 1); // 0 = Left, 1 = Right
    const x = side === 0 ? Phaser.Math.Between(50, 200) : Phaser.Math.Between(this.scale.width - 200, this.scale.width - 50);
    const y = this.scale.height - 20; // Start inside the screen to ensure visibility

    
    // Aim for the top-center area
    const targetX = this.scale.width / 2 + Phaser.Math.Between(-150, 150);
    const velocityX = (targetX - x) * (1.5 + Math.random());
    
    // Further decreased vertical push for much more relaxed gameplay
    const velocityY = Phaser.Math.Between(-900, -1200) * Math.min(this.difficultyMultiplier, 1.3);



    const isBomb = Phaser.Math.Between(1, 100) <= 15;
    const textureKey = isBomb ? BOMB : Phaser.Utils.Array.GetRandom(FRUITS);
    
    // Add to group IMMEDIATELY to avoid property resets
    const sprite = this.physics.add.sprite(x, y, textureKey);
    this.fruitsGroup.add(sprite);

    const targetSize = 120;
    const scaleFactor = targetSize / (sprite.width || targetSize);
    sprite.setScale(scaleFactor);

    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(velocityX, velocityY);
    // Adjusted additional gravity boost (total 900 with world gravity)
    body.setGravityY(200); 
    
    body.setCircle(targetSize / 2);

    this.tweens.add({
      targets: sprite,
      angle: Phaser.Math.Between(180, 360) * (Phaser.Math.Between(0, 1) ? 1 : -1),
      duration: 3000,
      repeat: -1
    });

    sprite.setData('isBomb', isBomb);
    console.log(`Spawned ${textureKey} at x=${Math.round(x)}, y=${Math.round(y)}`);
  }

  update(_time: number, delta: number) {
    if (!this.pointerPos) {
      this.trailGraphics.clear();
      this.pointerHistory = [];
      if (this.gameState === 'START') {
        this.hoverTimer = Math.max(0, this.hoverTimer - delta * 2);
        this.updateStartProgress();
      }
      return;
    }

    const { x, y } = this.pointerPos;
    const scaledX = this.scale.width - (x * this.scale.width);
    const scaledY = y * this.scale.height;

    // Glowing Trail Logic
    this.pointerHistory.push({ x: scaledX, y: scaledY });
    if (this.pointerHistory.length > 20) {
      this.pointerHistory.shift();
    }

    if (this.gameState === 'PLAYING') {
      this.trailGraphics.clear();
      
      // Outer Glow
      for (let i = 0; i < this.pointerHistory.length; i++) {
        const pt = this.pointerHistory[i];
        const alpha = (i + 1) / this.pointerHistory.length;
        // Make the trail much more slender and precise
        const size = 2 + (i * 0.8);
        this.trailGraphics.fillStyle(0x34d399, alpha * 0.3);
        this.trailGraphics.fillCircle(pt.x, pt.y, size * 2);
      }

      // Connecting Vibrant Line
      this.trailGraphics.lineStyle(8, 0x10b981, 0.8);
      this.trailGraphics.beginPath();
      this.pointerHistory.forEach((pt, i) => {
        if (i === 0) this.trailGraphics.moveTo(pt.x, pt.y);
        else this.trailGraphics.lineTo(pt.x, pt.y);
      });
      this.trailGraphics.strokePath();

      // Narrower Leading Core
      this.trailGraphics.fillStyle(0xffffff, 1.0);
      this.trailGraphics.fillCircle(scaledX, scaledY, 6);
      this.trailGraphics.setBlendMode(Phaser.BlendModes.ADD);

    } else {
      this.trailGraphics.clear();
      this.pointerHistory = [];
    }

    if (this.gameState === 'START') {
      const dist = Phaser.Math.Distance.Between(scaledX, scaledY, this.startButton.x, this.startButton.y);
      if (dist < 100) {
        this.hoverTimer += delta;
        if (this.hoverTimer >= this.HOVER_TIME_REQUIRED) {
          this.startGame();
        }
      } else {
        this.hoverTimer = Math.max(0, this.hoverTimer - delta * 2);
      }
      this.updateStartProgress();
    } else if (this.gameState === 'PLAYING') {
      this.checkSlices(scaledX, scaledY);
      this.cleanupFruits();
    }
  }

  updateStartProgress() {
    if (!this.startProgress || !this.startProgress.active) return;
    const progress = Phaser.Math.Clamp(this.hoverTimer / this.HOVER_TIME_REQUIRED, 0, 1);
    this.startProgress.setRadius(progress * 100);
  }

  checkSlices(scaledX: number, scaledY: number) {
    this.fruitsGroup.getChildren().forEach((b) => {
      const body = (b as Phaser.Physics.Arcade.Sprite).body;
      if (!body) return;
      
      const sprite = b as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(scaledX, scaledY, sprite.x, sprite.y);

      // Reduced hit radius from 70 to 50 for a tighter slicing feel
      if (dist < 50) {
        const isBomb = sprite.getData('isBomb');
        
        if (isBomb) {
          this.endGame(true);
        } else {
          this.score += 10;
          this.game.events.emit('score_updated', this.score);

          // slice effect
          const sliceEffect = this.add.graphics();
          sliceEffect.lineStyle(6, 0xffffff, 1);
          sliceEffect.strokeCircle(sprite.x, sprite.y, 60);
          this.tweens.add({
            targets: sliceEffect,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => sliceEffect.destroy()
          });

          // SPLIT INTO TWO HALVES
          const texWidth = sprite.texture.getSourceImage().width;
          const texHeight = sprite.texture.getSourceImage().height;
          const currentVel = sprite.body?.velocity || { x: 0, y: 0 };
          
          // Left Half
          const leftHalf = this.physics.add.sprite(sprite.x, sprite.y, sprite.texture.key);
          leftHalf.setDisplaySize(120, 120);
          leftHalf.setCrop(0, 0, texWidth / 2, texHeight);
          (leftHalf.body as Phaser.Physics.Arcade.Body).setVelocity(currentVel.x - 200, currentVel.y - 100);
          (leftHalf.body as Phaser.Physics.Arcade.Body).setGravityY(1000);
          leftHalf.setAngularVelocity(-200);

          // Right Half
          const rightHalf = this.physics.add.sprite(sprite.x, sprite.y, sprite.texture.key);
          rightHalf.setDisplaySize(120, 120);
          rightHalf.setCrop(texWidth / 2, 0, texWidth / 2, texHeight);
          (rightHalf.body as Phaser.Physics.Arcade.Body).setVelocity(currentVel.x + 200, currentVel.y - 100);
          (rightHalf.body as Phaser.Physics.Arcade.Body).setGravityY(1000);
          rightHalf.setAngularVelocity(200);

          // Fade out the halves over time
          this.tweens.add({
            targets: [leftHalf, rightHalf],
            alpha: 0,
            duration: 1000,
            delay: 500,
            onComplete: () => {
              leftHalf.destroy();
              rightHalf.destroy();
            }
          });

          sprite.destroy();
        }
      }
    });
  }

  cleanupFruits() {
    this.fruitsGroup.getChildren().forEach(b => {
      const sprite = b as Phaser.Physics.Arcade.Sprite;
      // Use extremely large buffer distance (500) so they NEVER delete prematurely on spawn
      if (sprite.y > this.scale.height + 500) {
        sprite.destroy();
      }
    });
  }

  updatePointer(pos: {x: number, y: number} | null) {
    this.pointerPos = pos;
  }
}
