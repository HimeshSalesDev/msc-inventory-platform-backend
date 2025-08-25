import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeWebhookTypeEnum1756105118234 implements MigrationInterface {
  name = 'ChangeWebhookTypeEnum1756105118234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE webhook_logs MODIFY type varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE webhook_logs MODIFY type enum('order_confirmation', 'inventory_reference') NOT NULL`,
    );
  }
}
