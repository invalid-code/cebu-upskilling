using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class UseGuidIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Converts every integer id (primary and foreign keys) to a UUID.
            // The mapping is deterministic: the same legacy int for the same
            // entity type becomes the same UUID in every table, so existing
            // rows keep their relationships. The first 8 hex digits identify
            // the entity type; the last 12 hold the original integer.
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION legacy_int_to_uuid(entity text, old_id integer)
                RETURNS uuid LANGUAGE sql IMMUTABLE STRICT AS $$
                    SELECT (
                        CASE entity
                            WHEN 'user' THEN '00000001'
                            WHEN 'learner' THEN '00000002'
                            WHEN 'company' THEN '00000003'
                            WHEN 'course' THEN '00000004'
                            WHEN 'module' THEN '00000005'
                            WHEN 'lesson' THEN '00000006'
                            WHEN 'lessoncontent' THEN '00000007'
                            WHEN 'media' THEN '00000008'
                            WHEN 'exercise' THEN '00000009'
                            WHEN 'exercisecontent' THEN '0000000a'
                            WHEN 'discipline' THEN '0000000b'
                            WHEN 'subdiscipline' THEN '0000000c'
                            WHEN 'genre' THEN '0000000d'
                            WHEN 'skill' THEN '0000000e'
                            WHEN 'roleskill' THEN '0000000f'
                            WHEN 'learnerskill' THEN '00000010'
                            WHEN 'learnerassessment' THEN '00000011'
                            WHEN 'assessmentquestion' THEN '00000012'
                            WHEN 'application' THEN '00000013'
                            WHEN 'learnernote' THEN '00000014'
                            WHEN 'discussionpost' THEN '00000015'
                            WHEN 'post' THEN '00000016'
                        END
                        || '-0000-0000-0000-'
                        || lpad(to_hex(old_id), 12, '0')
                    )::uuid
                $$;");

            // Foreign keys must be recreated after every referencing column
            // has been converted to uuid.
            migrationBuilder.Sql(@"
                DO $$
                DECLARE r RECORD;
                BEGIN
                    FOR r IN
                        SELECT conname, conrelid::regclass AS tbl
                        FROM pg_constraint
                        WHERE contype = 'f' AND connamespace = 'public'::regnamespace
                    LOOP
                        EXECUTE 'ALTER TABLE ' || r.tbl || ' DROP CONSTRAINT ' || quote_ident(r.conname);
                    END LOOP;
                END $$;");

            migrationBuilder.DropIndex(
                name: "IX_LearnerAssessments_LearnerId",
                table: "LearnerAssessments");
            migrationBuilder.DropIndex(
                name: "IX_Applications_LearnerId",
                table: "Applications");

            migrationBuilder.Sql(@"ALTER TABLE ""Users"" ALTER COLUMN ""UserId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Users"" ALTER COLUMN ""CompanyId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Applications"" ALTER COLUMN ""ApplicationId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Applications"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Applications"" ALTER COLUMN ""PostId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""AssessmentQuestions"" ALTER COLUMN ""AssessmentQuestionId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""AssessmentQuestions"" ALTER COLUMN ""CompanyId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""AssessmentQuestions"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Companies"" ALTER COLUMN ""CompanyId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Courses"" ALTER COLUMN ""CourseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Courses"" ALTER COLUMN ""CompanyId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Courses"" ALTER COLUMN ""GenreId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseModules"" ALTER COLUMN ""ModuleId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseModules"" ALTER COLUMN ""CourseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseSkills"" ALTER COLUMN ""CourseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseSkills"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Disciplines"" ALTER COLUMN ""DomainId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""DiscussionPosts"" ALTER COLUMN ""DiscussionPostId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""DiscussionPosts"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""DiscussionPosts"" ALTER COLUMN ""LessonId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Exercises"" ALTER COLUMN ""ExerciseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Exercises"" ALTER COLUMN ""ExerciseContentId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Exercises"" ALTER COLUMN ""LessonId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""ExerciseContents"" ALTER COLUMN ""ExerciseContentId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""ExerciseContents"" ALTER COLUMN ""ExerciseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Genres"" ALTER COLUMN ""GenreId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Genres"" ALTER COLUMN ""SubDisciplineId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Learners"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Learners"" ALTER COLUMN ""UserId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerAssessments"" ALTER COLUMN ""LearnerAssessmentId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerAssessments"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerAssessments"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerNotes"" ALTER COLUMN ""LearnerNoteId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerNotes"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerNotes"" ALTER COLUMN ""LessonId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerSkills"" ALTER COLUMN ""LearnerSkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerSkills"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerSkills"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerStudyCourses"" ALTER COLUMN ""LearnerId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerStudyCourses"" ALTER COLUMN ""CourseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Lessons"" ALTER COLUMN ""LessonId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Lessons"" ALTER COLUMN ""CourseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Lessons"" ALTER COLUMN ""ModuleId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LessonContents"" ALTER COLUMN ""ContentId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""LessonContents"" ALTER COLUMN ""LessonId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Media"" ALTER COLUMN ""MediaId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Media"" ALTER COLUMN ""LessonId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Posts"" ALTER COLUMN ""PostId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Posts"" ALTER COLUMN ""CompanyId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""PostCourseRequireds"" ALTER COLUMN ""PostId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""PostCourseRequireds"" ALTER COLUMN ""CourseId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""PostSkills"" ALTER COLUMN ""PostId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""PostSkills"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""RoleSkills"" ALTER COLUMN ""RoleSkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""RoleSkills"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Skills"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""SkillMarketTrends"" ALTER COLUMN ""SkillId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""SubDisciplines"" ALTER COLUMN ""SubDisciplineId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""SubDisciplines"" ALTER COLUMN ""DisciplineId"" DROP IDENTITY IF EXISTS;");
            migrationBuilder.Sql(@"ALTER TABLE ""Users"" ALTER COLUMN ""UserId"" TYPE uuid USING legacy_int_to_uuid('user', ""UserId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Users"" ALTER COLUMN ""CompanyId"" TYPE uuid USING legacy_int_to_uuid('company', ""CompanyId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Applications"" ALTER COLUMN ""ApplicationId"" TYPE uuid USING legacy_int_to_uuid('application', ""ApplicationId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Applications"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Applications"" ALTER COLUMN ""PostId"" TYPE uuid USING legacy_int_to_uuid('post', ""PostId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""AssessmentQuestions"" ALTER COLUMN ""AssessmentQuestionId"" TYPE uuid USING legacy_int_to_uuid('assessmentquestion', ""AssessmentQuestionId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""AssessmentQuestions"" ALTER COLUMN ""CompanyId"" TYPE uuid USING legacy_int_to_uuid('company', ""CompanyId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""AssessmentQuestions"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Companies"" ALTER COLUMN ""CompanyId"" TYPE uuid USING legacy_int_to_uuid('company', ""CompanyId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Courses"" ALTER COLUMN ""CourseId"" TYPE uuid USING legacy_int_to_uuid('course', ""CourseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Courses"" ALTER COLUMN ""CompanyId"" TYPE uuid USING legacy_int_to_uuid('company', ""CompanyId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Courses"" ALTER COLUMN ""GenreId"" TYPE uuid USING legacy_int_to_uuid('genre', ""GenreId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseModules"" ALTER COLUMN ""ModuleId"" TYPE uuid USING legacy_int_to_uuid('module', ""ModuleId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseModules"" ALTER COLUMN ""CourseId"" TYPE uuid USING legacy_int_to_uuid('course', ""CourseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseSkills"" ALTER COLUMN ""CourseId"" TYPE uuid USING legacy_int_to_uuid('course', ""CourseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""CourseSkills"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Disciplines"" ALTER COLUMN ""DomainId"" TYPE uuid USING legacy_int_to_uuid('discipline', ""DomainId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""DiscussionPosts"" ALTER COLUMN ""DiscussionPostId"" TYPE uuid USING legacy_int_to_uuid('discussionpost', ""DiscussionPostId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""DiscussionPosts"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""DiscussionPosts"" ALTER COLUMN ""LessonId"" TYPE uuid USING legacy_int_to_uuid('lesson', ""LessonId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Exercises"" ALTER COLUMN ""ExerciseId"" TYPE uuid USING legacy_int_to_uuid('exercise', ""ExerciseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Exercises"" ALTER COLUMN ""ExerciseContentId"" TYPE uuid USING legacy_int_to_uuid('exercisecontent', ""ExerciseContentId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Exercises"" ALTER COLUMN ""LessonId"" TYPE uuid USING legacy_int_to_uuid('lesson', ""LessonId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""ExerciseContents"" ALTER COLUMN ""ExerciseContentId"" TYPE uuid USING legacy_int_to_uuid('exercisecontent', ""ExerciseContentId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""ExerciseContents"" ALTER COLUMN ""ExerciseId"" TYPE uuid USING legacy_int_to_uuid('exercise', ""ExerciseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Genres"" ALTER COLUMN ""GenreId"" TYPE uuid USING legacy_int_to_uuid('genre', ""GenreId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Genres"" ALTER COLUMN ""SubDisciplineId"" TYPE uuid USING legacy_int_to_uuid('subdiscipline', ""SubDisciplineId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Learners"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Learners"" ALTER COLUMN ""UserId"" TYPE uuid USING legacy_int_to_uuid('user', ""UserId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerAssessments"" ALTER COLUMN ""LearnerAssessmentId"" TYPE uuid USING legacy_int_to_uuid('learnerassessment', ""LearnerAssessmentId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerAssessments"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerAssessments"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerNotes"" ALTER COLUMN ""LearnerNoteId"" TYPE uuid USING legacy_int_to_uuid('learnernote', ""LearnerNoteId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerNotes"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerNotes"" ALTER COLUMN ""LessonId"" TYPE uuid USING legacy_int_to_uuid('lesson', ""LessonId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerSkills"" ALTER COLUMN ""LearnerSkillId"" TYPE uuid USING legacy_int_to_uuid('learnerskill', ""LearnerSkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerSkills"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerSkills"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerStudyCourses"" ALTER COLUMN ""LearnerId"" TYPE uuid USING legacy_int_to_uuid('learner', ""LearnerId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LearnerStudyCourses"" ALTER COLUMN ""CourseId"" TYPE uuid USING legacy_int_to_uuid('course', ""CourseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Lessons"" ALTER COLUMN ""LessonId"" TYPE uuid USING legacy_int_to_uuid('lesson', ""LessonId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Lessons"" ALTER COLUMN ""CourseId"" TYPE uuid USING legacy_int_to_uuid('course', ""CourseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Lessons"" ALTER COLUMN ""ModuleId"" TYPE uuid USING legacy_int_to_uuid('module', ""ModuleId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LessonContents"" ALTER COLUMN ""ContentId"" TYPE uuid USING legacy_int_to_uuid('lessoncontent', ""ContentId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""LessonContents"" ALTER COLUMN ""LessonId"" TYPE uuid USING legacy_int_to_uuid('lesson', ""LessonId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Media"" ALTER COLUMN ""MediaId"" TYPE uuid USING legacy_int_to_uuid('media', ""MediaId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Media"" ALTER COLUMN ""LessonId"" TYPE uuid USING legacy_int_to_uuid('lesson', ""LessonId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Posts"" ALTER COLUMN ""PostId"" TYPE uuid USING legacy_int_to_uuid('post', ""PostId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Posts"" ALTER COLUMN ""CompanyId"" TYPE uuid USING legacy_int_to_uuid('company', ""CompanyId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""PostCourseRequireds"" ALTER COLUMN ""PostId"" TYPE uuid USING legacy_int_to_uuid('post', ""PostId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""PostCourseRequireds"" ALTER COLUMN ""CourseId"" TYPE uuid USING legacy_int_to_uuid('course', ""CourseId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""PostSkills"" ALTER COLUMN ""PostId"" TYPE uuid USING legacy_int_to_uuid('post', ""PostId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""PostSkills"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""RoleSkills"" ALTER COLUMN ""RoleSkillId"" TYPE uuid USING legacy_int_to_uuid('roleskill', ""RoleSkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""RoleSkills"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""Skills"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""SkillMarketTrends"" ALTER COLUMN ""SkillId"" TYPE uuid USING legacy_int_to_uuid('skill', ""SkillId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""SubDisciplines"" ALTER COLUMN ""SubDisciplineId"" TYPE uuid USING legacy_int_to_uuid('subdiscipline', ""SubDisciplineId"");");
            migrationBuilder.Sql(@"ALTER TABLE ""SubDisciplines"" ALTER COLUMN ""DisciplineId"" TYPE uuid USING legacy_int_to_uuid('discipline', ""DisciplineId"");");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Companies_CompanyId",
                table: "Users",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Applications_Learners_LearnerId",
                table: "Applications",
                column: "LearnerId",
                principalTable: "Learners",
                principalColumn: "LearnerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Applications_Posts_PostId",
                table: "Applications",
                column: "PostId",
                principalTable: "Posts",
                principalColumn: "PostId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AssessmentQuestions_Companies_CompanyId",
                table: "AssessmentQuestions",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AssessmentQuestions_Skills_SkillId",
                table: "AssessmentQuestions",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Courses_Companies_CompanyId",
                table: "Courses",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Courses_Genres_GenreId",
                table: "Courses",
                column: "GenreId",
                principalTable: "Genres",
                principalColumn: "GenreId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CourseModules_Courses_CourseId",
                table: "CourseModules",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "CourseId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CourseSkills_Courses_CourseId",
                table: "CourseSkills",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "CourseId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CourseSkills_Skills_SkillId",
                table: "CourseSkills",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DiscussionPosts_Learners_LearnerId",
                table: "DiscussionPosts",
                column: "LearnerId",
                principalTable: "Learners",
                principalColumn: "LearnerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DiscussionPosts_Lessons_LessonId",
                table: "DiscussionPosts",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "LessonId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Exercises_Lessons_LessonId",
                table: "Exercises",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "LessonId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ExerciseContents_Exercises_ExerciseId",
                table: "ExerciseContents",
                column: "ExerciseId",
                principalTable: "Exercises",
                principalColumn: "ExerciseId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Genres_SubDisciplines_SubDisciplineId",
                table: "Genres",
                column: "SubDisciplineId",
                principalTable: "SubDisciplines",
                principalColumn: "SubDisciplineId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Learners_Users_UserId",
                table: "Learners",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerAssessments_Learners_LearnerId",
                table: "LearnerAssessments",
                column: "LearnerId",
                principalTable: "Learners",
                principalColumn: "LearnerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerAssessments_Skills_SkillId",
                table: "LearnerAssessments",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerNotes_Learners_LearnerId",
                table: "LearnerNotes",
                column: "LearnerId",
                principalTable: "Learners",
                principalColumn: "LearnerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerNotes_Lessons_LessonId",
                table: "LearnerNotes",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "LessonId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerSkills_Learners_LearnerId",
                table: "LearnerSkills",
                column: "LearnerId",
                principalTable: "Learners",
                principalColumn: "LearnerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerSkills_Skills_SkillId",
                table: "LearnerSkills",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerStudyCourses_Courses_CourseId",
                table: "LearnerStudyCourses",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "CourseId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LearnerStudyCourses_Learners_LearnerId",
                table: "LearnerStudyCourses",
                column: "LearnerId",
                principalTable: "Learners",
                principalColumn: "LearnerId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_Courses_CourseId",
                table: "Lessons",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "CourseId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_CourseModules_ModuleId",
                table: "Lessons",
                column: "ModuleId",
                principalTable: "CourseModules",
                principalColumn: "ModuleId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LessonContents_Lessons_LessonId",
                table: "LessonContents",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "LessonId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Media_Lessons_LessonId",
                table: "Media",
                column: "LessonId",
                principalTable: "Lessons",
                principalColumn: "LessonId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Posts_Companies_CompanyId",
                table: "Posts",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PostCourseRequireds_Courses_CourseId",
                table: "PostCourseRequireds",
                column: "CourseId",
                principalTable: "Courses",
                principalColumn: "CourseId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PostCourseRequireds_Posts_PostId",
                table: "PostCourseRequireds",
                column: "PostId",
                principalTable: "Posts",
                principalColumn: "PostId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PostSkills_Posts_PostId",
                table: "PostSkills",
                column: "PostId",
                principalTable: "Posts",
                principalColumn: "PostId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PostSkills_Skills_SkillId",
                table: "PostSkills",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RoleSkills_Skills_SkillId",
                table: "RoleSkills",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SkillMarketTrends_Skills_SkillId",
                table: "SkillMarketTrends",
                column: "SkillId",
                principalTable: "Skills",
                principalColumn: "SkillId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SubDisciplines_Disciplines_DisciplineId",
                table: "SubDisciplines",
                column: "DisciplineId",
                principalTable: "Disciplines",
                principalColumn: "DomainId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.CreateIndex(
                name: "IX_LearnerAssessments_LearnerId",
                table: "LearnerAssessments",
                column: "LearnerId");
            migrationBuilder.CreateIndex(
                name: "IX_Applications_LearnerId",
                table: "Applications",
                column: "LearnerId");

            migrationBuilder.Sql(@"DROP FUNCTION IF EXISTS legacy_int_to_uuid(text, integer);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new System.NotSupportedException(
                "UseGuidIds is irreversible: integer IDs cannot be restored from UUIDs. " +
                "To roll back, restore the database backup or drop and recreate the database.");
        }
    }
}
