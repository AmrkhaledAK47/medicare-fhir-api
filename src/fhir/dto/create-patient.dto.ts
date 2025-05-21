import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

class HumanName {
    @ApiProperty({ description: 'Family name', example: 'Smith' })
    @IsString()
    @IsNotEmpty()
    family: string;

    @ApiProperty({ description: 'Given names', example: '["John", "Adam"]' })
    @IsArray()
    @IsString({ each: true })
    given: string[];

    @ApiProperty({ description: 'Use of this name', enum: ['usual', 'official', 'temp', 'nickname', 'anonymous', 'old', 'maiden'], example: 'official' })
    @IsString()
    @IsOptional()
    use?: string;

    @ApiProperty({ description: 'Text representation of the full name', example: 'John Adam Smith' })
    @IsString()
    @IsOptional()
    text?: string;
}

class ContactPoint {
    @ApiProperty({ description: 'Type of contact', enum: ['phone', 'fax', 'email', 'pager', 'url', 'sms', 'other'], example: 'phone' })
    @IsString()
    @IsNotEmpty()
    system: string;

    @ApiProperty({ description: 'Contact point value', example: '555-555-5555' })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiProperty({ description: 'Use of this contact', enum: ['home', 'work', 'temp', 'old', 'mobile'], example: 'home' })
    @IsString()
    @IsOptional()
    use?: string;
}

class Address {
    @ApiProperty({ description: 'Street address lines', example: '["123 Main St"]' })
    @IsArray()
    @IsString({ each: true })
    line: string[];

    @ApiProperty({ description: 'City', example: 'Anytown' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ description: 'State/Province', example: 'CA' })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiProperty({ description: 'Postal code', example: '12345' })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @ApiProperty({ description: 'Country', example: 'US' })
    @IsString()
    @IsOptional()
    country?: string;
}

export class CreatePatientDto {
    @ApiProperty({ description: 'Resource type', default: 'Patient', readOnly: true })
    @IsString()
    readonly resourceType: string = 'Patient';

    @ApiProperty({ type: [HumanName], description: 'Patient names' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => HumanName)
    name: HumanName[];

    @ApiProperty({ description: 'Patient gender', enum: ['male', 'female', 'other', 'unknown'], example: 'male' })
    @IsString()
    @IsEnum(['male', 'female', 'other', 'unknown'])
    gender: string;

    @ApiProperty({ description: 'Date of birth', type: String, format: 'date', example: '1980-06-15' })
    @IsString()
    birthDate: string;

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

    @ApiProperty({ description: 'Whether the patient record is active', default: true, required: false })
    @IsOptional()
    active?: boolean;
} 