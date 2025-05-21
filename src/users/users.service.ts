import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { RegisterDto } from '../auth/dto/register.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) { }

    async create(userData: RegisterDto): Promise<User> {
        const newUser = new this.userModel(userData);
        return await newUser.save();
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.userModel.findById(id).exec();
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async update(userId: string, userData: Partial<User>): Promise<User> {
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: userData },
            { new: true },
        ).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async remove(userId: string): Promise<boolean> {
        const result = await this.userModel.deleteOne({ _id: userId }).exec();
        return result.deletedCount > 0;
    }

    async findAll(): Promise<User[]> {
        return this.userModel.find().exec();
    }
} 