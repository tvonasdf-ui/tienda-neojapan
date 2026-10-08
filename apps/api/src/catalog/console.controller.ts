import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('consoles')
export class ConsoleController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.consoles();
  }
}
