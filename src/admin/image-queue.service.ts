import { Injectable, Logger } from '@nestjs/common';
import { ContentVersionService } from '../common/cache';
import { generateRenditions } from '../common/images';

/** Makes the WebP/AVIF sizes one photo at a time in the background, so uploads answer quickly. */
@Injectable()
export class ImageQueueService {
  private readonly log = new Logger('Images');
  private jobs: { rel: string; spec: string }[] = [];
  private running = false;
  constructor(private readonly versions: ContentVersionService) {}

  enqueue(rel: string, spec: string) {
    if (!rel || !spec) return;
    this.jobs.push({ rel, spec });
    if (!this.running) setImmediate(() => void this.drain());
  }
  get pending() { return this.jobs.length + (this.running ? 1 : 0); }

  private async drain() {
    this.running = true;
    let made = 0;
    while (this.jobs.length) {
      const job = this.jobs.shift()!;
      try { await generateRenditions(job.rel, job.spec); made += 1; }
      catch (e: any) { this.log.warn(`Could not resize ${job.rel}: ${e.message}`); }
    }
    this.running = false;
    if (made) await this.versions.bump().catch(() => undefined); // pages now pick up the new sizes
  }

  /** For scripts and tests: wait until the queue is empty. */
  async idle() { while (this.running || this.jobs.length) await new Promise((r) => setTimeout(r, 25)); }
}
