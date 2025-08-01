import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryReferenceService } from './inventory_reference.service';
import { CreateInventoryReferenceDto } from './dto/create_inventory_reference.dto';

@Controller('inventory-reference')
export class InventoryReferenceController {
  constructor(
    private readonly inventoryReferenceService: InventoryReferenceService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createInventoryReference(
    @Body() createInventoryReferenceDto: CreateInventoryReferenceDto,
    @Req() req,
  ) {
    //
    try {
      // Validate required fields
      if (
        !createInventoryReferenceDto.sku ||
        !createInventoryReferenceDto.number ||
        !createInventoryReferenceDto.type
      ) {
        throw new BadRequestException('Required fields are missing.');
      }

      return await this.inventoryReferenceService.create(
        createInventoryReferenceDto,
        req,
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
