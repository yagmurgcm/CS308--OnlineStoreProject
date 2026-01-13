import { SupportService } from './support.service';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ChatAttachment } from './chat-attachment.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ALL_ALLOWED_TYPES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from './upload.config';

class InMemoryConversationRepository {
  data = new Map<number, Conversation>();
  private seq = 1;

  create(payload: Partial<Conversation>): Conversation {
    return {
      id: 0,
      customerId: payload.customerId ?? null,
      customer: payload.customer ?? null,
      agentId: payload.agentId ?? null,
      agent: payload.agent ?? null,
      status: payload.status ?? 'open',
      guestEmail: payload.guestEmail ?? null,
      guestName: payload.guestName ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: payload.messages ?? [],
    } as Conversation;
  }

  async find(options?: any): Promise<Conversation[]> {
    const results: Conversation[] = [];
    this.data.forEach((conv) => {
      if (options?.where?.customerId !== undefined) {
        if (conv.customerId === options.where.customerId) {
          results.push(conv);
        }
      } else if (options?.where?.status !== undefined) {
        if (conv.status === options.where.status) {
          results.push(conv);
        }
      } else {
        results.push(conv);
      }
    });
    return results;
  }

  async findOne(options: { where: { id?: number; guestEmail?: string }; relations?: string[] }): Promise<Conversation | null> {
    if (options.where.id) {
      return this.data.get(options.where.id) ?? null;
    }
    if (options.where.guestEmail) {
      for (const conv of this.data.values()) {
        if (conv.guestEmail === options.where.guestEmail) {
          return conv;
        }
      }
    }
    return null;
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

class InMemoryAttachmentRepository {
  data = new Map<number, ChatAttachment>();
  private seq = 1;

  create(payload: Partial<ChatAttachment>): ChatAttachment {
    return {
      id: 0,
      messageId: payload.messageId ?? 0,
      message: payload.message ?? (undefined as any),
      fileName: payload.fileName ?? '',
      filePath: payload.filePath ?? '',
      fileType: payload.fileType ?? '',
      fileSize: payload.fileSize ?? 0,
      createdAt: new Date(),
    } as ChatAttachment;
  }

  async save(attachment: ChatAttachment): Promise<ChatAttachment> {
    if (!attachment.id) {
      attachment.id = this.seq++;
    }
    this.data.set(attachment.id, attachment);
    return attachment;
  }

  async findOne(options: { where: { id: number }; relations?: string[] }): Promise<ChatAttachment | null> {
    return this.data.get(options.where.id) ?? null;
  }

  async delete(id: number): Promise<void> {
    this.data.delete(id);
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
  attachmentRepo?: InMemoryAttachmentRepository,
) => {
  const noopRepo = {} as any;
  const usersService = { findById: jest.fn() } as any;
  const whatsappService = { notifyAgent: jest.fn().mockResolvedValue(undefined) } as any;

  return new SupportService(
    conversationRepo as any,
    messageRepo as any,
    attachmentRepo as any ?? noopRepo,
    noopRepo, // orderRepo
    noopRepo, // wishlistRepo
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

  it('throws when claiming a missing conversation', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    const service = createService(conversationRepo, messageRepo);

    await expect(service.claimConversation(999, 12)).rejects.toThrow();
  });

  it('throws when sending an agent message for a missing conversation', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    const service = createService(conversationRepo, messageRepo);
    const payload: SendMessageDto = { content: 'Need an update' };

    await expect(service.sendMessage(404, 55, 'agent', payload)).rejects.toThrow();
  });

  it('keeps the claimed assignment when the same agent replies', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    await conversationRepo.save(buildConversation({ id: 11, status: 'claimed', agentId: 77 }));
    const service = createService(conversationRepo, messageRepo);
    const payload: SendMessageDto = { content: 'Following up' };

    const message = await service.sendMessage(11, 77, 'agent', payload);

    const updated = conversationRepo.data.get(11);
    expect(updated?.agentId).toBe(77);
    expect(updated?.status).toBe('claimed');
    expect(message.senderId).toBe(77);
  });

  it('stores the agent message with the conversation id', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    await conversationRepo.save(buildConversation({ id: 21, status: 'claimed', agentId: 33 }));
    const service = createService(conversationRepo, messageRepo);
    const payload: SendMessageDto = { content: 'We are on it' };

    const message = await service.sendMessage(21, 33, 'agent', payload);

    expect(message.conversationId).toBe(21);
    expect(messageRepo.data.get(message.id)?.conversationId).toBe(21);
  });

