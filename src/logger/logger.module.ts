import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

@Module({
    imports: [
        WinstonModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const environment = configService.get('NODE_ENV');
                const isProduction = environment === 'production';

                return {
                    transports: [
                        new winston.transports.Console({
                            level: configService.get('LOG_LEVEL') || 'info',
                            format: winston.format.combine(
                                winston.format.timestamp(),
                                isProduction
                                    ? winston.format.json()
                                    : nestWinstonModuleUtilities.format.nestLike('MediCare', {
                                        colors: true,
                                        prettyPrint: true,
                                    }),
                            ),
                        }),
                    ],
                };
            },
        }),
    ],
})
export class LoggerModule { } 