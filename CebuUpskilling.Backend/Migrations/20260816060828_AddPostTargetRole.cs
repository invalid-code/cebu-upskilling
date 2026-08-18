using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPostTargetRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TargetRole",
                table: "Posts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TargetRole",
                table: "Posts");
        }
    }
}
