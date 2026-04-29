import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

// ── argon2 mock ──────────────────────────────────────────────────────────────
vi.mock('argon2', () => ({
  verify: vi.fn(),
  hash: vi.fn(),
}));
import * as argon2 from 'argon2';

// ── helpers ──────────────────────────────────────────────────────────────────
const USER_ID = 'user-123';
const CURRENT_TOKEN = 'token-abc';
const CURRENT_HASH = '$argon2id$current';
const NEW_HASH = '$argon2id$new';

const mockUser = {
  id: USER_ID,
  passwordHash: CURRENT_HASH,
  mustChangePassword: true,
};

// ── PrismaService mock factory ───────────────────────────────────────────────
function buildPrismaMock() {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(mockUser),
      update: vi.fn().mockResolvedValue({ ...mockUser, mustChangePassword: false }),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

// ── test suite ───────────────────────────────────────────────────────────────
describe('AuthService.changePassword', () => {
  let service: AuthService;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prismaMock = buildPrismaMock();
    // Instantiate directly — no DI container needed for unit tests
    service = new AuthService(prismaMock as any);

    vi.mocked(argon2.verify).mockReset();
    vi.mocked(argon2.hash).mockReset();
  });

  // ── success ─────────────────────────────────────────────────────────────────
  it('updates the password hash and clears mustChangePassword on success', async () => {
    vi.mocked(argon2.verify).mockResolvedValue(true);
    vi.mocked(argon2.hash).mockResolvedValue(NEW_HASH);

    const result = await service.changePassword(USER_ID, 'oldpass1', 'newpass1', CURRENT_TOKEN);

    expect(result).toEqual({ ok: true });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { passwordHash: NEW_HASH, mustChangePassword: false },
    });
  });

  // ── session revocation ───────────────────────────────────────────────────────
  it('deletes OTHER sessions but keeps the current session token', async () => {
    vi.mocked(argon2.verify).mockResolvedValue(true);
    vi.mocked(argon2.hash).mockResolvedValue(NEW_HASH);

    await service.changePassword(USER_ID, 'oldpass1', 'newpass1', CURRENT_TOKEN);

    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        NOT: { token: CURRENT_TOKEN },
      },
    });
  });

  // ── wrong current password ───────────────────────────────────────────────────
  it('throws UnauthorizedException when current password is wrong', async () => {
    vi.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      service.changePassword(USER_ID, 'wrongpass', 'newpass1', CURRENT_TOKEN),
    ).rejects.toThrow(UnauthorizedException);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // ── too-short new password ───────────────────────────────────────────────────
  it('throws BadRequestException when new password is shorter than 8 characters', async () => {
    await expect(
      service.changePassword(USER_ID, 'oldpass1', 'short', CURRENT_TOKEN),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  // ── no-op: same password ─────────────────────────────────────────────────────
  it('throws BadRequestException when new password equals current password', async () => {
    await expect(
      service.changePassword(USER_ID, 'samepass123', 'samepass123', CURRENT_TOKEN),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
