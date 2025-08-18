import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomOrderTable1755500551609 implements MigrationInterface {
  name = 'CustomOrderTable1755500551609';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`custom_orders\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`quantity\` bigint NULL, \`status\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_35dc2605d99cb2c46fc0ef9c5b\` (\`sku\`), INDEX \`IDX_762b3aa9a28173d75b5c0d1f48\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`custom_orders\``);
  }
}
