import { Module } from '@nestjs/common';
import { PractitionerProfileService } from '../practitioner-dashboard/services/practitioner-profile.service';

@Module({
    providers: [PractitionerProfileService],
    exports: [PractitionerProfileService],
})
export class PractitionerProfileModule { } 