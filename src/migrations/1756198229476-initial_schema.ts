import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1756198229476 implements MigrationInterface {
    name = 'InitialSchema1756198229476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`webhook_logs\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(255) NULL, \`status\` enum ('received', 'error', 'stored', 'retry_pending', 'retry_success') NOT NULL DEFAULT 'received', \`description\` text NULL, \`request\` json NULL, \`response\` json NULL, \`ip_address\` varchar(45) NULL, \`retryCount\` int NOT NULL DEFAULT '0', \`lastRetryAt\` timestamp NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_0097a33e4b2083268c615ea024\` (\`type\`), INDEX \`IDX_3b32dd2b00eb309ca80cfa80c3\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`roles\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`fullName\` varchar(100) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`role_id\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`pre_orders\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(100) NOT NULL, \`quantity\` int UNSIGNED NOT NULL, \`created_by\` varchar(255) NOT NULL, \`status\` varchar(20) NOT NULL DEFAULT 'active', \`poNumber\` varchar(255) NULL, \`length\` varchar(10) NULL, \`width\` varchar(10) NULL, \`radius\` varchar(10) NULL, \`skirt\` varchar(100) NULL, \`taper\` varchar(255) NULL, \`foamDensity\` varchar(100) NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`production_batches\` (\`id\` varchar(36) NOT NULL, \`pre_order_id\` varchar(255) NOT NULL, \`quantityInProduction\` int UNSIGNED NOT NULL, \`moved_by\` varchar(255) NOT NULL, \`moved_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inventory_reference\` (\`id\` varchar(36) NOT NULL, \`type\` varchar(10) NOT NULL, \`number\` varchar(100) NOT NULL, \`sku\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`status\` enum ('CREATED', 'DELIVERED', 'IN_TRANSIT', 'CANCELLED') NOT NULL DEFAULT 'CREATED', INDEX \`idx_inventory_reference_sku\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inventory\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`vendorDescription\` text NULL, \`length\` varchar(10) NULL, \`width\` varchar(10) NULL, \`radius\` varchar(10) NULL, \`skirt\` varchar(100) NULL, \`taper\` varchar(255) NULL, \`foamDensity\` varchar(100) NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`quantity\` bigint NULL, \`allocatedQuantity\` bigint NULL, \`inHandQuantity\` bigint NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, UNIQUE INDEX \`idx_inventory_sku\` (\`sku\`), UNIQUE INDEX \`IDX_c33f32cdf6993fe3852073b0d5\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inventory_locations\` (\`id\` varchar(36) NOT NULL, \`inventoryId\` varchar(255) NOT NULL, \`binNumber\` varchar(10) NOT NULL, \`location\` varchar(200) NOT NULL, \`quantity\` bigint NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`idx_inventory_location_inventory_id\` (\`inventoryId\`), INDEX \`idx_inventory_location_bin_number\` (\`binNumber\`), INDEX \`idx_inventory_location_location\` (\`location\`), INDEX \`idx_inventory_location_composite\` (\`inventoryId\`, \`location\`), INDEX \`idx_inventory_location_inventory_bin\` (\`inventoryId\`, \`binNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inventory_movements\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`type\` enum ('IN', 'OUT', 'ADJUST') NOT NULL, \`quantity\` int UNSIGNED NOT NULL, \`binNumber\` varchar(255) NULL, \`location\` varchar(255) NOT NULL, \`proNumber\` varchar(255) NULL, \`userId\` varchar(255) NULL, \`reason\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inbound\` (\`id\` varchar(36) NOT NULL, \`poNumber\` varchar(255) NULL, \`containerNumber\` varchar(255) NULL, \`etd\` date NULL, \`eta\` date NULL, \`shipped\` varchar(255) NULL, \`offloadedDate\` date NULL, \`sku\` varchar(255) NOT NULL, \`vendorDescription\` text NULL, \`length\` varchar(10) NULL, \`width\` varchar(10) NULL, \`radius\` varchar(10) NULL, \`skirt\` varchar(10) NULL, \`taper\` varchar(255) NULL, \`foamDensity\` varchar(10) NULL, \`stripInsert\` varchar(255) NULL, \`shape\` varchar(255) NULL, \`materialNumber\` varchar(255) NULL, \`materialType\` varchar(255) NULL, \`materialColor\` varchar(255) NULL, \`quantity\` bigint NULL, \`scannedQuantity\` bigint NULL DEFAULT '0', \`production_batch_id\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`idx_inbound_sku\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inbound_pre_order\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`preBookedQuantity\` bigint NOT NULL DEFAULT '0', UNIQUE INDEX \`IDX_24e795224ff876d2662e1d604c\` (\`sku\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`custom_orders\` (\`id\` varchar(36) NOT NULL, \`sku\` varchar(255) NOT NULL, \`quantity\` bigint NULL, \`status\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_35dc2605d99cb2c46fc0ef9c5b\` (\`sku\`), INDEX \`IDX_762b3aa9a28173d75b5c0d1f48\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`audit_log\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(255) NULL, \`type\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`previous_data\` json NULL, \`updated_data\` json NULL, \`entity_name\` varchar(255) NULL, \`entity_id\` varchar(255) NULL, \`ip_address\` varchar(45) NULL, \`user_agent\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_cb11bd5b662431ea0ac455a27d\` (\`user_id\`), INDEX \`IDX_e605e8b1b5ba5aa0646de95921\` (\`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`production_batches\` ADD CONSTRAINT \`FK_831f7f5e0addf86d3ea743c6d6f\` FOREIGN KEY (\`pre_order_id\`) REFERENCES \`pre_orders\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`inventory_locations\` ADD CONSTRAINT \`FK_748056d1111d531a107fe776b32\` FOREIGN KEY (\`inventoryId\`) REFERENCES \`inventory\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`audit_log\` ADD CONSTRAINT \`FK_cb11bd5b662431ea0ac455a27d7\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`audit_log\` DROP FOREIGN KEY \`FK_cb11bd5b662431ea0ac455a27d7\``);
        await queryRunner.query(`ALTER TABLE \`inventory_locations\` DROP FOREIGN KEY \`FK_748056d1111d531a107fe776b32\``);
        await queryRunner.query(`ALTER TABLE \`production_batches\` DROP FOREIGN KEY \`FK_831f7f5e0addf86d3ea743c6d6f\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``);
        await queryRunner.query(`DROP INDEX \`IDX_e605e8b1b5ba5aa0646de95921\` ON \`audit_log\``);
        await queryRunner.query(`DROP INDEX \`IDX_cb11bd5b662431ea0ac455a27d\` ON \`audit_log\``);
        await queryRunner.query(`DROP TABLE \`audit_log\``);
        await queryRunner.query(`DROP INDEX \`IDX_762b3aa9a28173d75b5c0d1f48\` ON \`custom_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_35dc2605d99cb2c46fc0ef9c5b\` ON \`custom_orders\``);
        await queryRunner.query(`DROP TABLE \`custom_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_24e795224ff876d2662e1d604c\` ON \`inbound_pre_order\``);
        await queryRunner.query(`DROP TABLE \`inbound_pre_order\``);
        await queryRunner.query(`DROP INDEX \`idx_inbound_sku\` ON \`inbound\``);
        await queryRunner.query(`DROP TABLE \`inbound\``);
        await queryRunner.query(`DROP TABLE \`inventory_movements\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_location_inventory_bin\` ON \`inventory_locations\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_location_composite\` ON \`inventory_locations\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_location_location\` ON \`inventory_locations\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_location_bin_number\` ON \`inventory_locations\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_location_inventory_id\` ON \`inventory_locations\``);
        await queryRunner.query(`DROP TABLE \`inventory_locations\``);
        await queryRunner.query(`DROP INDEX \`IDX_c33f32cdf6993fe3852073b0d5\` ON \`inventory\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_sku\` ON \`inventory\``);
        await queryRunner.query(`DROP TABLE \`inventory\``);
        await queryRunner.query(`DROP INDEX \`idx_inventory_reference_sku\` ON \`inventory_reference\``);
        await queryRunner.query(`DROP TABLE \`inventory_reference\``);
        await queryRunner.query(`DROP TABLE \`production_batches\``);
        await queryRunner.query(`DROP TABLE \`pre_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` ON \`roles\``);
        await queryRunner.query(`DROP TABLE \`roles\``);
        await queryRunner.query(`DROP INDEX \`IDX_3b32dd2b00eb309ca80cfa80c3\` ON \`webhook_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_0097a33e4b2083268c615ea024\` ON \`webhook_logs\``);
        await queryRunner.query(`DROP TABLE \`webhook_logs\``);
    }

}
