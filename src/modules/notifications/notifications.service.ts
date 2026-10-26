import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.notification.findMany({/
      
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const found = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!found) throw new NotFoundException('ບໍ່ພົບແຈ້ງເຕືອນ');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { message: 'ອ່ານທັງໝົດແລ້ວ' };
  }

  async push(userId: string, title: string, body: string, type = 'SYSTEM', data?: Record<string, any>) {
    return this.prisma.notification.create({ data: { userId, title, body, type, data } });
  }
}
