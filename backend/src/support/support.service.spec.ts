import { SupportService } from './support.service';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { SendMessageDto } from './dto/send-message.dto';

class InMemoryConversationRepository {
  data = new Map<number, Conversation>();
  private seq = 1;

  async findOne(options: { where: { id: number }; relations?: string[] }): Promise<Conversation | null> {
    return this.data.get(options.where.id) ?? null;
  }

  async save(conversation: Conversation): Promise<Conversation> {
    if (!conversation.id) {
      conversation.id = this.seq++;
    }
    this.data.set(conversation.id, conversation);
    return conversation;
  }
}

class InMemoryMessageRepository {
  data = new Map<number, Message>();
  private seq = 1;

  create(payload: Partial<Message>): Message {
    return {
      id: 0,
      conversationId: payload.conversationId ?? 0,
      conversation: payload.conversation ?? (undefined as any),
      senderId: payload.senderId ?? null,
      sender: payload.sender ?? null,
      senderType: payload.senderType ?? 'customer',
      content: payload.content ?? '',
      createdAt: new Date(),
      attachments: payload.attachments ?? [],
    } as Message;
  }

  async save(message: Message): Promise<Message> {
    if (!message.id) {
      message.id = this.seq++;
    }
    this.data.set(message.id, message);
    return message;
  }

  async findOne(options: { where: { id: number }; relations?: string[] }): Promise<Message | null> {
    return this.data.get(options.where.id) ?? null;
  }
}

const buildConversation = (overrides: Partial<Conversation> = {}): Conversation =>
  ({
    id: overrides.id ?? 1,
    customerId: overrides.customerId ?? 10,
    customer: overrides.customer ?? null,
    agentId: overrides.agentId ?? null,
    agent: overrides.agent ?? null,
    status: overrides.status ?? 'open',
    guestEmail: overrides.guestEmail ?? null,
    guestName: overrides.guestName ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    messages: overrides.messages ?? [],
  }) as Conversation;

const createService = (
  conversationRepo: InMemoryConversationRepository,
  messageRepo: InMemoryMessageRepository,
) => {
  const noopRepo = {} as any;
  const usersService = { findById: jest.fn() } as any;
  const whatsappService = { notifyAgent: jest.fn() } as any;

  return new SupportService(
    conversationRepo as any,
    messageRepo as any,
    noopRepo,
    noopRepo,
    noopRepo,
    usersService,
    whatsappService,
  );
};

describe('SupportService', () => {
  it('claims an open conversation for the agent', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    await conversationRepo.save(buildConversation({ id: 5, status: 'open' }));
    const service = createService(conversationRepo, messageRepo);

    const result = await service.claimConversation(5, 42);

    expect(result.agentId).toBe(42);
    expect(result.status).toBe('claimed');
    expect(conversationRepo.data.get(5)?.agentId).toBe(42);
  });

  it('auto-claims open conversation when agent sends a message', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    await conversationRepo.save(buildConversation({ id: 7, status: 'open' }));
    const service = createService(conversationRepo, messageRepo);
    const payload: SendMessageDto = { content: 'Hello from support' };

    const message = await service.sendMessage(7, 99, 'agent', payload);

    const updated = conversationRepo.data.get(7);
    expect(updated?.agentId).toBe(99);
    expect(updated?.status).toBe('claimed');
    expect(message.content).toBe('Hello from support');
    expect(message.senderId).toBe(99);
    expect(message.senderType).toBe('agent');
  });
});