  // ============ NEW TEST CASES FOR ATTACHMENTS & GUEST SUPPORT ============

  it('allows guest user to create conversation and send messages', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    const service = createService(conversationRepo, messageRepo);

    // Guest creates conversation
    const conversation = await service.createConversation(null, {
      guestEmail: 'guest@example.com',
      guestName: 'Test Guest',
    } as CreateConversationDto);

    expect(conversation.customerId).toBeNull();
    expect(conversation.guestEmail).toBe('guest@example.com');
    expect(conversation.guestName).toBe('Test Guest');
    expect(conversation.status).toBe('open');

    // Guest sends message
    const payload: SendMessageDto = { content: 'Hello, I need help!' };
    const message = await service.sendMessage(conversation.id, null, 'guest', payload);

    expect(message.senderId).toBeNull();
    expect(message.senderType).toBe('guest');
    expect(message.content).toBe('Hello, I need help!');
  });

  it('validates allowed file types for attachments (images, PDF, videos)', () => {
    // Test that all expected image types are allowed
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    imageTypes.forEach((type) => {
      expect(ALL_ALLOWED_TYPES).toContain(type);
      expect(ALLOWED_FILE_TYPES.images).toContain(type);
    });

    // Test that PDF is allowed
    expect(ALL_ALLOWED_TYPES).toContain('application/pdf');
    expect(ALLOWED_FILE_TYPES.documents).toContain('application/pdf');

    // Test that video types are allowed
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    videoTypes.forEach((type) => {
      expect(ALL_ALLOWED_TYPES).toContain(type);
      expect(ALLOWED_FILE_TYPES.videos).toContain(type);
    });

    // Test that invalid types are NOT in the allowed list
    expect(ALL_ALLOWED_TYPES).not.toContain('application/exe');
    expect(ALL_ALLOWED_TYPES).not.toContain('text/javascript');
    expect(ALL_ALLOWED_TYPES).not.toContain('application/x-msdownload');

    // Test max file size is 10MB
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it('adds attachments to a message successfully', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    const attachmentRepo = new InMemoryAttachmentRepository();
    await conversationRepo.save(buildConversation({ id: 30, status: 'open' }));
    const service = createService(conversationRepo, messageRepo, attachmentRepo);

    // Send a message first
    const payload: SendMessageDto = { content: 'Here is my document' };
    const message = await service.sendMessage(30, 10, 'customer', payload);

    // Mock file objects
    const mockFiles: Express.Multer.File[] = [
      {
        originalname: 'test-image.jpg',
        filename: 'chat-123456789.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 100, // 100KB
      } as Express.Multer.File,
      {
        originalname: 'document.pdf',
        filename: 'chat-987654321.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 500, // 500KB
      } as Express.Multer.File,
    ];

    // Add attachments
    const attachments = await service.addAttachments(message.id, mockFiles);

    expect(attachments).toHaveLength(2);
    expect(attachments[0].fileName).toBe('test-image.jpg');
    expect(attachments[0].fileType).toBe('image/jpeg');
    expect(attachments[1].fileName).toBe('document.pdf');
    expect(attachments[1].fileType).toBe('application/pdf');
    expect(attachmentRepo.data.size).toBe(2);
  });

  it('agent can close a claimed conversation', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    await conversationRepo.save(buildConversation({ id: 40, status: 'claimed', agentId: 50 }));
    const service = createService(conversationRepo, messageRepo);

    const closedConversation = await service.closeConversation(40, 50);

    expect(closedConversation.status).toBe('closed');
    expect(conversationRepo.data.get(40)?.status).toBe('closed');
  });

  it('throws error when non-assigned agent tries to close conversation', async () => {
    const conversationRepo = new InMemoryConversationRepository();
    const messageRepo = new InMemoryMessageRepository();
    await conversationRepo.save(buildConversation({ id: 45, status: 'claimed', agentId: 60 }));
    const service = createService(conversationRepo, messageRepo);

    // Agent 99 tries to close a conversation assigned to agent 60
    await expect(service.closeConversation(45, 99)).rejects.toThrow();
  });
});
