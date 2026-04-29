import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TypedEventEmitter } from '../event-bus/typed-event-emitter.service';
import { AddBookDto } from './dto/add-book.dto';

interface ChecksheetItem {
  id: string;
  text: string;
  completed: boolean;
}

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TypedEventEmitter,
  ) {}

  async getMyProgram(schoolId: string, userId: string) {
    return this.prisma.program.findFirst({
      where: { schoolId, studentUserId: userId },
      include: {
        checksheets: { orderBy: [{ stream: 'asc' }, { name: 'asc' }] },
        booksRead: { orderBy: { completedAt: 'desc' } },
      },
    });
  }

  async toggleChecksheetItem(
    programId: string,
    checksheetId: string,
    itemId: string,
    completed: boolean,
  ) {
    const sheet = await this.prisma.checksheet.findFirst({
      where: { id: checksheetId, programId },
    });
    if (!sheet) throw new NotFoundException(`Checksheet ${checksheetId} not found`);

    const items = (sheet.items as unknown as ChecksheetItem[]).map((item) =>
      item.id === itemId ? { ...item, completed } : item,
    );

    return this.prisma.checksheet.update({
      where: { id: checksheetId },
      data: { items: items as unknown as object[] },
    });
  }

  async markChecksheetDone(programId: string, checksheetId: string) {
    const sheet = await this.prisma.checksheet.findFirst({
      where: { id: checksheetId, programId },
    });
    if (!sheet) throw new NotFoundException(`Checksheet ${checksheetId} not found`);

    const items = sheet.items as unknown as ChecksheetItem[];
    const allDone = items.length > 0 && items.every((i) => i.completed);

    return this.prisma.checksheet.update({
      where: { id: checksheetId },
      data: { completedAt: allDone ? new Date() : null },
    });
  }

  async addBookRead(programId: string, dto: AddBookDto) {
    return this.prisma.bookRead.create({
      data: {
        programId,
        title: dto.title,
        author: dto.author ?? null,
        notes: dto.notes ?? null,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
      },
    });
  }

  async updateBookRead(bookId: string, dto: AddBookDto) {
    const existing = await this.prisma.bookRead.findUnique({ where: { id: bookId } });
    if (!existing) throw new NotFoundException(`BookRead ${bookId} not found`);

    return this.prisma.bookRead.update({
      where: { id: bookId },
      data: {
        title: dto.title,
        author: dto.author ?? null,
        notes: dto.notes ?? null,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
      },
    });
  }

  async deleteBookRead(bookId: string) {
    const existing = await this.prisma.bookRead.findUnique({ where: { id: bookId } });
    if (!existing) throw new NotFoundException(`BookRead ${bookId} not found`);
    await this.prisma.bookRead.delete({ where: { id: bookId } });
    return { ok: true };
  }
}
