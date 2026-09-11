import Phaser from 'phaser';
import { playOutcome, playRiff } from './audio/riffAudio';
import { FISH } from './content/fish';
import { MOONLIT_COVE } from './content/location';
import { advanceBeat, consumeBeat, createBeatClock, type BeatClock } from './game/beat';
import {
  beginCast,
  createFishingState,
  finishCast,
  rhythmHit,
  startReel,
  type FishingState,
} from './game/fishing';
import { bindFishingAction } from './input/keyboard';
import { loadPlayer, saveCatch, type PlayerState } from './persistence/playerStorage';
import { fishingVisualForPhase } from './ui/fishingVisuals';
import { FISH_INFO_WIDTH, formatFishInfo } from './ui/fishInfo';
import './style.css';

const W = 960;
const H = 600;
class LakeScene extends Phaser.Scene {
  private state: FishingState = createFishingState();
  private player: PlayerState = loadPlayer();
  private texts: Record<string, Phaser.GameObjects.Text> = {};
  private castClock = 0;
  private biteClock = 0;
  private beatClock: BeatClock = createBeatClock();
  private castDir = 1;
  private fish!: Phaser.GameObjects.Ellipse;
  private fishTail!: Phaser.GameObjects.Triangle;
  private fishingLine!: Phaser.GameObjects.Graphics;
  private bobber!: Phaser.GameObjects.Arc;

