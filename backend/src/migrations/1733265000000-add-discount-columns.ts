import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscountColumns1733265000000 implements MigrationInterface {
  name = 'AddDiscountColumns1733265000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `products` ADD `discountRate` int NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `products` ADD `discountedPrice` decimal(10,2) NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `products` DROP COLUMN `discountedPrice`',
    );
    await queryRunner.query(
      'ALTER TABLE `products` DROP COLUMN `discountRate`',
    );
  }
}
