import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import appConfig from './config/app.config';
import fhirConfig from './config/fhir.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FhirModule } from './fhir/fhir.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './email/email.module';
import { UploadsModule } from './uploads/uploads.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, fhirConfig],
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('app.db.uri'),
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('🚀 MongoDB connected successfully');
          });
          connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
          });
          connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
          });
          return connection;
        }
      }),
    }),

    // Serve static files (for avatars)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Application modules
    UploadsModule,
    AuthModule,
    UsersModule,
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
  ],
})
export class AppModule { }
