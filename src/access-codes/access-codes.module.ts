import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccessCodesController } from './access-codes.controller';
import { AccessCodesService } from './access-codes.service';
import { AccessCode, AccessCodeSchema } from './schemas/access-code.schema';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AccessCode.name, schema: AccessCodeSchema }
        ]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('app.jwt.secret'),
                signOptions: {
                    expiresIn: configService.get<string>('app.jwt.expiresIn'),
                },
            }),
        }),
        EmailModule,
        ConfigModule,
    ],
    controllers: [AccessCodesController],
    providers: [AccessCodesService],
    exports: [AccessCodesService]
})
export class AccessCodesModule { } 