import { Injectable, BadRequestException } from '@nestjs/common';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { UserTemp } from './entities/user-temp.entity';
import type { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserTempService {
  constructor(
    @InjectRepository(UserTemp)
    private userRepository: Repository<UserTemp>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserTemp> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOneBy({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    if (createUserDto.password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    // TypeORM will automatically handle createdAt and updatedAt
    return this.userRepository.save(createUserDto);
  }

  findAll(): Promise<UserTemp[]> {
    return this.userRepository.find();
  }

  findOne(id: number): Promise<UserTemp | null> {
    return this.userRepository.findOneBy({ id });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password && updateUserDto.password.length < 6) {
      throw new BadRequestException(
        'Password must be at least 6 characters long',
      );
    }

    return this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
