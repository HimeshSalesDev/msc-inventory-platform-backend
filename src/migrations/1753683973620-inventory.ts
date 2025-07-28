import { MigrationInterface, QueryRunner } from "typeorm";

export class Inventory1753683973620 implements MigrationInterface {
    name = 'Inventory1753683973620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`inventory\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`vendorDescription\` text NULL, \`length\` decimal(13,6) NOT NULL, \`width\` decimal(13,6) NULL, \`radius\` decimal(13,6) NULL, \`skirt\` decimal(13,6) NOT NULL, \`taper\` varchar(255) NULL, \`foamDensity\` decimal(13,6) NOT NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`quantity\` bigint NULL, \`allocatedQuantity\` bigint NULL, \`inHandQuantity\` bigint NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`idx_inventory_sku\` (\`sku\`), UNIQUE INDEX \`IDX_c33f32cdf6993fe3852073b0d5\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_c33f32cdf6993fe3852073b0d5\` ON \`inventory\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_sku\` ON \`inventory\``);
        await queryRunner.query(`DROP TABLE \`inventory\``);
    }

}
