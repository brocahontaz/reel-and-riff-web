/**
 * The focused fishing activity at a registered spot. Adapted from the original
 * whole-game scene: same loop, now framed by the overworld with an idle exit.
 */

import Phaser from 'phaser';
import { playBeat, playCoins, playOutcome, playRiff } from '../audio/riffAudio';
import { FISH } from '../content/fish';
import {
  DEFAULT_SPOT_ID,
  FISHING_SPOTS,
  fishingSpotById,
  type FishingSpotInfo,
} from '../content/fishingSpots';
import { advanceBeat, consumeBeat, createBeatClock, type BeatClock } from '../game/beat';
import {
  beginCast,
  biteHooked,
  createFishingState,
  expireHook,
  finishCast,
  flub,
  flubRest,
  hookWindow,
  missNote,
  passRest,
  rhythmHit,
  setHook,
  type FishingState,
  type ReelModifiers,
} from '../game/fishing';
import {
  baseInterval,
  fightModifiers,
  isPlayable,
  patternGlyphs,
  stepAt,
  stepInterval,
} from '../game/rhythm';
import { biteDelay, pickFish, rollWeight } from '../game/encounter';
import { createRng } from '../game/rng';
import { catchReward } from '../game/rewards';
import { lureById, rodById, sanitizePlayer } from '../game/tackle';
import { INTERACT_KEY } from '../input/keys';
import { bindFishingAction, bindPanelKeys } from '../input/keyboard';
import { loadPlayer, saveCatch, savePlayer, type PlayerState } from '../persistence/playerStorage';
import {
  equippedSummary,
  handleShopDigit,
  journalLines,
  playerChanged,
  shopLines,
  type Overlay,
} from '../ui/panels';
import { fishingVisualForPhase } from '../ui/fishingVisuals';
import { FISH_INFO_WIDTH, formatFishInfo } from '../ui/fishInfo';

const W = 960;
const H = 600;
const PANEL = { x: 210, y: 150, width: 540, height: 280 };
const ROD_TIP = { x: 245, y: 330 };

export class FishingScene extends Phaser.Scene {
  private spot: FishingSpotInfo = FISHING_SPOTS[0];
  private state: FishingState = createFishingState();
  private player: PlayerState = sanitizePlayer(loadPlayer());
  private texts: Record<string, Phaser.GameObjects.Text> = {};
  private castClock = 0;
  private biteClock = 0;
  private hookClock = 0;
  private beatClock: BeatClock = createBeatClock();
  private windowKind: 'note' | 'rest' | undefined;
  private windowConsumed = false;
  private castDir = 1;
  private lostReason: 'snap' | 'spat' = 'snap';
  private overlay: Overlay = 'none';
  private panelMessage = '';
  private transitioning = false;
  private rng = createRng(Date.now() % 2147483647);
  private fish!: Phaser.GameObjects.Ellipse;
  private fishTail!: Phaser.GameObjects.Triangle;
  private fishingLine!: Phaser.GameObjects.Graphics;
  private bobber!: Phaser.GameObjects.Arc;
  private panelBg!: Phaser.GameObjects.Graphics;
  private panelText!: Phaser.GameObjects.Text;
  private exitHint!: Phaser.GameObjects.Text;

