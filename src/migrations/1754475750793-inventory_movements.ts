import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryMovements1754475750793 implements MigrationInterface {
  name = 'InventoryMovements1754475750793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`inventory_movements\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`type\` enum ('IN', 'OUT', 'ADJUST') NOT NULL, \`quantity\` int UNSIGNED NOT NULL, \`binNumber\` varchar(255) NULL, \`location\` varchar(255) NOT NULL, \`proNumber\` varchar(255) NULL, \`userId\` varchar(255) NULL, \`reason\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`inventory_movements\``);
  }
}
