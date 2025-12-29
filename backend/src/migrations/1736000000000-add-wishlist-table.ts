import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWishlistTable1736000000000 implements MigrationInterface {
  name = 'AddWishlistTable1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`wishlist_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`productId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_wishlist_user_product\` (\`userId\`, \`productId\`),
        INDEX \`IDX_wishlist_product\` (\`productId\`),
        CONSTRAINT \`FK_wishlist_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_wishlist_product\` FOREIGN KEY (\`productId\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `wishlist_items` DROP FOREIGN KEY `FK_wishlist_product`',
    );
    await queryRunner.query(
      'ALTER TABLE `wishlist_items` DROP FOREIGN KEY `FK_wishlist_user`',
    );
    await queryRunner.query('DROP INDEX `IDX_wishlist_product` ON `wishlist_items`');
    await queryRunner.query(
      'DROP INDEX `IDX_wishlist_user_product` ON `wishlist_items`',
    );
    await queryRunner.query('DROP TABLE `wishlist_items`');
  }
}
