using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssessmentQuestions",
                columns: table => new
                {
                    AssessmentQuestionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SkillId = table.Column<int>(type: "integer", nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    OptionA = table.Column<string>(type: "text", nullable: false),
                    OptionB = table.Column<string>(type: "text", nullable: false),
                    OptionC = table.Column<string>(type: "text", nullable: false),
                    OptionD = table.Column<string>(type: "text", nullable: false),
                    CorrectOption = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssessmentQuestions", x => x.AssessmentQuestionId);
                    table.ForeignKey(
                        name: "FK_AssessmentQuestions_Skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "Skills",
                        principalColumn: "SkillId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "AssessmentQuestions",
                columns: new[] { "AssessmentQuestionId", "CorrectOption", "OptionA", "OptionB", "OptionC", "OptionD", "SkillId", "Text" },
                values: new object[,]
                {
                    { 1, 1, "Array.prototype.forEach", "Array.prototype.map", "Array.prototype.filter", "Array.prototype.reduce", 1, "Which method creates a new array with the results of calling a function on every element?" },
                    { 2, 2, "Value only", "Type only", "Value and type", "Reference equality", 1, "What does the '===' operator check in JavaScript?" },
                    { 3, 1, "var", "let", "function", "global", 1, "Which keyword creates a block-scoped variable?" },
                    { 4, 2, "\"null\"", "\"undefined\"", "\"object\"", "\"boolean\"", 1, "What is the output of typeof null?" },
                    { 5, 1, "Array.prototype.unshift()", "Array.prototype.push()", "Array.prototype.pop()", "Array.prototype.shift()", 1, "Which method adds an element to the end of an array?" },
                    { 6, 1, "A function that has no return value", "A function that accesses variables from its outer scope", "A function that takes no arguments", "A function that calls itself", 1, "What is a closure in JavaScript?" },
                    { 7, 2, "onmouseover", "onchange", "onclick", "onsubmit", 1, "Which event fires when an HTML element is clicked?" },
                    { 8, 0, "JavaScript Object Notation", "Java Source Object Network", "JavaScript Online Notation", "Java Syntax Object Notation", 1, "What does JSON stand for?" },
                    { 9, 1, "JSON.stringify()", "JSON.parse()", "JSON.convert()", "JSON.toObject()", 1, "Which method converts a JSON string into a JavaScript object?" },
                    { 10, 1, "4", "\"22\"", "NaN", "TypeError", 1, "What is the result of 2 + '2' in JavaScript?" },
                    { 11, 1, "A compiled language", "A superset of JavaScript", "A database query language", "A CSS preprocessor", 2, "What is TypeScript?" },
                    { 12, 2, "var", "let", "const", "static", 2, "Which keyword declares a variable that cannot be reassigned?" },
                    { 13, 1, "A type for numeric values", "A type that disables type checking", "A type for string values", "A type for boolean values", 2, "What is the 'any' type in TypeScript?" },
                    { 14, 1, "class Interface {}", "interface IFace {}", "type IFace = {}", "struct IFace {}", 2, "How do you define an interface in TypeScript?" },
                    { 15, 1, "A type that combines multiple classes", "A type that allows multiple possible types", "A type for array elements", "A type for function parameters", 2, "What is a union type?" },
                    { 16, 1, "A CSS class", "A reusable piece of UI", "A database table", "An HTML element", 3, "What is a React component?" },
                    { 17, 1, "useState", "useEffect", "useContext", "useReducer", 3, "Which hook is used for side effects?" },
                    { 18, 1, "A new programming language", "JavaScript XML syntax extension", "A CSS framework", "A testing library", 3, "What is JSX?" },
                    { 19, 1, "Using state", "Using props", "Using context only", "Using refs", 3, "How do you pass data from parent to child?" },
                    { 20, 0, "A copy of the real DOM kept in memory", "A browser API", "A CSS technique", "A JavaScript library", 3, "What is the virtual DOM?" },
                    { 21, 0, "Cascading Style Sheets", "Computer Style Sheets", "Creative Style System", "Colorful Style Sheets", 4, "What does CSS stand for?" },
                    { 22, 2, "font-color", "text-color", "color", "foreground", 4, "Which property changes text color?" },
                    { 23, 1, "A 3D modeling technique", "Content, padding, border, margin layout model", "A JavaScript concept", "A CSS grid system", 4, "What is the box model?" },
                    { 24, 1, "none", "hidden", "invisible", "block", 4, "Which display value makes an element hidden but retains space?" },
                    { 25, 1, "A JavaScript library", "A CSS layout method for one-dimensional layouts", "A HTML element", "A CSS reset", 4, "What is Flexbox?" },
                    { 26, 0, "Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language", 5, "What does HTML stand for?" },
                    { 27, 1, "<link>", "<a>", "<href>", "<url>", 5, "Which tag creates a hyperlink?" },
                    { 28, 2, "<image src='img.jpg'>", "<img href='img.jpg'>", "<img src='img.jpg'>", "<picture src='img.jpg'>", 5, "What is the correct way to add an image?" },
                    { 29, 1, "title", "alt", "description", "text", 5, "Which attribute provides alternative text for images?" },
                    { 30, 2, "<div>", "<span>", "<article>", "<b>", 5, "What is a semantic HTML element?" },
                    { 31, 1, "A frontend framework", "A JavaScript runtime built on Chrome's V8", "A database", "A CSS preprocessor", 6, "What is Node.js?" },
                    { 32, 1, "node init", "npm init", "npx create", "npm start", 6, "Which command initializes a new Node.js project?" },
                    { 33, 0, "Node Package Manager", "New Project Manager", "Node Process Manager", "Network Protocol Manager", 6, "What is npm?" },
                    { 34, 0, "fs", "file", "files", "io", 6, "Which module is used to work with files?" },
                    { 35, 1, "A database", "A web application framework for Node.js", "A testing library", "A CSS framework", 6, "What is Express.js?" },
                    { 36, 1, "A compiled language", "An interpreted high-level programming language", "A markup language", "A database", 7, "What is Python?" },
                    { 37, 1, "function func() {}", "def func():", "func function() {}", "define func() {}", 7, "How do you define a function in Python?" },
                    { 38, 1, "An immutable sequence", "A mutable ordered collection", "A key-value pair", "A single value", 7, "What is a list in Python?" },
                    { 39, 1, "loop", "for", "iterate", "repeat", 7, "Which keyword is used for loops?" },
                    { 40, 1, "A Python version", "Python's style guide", "A testing framework", "A package manager", 7, "What is PEP 8?" },
                    { 41, 0, "Structured Query Language", "Simple Query Logic", "Standard Question Language", "System Query Lookup", 8, "What does SQL stand for?" },
                    { 42, 2, "GET", "RETRIEVE", "SELECT", "FETCH", 8, "Which command retrieves data?" },
                    { 43, 1, "A foreign reference", "A unique identifier for each row", "A column index", "A table name", 8, "What is a primary key?" },
                    { 44, 1, "FILTER", "WHERE", "HAVING", "LIMIT", 8, "Which clause filters results?" },
                    { 45, 1, "Deleting rows", "Combining rows from two or more tables", "Creating tables", "Updating records", 8, "What is a JOIN used for?" },
                    { 46, 1, "A programming language", "A distributed version control system", "A database", "An operating system", 9, "What is Git?" },
                    { 47, 0, "git add", "git stage", "git commit", "git push", 9, "Which command stages changes?" },
                    { 48, 1, "Creates a branch", "Creates a copy of a repository", "Deletes a file", "Merges branches", 9, "What does 'git clone' do?" },
                    { 49, 0, "git log", "git history", "git show", "git list", 9, "Which command shows commit history?" },
                    { 50, 1, "A file type", "An independent line of development", "A merge conflict", "A remote repository", 9, "What is a branch?" },
                    { 51, 0, "Representational State Transfer", "Remote Execution Standard Transfer", "Resource Entity State Technology", "Real-time Event System Transfer", 10, "What does REST stand for?" },
                    { 52, 1, "GET", "POST", "PUT", "DELETE", 10, "Which HTTP method is used to create a resource?" },
                    { 53, 2, "Not Found", "Created", "OK", "Bad Request", 10, "What is a status code 200?" },
                    { 54, 1, "A database table", "A specific URL where an API can be accessed", "A JavaScript function", "A CSS selector", 10, "What is a REST API endpoint?" },
                    { 55, 2, "XML only", "CSV only", "JSON", "HTML only", 10, "Which format is commonly used for API responses?" },
                    { 56, 1, "A backend framework", "A progressive JavaScript framework", "A database", "A CSS library", 11, "What is Vue.js?" },
                    { 57, 1, "A CSS class", "An encapsulated reusable UI piece", "A database model", "An HTML template only", 11, "What is a Vue component?" },
                    { 58, 0, "v-bind", "v-model", "v-show", "v-for", 11, "Which directive binds data to the DOM?" },
                    { 59, 1, "A CSS technique", "A way to organize component logic using functions", "A routing system", "A state management only", 11, "What is the Composition API?" },
                    { 60, 1, "var x = 0", "ref(0)", "reactive(0)", "state(0)", 11, "How do you create a reactive variable?" },
                    { 61, 1, "A JavaScript library", "A platform for building mobile and desktop apps", "A CSS framework", "A database", 12, "What is Angular?" },
                    { 62, 1, "A CSS file", "A class with a template that controls a view", "A database table", "An HTML attribute", 12, "What is a component in Angular?" },
                    { 63, 0, "@Component", "@View", "@Template", "@Module", 12, "Which decorator marks a class as a component?" },
                    { 64, 1, "A CSS preprocessor", "A superset of JavaScript used by Angular", "A testing framework", "A database", 12, "What is TypeScript in Angular?" },
                    { 65, 1, "Connecting to a database", "Automatic synchronization between component and view", "Importing modules", "Creating HTML elements", 12, "What is data binding?" },
                    { 66, 1, "A programming language", "A containerization platform", "A database", "An IDE", 13, "What is Docker?" },
                    { 67, 1, "A running container", "A read-only template for creating containers", "A Dockerfile", "A virtual machine", 13, "What is a Docker image?" },
                    { 68, 0, "docker build", "docker create", "docker run", "docker start", 13, "Which command builds a Docker image?" },
                    { 69, 1, "A configuration file for Docker Desktop", "A text file with instructions to build an image", "A container log", "A network config", 13, "What is a Dockerfile?" },
                    { 70, 1, "Creating single containers", "Managing multiple containers at scale", "Building Docker images", "Writing Dockerfiles", 13, "What is container orchestration?" },
                    { 71, 1, "A programming language", "A cloud computing platform", "A database", "An operating system", 14, "What is AWS?" },
                    { 72, 1, "A database", "A virtual server in the cloud", "A storage bucket", "A network load balancer", 14, "What is an EC2 instance?" },
                    { 73, 1, "Computing", "Object storage", "Database management", "Email hosting", 14, "What is S3 used for?" },
                    { 74, 0, "A virtual private cloud - isolated network", "A very private computer", "A video processing center", "A visual programming code", 14, "What is a VPC?" },
                    { 75, 0, "Identity and Access Management", "Internet Application Manager", "Integrated AWS Monitor", "Internal API Middleware", 14, "What is IAM?" },
                    { 76, 1, "A code editor", "A collaborative interface design tool", "A database", "A testing framework", 15, "What is Figma?" },
                    { 77, 1, "A code snippet", "A reusable design element", "A file type", "An export format", 15, "What is a component in Figma?" },
                    { 78, 1, "Manual positioning", "A feature that creates responsive layouts automatically", "A CSS property", "A grid system", 15, "What is auto layout?" },
                    { 79, 1, "Different files", "Different versions of a component", "Color schemes", "Font styles", 15, "What are variants in Figma?" },
                    { 80, 1, "A code editor", "A mode for developers to inspect designs and get code", "A testing tool", "A deployment feature", 15, "What is Dev Mode in Figma?" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssessmentQuestions_SkillId",
                table: "AssessmentQuestions",
                column: "SkillId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssessmentQuestions");
        }
    }
}
