import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from './logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FhirModule } from './fhir/fhir.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './email/email.module';
import { UploadsModule } from './uploads/uploads.module';
import { AccessCodesModule } from './access-codes/access-codes.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { FhirExceptionFilter } from './common/filters/fhir-exception.filter';
import { DashboardModule } from './dashboard/dashboard.module';
import { CacheModule } from './cache/cache.module';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { BrainTumorModule } from './brain-tumor/brain-tumor.module';
import { PractitionerDashboardModule } from './practitioner-dashboard/practitioner-dashboard.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Try multiple possible MongoDB connection strings
        // This handles both Docker container and local development environments
        const possibleHosts = [
          configService.get<string>('MONGODB_URI'), // From environment variable
          'mongodb://mongodb:27017/medicare', // Docker container name
          'mongodb://medicare-mongodb:27017/medicare', // Alternative container name
          'mongodb://localhost:27017/medicare', // Local development
        ];

        // Filter out undefined values
        const validHosts = possibleHosts.filter(host => !!host);

        // Use the first valid connection string
        const mongoUri = validHosts[0];

        console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);

        return {
          uri: mongoUri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('MongoDB connection established successfully');
            });
            connection.on('error', (error) => {
              console.error('MongoDB connection error:', error);
            });
            return connection;
          }
        };
      },
    }),

    // Throttler
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = configService.get<number>('THROTTLE_TTL', 60);
        const limit = configService.get<number>('THROTTLE_LIMIT', 30);
        return [{
          ttl,
          limit,
        }];
      },
    }),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '24h'),
        },
      }),
      inject: [ConfigService],
    }),

    // Cache
    CacheModule,

    // Metrics
    MetricsModule,

    // Serve static files for uploads
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      exclude: ['/api*'],
    }),

    // Application modules
    LoggerModule,
    UploadsModule,
    AuthModule,
    UsersModule,
    AccessCodesModule,
    FhirModule.forRoot({
      // HAPI FHIR server URL
      serverUrl: process.env.HAPI_FHIR_URL || 'http://hapi-fhir:8080/fhir',
      // Authentication for HAPI FHIR server (none in this case)
      auth: {
        type: 'none'
      },
      // In the new architecture, all resources are stored in HAPI FHIR
      // We only use MongoDB for user authentication and app-specific data
      localResources: [],
      // Enable validation and auditing
      enableValidation: true,
      enableAuditing: true,
    }),
    HealthModule,
    EmailModule,
    DashboardModule,
    BrainTumorModule,
    PractitionerDashboardModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useFactory: (metricsService: MetricsService) => {
        return new FhirExceptionFilter(metricsService);
      },
      inject: [MetricsService],
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply correlation ID middleware to all routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
