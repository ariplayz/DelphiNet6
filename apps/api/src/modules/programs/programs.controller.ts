import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ProgramsService } from './programs.service';
import { AddBookDto } from './dto/add-book.dto';
import { ToggleItemDto } from './dto/toggle-item.dto';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly service: ProgramsService) {}

  @Get('mine')
  getMyProgram(@Req() req: Request) {
    const schoolId = (req as any).schoolId as string;
    return this.service.getMyProgram(schoolId, req.user!.id);
  }

  @Patch('checksheets/:checksheetId/items/:itemId')
  async toggleItem(
    @Req() req: Request,
    @Param('checksheetId') checksheetId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ToggleItemDto,
  ) {
    const schoolId = (req as any).schoolId as string;
    const program = await this.service.getMyProgram(schoolId, req.user!.id);
    if (!program) {
      return { ok: false };
    }
    const sheet = await this.service.toggleChecksheetItem(
      program.id,
      checksheetId,
      itemId,
      dto.completed,
    );
    // Auto-update completedAt based on new item states
    await this.service.markChecksheetDone(program.id, checksheetId);
    return sheet;
  }

  @Post('books')
  async addBook(@Req() req: Request, @Body() dto: AddBookDto) {
    const schoolId = (req as any).schoolId as string;
    const program = await this.service.getMyProgram(schoolId, req.user!.id);
    if (!program) {
      return { ok: false };
    }
    return this.service.addBookRead(program.id, dto);
  }

  @Patch('books/:bookId')
  updateBook(@Param('bookId') bookId: string, @Body() dto: AddBookDto) {
    return this.service.updateBookRead(bookId, dto);
  }

  @Delete('books/:bookId')
  deleteBook(@Param('bookId') bookId: string) {
    return this.service.deleteBookRead(bookId);
  }
}
