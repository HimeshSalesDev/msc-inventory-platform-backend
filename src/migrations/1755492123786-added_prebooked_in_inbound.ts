import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedPreBookedInInbound1755492123786
  implements MigrationInterface
{
  name = 'AddedPreBookedInInbound1755492123786';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inbound\` ADD \`preBookedQuantity\` bigint NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inbound\` DROP COLUMN \`preBookedQuantity\``,
    );
  }
}
