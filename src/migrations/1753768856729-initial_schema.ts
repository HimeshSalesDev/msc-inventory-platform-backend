import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1753768856729 implements MigrationInterface {
  name = 'InitialSchema1753768856729';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`roles\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`fullName\` varchar(100) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`role_id\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`inventory\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`vendorDescription\` text NULL, \`length\` decimal(6,3) NOT NULL, \`width\` decimal(6,3) NULL, \`radius\` decimal(6,3) NULL, \`skirt\` decimal(6,3) NOT NULL, \`taper\` varchar(255) NULL, \`foamDensity\` decimal(6,3) NOT NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`quantity\` bigint NULL, \`allocatedQuantity\` bigint NULL, \`inHandQuantity\` bigint NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`idx_inventory_sku\` (\`sku\`), UNIQUE INDEX \`IDX_c33f32cdf6993fe3852073b0d5\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`inbound\` (\`id\` varchar(36) NOT NULL, \`poNumber\` varchar(255) NULL, \`containerNumber\` varchar(255) NULL, \`etd\` date NULL, \`eta\` date NULL, \`shipped\` varchar(255) NULL, \`offloadedDate\` date NULL, \`sku\` varchar(255) NOT NULL, \`vendorDescription\` text NULL, \`length\` decimal(6,3) NOT NULL, \`width\` decimal(6,3) NULL, \`radius\` decimal(6,3) NULL, \`skirt\` decimal(6,3) NOT NULL, \`taper\` varchar(255) NULL, \`foamDensity\` decimal(6,3) NOT NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`quantity\` bigint NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_inbound_sku\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``,
    );
    await queryRunner.query(`DROP INDEX \`idx_inbound_sku\` ON \`inbound\``);
    await queryRunner.query(`DROP TABLE \`inbound\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_c33f32cdf6993fe3852073b0d5\` ON \`inventory\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_inventory_sku\` ON \`inventory\``,
    );
    await queryRunner.query(`DROP TABLE \`inventory\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` ON \`roles\``,
    );
    await queryRunner.query(`DROP TABLE \`roles\``);
  }
}
