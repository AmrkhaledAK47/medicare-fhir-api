import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as morgan from 'morgan';
import helmet from 'helmet';
import * as compression from 'compression';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get environment variables
  const port = configService.get<number>('app.port') || 3000;
  const environment = configService.get<string>('app.env') || 'development';
  const frontendUrl = configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
  const allowedOrigins = configService.get<string[]>('app.cors.allowedOrigins') || [frontendUrl];

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (allowedOrigins.indexOf(origin) !== -1 || environment === 'development') {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization,X-Forwarded-For',
    exposedHeaders: 'Content-Disposition'
  });

  // Security
  app.use(helmet());

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }));

  // Swagger API documentation
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MediCare FHIR API')
      .setDescription('API documentation for the MediCare FHIR API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start server
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();

