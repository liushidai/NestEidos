import { MigrationInterface, QueryRunner } from "typeorm";
// 类名 Migration1739084795144 与文件名中的时间戳一致，用于排序和标识这一版本的迁移。
export class Migration1739084795144 implements MigrationInterface {
    name = 'Migration1739084795144'
    // 执行升级操作（在此创建 user 表）。
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
    }
    // 执行降级操作（在此删除 user 表）。
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
