/**
 * The guitar practice minigame on the cabin mat: the fishing reeling loop's
 * beat clock driving a pure practice state machine over a song's steps.
 */

import Phaser from 'phaser';
import { playBeat, playOutcome, playRiff } from '../audio/riffAudio';
import { SONGS, songById, type Song } from '../content/songs';
import {
  createPracticeState,
  passRest,
  practiceGlyphs,
  practiceHit,
  practiceMiss,
  practiceResult,
  startPractice,
  stepKind,
  type PracticeState,
  type PracticeGrade,
} from '../game/guitar';
import { advanceBeat, consumeBeat, createBeatClock, type BeatClock } from '../game/beat';
import { BACK_KEY, INTERACT_KEY } from '../input/keys';
import { bindFishingAction } from '../input/keyboard';
import { createFade } from './walkUi';

const W = 960;
const H = 600;
const RESULT_PANEL = { x: 230, y: 150, width: 500, height: 260 };
const GRADE_COLORS: Record<PracticeGrade, number> = {
  gold: 0xf4b942,
  silver: 0xc9d3dc,
  bronze: 0xb0793f,
};
const GRADE_FLAVOR: Record<PracticeGrade, string> = {
  gold: 'The strings sing — June would be proud.',
  silver: 'Solid chords. A little polish and they shine.',
  bronze: 'Rough edges, but the fingers remember.',
};

export class PracticeScene extends Phaser.Scene {
  private song: Song = SONGS[0];
  private returnTo: string = 'home';
  private practice: PracticeState = createPracticeState(SONGS[0]);
  private result: ReturnType<typeof practiceResult> | undefined;
  private beatClock: BeatClock = createBeatClock();
  private windowKind: 'note' | 'burst' | 'rest' | undefined;
  private windowConsumed = false;
  private fade!: ReturnType<typeof createFade>;
  private glyph!: Phaser.GameObjects.Text;
  private trail!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private readyTitle!: Phaser.GameObjects.Text;
  private readyDesc!: Phaser.GameObjects.Text;
  private resultPanel!: Phaser.GameObjects.Graphics;
  private resultTitle!: Phaser.GameObjects.Text;
  private resultLines!: Phaser.GameObjects.Text;
  private resultGrade!: Phaser.GameObjects.Text;
  private resultFlavor!: Phaser.GameObjects.Text;

