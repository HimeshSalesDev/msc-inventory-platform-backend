import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusAndSkuToInventoryReference1754480756688
  implements MigrationInterface
{
  name = 'AddStatusAndSkuToInventoryReference1754480756688';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`inventory_reference\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(10) NOT NULL, \`number\` varchar(100) NOT NULL, \`sku\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`status\` enum ('CREATED', 'DELIVERED', 'IN_TRANSIT', 'CANCELLED') NOT NULL DEFAULT 'CREATED', INDEX \`idx_inventory_reference_sku\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_reference_sku\` ON \`inventory_reference\``,
    );
    await queryRunner.query(`DROP TABLE \`inventory_reference\``);
  }
}
