import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserTempService } from './user-temp.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('user')
export class UserTempController {
  constructor(private readonly userService: UserTempService) {}

  @Post()
  @ApiBody({ type: CreateUserDto })
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request.',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return all users.',
  })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Return the user.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    required: true,
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
