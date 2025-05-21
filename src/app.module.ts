import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import appConfig from './config/app.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FhirModule } from './fhir/fhir.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
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

    // Application modules
    AuthModule,
    UsersModule,
    FhirModule,
    HealthModule,
  ],
})
export class AppModule { }
