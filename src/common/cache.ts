import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Small in-memory cache with expiry and a size limit (shared hosting has no Redis). */
export class LruCache<V = any> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(private max = 300) {}
  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) { this.map.delete(key); return undefined; }
    this.map.delete(key); this.map.set(key, hit); // most recently used goes last
    return hit.value;
  }
  set(key: string, value: V, ttlSeconds: number) {
    this.map.delete(key);
    this.map.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
  delete(key: string) { this.map.delete(key); }
  clear() { this.map.clear(); }
  get size() { return this.map.size; }
}

/**
 * One number stored in the database. Every admin save bumps it, and every cached page and
 * cached settings object includes it in its key, so edits show on the website at once.
 * It is re-read from the database every few seconds, so it also works if the host runs
 * more than one Node process.
 */
@Injectable()
export class ContentVersionService {
  private value = 1;
  private checkedAt = 0;
  private refreshing: Promise<void> | null = null;
  constructor(private readonly prisma: PrismaService) {}

  async current(): Promise<number> {
    if (Date.now() - this.checkedAt > 3000) {
      this.refreshing ??= this.refresh().finally(() => { this.refreshing = null; });
      await this.refreshing;
    }
    return this.value;
  }

  private async refresh() {
    try {
      const row = await this.prisma.contentVersion.upsert({ where: { id: 1 }, update: {}, create: { id: 1, version: 1 } });
      this.value = row.version;
    } catch {
      /* database busy: keep the last known version */
    }
    this.checkedAt = Date.now();
  }

  async bump(): Promise<void> {
    const row = await this.prisma.contentVersion.upsert({ where: { id: 1 }, update: { version: { increment: 1 } }, create: { id: 1, version: 2 } });
    this.value = row.version;
    this.checkedAt = Date.now();
  }
}
