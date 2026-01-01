import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTable1738600000000 implements MigrationInterface {
  name = 'AddNotificationsTable1738600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `notifications` (`id` int NOT NULL AUTO_INCREMENT, `userId` int NOT NULL, `title` varchar(160) NOT NULL, `message` text NOT NULL, `read` tinyint NOT NULL DEFAULT 0, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'ALTER TABLE `notifications` ADD CONSTRAINT `FK_notifications_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `notifications` DROP FOREIGN KEY `FK_notifications_user`',
    );
    await queryRunner.query('DROP TABLE `notifications`');
  }
}
