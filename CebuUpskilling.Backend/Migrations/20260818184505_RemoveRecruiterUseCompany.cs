using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRecruiterUseCompany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "CompanyId" = r."CompanyId"
                FROM "Recruiters" r
                WHERE r."UserId" = "Users"."UserId";
                """);

            migrationBuilder.Sql(
                """
                UPDATE "Posts"
                SET "CompanyId" = r."CompanyId"
                FROM "Recruiters" r
                WHERE r."RecruiterId" = "Posts"."RecruiterId"
                  AND "Posts"."CompanyId" IS NULL;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Companies_CompanyId",
                table: "Posts");

            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Recruiters_RecruiterId",
                table: "Posts");

            migrationBuilder.DropTable(
                name: "Recruiters");

            migrationBuilder.DropIndex(
                name: "IX_Posts_RecruiterId",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "RecruiterId",
                table: "Posts");

            migrationBuilder.AlterColumn<int>(
                name: "CompanyId",
                table: "Posts",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_CompanyId",
                table: "Users",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Companies_CompanyId",
                table: "Posts",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Companies_CompanyId",
                table: "Users",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Posts_Companies_CompanyId",
                table: "Posts");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Companies_CompanyId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_CompanyId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "Users");

            migrationBuilder.AlterColumn<int>(
                name: "CompanyId",
                table: "Posts",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "RecruiterId",
                table: "Posts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Recruiters",
                columns: table => new
                {
                    RecruiterId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recruiters", x => x.RecruiterId);
                    table.ForeignKey(
                        name: "FK_Recruiters_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Recruiters_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_RecruiterId",
                table: "Posts",
                column: "RecruiterId");

            migrationBuilder.CreateIndex(
                name: "IX_Recruiters_CompanyId",
                table: "Recruiters",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Recruiters_UserId",
                table: "Recruiters",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Companies_CompanyId",
                table: "Posts",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Recruiters_RecruiterId",
                table: "Posts",
                column: "RecruiterId",
                principalTable: "Recruiters",
                principalColumn: "RecruiterId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
