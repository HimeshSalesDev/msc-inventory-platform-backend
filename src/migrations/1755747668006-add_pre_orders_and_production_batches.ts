import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreOrdersAndProductionBatches1755747668006
  implements MigrationInterface
{
  name = 'AddPreOrdersAndProductionBatches1755747668006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`production_batches\` (\`id\` varchar(36) NOT NULL, \`pre_order_id\` varchar(255) NOT NULL, \`quantityInProduction\` int UNSIGNED NOT NULL, \`moved_by\` varchar(255) NOT NULL, \`moved_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`production_batches\` ADD CONSTRAINT \`FK_831f7f5e0addf86d3ea743c6d6f\` FOREIGN KEY (\`pre_order_id\`) REFERENCES \`pre_orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`production_batches\` DROP FOREIGN KEY \`FK_831f7f5e0addf86d3ea743c6d6f\``,
    );
    await queryRunner.query(`DROP TABLE \`production_batches\``);
  }
}
