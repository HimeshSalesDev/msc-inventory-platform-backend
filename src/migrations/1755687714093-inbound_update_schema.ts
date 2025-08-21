import { MigrationInterface, QueryRunner } from 'typeorm';

export class InboundUpdateSchema1755687714093 implements MigrationInterface {
  name = 'InboundUpdateSchema1755687714093';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inbound\` CHANGE \`length\` \`length\` decimal(6,3) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inbound\` CHANGE \`skirt\` \`skirt\` decimal(6,3) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inbound\` CHANGE \`foamDensity\` \`foamDensity\` decimal(6,3) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`inbound\` CHANGE \`foamDensity\` \`foamDensity\` decimal(6,3) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inbound\` CHANGE \`skirt\` \`skirt\` decimal(6,3) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inbound\` CHANGE \`length\` \`length\` decimal(6,3) NOT NULL`,
    );
  }
}
