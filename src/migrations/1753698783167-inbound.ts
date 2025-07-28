import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inbound1753684000000 implements MigrationInterface {
  name = 'Inbound1753684000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`inbound\` (\`id\` varchar(36) NOT NULL, \`poNumber\` varchar(255) NULL, \`containerNumber\` varchar(255) NULL, \`etd\` date NULL, \`eta\` date NULL, \`shipped\` varchar(255) NULL, \`offloadedDate\` date NULL, \`sku\` varchar(255) NOT NULL, \`vendorDescription\` text NULL, \`length\` decimal(13,6) NOT NULL, \`width\` decimal(13,6) NULL, \`radius\` decimal(13,6) NULL, \`skirt\` decimal(13,6) NOT NULL, \`taper\` varchar(255) NULL, \`foamDensity\` decimal(13,6) NOT NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`quantity\` bigint NULL, \`inventoryId\` varchar(36) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_inbound_sku\` (\`sku\`), INDEX \`IDX_inbound_inventory_id\` (\`inventoryId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_inbound_inventory_id\` ON \`inbound\``,
    );
    await queryRunner.query(`DROP INDEX \`idx_inbound_sku\` ON \`inbound\``);
    await queryRunner.query(`DROP TABLE \`inbound\``);
  }
}
