using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddJobPostingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Benefits",
                table: "Posts",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyLogoUrl",
                table: "Posts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()");

            migrationBuilder.AddColumn<string>(
                name: "ExperienceLevel",
                table: "Posts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRemote",
                table: "Posts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "JobType",
                table: "Posts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Full-time");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Posts",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Requirements",
                table: "Posts",
                type: "character varying(5000)",
                maxLength: 5000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SalaryRange",
                table: "Posts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverLetterUrl",
                table: "Applications",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResumeUrl",
                table: "Applications",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Benefits",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "CompanyLogoUrl",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "ExperienceLevel",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "IsRemote",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "JobType",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Requirements",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "SalaryRange",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "CoverLetterUrl",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "ResumeUrl",
                table: "Applications");
        }
    }
}
