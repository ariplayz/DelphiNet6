import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

const DEFAULT_THEME_KEY = 'delphinet';

export interface PreferencesShape {
  themeKey: string;
  customThemes: unknown[];
}

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<PreferencesShape> {
    const row = await this.prisma.userPreference.findUnique({ where: { userId } });
    return {
      themeKey: row?.themeKey ?? DEFAULT_THEME_KEY,
      customThemes: Array.isArray(row?.customThemes) ? (row!.customThemes as unknown[]) : [],
    };
  }

  async update(userId: string, dto: UpdatePreferencesDto): Promise<PreferencesShape> {
    const themeKey = dto.themeKey ?? DEFAULT_THEME_KEY;
    const customThemes = Array.isArray(dto.customThemes) ? dto.customThemes : [];
    const row = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, themeKey, customThemes: customThemes as any },
      update: { themeKey, customThemes: customThemes as any },
    });
    return {
      themeKey: row.themeKey,
      customThemes: Array.isArray(row.customThemes) ? (row.customThemes as unknown[]) : [],
    };
  }
}
