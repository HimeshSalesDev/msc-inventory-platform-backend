import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebhookLogs1754894363461 implements MigrationInterface {
  name = 'WebhookLogs1754894363461';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`webhook_logs\` (\`id\` varchar(36) NOT NULL, \`type\` enum ('order_confirmation', 'inventory_reference') NOT NULL, \`status\` enum ('received', 'error', 'stored', 'retry_pending', 'retry_success') NOT NULL DEFAULT 'received', \`description\` text NULL, \`request\` json NULL, \`response\` json NULL, \`ip_address\` varchar(45) NULL, \`retryCount\` int NOT NULL DEFAULT '0', \`lastRetryAt\` timestamp NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_0097a33e4b2083268c615ea024\` (\`type\`), INDEX \`IDX_3b32dd2b00eb309ca80cfa80c3\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`webhook_logs\``);
  }
}