  constructor() {
    super('lake');
  }
  create() {
    this.drawWorld();
    bindFishingAction(this.input.keyboard!, () => this.action());
    this.showReady();
  }
  update(_time: number, delta: number) {
    const seconds = delta / 1000;
    this.drawFishingLine();
    if (this.state.phase === 'casting') {
      this.castClock = Math.max(0, Math.min(1, this.castClock + this.castDir * seconds * 0.9));
      if (this.castClock >= 1 || this.castClock <= 0) this.castDir *= -1;
      this.set(
        'meter',
        `CAST POWER  ${'▰'.repeat(Math.round(this.castClock * 14))}${'▱'.repeat(14 - Math.round(this.castClock * 14))}`,
      );
    }
    if (this.state.phase === 'waiting') {
      this.biteClock -= seconds;
      this.set(
        'status',
        this.biteClock > 0
          ? `The lake is listening...  ${Math.ceil(this.biteClock)}s`
          : 'A bite! Press SPACE to set the hook!',
      );
      if (this.biteClock <= 0) this.bite();
    }
    if (this.state.phase === 'reeling') {
      const interval = Math.max(0.65, 1.15 - this.state.fish!.difficulty * 0.12);
      const wasReady = this.beatClock.ready;
      this.beatClock = advanceBeat(this.beatClock, seconds, interval);
      if (this.beatClock.ready && !wasReady) {
        this.set('beat', '♪  PLAY THE BEAT  ♪');
        this.tweens.add({ targets: this.fish, scale: 1.15, duration: 120, yoyo: true });
      }
      this.set(
        'meter',
        `REEL  ${'▰'.repeat(Math.round(this.state.progress * 14))}${'▱'.repeat(14 - Math.round(this.state.progress * 14))}   TENSION ${Math.round(this.state.tension * 100)}%`,
      );
    }
  }
  private action() {
    if (
      this.state.phase === 'ready' ||
      this.state.phase === 'caught' ||
      this.state.phase === 'lost'
    ) {
      this.state = beginCast(this.state);
      this.castClock = 0;
      this.castDir = 1;
      this.set('status', 'Tap SPACE when the power feels right.');
      this.set('meter', 'CAST POWER  ▱▱▱▱▱▱▱▱▱▱▱▱▱▱');
      this.set('beat', '');
      return;
    }
    if (this.state.phase === 'casting') {
      this.state = finishCast(this.state, this.castClock);
      this.biteClock = 2.2;
      this.set('status', 'Line away! Wait for a bite...');
      this.set('beat', '');
      return;
    }
    if (this.state.phase === 'waiting') {
      this.bite();
      return;
    }
    if (this.state.phase === 'reeling') {
      if (!this.beatClock.ready) {
        this.set('beat', '♭ WAIT FOR THE BEAT...');
        return;
      }
      const accuracy = this.beatClock.ready ? Math.min(1, this.beatClock.remaining / 0.6) : 0;
      this.state = rhythmHit(this.state, accuracy);
      this.beatClock = consumeBeat(
        this.beatClock,
        Math.max(0.65, 1.15 - this.state.fish!.difficulty * 0.12),
      );
      playRiff(accuracy >= 0.6);
      this.set('beat', accuracy >= 0.6 ? '✦ NICE RIFF! ✦' : '♭ OFF BEAT...');
      this.finishIfNeeded();
    }
  }
  private bite() {
    if (this.state.phase !== 'waiting') return;
    const index = Math.min(FISH.length - 1, Math.floor((1 - this.state.castPower) * FISH.length));
    const fish = FISH[index];
    const weight =
      fish.minWeight + (fish.maxWeight - fish.minWeight) * (0.35 + this.state.castPower * 0.5);
    this.state = startReel(this.state, fish, Number(weight.toFixed(1)));
    this.beatClock = createBeatClock(1);
    this.set('status', `${fish.name} on the line! Follow the pulse and press SPACE.`);
    this.set('fishInfo', formatFishInfo(fish));
    this.fish.setFillStyle(fish.color).setVisible(true);
    this.fishTail.setFillStyle(fish.color).setVisible(true);
  }
  private finishIfNeeded() {
    if (this.state.phase === 'caught') {
      this.player = saveCatch(this.player, this.state.fish!.name, this.state.weight!);
      playOutcome(true);
      this.set('status', `You landed the ${this.state.fish!.name}!`);
      this.set('beat', `✦ ${this.state.weight!.toFixed(1)} kg catch ✦`);
      this.set(
        'score',
        `CATCHES ${this.player.catches}   BEST ${this.player.bestWeight.toFixed(1)} kg`,
      );
      this.fish.setVisible(false);
      this.fishTail.setVisible(false);
    } else if (this.state.phase === 'lost') {
      playOutcome(false);
      this.set('status', `The ${this.state.fish!.name} slipped away. Keep the tension low!`);
      this.set('beat', 'THE LINE SNAPPED');
      this.fish.setVisible(false);
      this.fishTail.setVisible(false);
    }
  }
  private set(name: string, value: string) {
    this.texts[name]?.setText(value);
  }
  private drawWorld() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x142d4a, 0x142d4a, 0x1b5e75, 0x1b5e75, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x0c253d).fillRect(0, 390, W, 210);
    g.fillStyle(0xf4b942).fillCircle(820, 95, 46);
    g.fillStyle(0x163b52).fillTriangle(0, 390, 180, 220, 360, 390);
    g.fillStyle(0x1a4960).fillTriangle(250, 390, 490, 190, 730, 390);
    g.lineStyle(3, 0x3e89a0).strokeLineShape(new Phaser.Geom.Line(0, 435, W, 435));
    this.add.text(42, 28, 'REEL & RIFF', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#f4b942',
      fontStyle: 'bold',
    });
    this.add.text(44, 70, 'A fishing song in three beats', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#a9d6e5',
    });
    this.add.text(640, 34, MOONLIT_COVE.name, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f7f3e3',
      fontStyle: 'bold',
    });
    this.add.text(640, 62, MOONLIT_COVE.controls, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#a9d6e5',
    });
    this.texts.status = this.add.text(48, 470, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f7f3e3',
    });
    this.texts.meter = this.add.text(48, 510, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#f4b942',
    });
    this.texts.beat = this.add.text(48, 550, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffdb70',
    });
    this.texts.fishInfo = this.add.text(640, 470, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#a9d6e5',
      wordWrap: { width: FISH_INFO_WIDTH },
    });
    this.texts.score = this.add.text(640, 510, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#a9d6e5',
    });
    this.fish = this.add.ellipse(735, 350, 72, 32, 0x5cc8d7).setVisible(false);
    this.fishTail = this.add.triangle(690, 350, 0, -16, 0, 16, -35, 0, 0x5cc8d7).setVisible(false);
    this.fishingLine = this.add.graphics();
    this.bobber = this.add.circle(400, 420, 7, 0xf4b942).setVisible(false);
  }
  private drawFishingLine() {
    const visual = fishingVisualForPhase(this.state.phase);
    this.fishingLine.clear();
    this.bobber.setVisible(visual.visible);
    if (!visual.visible) return;
    this.fishingLine.lineStyle(2, 0xa9d6e5, 0.8);
    this.fishingLine.beginPath();
    this.fishingLine.moveTo(245, 330);
    this.fishingLine.lineTo(visual.targetX, visual.targetY);
    this.fishingLine.strokePath();
    this.bobber.setPosition(visual.targetX, visual.targetY);
  }
  private showReady() {
    this.set('status', 'Press SPACE to cast your line.');
    this.set('meter', '');
    this.set('beat', '');
    this.set(
      'score',
      `CATCHES ${this.player.catches}   BEST ${this.player.bestWeight.toFixed(1)} kg`,
    );
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#142d4a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: LakeScene,
});
