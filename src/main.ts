import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as morgan from 'morgan';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(morgan('dev'));
  app.use(helmet());
  app.enableCors();

  // Global validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('FHIR EHR API')
    .setDescription('FHIR-based Electronic Health Records API with ML integration')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('fhir', 'FHIR resource operations')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📝 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
