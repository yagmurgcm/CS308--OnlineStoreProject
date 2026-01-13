import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOrderDetailProductIdNullable1738700000000 implements MigrationInterface {
  name = 'MakeOrderDetailProductIdNullable1738700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, find and drop the existing foreign key constraint
    const [constraints] = await queryRunner.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'order_detail' 
      AND COLUMN_NAME = 'productId' 
      AND REFERENCED_TABLE_NAME = 'products'
    `);

    if (constraints && constraints.length > 0) {
      const constraintName = constraints[0].CONSTRAINT_NAME;
      await queryRunner.query(
        `ALTER TABLE \`order_detail\` DROP FOREIGN KEY \`${constraintName}\``,
      );
    }

    // Make productId nullable
    await queryRunner.query(
      'ALTER TABLE `order_detail` MODIFY COLUMN `productId` int NULL',
    );

    // Re-add the foreign key with ON DELETE SET NULL
    await queryRunner.query(
      'ALTER TABLE `order_detail` ADD CONSTRAINT `FK_order_detail_product` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key
    await queryRunner.query(
      'ALTER TABLE `order_detail` DROP FOREIGN KEY `FK_order_detail_product`',
    );

    // Make productId NOT NULL again (this might fail if there are NULL values)
    await queryRunner.query(
      'ALTER TABLE `order_detail` MODIFY COLUMN `productId` int NOT NULL',
    );

    // Re-add the foreign key without ON DELETE SET NULL
    await queryRunner.query(
      'ALTER TABLE `order_detail` ADD CONSTRAINT `FK_order_detail_product` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}

