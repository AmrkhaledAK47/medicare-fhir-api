import { Module } from '@nestjs/common';
import { PractitionerSeedService } from './practitioner-seed';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema }
        ])
    ],
    providers: [PractitionerSeedService],
    exports: [PractitionerSeedService],
})
export class SeedModule { } 