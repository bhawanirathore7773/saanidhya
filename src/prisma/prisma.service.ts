import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { config } from '../config/config';

/** mysql://user:pass@host:3306/db  ->  mariadb adapter options (works for Hostinger MySQL and MariaDB). */
export function parseDatabaseUrl(url: string) {
  if (!url) throw new Error('DATABASE_URL is missing. Example: mysql://user:password@localhost:3306/database');
  const u = new URL(url);
  return {
    host: u.hostname === 'localhost' ? '127.0.0.1' : u.hostname,
    port: u.port ? parseInt(u.port, 10) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : {}),
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const db = parseDatabaseUrl(config.databaseUrl);
    super({
      adapter: new PrismaMariaDb({
        ...db,
        timezone: 'Z',            // all DateTime values are stored in UTC
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10), // shared hosting allows few connections
        connectTimeout: 10000,
        acquireTimeout: 15000,
      }),
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
