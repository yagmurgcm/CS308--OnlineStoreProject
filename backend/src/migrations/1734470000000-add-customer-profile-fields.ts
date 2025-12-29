import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerProfileFields1734470000000
  implements MigrationInterface
{
  name = 'AddCustomerProfileFields1734470000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` ADD `taxId` varchar(64) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `user` ADD `homeAddress` varchar(255) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `user` DROP COLUMN `homeAddress`',
    );
    await queryRunner.query('ALTER TABLE `user` DROP COLUMN `taxId`');
  }
}
