import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedAddOnAndQuantityInReferenceTable1756545940270
  implements MigrationInterface
{
  name = 'AddedAddOnAndQuantityInReferenceTable1756545940270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inventory_reference\` ADD \`addOn\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory_reference\` ADD \`quantity\` int NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inventory_reference\` DROP COLUMN \`quantity\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inventory_reference\` DROP COLUMN \`addOn\``,
    );
  }
}
