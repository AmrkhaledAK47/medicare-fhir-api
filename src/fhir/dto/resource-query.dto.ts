import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResourceQueryDto {
    [key: string]: string;
} 