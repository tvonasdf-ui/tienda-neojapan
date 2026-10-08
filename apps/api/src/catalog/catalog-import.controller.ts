import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseStaffGuard } from '../auth/supabase-staff.guard';
import { ensureImportRows } from './catalog-import.service';
import { parseCatalogCsv } from './catalog-csv';
import { CatalogImportService } from './catalog-import.service';

@Controller('admin/products')
@UseGuards(SupabaseStaffGuard)
export class CatalogImportController {
  constructor(private readonly catalogImportService: CatalogImportService) {}

  /** Carga masiva del catálogo desde CSV (multipart, campo `file`). */
  @Post('import-csv')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 1024 * 1024 } }),
  )
  async importCsv(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo requerido (campo multipart `file`)');
    }
    if (!/\.(csv|txt)$/i.test(file.originalname)) {
      throw new BadRequestException('El archivo debe tener extensión .csv');
    }

    const { rows, errors } = parseCatalogCsv(file.buffer.toString('utf8'));
    if (errors.length > 0) {
      return {
        createdProducts: 0,
        totalRows: rows.length,
        errors,
        detail: `El archivo tiene ${errors.length} filas inválidas; corrígelas y vuelve a importar.`,
      };
    }

    const summary = await this.catalogImportService.importRows(
      ensureImportRows(rows),
    );
    return {
      ...summary,
      detail:
        summary.errors.length > 0
          ? `Productos creados: ${summary.createdProducts}. Errores (no importados): ${summary.errors.length}.`
          : `Productos creados: ${summary.createdProducts}.`,
    };
  }
}