  constructor() {
    super('practice');
  }
  init(data: { songId?: string; returnTo?: 'home' | 'overworld' }) {
    this.song = songById(data.songId ?? 'lakeside') ?? SONGS[0];
    this.returnTo = data.returnTo ?? 'home';
  }
  create() {
    // A restarted scene reuses its instance: reset everything run-scoped.
    this.practice = createPracticeState(this.song);
    this.result = undefined;
    this.beatClock = createBeatClock();
    this.windowKind = undefined;
    this.windowConsumed = false;
    this.drawStage();
    bindFishingAction(this.input.keyboard!, () => this.action());
    this.input.keyboard!.addKey(INTERACT_KEY).on('down', () => this.onBack());
    this.input.keyboard!.addKey(BACK_KEY).on('down', () => this.onBack());
    this.cameras.main.fadeIn(200);
    this.syncPhase();
  }
  update(_time: number, delta: number) {
    if (this.practice.phase !== 'playing') return;
    const seconds = delta / 1000;
    const wasReady = this.beatClock.ready;
    this.beatClock = advanceBeat(this.beatClock, seconds, this.song.interval);
    let fired = false;
    if (this.beatClock.ready && !wasReady) {
      fired = true;
      this.windowConsumed = false;
      const step = stepKind(this.song, this.practice.step);
      this.windowKind = step;
      if (step === 'rest') {
        this.glyph.setText('·  (hold)').setColor('#a9d6e5');
      } else {
        this.glyph
          .setText(step === 'burst' ? '♪!' : '♪')
          .setColor('#ffdb70')
          .setScale(1);
        this.tweens.add({
          targets: this.glyph,
          scale: 1.25,
          duration: step === 'burst' ? 80 : 120,
          yoyo: true,
        });
      }
      playBeat(step);
    }
    if (!fired && wasReady && !this.beatClock.ready && !this.windowConsumed) {
      if (this.windowKind === 'rest') {
        this.practice = passRest(this.practice);
        this.glyph.setText('·').setColor('#a9d6e5');
      } else {
        this.practice = practiceMiss(this.practice);
        this.glyph.setText('♪  MISSED!').setColor('#a9d6e5');
        playRiff(false, 0);
      }
      this.beatClock = consumeBeat(this.beatClock, this.song.interval);
      this.windowKind = undefined;
      this.settleIfDone();
    }
    this.refreshProgress();
  }
  private action() {
    if (this.practice.phase === 'ready') {
      this.practice = startPractice(this.practice);
      this.beatClock = createBeatClock();
      this.windowKind = undefined;
      this.windowConsumed = false;
      this.syncPhase();
      return;
    }
    if (this.practice.phase === 'playing') {
      if (!this.beatClock.ready) {
        // Too early: a wrong note rings out but the step does not advance.
        playRiff(false, this.practice.combo);
        this.glyph.setText('♭ TOO EARLY').setColor('#a9d6e5');
        return;
      }
      this.windowConsumed = true;
      const accuracy = Math.min(1, this.beatClock.remaining / 0.6);
      const rest = this.windowKind === 'rest';
      this.practice = practiceHit(this.practice, accuracy);
      if (rest) {
        this.glyph.setText('♭ REST — HOLD!').setColor('#a9d6e5');
        playRiff(false, 0);
      } else if (accuracy >= 0.9) {
        this.glyph.setText('✦ PERFECT ♪ ✦').setColor('#ffdb70');
        playRiff(true, this.practice.combo);
        this.spawnNote();
      } else if (accuracy >= 0.6) {
        this.glyph.setText('♪ NICE!').setColor('#ffdb70');
        playRiff(true, this.practice.combo);
        this.spawnNote();
      } else {
        this.glyph.setText('♭ OFF BEAT...').setColor('#a9d6e5');
        playRiff(false, 0);
      }
      this.beatClock = consumeBeat(this.beatClock, this.song.interval);
      this.windowKind = undefined;
      this.settleIfDone();
      this.refreshProgress();
      return;
    }
    if (this.practice.phase === 'done') {
      // Play again: a fresh run, back to the ready phase.
      this.practice = createPracticeState(this.song);
      this.result = undefined;
      this.beatClock = createBeatClock();
      this.windowKind = undefined;
      this.windowConsumed = false;
      this.syncPhase();
    }
  }
  /** E / ESC during ready or done only — never mid-song. */
  private onBack() {
    if (this.practice.phase === 'ready' || this.practice.phase === 'done') {
      this.fade.to(this.returnTo);
    }
  }
  private settleIfDone() {
    if (this.practice.phase !== 'done' || this.result !== undefined) return;
    this.result = practiceResult(this.practice);
    playOutcome(true);
    this.syncPhase();
  }
  private refreshProgress() {
    this.progress.setText(
      `SCORE ${this.practice.score}   COMBO ${this.practice.combo}   BEST ${this.practice.bestCombo}`,
    );
    this.trail.setText(practiceGlyphs(this.song, this.practice.step, 4));
  }
  /** Show and hide the right texts for the current phase. */
  private syncPhase() {
    const ready = this.practice.phase === 'ready';
    const playing = this.practice.phase === 'playing';
    const done = this.practice.phase === 'done';
    this.readyTitle.setVisible(ready);
    this.readyDesc.setVisible(ready);
    this.glyph.setVisible(playing);
    this.trail.setVisible(playing);
    this.progress.setVisible(playing);
    this.hint.setVisible(true);
    if (ready) {
      this.hint.setText('SPACE — start practicing · E — leave');
    } else if (playing) {
      this.hint.setText('SPACE on the beat — hold through the · rests');
    } else {
      this.hint.setText('SPACE — play again · E — head back');
    }
    this.refreshProgress();
    this.renderResult(done);
  }
  private renderResult(show: boolean) {
    const panel = this.resultPanel;
    if (!show || this.result === undefined) {
      panel.clear().setVisible(false);
      this.resultTitle.setVisible(false);
      this.resultLines.setVisible(false);
      this.resultGrade.setVisible(false);
      this.resultFlavor.setVisible(false);
      return;
    }
    const { score, bestCombo, accuracy, grade } = this.result;
    panel
      .clear()
      .fillStyle(0x0c253d, 0.94)
      .fillRoundedRect(RESULT_PANEL.x, RESULT_PANEL.y, RESULT_PANEL.width, RESULT_PANEL.height, 12)
      .lineStyle(2, 0xf4b942, 0.9)
      .strokeRoundedRect(
        RESULT_PANEL.x,
        RESULT_PANEL.y,
        RESULT_PANEL.width,
        RESULT_PANEL.height,
        12,
      );
    panel.setVisible(true);
    this.resultTitle.setVisible(true);
    this.resultLines
      .setText(`SCORE ${score}\nBEST COMBO ${bestCombo}   ACCURACY ${Math.round(accuracy * 100)}%`)
      .setVisible(true);
    this.resultGrade
      .setText(`GRADE — ${grade.toUpperCase()}`)
      .setColor(`#${GRADE_COLORS[grade].toString(16).padStart(6, '0')}`)
      .setVisible(true);
    this.resultFlavor.setText(GRADE_FLAVOR[grade]).setVisible(true);
  }
  /** A floating note that rises and fades on a well-played hit. */
  private spawnNote() {
    const note = this.add
      .text(W / 2 + Phaser.Math.Between(-30, 30), 400, '♪', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f4b942',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: note,
      y: note.y - 56,
      alpha: 0,
      duration: 650,
      onComplete: () => note.destroy(),
    });
  }

  /** Dark stage, warm spotlight cone, silhouette with guitar, floor boards. */
  private drawStage() {
    this.fade = createFade(this);
    const g = this.add.graphics();
    g.fillStyle(0x081a2b, 1);
    g.fillRect(0, 0, W, H);
    // Spotlight cone: two overlapping warm triangles.
    g.fillStyle(0xf4b942, 0.07);
    g.fillTriangle(430, -10, 530, -10, 300, 470);
    g.fillTriangle(430, -10, 530, -10, 660, 470);
    // Stage floor boards.
    g.fillStyle(0x6e4526, 1);
    g.fillRect(0, 470, W, H - 470);
    g.lineStyle(2, 0x543418, 1);
    for (let py = 490; py < H; py += 22) {
      g.beginPath();
      g.moveTo(0, py);
      g.lineTo(W, py);
      g.strokePath();
    }
    // Silhouette figure with a guitar.
    g.fillStyle(0x0c253d, 0.5);
    g.fillEllipse(W / 2, 470, 40, 10);
    g.fillStyle(0x1c2f44, 1);
    g.fillRoundedRect(W / 2 - 14, 420, 28, 40, 8);
    g.fillCircle(W / 2, 408, 11);
    g.fillStyle(0x3a2a1c, 1);
    g.fillCircle(W / 2 + 12, 446, 10);
    g.fillCircle(W / 2 + 4, 438, 7);
    g.lineStyle(3, 0x543418, 1);
    g.beginPath();
    g.moveTo(W / 2, 434);
    g.lineTo(W / 2 + 24, 414);
    g.strokePath();

    this.progress = this.add
      .text(W / 2, 56, '', { fontFamily: 'monospace', fontSize: '15px', color: '#f4b942' })
      .setOrigin(0.5, 0);
    this.readyTitle = this.add
      .text(W / 2, 150, this.song.name, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#f4b942',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.readyDesc = this.add
      .text(W / 2, 188, `${this.song.description}   ${totalGlyphHint(this.song)}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#a9d6e5',
      })
      .setOrigin(0.5, 0);
    this.glyph = this.add
      .text(W / 2, 250, '', { fontFamily: 'monospace', fontSize: '30px', color: '#ffdb70' })
      .setOrigin(0.5);
    this.trail = this.add
      .text(W / 2, 305, '', { fontFamily: 'monospace', fontSize: '15px', color: '#a9d6e5' })
      .setOrigin(0.5, 0);
    this.hint = this.add
      .text(W / 2, 520, '', { fontFamily: 'monospace', fontSize: '13px', color: '#7fb2c4' })
      .setOrigin(0.5, 0);

    this.resultPanel = this.add.graphics().setVisible(false);
    this.resultTitle = this.add
      .text(W / 2, 172, 'SET COMPLETE', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f4b942',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.resultLines = this.add
      .text(W / 2, 216, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f7f3e3',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.resultGrade = this.add
      .text(W / 2, 280, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#f4b942',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.resultFlavor = this.add
      .text(W / 2, 322, '', { fontFamily: 'monospace', fontSize: '12px', color: '#a9d6e5' })
      .setOrigin(0.5, 0)
      .setVisible(false);
  }
}

/** One line describing the run length: loops of the pattern. */
const totalGlyphHint = (song: Song): string => `${song.loops} loops of ${song.steps.length} steps`;
