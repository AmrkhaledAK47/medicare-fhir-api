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

    // Application modules
    AuthModule,
    UsersModule,
    FhirModule.forRoot({
      enableHapiFhir: process.env.ENABLE_HAPI_FHIR === 'true',
      hapiFhirUrl: process.env.HAPI_FHIR_URL || 'http://localhost:9090/fhir',
      localResources: (process.env.LOCAL_FHIR_RESOURCES || 'Patient,Practitioner,Organization').split(','),
    }),
    HealthModule,
    EmailModule,
  ],
})
export class AppModule { }
