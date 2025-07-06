import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';
import { CacheModuleOptions } from '@nestjs/cache-manager/dist/interfaces/cache-module.interface';
import { CacheService } from './cache.service';

@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService): Promise<CacheModuleOptions> => {
                const redisHost = configService.get('REDIS_HOST', 'redis');
                const redisPort = configService.get('REDIS_PORT', 6379);

                return {
                    store: redisStore,
                    socket: {
                        host: redisHost,
                        port: redisPort,
                    },
                    ttl: 60, // Default TTL in seconds
                    max: 1000, // Maximum number of items in cache
                } as any;
            },
            isGlobal: true,
        }),
    ],
    providers: [CacheService],
    exports: [NestCacheModule, CacheService],
})
export class CacheModule { } 