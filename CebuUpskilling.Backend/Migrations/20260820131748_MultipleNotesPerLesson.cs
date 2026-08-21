using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class MultipleNotesPerLesson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LearnerNotes_LearnerId_LessonId",
                table: "LearnerNotes");

            migrationBuilder.CreateIndex(
                name: "IX_LearnerNotes_LearnerId_LessonId",
                table: "LearnerNotes",
                columns: new[] { "LearnerId", "LessonId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LearnerNotes_LearnerId_LessonId",
                table: "LearnerNotes");

            migrationBuilder.CreateIndex(
                name: "IX_LearnerNotes_LearnerId_LessonId",
                table: "LearnerNotes",
                columns: new[] { "LearnerId", "LessonId" },
                unique: true);
        }
    }
}
