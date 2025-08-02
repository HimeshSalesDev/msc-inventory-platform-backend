import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryReferenceService } from './inventory_reference.service';
import { CreateInventoryReferenceDto } from './dto/create_inventory_reference.dto';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { InventoryReferenceResponseDto } from './dto/inventory_reference_response.dto';

@Controller('inventory-reference')
export class InventoryReferenceController {
  constructor(
    private readonly inventoryReferenceService: InventoryReferenceService,
  ) {}

  @Post()
  @ApiBody({
    type: CreateInventoryReferenceDto,
    description: 'Inventory reference data from trends',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inventory reference created or updated successfully',
    type: InventoryReferenceResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createInventoryReference(
    @Body() createInventoryReferenceDto: CreateInventoryReferenceDto,
  ) {
    try {
      if (
        !createInventoryReferenceDto.sku ||
        !createInventoryReferenceDto.number ||
        !createInventoryReferenceDto.type
      ) {
        throw new BadRequestException('Required fields are missing.');
      }

      return await this.inventoryReferenceService.create(
        createInventoryReferenceDto,
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to create inventory item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
