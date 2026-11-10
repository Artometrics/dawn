import Phaser from 'phaser';
import { AGENTS } from '@/lib/agents';
import { COLS, ROWS, TILE, buildHq } from '@/lib/hq-map';
import type { AgentSlot } from '@/lib/forge/catalog';
import type { AgentLook } from '@/lib/forge/roster';

export type VillagePose = {
  id: string;
  gx: number;
  gy: number;
  caption: string;
};

export type VillageHandlers = {
  onAgent: (id: string) => void;
  onYou: () => void;
  avatar: number;
  poses: () => VillagePose[];
  /** Character Maker looks. An agent without one keeps its tile sprite. */
  looks: () => Partial<Record<AgentSlot, AgentLook>>;
};

type Walker = {
  id: string;
  kind: 'agent' | 'you';
  body: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  gx: number;
  gy: number;
  caption: string;
  moving: boolean;
  sprite: Phaser.GameObjects.Sprite;
  look: string;
};

export function mountVillage(parent: HTMLElement, handlers: VillageHandlers): Phaser.Game {
  const grid = buildHq();

  class VillageScene extends Phaser.Scene {
    private walkers: Walker[] = [];
    private youSprite?: Phaser.GameObjects.Sprite;
    private lookSeq = 0;

    constructor() {
      super('village');
    }

    preload() {
      this.load.spritesheet('tiles', '/tiles/kenney-tiny-dungeon.png', {
        frameWidth: TILE,
        frameHeight: TILE,
      });
      for (const agent of AGENTS) this.load.image(agent.id, agent.src);
      this.load.image('you-0', '/tiles/you-0.png');
      this.load.image('you-1', '/tiles/you-1.png');
      this.load.image('you-2', '/tiles/you-2.png');
    }

    create() {
      const map = this.make.tilemap({ data: grid, tileWidth: TILE, tileHeight: TILE });
      const tiles = map.addTilesetImage('tiles');
      if (tiles) map.createLayer(0, tiles, 0, 0);

      const posed = handlers.poses();
      for (const agent of AGENTS) {
        const pose = posed.find((item) => item.id === agent.id);
        this.walkers.push(this.makeWalker(
          agent.id,
          pose?.caption || agent.name,
          agent.id,
          pose?.gx ?? 4,
          pose?.gy ?? 3,
          'agent',
        ));
      }
      this.walkers.push(this.makeWalker('you', 'You', `you-${handlers.avatar}`, 8, 8, 'you'));
    }

    update() {
      const you = this.walkers.find((walker) => walker.kind === 'you');
      const key = `you-${handlers.avatar}`;
      if (you && this.youSprite && this.youSprite.texture.key !== key) {
        this.youSprite.setTexture(key);
      }

      this.syncLooks();

      for (const pose of handlers.poses()) {
        const walker = this.walkers.find((item) => item.id === pose.id);
        if (!walker) continue;
        if (walker.caption !== pose.caption) {
          walker.caption = pose.caption;
          walker.label.setText(pose.caption);
        }
        if (walker.moving || (walker.gx === pose.gx && walker.gy === pose.gy)) continue;
        walker.moving = true;
        walker.gx = pose.gx;
        walker.gy = pose.gy;
        this.tweens.add({
          targets: walker.body,
          x: pose.gx * TILE + TILE / 2,
          y: pose.gy * TILE + TILE / 2,
          duration: 640,
          ease: 'Linear',
          onComplete: () => {
            walker.moving = false;
          },
        });
      }
    }

    private syncLooks() {
      const looks = handlers.looks();
      for (const walker of this.walkers) {
        if (walker.kind !== 'agent') continue;
        const wanted = looks[walker.id as AgentSlot]?.sprite ?? '';
        if (walker.look === wanted) continue;
        walker.look = wanted;
        if (!wanted) {
          walker.sprite.setTexture(walker.id).setScale(1);
          this.markLooks();
          continue;
        }
        const key = `look-${walker.id}-${(this.lookSeq += 1)}`;
        const apply = () => {
          if (walker.look !== wanted || !walker.sprite.scene) return;
          walker.sprite.setTexture(key);
          walker.sprite.setDisplaySize(26, 26);
          this.markLooks();
        };
        this.textures.once(`addtexture-${key}`, apply);
        this.textures.addBase64(key, wanted);
      }
    }

    /** Lets a browser check read which agents are drawn from a character. */
    private markLooks() {
      const drawn = this.walkers
        .filter((walker) => walker.kind === 'agent' && walker.sprite.texture.key.startsWith('look-'))
        .map((walker) => walker.id);
      this.game.canvas.dataset.looks = drawn.join(',');
    }

    private makeWalker(
      id: string,
      label: string,
      texture: string,
      gx: number,
      gy: number,
      kind: 'agent' | 'you',
    ): Walker {
      const body = this.add.container(gx * TILE + TILE / 2, gy * TILE + TILE / 2);
      const sprite = this.add.sprite(0, 2, texture).setOrigin(0.5, 0.85);
      const name = this.add
        .text(0, -16, label, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#f3e6d0',
          resolution: 4,
          wordWrap: { width: 72 },
          align: 'center',
        })
        .setOrigin(0.5, 1);
      body.add([sprite, name]);
      body.setSize(20, 28);
      body.setInteractive({ useHandCursor: true });
      body.on('pointerdown', () => {
        if (kind === 'you') handlers.onYou();
        else handlers.onAgent(id);
      });
      if (kind === 'you') this.youSprite = sprite;
      return { id, kind, body, label: name, gx, gy, caption: label, moving: false, sprite, look: '' };
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: COLS * TILE,
    height: ROWS * TILE,
    backgroundColor: '#1c1410',
    pixelArt: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.ScaleModes.FIT,
      autoCenter: Phaser.Scale.Center.CENTER_BOTH,
    },
    scene: VillageScene,
  });
}
