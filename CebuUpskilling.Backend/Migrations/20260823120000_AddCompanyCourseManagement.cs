using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations;

public partial class AddCompanyCourseManagement : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(name: "CompanyId", table: "Courses", type: "integer", nullable: true);
        migrationBuilder.AddColumn<string>(name: "Status", table: "Courses", type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Draft");
        migrationBuilder.CreateIndex(name: "IX_Courses_CompanyId", table: "Courses", column: "CompanyId");
        migrationBuilder.AddForeignKey(name: "FK_Courses_Companies_CompanyId", table: "Courses", column: "CompanyId", principalTable: "Companies", principalColumn: "CompanyId", onDelete: ReferentialAction.SetNull);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_Courses_Companies_CompanyId", table: "Courses");
        migrationBuilder.DropIndex(name: "IX_Courses_CompanyId", table: "Courses");
        migrationBuilder.DropColumn(name: "CompanyId", table: "Courses");
        migrationBuilder.DropColumn(name: "Status", table: "Courses");
    }
}
