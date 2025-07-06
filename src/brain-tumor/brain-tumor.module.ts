import { Module } from '@nestjs/common';
import { BrainTumorController } from './brain-tumor.controller';
import { BrainTumorService } from './brain-tumor.service';
import { HttpModule } from '@nestjs/axios';
import { FhirModule } from '../fhir/fhir.module';
import { MongooseModule } from '@nestjs/mongoose';
import { BrainScan, BrainScanSchema } from './schemas/brain-scan.schema';
import { UploadsModule } from '../uploads/uploads.module';
import { CacheModule } from '../cache/cache.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        HttpModule.register({
            timeout: 30000, // 30 seconds timeout for API calls
            maxRedirects: 5,
        }),
        MongooseModule.forFeature([
            { name: BrainScan.name, schema: BrainScanSchema },
        ]),
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
        FhirModule,
        UploadsModule,
        CacheModule,
    ],
    controllers: [BrainTumorController],
    providers: [BrainTumorService],
    exports: [BrainTumorService],
})
export class BrainTumorModule { } 