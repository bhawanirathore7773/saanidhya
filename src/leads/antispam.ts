import { Request } from 'express';
import { config } from '../config/config';
import { clientIp, HitCounter } from '../common/http';
import { PrismaService } from '../prisma/prisma.service';

const attempts = new HitCounter(3600 * 1000);

/** Too many form submissions (valid or not) from one address in an hour. */
export function attemptsExceeded(ip: string | null): boolean {
  if (!ip) return false;
  return attempts.hit(`lead-attempts:${ip}`) > config.lead.attemptsPerHour;
}

export async function savedLimitReached(prisma: PrismaService, ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const since = new Date(Date.now() - 3600 * 1000);
  return (await prisma.lead.count({ where: { ip_address: ip, created_at: { gte: since } } })) >= config.lead.rateLimitPerHour;
}

/** The same number + event type inside the window counts as one enquiry (double-click, resend). */
export async function findDuplicate(prisma: PrismaService, phone: string, eventTypeId: number) {
  const since = new Date(Date.now() - config.lead.duplicateWindowMinutes * 60 * 1000);
  return prisma.lead.findFirst({ where: { phone, event_type_id: eventTypeId, created_at: { gte: since } }, include: { event_type: true }, orderBy: { created_at: 'desc' } });
}
export { clientIp };
export type { Request };
