using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddJobMarketTrends : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RoleMarketTrends",
                columns: table => new
                {
                    TargetRole = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActivePostings = table.Column<int>(type: "integer", nullable: false),
                    TotalPostings = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleMarketTrends", x => x.TargetRole);
                });

            migrationBuilder.CreateTable(
                name: "SkillMarketTrends",
                columns: table => new
                {
                    SkillId = table.Column<int>(type: "integer", nullable: false),
                    ActivePostings = table.Column<int>(type: "integer", nullable: false),
                    TotalPostings = table.Column<int>(type: "integer", nullable: false),
                    AvgRequiredLevel = table.Column<double>(type: "double precision", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SkillMarketTrends", x => x.SkillId);
                    table.ForeignKey(
                        name: "FK_SkillMarketTrends_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoleMarketTrends_ActivePostings",
                table: "RoleMarketTrends",
                column: "ActivePostings");

            migrationBuilder.CreateIndex(
                name: "IX_SkillMarketTrends_ActivePostings",
                table: "SkillMarketTrends",
                column: "ActivePostings");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RoleMarketTrends");

            migrationBuilder.DropTable(
                name: "SkillMarketTrends");
        }
    }
}
