import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed/seed.module';
import { PractitionerSeedService } from './seed/practitioner-seed';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(SeedModule);
    const seedService = app.get(PractitionerSeedService);

    try {
        console.log('Starting seed process...');
        await seedService.seed();
        console.log('Seed completed successfully');
    } catch (error) {
        console.error('Error during seed:', error);
        process.exit(1);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap(); 