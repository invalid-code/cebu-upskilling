using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSkillGapEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Skills",
                columns: table => new
                {
                    SkillId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skills", x => x.SkillId);
                });

            migrationBuilder.CreateTable(
                name: "LearnerSkills",
                columns: table => new
                {
                    LearnerSkillId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LearnerId = table.Column<int>(type: "integer", nullable: false),
                    SkillId = table.Column<int>(type: "integer", nullable: false),
                    CurrentLevel = table.Column<int>(type: "integer", nullable: false),
                    Verified = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LearnerSkills", x => x.LearnerSkillId);
                    table.ForeignKey(
                        name: "FK_LearnerSkills_Learners_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "Learners",
                        principalColumn: "LearnerId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LearnerSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RoleSkills",
                columns: table => new
                {
                    RoleSkillId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TargetRole = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SkillId = table.Column<int>(type: "integer", nullable: false),
                    RequiredLevel = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleSkills", x => x.RoleSkillId);
                    table.ForeignKey(
                        name: "FK_RoleSkills_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Skills",
                columns: new[] { "SkillId", "Category", "Name" },
                values: new object[,]
                {
                    { 1, "Language", "JavaScript" },
                    { 2, "Language", "TypeScript" },
                    { 3, "Framework", "React" },
                    { 4, "Language", "CSS" },
                    { 5, "Language", "HTML" },
                    { 6, "Runtime", "Node.js" },
                    { 7, "Language", "Python" },
                    { 8, "Language", "SQL" },
                    { 9, "Tool", "Git" },
                    { 10, "Concept", "REST APIs" },
                    { 11, "Framework", "Vue.js" },
                    { 12, "Framework", "Angular" },
                    { 13, "Tool", "Docker" },
                    { 14, "Platform", "AWS" },
                    { 15, "Tool", "Figma" }
                });

            migrationBuilder.InsertData(
                table: "RoleSkills",
                columns: new[] { "RoleSkillId", "RequiredLevel", "SkillId", "TargetRole" },
                values: new object[,]
                {
                    { 1, 4, 1, "Frontend Developer" },
                    { 2, 3, 2, "Frontend Developer" },
                    { 3, 4, 3, "Frontend Developer" },
                    { 4, 3, 4, "Frontend Developer" },
                    { 5, 4, 5, "Frontend Developer" },
                    { 6, 3, 9, "Frontend Developer" },
                    { 7, 3, 10, "Frontend Developer" },
                    { 8, 3, 1, "Backend Developer" },
                    { 9, 4, 6, "Backend Developer" },
                    { 10, 4, 7, "Backend Developer" },
                    { 11, 4, 8, "Backend Developer" },
                    { 12, 3, 9, "Backend Developer" },
                    { 13, 4, 10, "Backend Developer" },
                    { 14, 4, 1, "Full Stack Developer" },
                    { 15, 3, 2, "Full Stack Developer" },
                    { 16, 3, 3, "Full Stack Developer" },
                    { 17, 4, 6, "Full Stack Developer" },
                    { 18, 3, 8, "Full Stack Developer" },
                    { 19, 3, 9, "Full Stack Developer" },
                    { 20, 4, 10, "Full Stack Developer" },
                    { 21, 4, 7, "Data Analyst" },
                    { 22, 5, 8, "Data Analyst" },
                    { 23, 2, 1, "Data Analyst" },
                    { 24, 5, 7, "Data Scientist" },
                    { 25, 4, 8, "Data Scientist" },
                    { 26, 3, 1, "Data Scientist" },
                    { 27, 5, 15, "UI/UX Designer" },
                    { 28, 4, 4, "UI/UX Designer" },
                    { 29, 4, 5, "UI/UX Designer" },
                    { 30, 5, 13, "DevOps Engineer" },
                    { 31, 4, 14, "DevOps Engineer" },
                    { 32, 4, 9, "DevOps Engineer" },
                    { 33, 3, 1, "Quality Assurance" },
                    { 34, 3, 9, "Quality Assurance" },
                    { 35, 2, 8, "Quality Assurance" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_LearnerSkills_LearnerId_SkillId",
                table: "LearnerSkills",
                columns: new[] { "LearnerId", "SkillId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LearnerSkills_SkillId",
                table: "LearnerSkills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_RoleSkills_SkillId",
                table: "RoleSkills",
                column: "SkillId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LearnerSkills");

            migrationBuilder.DropTable(
                name: "RoleSkills");

            migrationBuilder.DropTable(
                name: "Skills");
        }
    }
}
