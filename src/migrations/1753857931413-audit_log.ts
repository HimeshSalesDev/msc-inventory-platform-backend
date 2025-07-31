import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1753857931413 implements MigrationInterface {
  name = 'CreateAuditLogTable1753857931413';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE \`audit_log\` (
                \`id\` char(36) NOT NULL,
                \`user_id\` char(36) NULL,
                \`type\` ENUM(
                    'login',
                    'logout',
                    'add_inventory',
                    'update_inventory',
                    'delete_inventory',
                    'create_user',
                    'update_user',
                    'delete_user',
                    'add_inbound',
                    'update_inbound',
                    'delete_inbound',
                    'add_inventory_location',
                    'update_inventory_location',
                    'delete_inventory_location',
                    'add_inventory_reference',
                    'update_inventory_reference',
                    'delete_inventory_reference'
                ) NOT NULL,
                \`description\` text NOT NULL,
                \`previous_data\` json NULL,
                \`updated_data\` json NULL,
                \`entity_name\` varchar(255) NULL,
                \`entity_id\` varchar(255) NULL,
                \`ip_address\` varchar(45) NULL,
                \`user_agent\` text NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleted_at\` datetime(6) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

    await queryRunner.query(`
            ALTER TABLE \`audit_log\`
            ADD CONSTRAINT \`FK_audit_log_user\`
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
            ON DELETE SET NULL
            ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_log\` DROP FOREIGN KEY \`FK_audit_log_user\``,
    );
    await queryRunner.query(`DROP TABLE \`audit_log\``);
  }
}
