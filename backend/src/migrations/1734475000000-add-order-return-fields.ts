import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderReturnFields1734475000000 implements MigrationInterface {
  name = 'AddOrderReturnFields1734475000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `order_detail` ADD `variantId` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `order_detail` ADD `returnedQuantity` int NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `order_detail` ADD CONSTRAINT `FK_order_detail_variant` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `order_detail` DROP FOREIGN KEY `FK_order_detail_variant`',
    );
    await queryRunner.query(
      'ALTER TABLE `order_detail` DROP COLUMN `returnedQuantity`',
    );
    await queryRunner.query('ALTER TABLE `order_detail` DROP COLUMN `variantId`');
  }
}
