import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: MockRepo<User>;

  beforeEach(() => {
    repo = createMockRepo();
    service = new UsersService(repo as unknown as Repository<User>);
  });

  it('findById should look up by id', async () => {
    const user = { id: 1, email: 'a@test.com' } as User;
    repo.findOne!.mockResolvedValue(user);

    const result = await service.findById(1);

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toBe(user);
  });

  it('findByEmail should query without select by default', async () => {
    const user = { id: 2, email: 'b@test.com' } as User;
    repo.findOne!.mockResolvedValue(user);

    const result = await service.findByEmail('b@test.com');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'b@test.com' } });
    expect(result).toBe(user);
  });

  it('findByEmail should request password hash when asked', async () => {
    const user = { id: 3, email: 'c@test.com', password: 'hashed' } as User;
    repo.findOne!.mockResolvedValue(user);

    const result = await service.findByEmail('c@test.com', { withHash: true });

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'c@test.com' },
      select: ['id', 'email', 'name', 'password', 'createdAt', 'updatedAt'],
    });
    expect(result).toBe(user);
  });

  it('create should instantiate and persist user', async () => {
    const payload = { email: 'new@test.com', name: 'New User' };
    const created = { ...payload } as User;
    const saved = { id: 10, ...payload } as User;

    repo.create!.mockReturnValue(created);
    repo.save!.mockResolvedValue(saved);

    const result = await service.create(payload);

    expect(repo.create).toHaveBeenCalledWith(payload);
    expect(repo.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(saved);
  });
});
