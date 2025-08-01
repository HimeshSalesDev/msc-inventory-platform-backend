import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryReference1754033340426 implements MigrationInterface {
  name = 'InventoryReference1754033340426';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` DROP FOREIGN KEY \`FK_audit_log_user\``,
    );
    await queryRunner.query(
      `CREATE TABLE \`inventory_reference\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(10) NOT NULL, \`number\` varchar(100) NOT NULL, \`inventoryId\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_inventory_reference_inventory_id\` (\`inventoryId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(`ALTER TABLE \`audit_log\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`audit_log\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD \`id\` varchar(36) NOT NULL PRIMARY KEY`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` DROP COLUMN \`user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD \`user_id\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_cb11bd5b662431ea0ac455a27d\` ON \`audit_log\` (\`user_id\`)`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_e605e8b1b5ba5aa0646de95921\` ON \`audit_log\` (\`type\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory_reference\` ADD CONSTRAINT \`FK_58ad6d0ba2cdb513095959777cd\` FOREIGN KEY (\`inventoryId\`) REFERENCES \`inventory\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD CONSTRAINT \`FK_cb11bd5b662431ea0ac455a27d7\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` DROP FOREIGN KEY \`FK_cb11bd5b662431ea0ac455a27d7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory_reference\` DROP FOREIGN KEY \`FK_58ad6d0ba2cdb513095959777cd\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_e605e8b1b5ba5aa0646de95921\` ON \`audit_log\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_cb11bd5b662431ea0ac455a27d\` ON \`audit_log\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` DROP COLUMN \`user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD \`user_id\` char(36) NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`audit_log\` DROP COLUMN \`id\``);
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD \`id\` char(36) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD PRIMARY KEY (\`id\`)`,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_reference_inventory_id\` ON \`inventory_reference\``,
    );
    await queryRunner.query(`DROP TABLE \`inventory_reference\``);
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` ADD CONSTRAINT \`FK_audit_log_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
    );
  }
}
