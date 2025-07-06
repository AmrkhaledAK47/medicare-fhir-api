import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyAccessCodeDto {
    @ApiProperty({
        description: 'Access code to verify',
        example: 'ABC123XYZ'
    })
    @IsString()
    @IsNotEmpty()
    code: string;
} 