using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPostCompanyActivityIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_CompanyId",
                table: "Posts");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_CompanyId_IsActive_CreatedAt",
                table: "Posts",
                columns: new[] { "CompanyId", "IsActive", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_CompanyId_IsActive_CreatedAt",
                table: "Posts");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_CompanyId",
                table: "Posts",
                column: "CompanyId");
        }
    }
}
