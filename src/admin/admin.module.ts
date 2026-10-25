import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminController } from './admin.controller';
import { AdminSupport } from './admin.support';
import { AdminGuard } from './auth';
import { ImageQueueService } from './image-queue.service';

@Module({
  controllers: [AdminAuthController, AdminController],
  providers: [AdminSupport, AdminGuard, ImageQueueService],
  exports: [ImageQueueService],
})
export class AdminModule {}