  constructor() {
    super('fishing');
  }
  init(data: { spotId?: string }) {
    // Unknown ids fall back to the first registry entry without any fuss.
    this.spot = fishingSpotById(data.spotId ?? DEFAULT_SPOT_ID) ?? FISHING_SPOTS[0];
  }
  create() {
    // A restarted scene reuses its instance: reset everything run-scoped.
    this.state = createFishingState();
    this.player = sanitizePlayer(loadPlayer());
    this.overlay = 'none';
    this.panelMessage = '';
    this.transitioning = false;
    this.castClock = 0;
    this.castDir = 1;
    this.lostReason = 'snap';
    this.beatClock = createBeatClock();
    this.windowKind = undefined;
    this.windowConsumed = false;
    this.drawWorld();
    bindFishingAction(this.input.keyboard!, () => this.action());
    bindPanelKeys(this.input.keyboard!, {
      onShop: () => this.toggleOverlay('shop'),
      onJournal: () => this.toggleOverlay('journal'),
      onClose: () => {
        if (this.overlay !== 'none') {
          this.closeOverlay();
          return;
        }
        this.exitToOverworld();
      },
      onDigit: (digit) => this.shopDigit(digit),
    });
    this.input.keyboard!.addKey(INTERACT_KEY).on('down', () => this.exitToOverworld());
    this.cameras.main.fadeIn(200);
    this.showReady();
  }
  update(_time: number, delta: number) {
    const seconds = delta / 1000;
    this.drawFishingLine();
    this.exitHint.setAlpha(this.isIdle() ? 0.9 : 0.35);
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
          : 'Something took the bait!',
      );
      if (this.biteClock <= 0) this.hookBite();
    }
    if (this.state.phase === 'biting') {
      this.hookClock -= seconds;
      const bars = Math.max(0, Math.round((this.hookClock / hookWindow(this.state.fish!)) * 14));
      this.set('status', `${this.state.fish!.name.toUpperCase()}!  HOOK IT — SPACE!`);
      this.set('meter', `HOOK ${'▰'.repeat(bars)}${'▱'.repeat(14 - bars)}`);
      if (this.hookClock <= 0) {
        this.state = expireHook(this.state);
        this.lostReason = 'spat';
        this.finishIfNeeded();
      }
    }
    if (this.state.phase === 'reeling') {
      const fish = this.state.fish!;
      const wasReady = this.beatClock.ready;
      this.beatClock = advanceBeat(this.beatClock, seconds, baseInterval(fish));
      let fired = false;
      if (this.beatClock.ready && !wasReady) {
        fired = true;
        this.windowConsumed = false;
        const step = stepAt(fish, this.state.step);
        this.windowKind = isPlayable(step) ? 'note' : 'rest';
        if (this.windowKind === 'rest') {
          this.set('beat', '·  REST — HOLD!');
        } else {
          this.set('beat', step === 'burst' ? '♪!  SPEED UP!' : '♪  PLAY!');
          this.tweens.add({
            targets: this.fish,
            scale: 1.15,
            duration: step === 'burst' ? 80 : 120,
            yoyo: true,
          });
        }
        playBeat(step);
      }
      if (!fired && wasReady && !this.beatClock.ready && !this.windowConsumed) {
        if (this.windowKind === 'rest') {
          this.state = passRest(this.state);
          this.set('beat', '·');
        } else {
          this.state = missNote(this.state, this.fightMods());
          this.set('beat', '♪  MISSED!');
          playRiff(false, 0);
        }
        this.beatClock = consumeBeat(this.beatClock, stepInterval(fish, this.state.step));
        this.windowKind = undefined;
        this.finishIfNeeded();
      }
      const filled = Math.round(this.state.progress * 14);
      const bar = '▰'.repeat(filled) + '▱'.repeat(14 - filled);
      this.set(
        'meter',
        `REEL  ${bar}   TENSION ${Math.round(this.state.tension * 100)}%  NEXT ${patternGlyphs(
          fish,
          this.state.step,
        )}`,
      );
    }
  }
  private isPhaseIdle(): boolean {
    return (
      this.state.phase === 'ready' || this.state.phase === 'caught' || this.state.phase === 'lost'
    );
  }
  private isIdle(): boolean {
    return !this.transitioning && this.overlay === 'none' && this.isPhaseIdle();
  }
  private fightMods(): ReelModifiers {
    return fightModifiers(rodById(this.player.rod), this.state.fish!);
  }
  private action() {
    if (this.overlay !== 'none' || this.transitioning) return;
    if (
      this.state.phase === 'ready' ||
      this.state.phase === 'caught' ||
      this.state.phase === 'lost'
    ) {
      this.state = beginCast(this.state);
      this.castClock = 0;
      this.castDir = 1;
      this.lostReason = 'snap';
      this.set('status', 'Tap SPACE when the power feels right — deep casts reach rare fish.');
      this.set('meter', 'CAST POWER  ▱▱▱▱▱▱▱▱▱▱▱▱▱▱');
      this.set('beat', '');
      this.set('fishInfo', '');
      return;
    }
    if (this.state.phase === 'casting') {
      this.state = finishCast(this.state, this.castClock);
      this.biteClock = biteDelay(this.state.castPower, this.rng, false);
      this.set('status', 'Line away! Wait for a bite...');
      this.set('beat', '');
      return;
    }
    if (this.state.phase === 'waiting') {
      // Too eager: the ripples scare the fish and the water needs longer to settle.
      this.biteClock = biteDelay(this.state.castPower, this.rng, true);
      this.set('status', 'Too eager! The ripples scared it deeper...');
      playRiff(false, 0);
      return;
    }
    if (this.state.phase === 'biting') {
      this.state = setHook(this.state);
      this.windowKind = undefined;
      this.windowConsumed = false;
      this.beatClock = consumeBeat(this.beatClock, stepInterval(this.state.fish!, 0) + 0.35);
      playRiff(true, 0);
      this.set('status', `${this.state.fish!.name} hooked! SPACE on the pulse to reel it in.`);
      this.set('beat', '');
      this.tweens.add({ targets: this.fish, scale: 1.3, duration: 90, yoyo: true });
      return;
    }
    if (this.state.phase === 'reeling') {
      const fish = this.state.fish!;
      if (!this.beatClock.ready) {
        this.state = flub(this.state);
        this.set('beat', '♭ TOO EARLY...');
        playRiff(false, 0);
        this.finishIfNeeded();
        return;
      }
      this.windowConsumed = true;
      if (this.windowKind === 'rest') {
        this.state = flubRest(this.state, this.fightMods());
        this.set('beat', '♭ REST! HOLD...');
        playRiff(false, 0);
        this.finishIfNeeded();
        return;
      }
      const accuracy = Math.min(1, this.beatClock.remaining / 0.6);
      this.state = rhythmHit(this.state, accuracy, this.fightMods());
      this.beatClock = consumeBeat(this.beatClock, stepInterval(fish, this.state.step));
      playRiff(accuracy >= 0.6, this.state.combo);
      this.set('beat', accuracy >= 0.6 ? '✦ NICE RIFF! ✦' : '♭ OFF BEAT...');
      this.finishIfNeeded();
    }
  }
  /** E / ESC while idle: fade back to the overworld. One exit per press. */
  private exitToOverworld() {
    if (!this.isIdle()) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 8, 26, 43);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('overworld', { from: 'fishing' });
    });
  }
  private hookBite() {
    if (this.state.phase !== 'waiting') return;
    const fish = pickFish(this.state.castPower, this.rng, lureById(this.player.lure));
    const weight = rollWeight(fish, this.state.castPower, this.rng);
    this.state = biteHooked(this.state, fish, weight);
    this.hookClock = hookWindow(fish);
    this.set('fishInfo', formatFishInfo(fish));
    this.fish.setFillStyle(fish.color).setVisible(true);
    this.fishTail.setFillStyle(fish.color).setVisible(true);
    this.tweens.add({ targets: this.fish, scale: 1.2, duration: 110, yoyo: true });
  }
  private finishIfNeeded() {
    if (this.state.phase === 'caught') {
      const fish = this.state.fish!;
      const weight = this.state.weight!;
      const perfect = this.state.misses === 0;
      const newSpecies = !this.player.species[fish.id];
      const result = catchReward(fish, weight, perfect, newSpecies, lureById(this.player.lure));
      this.player = saveCatch(this.player, fish.id, fish.name, weight, result.coins);
      playOutcome(true);
      if (newSpecies) playCoins();
      this.set('status', `You landed the ${fish.name}!${perfect ? '  PERFECT RIFF!' : ''}`);
      this.set(
        'beat',
        `+${result.coins}c   ${weight.toFixed(1)} kg${perfect ? '   x1.5' : ''}${result.newSpecies ? '   NEW SPECIES!' : ''}`,
      );
      this.showScore();
      this.fish.setVisible(false);
      this.fishTail.setVisible(false);
    } else if (this.state.phase === 'lost') {
      playOutcome(false);
      const fish = this.state.fish!;
      this.set(
        'status',
        this.lostReason === 'spat'
          ? `The ${fish.name} spat the hook. Set it faster next time!`
          : `The ${fish.name} slipped away. Keep the tension low!`,
      );
      this.set('beat', this.lostReason === 'spat' ? 'IT GOT AWAY' : 'THE LINE SNAPPED');
      this.fish.setVisible(false);
      this.fishTail.setVisible(false);
    }
  }
  private showScore() {
    const species = Object.keys(this.player.species).length;
    this.set(
      'score',
      `${this.player.coins}c   CATCHES ${this.player.catches}   BEST ${this.player.bestWeight.toFixed(1)} kg   ${species}/${FISH.length}`,
    );
  }
  private toggleOverlay(kind: Exclude<Overlay, 'none'>) {
    if (this.transitioning || !this.isPhaseIdle()) return;
    if (this.overlay === kind) {
      this.closeOverlay();
      return;
    }
    this.overlay = kind;
    this.panelMessage = '';
    this.renderPanel();
  }
  private closeOverlay() {
    if (this.overlay === 'none') return;
    this.overlay = 'none';
    this.panelBg.setVisible(false);
    this.panelText.setVisible(false);
  }
  private shopDigit(digit: number) {
    if (this.overlay !== 'shop') return;
    const result = handleShopDigit(this.player, digit);
    this.panelMessage = result.message;
    if (playerChanged(this.player, result.player)) {
      this.player = savePlayer(result.player);
      this.showScore();
      this.set('gear', equippedSummary(this.player));
    }
    this.renderPanel();
  }
  private renderPanel() {
    if (this.overlay === 'none') {
      this.panelBg.setVisible(false);
      this.panelText.setVisible(false);
      return;
    }
    const lines = this.overlay === 'shop' ? shopLines(this.player) : journalLines(this.player);
    if (this.panelMessage) lines.splice(lines.length - 1, 0, '', this.panelMessage);
    this.panelBg.clear();
    this.panelBg
      .fillStyle(0x0c253d, 0.94)
      .fillRoundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 12);
    this.panelBg
      .lineStyle(2, 0xf4b942, 0.9)
      .strokeRoundedRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, 12);
    this.panelBg.setVisible(true);
    this.panelText.setText(lines.join('\n')).setVisible(true);
  }
  private set(name: string, value: string) {
    this.texts[name]?.setText(value);
  }

  /** Focused waterside backdrop: dark water, ripples, a dock strip and the moon. */
  private drawWorld() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x142d4a, 0x142d4a, 0x0c253d, 0x0c253d, 1);
    g.fillRect(0, 0, W, H);
    // Static ripple arcs.
    g.lineStyle(2, 0x3e89a0, 0.45);
    const ripples: [number, number, number][] = [
      [520, 250, 60],
      [560, 255, 90],
      [180, 170, 46],
      [205, 174, 72],
      [760, 470, 52],
      [795, 474, 80],
    ];
    for (const [cx, cy, radius] of ripples) {
      g.beginPath();
      g.arc(cx, cy, radius, Phaser.Math.DegToRad(160), Phaser.Math.DegToRad(20), false);
      g.strokePath();
    }
    // Moon top-right.
    g.fillStyle(0xf4b942, 0.16);
    g.fillCircle(858, 82, 54);
    g.fillStyle(0xf4b942, 1);
    g.fillCircle(858, 82, 40);
    // Dock strip along the bottom-left; the rod anchor sits on its top edge.
    const dock = { x: 40, y: 330, width: 300, height: 120 };
    g.fillStyle(0x8a5a33, 1);
    g.fillRect(dock.x, dock.y, dock.width, dock.height);
    g.lineStyle(3, 0x6e4526, 1);
    for (let py = dock.y + 22; py < dock.y + dock.height; py += 22) {
      g.beginPath();
      g.moveTo(dock.x, py);
      g.lineTo(dock.x + dock.width, py);
      g.strokePath();
    }
    g.lineStyle(2, 0x543418, 1);
    g.strokeRect(dock.x, dock.y, dock.width, dock.height);
    // Rod: butt on the planks, tip where the fishing line starts.
    g.lineStyle(3, 0x543418, 1);
    g.beginPath();
    g.moveTo(225, 385);
    g.lineTo(ROD_TIP.x, ROD_TIP.y);
    g.strokePath();
    g.fillStyle(0x543418, 1);
    g.fillCircle(232, 362, 5);

    this.add.text(620, 26, this.spot.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f4b942',
      fontStyle: 'bold',
    });
    this.add.text(620, 54, this.spot.tagline, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#a9d6e5',
    });
    this.add.text(620, 74, 'SPACE cast · S shop · C journal', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#a9d6e5',
    });
    this.texts.gear = this.add.text(620, 94, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#7fb2c4',
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
    this.exitHint = this.add
      .text(944, 552, 'E — back to shore', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#7fb2c4',
      })
      .setOrigin(1, 0);
    this.fish = this.add.ellipse(735, 350, 72, 32, 0x5cc8d7).setVisible(false);
    this.fishTail = this.add.triangle(690, 350, 0, -16, 0, 16, -35, 0, 0x5cc8d7).setVisible(false);
    this.fishingLine = this.add.graphics();
    this.bobber = this.add.circle(400, 420, 7, 0xf4b942).setVisible(false);
    this.panelBg = this.add.graphics().setVisible(false);
    this.panelText = this.add.text(PANEL.x + 22, PANEL.y + 18, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#f7f3e3',
      lineSpacing: 6,
    });
  }
  private drawFishingLine() {
    const visual = fishingVisualForPhase(this.state.phase);
    this.fishingLine.clear();
    this.bobber.setVisible(visual.visible);
    if (!visual.visible) return;
    this.fishingLine.lineStyle(2, 0xa9d6e5, 0.8);
    this.fishingLine.beginPath();
    this.fishingLine.moveTo(ROD_TIP.x, ROD_TIP.y);
    this.fishingLine.lineTo(visual.targetX, visual.targetY);
    this.fishingLine.strokePath();
    this.bobber.setPosition(visual.targetX, visual.targetY);
  }
  private showReady() {
    this.set('status', 'Press SPACE to cast. Deep casts reach rarer fish!');
    this.set('meter', '');
    this.set('beat', '');
    this.set('gear', equippedSummary(this.player));
    this.showScore();
  }
}
