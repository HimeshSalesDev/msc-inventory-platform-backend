import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryLocation1753944265128 implements MigrationInterface {
  name = 'InventoryLocation1753944265128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`inventory_locations\` (\`id\` varchar(36) NOT NULL, \`inventoryId\` varchar(255) NOT NULL, \`binNumber\` varchar(10) NOT NULL, \`location\` varchar(200) NOT NULL, \`quantity\` bigint NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_inventory_location_inventory_id\` (\`inventoryId\`), INDEX \`idx_inventory_location_bin_number\` (\`binNumber\`), INDEX \`idx_inventory_location_location\` (\`location\`), INDEX \`idx_inventory_location_composite\` (\`inventoryId\`, \`location\`), INDEX \`idx_inventory_location_inventory_bin\` (\`inventoryId\`, \`binNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory_locations\` ADD CONSTRAINT \`FK_748056d1111d531a107fe776b32\` FOREIGN KEY (\`inventoryId\`) REFERENCES \`inventory\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inventory_locations\` DROP FOREIGN KEY \`FK_748056d1111d531a107fe776b32\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_location_inventory_bin\` ON \`inventory_locations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_location_composite\` ON \`inventory_locations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_location_location\` ON \`inventory_locations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_location_bin_number\` ON \`inventory_locations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_location_inventory_id\` ON \`inventory_locations\``,
    );
    await queryRunner.query(`DROP TABLE \`inventory_locations\``);
  }
}
