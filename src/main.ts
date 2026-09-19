import Phaser from 'phaser';
import { OverworldScene } from './scenes/overworldScene';
import { HomeScene } from './scenes/homeScene';
import { FishingScene } from './scenes/fishingScene';
import { PracticeScene } from './scenes/practiceScene';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#142d4a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [OverworldScene, HomeScene, FishingScene, PracticeScene],
});
