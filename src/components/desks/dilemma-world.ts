import Phaser from 'phaser';
import type { AgentSnapshot, SimulationSnapshot } from '@/lib/games/dilemma';
import { STRATEGY_LABELS } from '@/lib/games/dilemma';

/**
 * The dilemma field, drawn with Phaser the way the original village was.
 * Canvas fills cannot read CSS variables, so the hex values are the Dawn night tokens:
 * forest #143018, grass #3f8f34, road #3a413c, paper #f3f1ec, ink #141210, chip #2a2a27.
 * Cooperate is the map's neon green; defect is the clay accent.
 */
export type DilemmaDriver = {
  /** Advance the village by dt seconds, or return the current snapshot when paused. */
  step: (dtSeconds: number) => SimulationSnapshot;
};

const DESKTOP = { width: 980, height: 640 };
const PHONE = { width: 560, height: 420 };

export function mountDilemmaWorld(parent: HTMLElement, driver: DilemmaDriver): Phaser.Game {
  const narrow = parent.clientWidth > 0 && parent.clientWidth < 720;
  const view = narrow ? PHONE : DESKTOP;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class DilemmaScene extends Phaser.Scene {
    private readonly sprites = new Map<string, Phaser.GameObjects.Container>();
    private readonly bodies = new Map<string, Phaser.GameObjects.Rectangle>();
    private readonly labels = new Map<string, Phaser.GameObjects.Text>();
    private readonly bubbles = new Map<string, Phaser.GameObjects.Container>();

    constructor() {
      super('dilemma');
    }

    create() {
      const snap = driver.step(0);
      this.cameras.main.setBounds(0, 0, snap.width, snap.height);
      this.drawWorld(snap.width, snap.height);
      this.cameras.main.centerOn(snap.width / 2, snap.height / 2);
    }

    update(_time: number, delta: number) {
      const snap = driver.step(delta / 1000);
      this.syncAgents(snap.agents);
      this.syncBubbles(snap.agents);
      this.follow(snap);
    }

    private drawWorld(width: number, height: number) {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x143018, 1);
      graphics.fillRect(0, 0, width, height);

      graphics.fillStyle(0x1f5a28, 0.85);
      for (let index = 0; index < 90; index += 1) {
        const x = 40 + ((index * 187) % (width - 80));
        const y = 40 + ((index * 131) % (height - 80));
        graphics.fillCircle(x, y, 2 + (index % 3));
      }

      // The original three paths, repainted as night roads. The center is a step lighter so the path reads.
      graphics.fillStyle(0x3a413c, 1);
      graphics.fillRoundedRect(240, 230, width - 480, 64, 18);
      graphics.fillRoundedRect(1060, 100, 80, height - 200, 18);
      graphics.fillRoundedRect(570, 500, 760, 64, 18);
      graphics.fillStyle(0x524a42, 1);
      graphics.fillRoundedRect(252, 242, width - 504, 40, 12);
      graphics.fillRoundedRect(1072, 112, 56, height - 224, 12);
      graphics.fillRoundedRect(582, 512, 736, 40, 12);

      for (let index = 0; index < 26; index += 1) {
        const trunkX = 120 + ((index * 211) % 420);
        const trunkY = 140 + ((index * 157) % (height - 240));
        this.drawTree(trunkX, trunkY);
        this.drawTree(width - trunkX, Math.max(100, trunkY - 40));
      }
    }

    private drawTree(x: number, y: number) {
      const tree = this.add.container(x, y);
      const trunk = this.add.rectangle(0, 30, 16, 34, 0x5c4030);
      const canopy = this.add.circle(0, 4, 32, 0x1f6b2a);
      const canopyLeft = this.add.circle(-16, 16, 22, 0x2f8a3c);
      const canopyRight = this.add.circle(16, 16, 22, 0x145022);
      tree.add([trunk, canopy, canopyLeft, canopyRight]);
    }

    private syncAgents(agents: AgentSnapshot[]) {
      const seen = new Set<string>();
      for (const agent of agents) {
        seen.add(agent.id);
        const sprite = this.ensureAgent(agent);
        sprite.setPosition(agent.x, agent.y);
        const body = this.bodies.get(agent.id);
        if (body) body.rotation = agent.facing === 'left' ? -0.12 : agent.facing === 'right' ? 0.12 : 0;
        this.labels.get(agent.id)?.setPosition(agent.x, agent.y + 36);
        sprite.setAlpha(agent.mode === 'cooldown' ? 0.72 : 1);
      }
      for (const id of [...this.sprites.keys()]) {
        if (seen.has(id)) continue;
        this.sprites.get(id)?.destroy();
        this.sprites.delete(id);
        this.bodies.delete(id);
        this.labels.get(id)?.destroy();
        this.labels.delete(id);
      }
    }

    private ensureAgent(agent: AgentSnapshot) {
      const existing = this.sprites.get(agent.id);
      if (existing) return existing;
      const color = Number.parseInt(agent.color.slice(1), 16);
      const body = this.add.rectangle(0, 0, 34, 42, color).setStrokeStyle(3, 0xf3f1ec);
      const eyeLeft = this.add.rectangle(-7, -6, 4, 4, 0x141210);
      const eyeRight = this.add.rectangle(7, -6, 4, 4, 0x141210);
      const footLeft = this.add.rectangle(-7, 22, 8, 8, 0x2a2a27);
      const footRight = this.add.rectangle(7, 22, 8, 8, 0x2a2a27);
      const sprite = this.add.container(agent.x, agent.y, [body, eyeLeft, eyeRight, footLeft, footRight]);
      const label = this.add
        .text(agent.x, agent.y + 36, STRATEGY_LABELS[agent.name], {
          fontFamily: 'Geist, system-ui, sans-serif',
          fontSize: narrow ? '15px' : '13px',
          color: agent.color,
          backgroundColor: '#171715',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 0);
      this.sprites.set(agent.id, sprite);
      this.bodies.set(agent.id, body);
      this.labels.set(agent.id, label);
      return sprite;
    }

    private syncBubbles(agents: AgentSnapshot[]) {
      const active = new Set<string>();
      for (const agent of agents) {
        if (!agent.lastAction || agent.bubbleTimer <= 0) continue;
        active.add(agent.id);
        const bubble = this.ensureBubble(agent.id);
        bubble.setPosition(agent.x, agent.y - 58);
        bubble.setAlpha(Math.min(1, agent.bubbleTimer * 2));
        const [box, actionText, pointsText] = bubble.list as [
          Phaser.GameObjects.Rectangle,
          Phaser.GameObjects.Text,
          Phaser.GameObjects.Text,
        ];
        box.setFillStyle(0x171715, 0.96);
        actionText.setText(agent.lastAction === 'C' ? 'Cooperate' : 'Defect');
        actionText.setColor(agent.lastAction === 'C' ? '#3ee08a' : '#d97746');
        pointsText.setText(`+${agent.lastPoints}`);
      }
      for (const [id, bubble] of this.bubbles.entries()) {
        if (active.has(id)) continue;
        bubble.destroy();
        this.bubbles.delete(id);
      }
    }

    private ensureBubble(id: string) {
      const existing = this.bubbles.get(id);
      if (existing) return existing;
      const box = this.add.rectangle(0, 0, 108, 48, 0x171715, 0.96).setStrokeStyle(2, 0xf3f1ec, 0.35);
      const actionText = this.add
        .text(0, -8, '', {
          fontFamily: 'Geist, system-ui, sans-serif',
          fontSize: '14px',
          color: '#3ee08a',
          fontStyle: '700',
        })
        .setOrigin(0.5);
      const pointsText = this.add
        .text(0, 12, '', {
          fontFamily: 'Geist, system-ui, sans-serif',
          fontSize: '12px',
          color: '#c4bdb3',
        })
        .setOrigin(0.5);
      const bubble = this.add.container(0, 0, [box, actionText, pointsText]);
      this.bubbles.set(id, bubble);
      return bubble;
    }

    private follow(snap: SimulationSnapshot) {
      const agents = snap.agents;
      if (agents.length === 0) return;
      const meeting = agents.filter((agent) => agent.mode === 'interacting');
      const focus = meeting.length > 0 ? meeting : agents;
      const x = focus.reduce((sum, agent) => sum + agent.x, 0) / focus.length;
      const y = focus.reduce((sum, agent) => sum + agent.y, 0) / focus.length;
      const camera = this.cameras.main;
      if (reduceMotion) {
        camera.centerOn(x, y);
        return;
      }
      camera.centerOn(
        camera.midPoint.x + (x - camera.midPoint.x) * 0.12,
        camera.midPoint.y + (y - camera.midPoint.y) * 0.12,
      );
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: view.width,
    height: view.height,
    backgroundColor: '#143018',
    banner: false,
    scale: {
      mode: Phaser.Scale.ScaleModes.FIT,
      autoCenter: Phaser.Scale.Center.CENTER_BOTH,
    },
    scene: DilemmaScene,
  });
}
