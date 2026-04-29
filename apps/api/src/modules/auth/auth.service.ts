import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const COOKIE_NAME = 'sesh';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(
    email: string,
    password: string,
    res: Response,
    schoolId?: string,
  ) {
    // If no schoolId was supplied and only one school exists in the system
    // (default single-tenant deployment for The Delphian School), use it.
    let resolvedSchoolId = schoolId;
    if (!resolvedSchoolId) {
      const schools = await this.prisma.school.findMany({
        select: { id: true },
        take: 2,
      });
      if (schools.length === 1) {
        resolvedSchoolId = schools[0].id;
      }
    }

    const user = await this.prisma.user.findFirst({
      where: resolvedSchoolId
        ? { email, OR: [{ schoolId: resolvedSchoolId }, { isSuperAdmin: true }] }
        : { email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!resolvedSchoolId && !user.isSuperAdmin) {
      throw new BadRequestException(
        'Multiple schools exist; a schoolId is required to log in as a non-super-admin.',
      );
    }

    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await this.prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    this.setCookie(res, token, expiresAt);

    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  }

  async logout(token: string | undefined, res: Response) {
    if (token) {
      await this.prisma.session.deleteMany({ where: { token } });
    }
    res.clearCookie(COOKIE_NAME);
  }

  async renew(token: string, res: Response) {
    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      res.clearCookie(COOKIE_NAME);
      throw new UnauthorizedException('Session not found or expired');
    }

    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiry },
    });

    this.setCookie(res, token, newExpiry);
    return { expiresAt: newExpiry };
  }

  private setCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/',
    });
  }
}
