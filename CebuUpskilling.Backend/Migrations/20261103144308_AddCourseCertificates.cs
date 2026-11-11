using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseCertificates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IssuesCertificate",
                table: "Courses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "CourseCertificates",
                columns: table => new
                {
                    CertificateId = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    LearnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    SerialNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    RecipientName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CourseName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ProviderName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourseCertificates", x => x.CertificateId);
                    table.ForeignKey(
                        name: "FK_CourseCertificates_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "CourseId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CourseCertificates_Learners_LearnerId",
                        column: x => x.LearnerId,
                        principalTable: "Learners",
                        principalColumn: "LearnerId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CourseCertificates_CourseId",
                table: "CourseCertificates",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_CourseCertificates_LearnerId_CourseId",
                table: "CourseCertificates",
                columns: new[] { "LearnerId", "CourseId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CourseCertificates_SerialNumber",
                table: "CourseCertificates",
                column: "SerialNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CourseCertificates");

            migrationBuilder.DropColumn(
                name: "IssuesCertificate",
                table: "Courses");
        }
    }
}
