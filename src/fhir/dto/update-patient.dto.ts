import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class HumanName {
    @ApiProperty({ description: 'Family name', example: 'Smith', required: false })
    @IsString()
    @IsOptional()
    family?: string;

    @ApiProperty({ description: 'Given names', example: '["John", "Adam"]', required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    given?: string[];

    @ApiProperty({ description: 'Use of this name', enum: ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'], example: 'official', required: false })
    @IsString()
    @IsOptional()
    use?: string;

    @ApiProperty({ description: 'Text representation of the full name', example: 'John Adam Smith', required: false })
    @IsString()
    @IsOptional()
    text?: string;
}

class ContactPoint {
    @ApiProperty({ description: 'Type of contact', enum: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'], example: 'phone', required: false })
    @IsString()
    @IsOptional()
    system?: string;

    @ApiProperty({ description: 'Contact point value', example: '555-555-5555', required: false })
    @IsString()
    @IsOptional()
    value?: string;

    @ApiProperty({ description: 'Use of this contact', enum: ['home', 'work', 'temp', 'old', 'mobile'], example: 'home', required: false })
    @IsString()
    @IsOptional()
    use?: string;
}

class Address {
    @ApiProperty({ description: 'Street address lines', example: '["123 Main St"]', required: false })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    line?: string[];

    @ApiProperty({ description: 'City', example: 'Anytown', required: false })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ description: 'State/Province', example: 'CA', required: false })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiProperty({ description: 'Postal code', example: '12345', required: false })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @ApiProperty({ description: 'Country', example: 'US', required: false })
    @IsString()
    @IsOptional()
    country?: string;
}

export class UpdatePatientDto {
    @ApiProperty({ description: 'Resource type', default: 'Patient', readOnly: true })
    @IsString()
    @IsOptional()
    readonly resourceType?: string = 'Patient';

    @ApiProperty({ type: [HumanName], description: 'Patient names', required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => HumanName)
    @IsOptional()
    name?: HumanName[];

    @ApiProperty({ description: 'Patient gender', enum: ['male', 'female', 'other', 'unknown'], example: 'male', required: false })
    @IsString()
    @IsEnum(['male', 'female', 'other', 'unknown'])
    @IsOptional()
    gender?: string;

    @ApiProperty({ description: 'Date of birth', type: String, format: 'date', example: '1980-06-15', required: false })
    @IsString()
    @IsOptional()
    birthDate?: string;

    @ApiProperty({ type: [ContactPoint], description: 'Contact points (phone, email, etc.)', required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ContactPoint)
    @IsOptional()
    telecom?: ContactPoint[];

    @ApiProperty({ type: [Address], description: 'Patient addresses', required: false })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Address)
    @IsOptional()
    address?: Address[];

    @ApiProperty({ description: 'Whether the patient record is active', required: false })
    @IsOptional()
    active?: boolean;
} 