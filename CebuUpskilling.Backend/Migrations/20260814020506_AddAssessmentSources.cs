using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentSources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "AssessmentQuestions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "AssessmentQuestions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentQuestions_CompanyId",
                table: "AssessmentQuestions",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_AssessmentQuestions_Companies_CompanyId",
                table: "AssessmentQuestions",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssessmentQuestions_Companies_CompanyId",
                table: "AssessmentQuestions");

            migrationBuilder.DropIndex(
                name: "IX_AssessmentQuestions_CompanyId",
                table: "AssessmentQuestions");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "AssessmentQuestions");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "AssessmentQuestions");
        }
    }
}
