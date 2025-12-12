import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserProfileService } from './user-profile.service';
import { User } from '../users/user.entity';

describe('UserProfileService', () => {
  let service: UserProfileService;
  const usersRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get(UserProfileService);
    jest.clearAllMocks();
  });

  it('getUserProfile returns correct user data', async () => {
    const user = { id: 1, email: 'demo@example.com', name: 'Demo' } as User;
    usersRepository.findOne.mockResolvedValue(user);

    const result = await service.getUserProfile(1);

    expect(result).toEqual(user);
    expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('updateUserProfile updates allowed fields', async () => {
    const existing = { id: 2, email: 'old@example.com', name: 'Old' } as User;
    const updated = { ...existing, email: 'new@example.com', name: 'New' };
    usersRepository.findOne
      .mockResolvedValueOnce(existing) // fetch current user
      .mockResolvedValueOnce(null); // no conflicting email
    usersRepository.save.mockResolvedValue(updated);

    const result = await service.updateUserProfile(2, {
      email: 'new@example.com',
      name: 'New',
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        email: 'new@example.com',
        name: 'New',
      }),
    );
    expect(result).toEqual(updated);
  });

  it('rejects update when email already exists', async () => {
    const existing = { id: 3, email: 'current@example.com' } as User;
    const conflicting = { id: 99, email: 'duplicate@example.com' } as User;
    usersRepository.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(conflicting);

    await expect(
      service.updateUserProfile(3, { email: 'duplicate@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException if user not found', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getUserProfile(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
