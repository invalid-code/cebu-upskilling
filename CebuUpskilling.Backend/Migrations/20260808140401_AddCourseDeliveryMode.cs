using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCourseDeliveryMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Mode",
                table: "Courses",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Online");

            migrationBuilder.Sql("""
                UPDATE "Courses"
                SET "Mode" = CASE
                    WHEN ("CourseId" - 1) % 3 = 0 THEN 'Online'
                    WHEN ("CourseId" - 1) % 3 = 1 THEN 'Hybrid'
                    ELSE 'In-person'
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Mode",
                table: "Courses");
        }
    }
}
