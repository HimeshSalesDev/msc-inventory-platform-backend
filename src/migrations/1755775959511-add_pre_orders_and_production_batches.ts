import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreOrdersAndProductionBatches1755775959511
  implements MigrationInterface
{
  name = 'AddPreOrdersAndProductionBatches1755775959511';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`pre_orders\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(100) NOT NULL, \`totalQuantity\` int UNSIGNED NOT NULL, \`created_by\` varchar(255) NOT NULL, \`status\` varchar(20) NOT NULL DEFAULT 'active', \`poNumber\` varchar(255) NULL, \`length\` decimal(6,3) NULL, \`width\` decimal(6,3) NULL, \`radius\` decimal(6,3) NULL, \`skirt\` decimal(6,3) NULL, \`taper\` varchar(255) NULL, \`foamDensity\` decimal(6,3) NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`production_batches\` (\`id\` varchar(36) NOT NULL, \`pre_order_id\` varchar(255) NOT NULL, \`quantityInProduction\` int UNSIGNED NOT NULL, \`moved_by\` varchar(255) NOT NULL, \`moved_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`production_batches\``);
    await queryRunner.query(`DROP TABLE \`pre_orders\``);
  }
}
