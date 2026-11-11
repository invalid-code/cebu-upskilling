using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Applications_LearnerId_PostId",
                table: "Applications",
                columns: new[] { "LearnerId", "PostId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Skills_Name",
                table: "Skills",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LearnerAssessments_LearnerId_SkillId",
                table: "LearnerAssessments",
                columns: new[] { "LearnerId", "SkillId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Applications_LearnerId_PostId",
                table: "Applications");

            migrationBuilder.DropIndex(
                name: "IX_Skills_Name",
                table: "Skills");

            migrationBuilder.DropIndex(
                name: "IX_LearnerAssessments_LearnerId_SkillId",
                table: "LearnerAssessments");
        }
    }
}
