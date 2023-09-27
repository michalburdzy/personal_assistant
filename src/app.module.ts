import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './app.gateway';
import { BotService } from './bot.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AppGateway, BotService],
})
export class AppModule {}
