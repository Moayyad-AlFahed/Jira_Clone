import { Injectable } from '@nestjs/common';
import { RedisService } from './cache/redis/redis.service';

@Injectable()
export class AppService {
  constructor(private readonly redisService:RedisService){}
  getHello(): string {
    return 'Hello World!';
  }

   async test(){
    await this.redisService.set('test:key','hello',60)
    const value = await this.redisService.get('test:key')
    console.log(value,'value');
    return value
  }
}
