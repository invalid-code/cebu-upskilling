using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ModuleId",
                table: "Lessons",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CourseModules",
                columns: table => new
                {
                    ModuleId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CourseId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseModules", x => x.ModuleId);
                    table.ForeignKey(
                        name: "FK_CourseModules_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "CourseId",
                        onDelete: ReferentialAction.Cascade);
                });

            // Backfill: create one module per existing lesson (preserving the old
            // 1:1 lesson => module behavior) and link each lesson to its module.
            migrationBuilder.Sql(
                """
                INSERT INTO "CourseModules" ("CourseId", "Name", "Description", "Order", "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy")
                SELECT "CourseId",
                       'Module ' || ROW_NUMBER() OVER (PARTITION BY "CourseId" ORDER BY "LessonId")::text,
                       NULL,
                       ROW_NUMBER() OVER (PARTITION BY "CourseId" ORDER BY "LessonId"),
                       NOW(),
                       NULL,
                       NULL,
                       NULL
                FROM "Lessons";
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Lessons" AS l
                SET "ModuleId" = m."ModuleId"
                FROM "CourseModules" AS m
                WHERE m."CourseId" = l."CourseId"
                  AND m."Order" = (
                      SELECT COUNT(*)
                      FROM "Lessons" AS l2
                      WHERE l2."CourseId" = l."CourseId"
                        AND l2."LessonId" <= l."LessonId"
                  );
                """);

            migrationBuilder.AlterColumn<int>(
                name: "ModuleId",
                table: "Lessons",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_ModuleId",
                table: "Lessons",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseModules_CourseId",
                table: "CourseModules",
                column: "CourseId");

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_CourseModules_ModuleId",
                table: "Lessons",
                column: "ModuleId",
                principalTable: "CourseModules",
                principalColumn: "ModuleId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Lessons_CourseModules_ModuleId",
                table: "Lessons");

            migrationBuilder.DropTable(
                name: "CourseModules");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_ModuleId",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "ModuleId",
                table: "Lessons");
        }
    }
}