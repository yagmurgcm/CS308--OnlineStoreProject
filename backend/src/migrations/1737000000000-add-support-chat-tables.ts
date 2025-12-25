import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportChatTables1737000000000 implements MigrationInterface {
  name = 'AddSupportChatTables1737000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.query(`
      CREATE TABLE \`conversations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`customerId\` int NULL,
        \`agentId\` int NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'open',
        \`guestEmail\` varchar(255) NULL,
        \`guestName\` varchar(120) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_conversation_customer\` (\`customerId\`),
        INDEX \`IDX_conversation_agent\` (\`agentId\`),
        INDEX \`IDX_conversation_status\` (\`status\`),
        CONSTRAINT \`FK_conversation_customer\` FOREIGN KEY (\`customerId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT \`FK_conversation_agent\` FOREIGN KEY (\`agentId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    // Create messages table
    await queryRunner.query(`
      CREATE TABLE \`messages\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`conversationId\` int NOT NULL,
        \`senderId\` int NULL,
        \`senderType\` varchar(20) NOT NULL,
        \`content\` text NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_message_conversation\` (\`conversationId\`),
        INDEX \`IDX_message_sender\` (\`senderId\`),
        CONSTRAINT \`FK_message_conversation\` FOREIGN KEY (\`conversationId\`) REFERENCES \`conversations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_message_sender\` FOREIGN KEY (\`senderId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    // Create chat_attachments table
    await queryRunner.query(`
      CREATE TABLE \`chat_attachments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`messageId\` int NOT NULL,
        \`fileName\` varchar(255) NOT NULL,
        \`filePath\` varchar(500) NOT NULL,
        \`fileType\` varchar(100) NOT NULL,
        \`fileSize\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_attachment_message\` (\`messageId\`),
        CONSTRAINT \`FK_attachment_message\` FOREIGN KEY (\`messageId\`) REFERENCES \`messages\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `chat_attachments`');
    await queryRunner.query('DROP TABLE IF EXISTS `messages`');
    await queryRunner.query('DROP TABLE IF EXISTS `conversations`');
  }
}

