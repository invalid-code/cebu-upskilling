using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CebuUpskilling.Backend.Migrations
{
    /// <inheritdoc />
    public partial class SeedCourseContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "SubDisciplines",
                columns: new[] { "SubDisciplineId", "CreatedAt", "CreatedBy", "Description", "DisciplineId", "Name", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Building user interfaces and client-side web applications", 3, "Frontend Development", null, null },
                    { 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Server-side programming and API development", 3, "Backend Development", null, null },
                    { 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Deployment, infrastructure, and cloud services", 3, "DevOps & Cloud", null, null }
                });

            migrationBuilder.InsertData(
                table: "Genres",
                columns: new[] { "GenreId", "CreatedAt", "CreatedBy", "Description", "Name", "SubDisciplineId", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Core JavaScript and modern frameworks", "JavaScript & Frameworks", 100, null, null },
                    { 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Static typing for JavaScript", "TypeScript", 100, null, null },
                    { 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "React library and ecosystem", "React", 100, null, null },
                    { 103, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Building real-world projects", "Portfolio & Projects", 100, null, null },
                    { 104, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Software testing methodologies", "Testing", 100, null, null }
                });

            migrationBuilder.InsertData(
                table: "Courses",
                columns: new[] { "CourseId", "CreatedAt", "CreatedBy", "Description", "GenreId", "Mode", "Name", "Price", "TechnicalLevel", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Master modern JavaScript ES6+ features for building dynamic frontend applications. Learn arrow functions, destructuring, modules, and more.", 100, "Online", "Modern JavaScript for Frontend Work", 0, 2, null, null },
                    { 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Learn TypeScript from scratch. Master type system, interfaces, generics, and build type-safe applications with confidence.", 101, "Online", "TypeScript from Zero to Confident", 0, 2, null, null },
                    { 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Build a complete frontend portfolio project from scratch. Learn to plan, design, and deploy a professional portfolio that showcases your skills.", 103, "Online", "Frontend Portfolio Sprint", 0, 2, null, null },
                    { 103, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Learn how to test React applications with Jest and React Testing Library. Write unit tests, integration tests, and mock external dependencies.", 104, "Online", "React Testing Fundamentals", 0, 3, null, null }
                });

            migrationBuilder.InsertData(
                table: "Lessons",
                columns: new[] { "LessonId", "CourseId", "CreatedAt", "CreatedBy", "Description", "Name", "UpdatedAt", "UpdatedBy" },
                values: new object[,]
                {
                    { 100, 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Understanding let, const, and JavaScript data types", "Variables and Data Types", null, null },
                    { 101, 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Modern function syntax and closure patterns", "Arrow Functions and Closures", null, null },
                    { 102, 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Extracting values and spreading collections", "Destructuring and Spread", null, null },
                    { 103, 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Organizing code with ES modules", "Modules and Imports", null, null },
                    { 104, 100, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Promises, async/await, and error handling", "Async JavaScript", null, null },
                    { 105, 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Why TypeScript and how to set it up", "Introduction to TypeScript", null, null },
                    { 106, 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Primitive types, arrays, and type annotations", "Basic Types and Annotations", null, null },
                    { 107, 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Defining object shapes and custom types", "Interfaces and Type Aliases", null, null },
                    { 108, 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Type-safe functions and reusable components", "Functions and Generics", null, null },
                    { 109, 101, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Unions, intersections, and utility types", "Advanced Types", null, null },
                    { 110, 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Defining your brand and content strategy", "Planning Your Portfolio", null, null },
                    { 111, 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Creating reusable UI components", "Building Project Components", null, null },
                    { 112, 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Making your portfolio work on all devices", "Responsive Design", null, null },
                    { 113, 102, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Going live with your portfolio", "Deployment", null, null },
                    { 114, 103, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Why testing matters and testing pyramid", "Testing Philosophy", null, null },
                    { 115, 103, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Writing and running unit tests", "Unit Testing with Jest", null, null },
                    { 116, 103, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Testing React components with RTL", "Component Testing", null, null },
                    { 117, 103, new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), null, "Mocking modules and testing async code", "Mocking and Async Tests", null, null }
                });

            migrationBuilder.InsertData(
                table: "LessonContents",
                columns: new[] { "ContentId", "BlockType", "Content", "LessonId", "LessonOrder", "PercentAddedPerContent", "TopicOrder" },
                values: new object[,]
                {
                    { 100, "text", "JavaScript provides three ways to declare variables: var, let, and const. The var keyword is function-scoped and can be redeclared. Let is block-scoped and can be reassigned but not redeclared. Const is block-scoped and cannot be reassigned or redeclared.", 100, 1, 10, 1 },
                    { 101, "code", "let age = 25;\nconst name = \"Maria\";\nvar isActive = true;\n\n// Block scope demo\nif (true) {\n  let x = 10;\n  console.log(x); // 10\n}\n// console.log(x); // ReferenceError", 100, 1, 10, 2 },
                    { 102, "text", "JavaScript has seven primitive data types: String, Number, BigInt, Boolean, Undefined, Null, and Symbol. Understanding these types is crucial for writing bug-free code and avoiding unexpected type coercion.", 100, 1, 10, 3 },
                    { 103, "text", "Arrow functions provide a shorter syntax for writing functions. They were introduced in ES6 and also lexically bind the this keyword, meaning they inherit this from their surrounding scope.", 101, 2, 10, 1 },
                    { 104, "code", "// Traditional function\nfunction add(a, b) {\n  return a + b;\n}\n\n// Arrow function\nconst addArrow = (a, b) => a + b;\n\n// Single parameter - no parentheses needed\nconst double = x => x * 2;\n\n// No parameters\nconst greet = () => \"Hello!\";", 101, 2, 10, 2 },
                    { 105, "text", "A closure is a function that retains access to variables from its outer (enclosing) scope even after the outer function has returned. This is one of the most powerful patterns in JavaScript.", 101, 2, 10, 3 },
                    { 106, "text", "Destructuring allows you to extract values from arrays or properties from objects into distinct variables. This syntax makes code more concise and readable.", 102, 3, 10, 1 },
                    { 107, "code", "// Array destructuring\nconst [first, second, third] = [10, 20, 30];\n\n// Object destructuring\nconst { name, age, city = \"Cebu\" } = {\n  name: \"Juan\",\n  age: 28\n};\n\n// Spread operator\nconst nums1 = [1, 2, 3];\nconst nums2 = [...nums1, 4, 5]; // [1, 2, 3, 4, 5]\n\nconst obj1 = { a: 1, b: 2 };\nconst obj2 = { ...obj1, c: 3 };", 102, 3, 10, 2 },
                    { 108, "text", "ES modules allow you to split your code into separate files, each with its own scope. This promotes code organization, reusability, and maintainability in larger projects.", 103, 4, 10, 1 },
                    { 109, "code", "// math.js - Exporting\nexport const PI = 3.14159;\nexport function add(a, b) { return a + b; }\nexport default class Calculator {\n  // ...\n}\n\n// app.js - Importing\nimport Calculator, { PI, add } from './math.js';\nimport * as MathUtils from './math.js';", 103, 4, 10, 2 },
                    { 110, "text", "Asynchronous JavaScript allows you to perform non-blocking operations. Promises represent eventual completion or failure, while async/await provides cleaner syntax for working with promises.", 104, 5, 10, 1 },
                    { 111, "code", "// Promise\nconst fetchData = () => {\n  return new Promise((resolve, reject) => {\n    setTimeout(() => resolve(\"Data loaded!\"), 1000);\n  });\n};\n\n// Async/Await\nasync function loadData() {\n  try {\n    const data = await fetchData();\n    console.log(data);\n  } catch (error) {\n    console.error(\"Failed:\", error);\n  }\n}", 104, 5, 10, 2 },
                    { 112, "text", "Promise.all() runs multiple promises in parallel and resolves when all are complete. Promise.race() resolves as soon as the first promise settles. These methods are essential for managing concurrent async operations.", 104, 5, 10, 3 },
                    { 113, "text", "TypeScript is a strongly typed programming language that builds on JavaScript. It adds static type checking, which helps catch errors at compile time rather than runtime. TypeScript code is transpiled to plain JavaScript.", 105, 1, 10, 1 },
                    { 114, "code", "// Install TypeScript\n// npm install -g typescript\n\n// Initialize a project\n// tsc --init\n\n// Compile a file\n// tsc filename.ts\n\n// Basic TypeScript file\nlet message: string = \"Hello, TypeScript!\";\nconsole.log(message);", 105, 1, 10, 2 },
                    { 115, "text", "The tsconfig.json file configures the TypeScript compiler. Key options include strict mode for stricter type checking, target for output JavaScript version, and outDir for compiled output location.", 105, 1, 10, 3 },
                    { 116, "text", "TypeScript provides several primitive types: string, number, boolean, null, undefined, symbol, bigint, and void. You can annotate variables with a colon followed by the type.", 106, 2, 10, 1 },
                    { 117, "code", "// Primitive types\nlet name: string = \"Ana\";\nlet age: number = 25;\nlet isStudent: boolean = true;\n\n// Arrays\nlet numbers: number[] = [1, 2, 3];\nlet names: Array<string> = [\"A\", \"B\"];\n\n// Tuples\nlet person: [string, number] = [\"Carlos\", 30];\n\n// Any (avoid using)\nlet data: any = \"could be anything\";", 106, 2, 10, 2 },
                    { 118, "text", "Interfaces define the shape of objects. They specify what properties an object should have and their types. Type aliases can do the same and more, including creating union types.", 107, 3, 10, 1 },
                    { 119, "code", "// Interface\ninterface User {\n  id: number;\n  name: string;\n  email: string;\n  avatar?: string; // Optional\n}\n\n// Type alias\ntype Status = \"active\" | \"inactive\" | \"pending\";\n\n// Extending interfaces\ninterface Employee extends User {\n  department: string;\n  salary: number;\n}\n\nconst employee: Employee = {\n  id: 1,\n  name: \"Maria\",\n  email: \"maria@example.com\",\n  department: \"Engineering\",\n  salary: 75000\n};", 107, 3, 10, 2 },
                    { 120, "text", "TypeScript lets you type function parameters and return values. Generics allow you to write flexible, reusable code that works with multiple types while maintaining type safety.", 108, 4, 10, 1 },
                    { 121, "code", "// Typed functions\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n\n// Generics\nfunction identity<T>(value: T): T {\n  return value;\n}\n\n// Generic interface\ninterface ApiResponse<T> {\n  data: T;\n  status: number;\n  message: string;\n}\n\n// Usage\nconst response: ApiResponse<User> = {\n  data: user,\n  status: 200,\n  message: \"Success\"\n};", 108, 4, 10, 2 },
                    { 122, "text", "TypeScript offers powerful type manipulation features. Union types allow a value to be one of several types. Intersection types combine multiple types. Utility types like Partial, Required, and Pick modify existing types.", 109, 5, 10, 1 },
                    { 123, "code", "// Union types\ntype ID = string | number;\n\n// Intersection types\ntype Named = { name: string };\ntype Aged = { age: number };\ntype Person = Named & Aged;\n\n// Utility types\ntype PartialUser = Partial<User>;\ntype RequiredUser = Required<User>;\ntype UserPreview = Pick<User, \"id\" | \"name\">;\ntype CreateUser = Omit<User, \"id\">;", 109, 5, 10, 2 },
                    { 124, "text", "Before writing code, define your personal brand. What skills do you want to highlight? What projects will you showcase? Who is your target audience? A clear strategy makes development faster and more focused.", 110, 1, 10, 1 },
                    { 125, "text", "Essential portfolio sections: Hero/Introduction, About Me, Skills, Projects (with descriptions and links), Experience/Timeline, Contact Form, Footer. Keep it simple and focused on quality over quantity.", 110, 1, 10, 2 },
                    { 126, "text", "Create a wireframe before coding. Sketch the layout for mobile and desktop views. This helps visualize the user flow and identify potential layout challenges early.", 110, 1, 10, 3 },
                    { 127, "text", "Start with atomic design principles. Build small, reusable components first (buttons, cards, inputs) then compose them into larger sections. This makes your code maintainable and testable.", 111, 2, 10, 1 },
                    { 128, "code", "// Example project card component\nfunction ProjectCard({ title, description, imageUrl, liveUrl, githubUrl }) {\n  return (\n    <div className=\"project-card\">\n      <img src={imageUrl} alt={title} />\n      <h3>{title}</h3>\n      <p>{description}</p>\n      <div className=\"links\">\n        <a href={liveUrl} target=\"_blank\">Live Demo</a>\n        <a href={githubUrl} target=\"_blank\">GitHub</a>\n      </div>\n    </div>\n  );\n}", 111, 2, 10, 2 },
                    { 129, "text", "Responsive design ensures your portfolio looks great on all screen sizes. Use CSS Grid and Flexbox for layouts, media queries for breakpoints, and relative units (rem, em, %) instead of fixed pixels.", 112, 3, 10, 1 },
                    { 130, "code", "/* Mobile-first approach */\n.container {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 1rem;\n  padding: 1rem;\n}\n\n/* Tablet */\n@media (min-width: 768px) {\n  .container {\n    grid-template-columns: repeat(2, 1fr);\n    padding: 2rem;\n  }\n}\n\n/* Desktop */\n@media (min-width: 1024px) {\n  .container {\n    grid-template-columns: repeat(3, 1fr);\n    max-width: 1200px;\n    margin: 0 auto;\n  }\n}", 112, 3, 10, 2 },
                    { 131, "text", "Deploy your portfolio to make it accessible online. Popular free options include Vercel, Netlify, and GitHub Pages. Each offers automatic deployments from Git repositories.", 113, 4, 10, 1 },
                    { 132, "text", "Post-deployment checklist: Test all links, verify responsive behavior, check loading speed, ensure images are optimized, set up a custom domain, add Open Graph meta tags for social sharing, and submit to Google Search Console.", 113, 4, 10, 2 },
                    { 133, "text", "Testing is not just about finding bugs - it's about building confidence in your code. Good tests act as documentation, enable refactoring, and catch regressions early. The testing pyramid suggests many unit tests, fewer integration tests, and minimal end-to-end tests.", 114, 1, 10, 1 },
                    { 134, "text", "React Testing Library encourages testing from the user's perspective. Instead of testing implementation details (state, internal methods), test what users see and do: rendered text, buttons, form submissions, and navigation.", 114, 1, 10, 2 },
                    { 135, "text", "Jest is a testing framework that provides test runner, assertions, mocking, and coverage out of the box. Tests are organized in describe blocks with individual test cases using it() or test().", 115, 2, 10, 1 },
                    { 136, "code", "// utils.test.js\ndescribe(\"formatCurrency\", () => {\n  it(\"formats Philippine Peso correctly\", () => {\n    expect(formatCurrency(1500)).toBe(\"₱1,500.00\");\n  });\n\n  it(\"returns ₱0.00 for zero\", () => {\n    expect(formatCurrency(0)).toBe(\"₱0.00\");\n  });\n\n  it(\"handles negative values\", () => {\n    expect(formatCurrency(-500)).toBe(\"-₱500.00\");\n  });\n});", 115, 2, 10, 2 },
                    { 137, "text", "React Testing Library provides query methods to find elements the way users would: getByRole, getByText, getByLabelText. Prefer queries that match accessibility roles over CSS selectors.", 116, 3, 10, 1 },
                    { 138, "code", "// Button.test.jsx\nimport { render, screen, fireEvent } from '@testing-library/react';\nimport Button from './Button';\n\ndescribe(\"Button\", () => {\n  it(\"renders with correct text\", () => {\n    render(<Button>Click me</Button>);\n    expect(screen.getByRole(\"button\", { name: /click me/i })).toBeInTheDocument();\n  });\n\n  it(\"calls onClick when clicked\", () => {\n    const handleClick = vi.fn();\n    render(<Button onClick={handleClick}>Click</Button>);\n    fireEvent.click(screen.getByRole(\"button\"));\n    expect(handleClick).toHaveBeenCalledTimes(1);\n  });\n});", 116, 3, 10, 2 },
                    { 139, "text", "Mocking replaces real dependencies with controlled substitutes. Use vi.fn() for mock functions, vi.mock() for module mocks, and mock service workers (MSW) for API mocking in integration tests.", 117, 4, 10, 1 },
                    { 140, "code", "// Testing async components\nimport { render, screen, waitFor } from '@testing-library/react';\nimport UserProfile from './UserProfile';\n\nvi.mock(\"./api\", () => ({\n  fetchUser: vi.fn()\n}));\n\ndescribe(\"UserProfile\", () => {\n  it(\"loads and displays user data\", async () => {\n    fetchUser.mockResolvedValue({ name: \"Ana\", role: \"Developer\" });\n    render(<UserProfile userId={1} />);\n    \n    expect(screen.getByText(\"Loading...\")).toBeInTheDocument();\n    \n    await waitFor(() => {\n      expect(screen.getByText(\"Ana\")).toBeInTheDocument();\n    });\n  });\n});", 117, 4, 10, 2 },
                    { 141, "text", "Coverage reports show which parts of your code are tested. Aim for meaningful coverage - test critical paths and edge cases rather than chasing 100% line coverage. Focus on behavior, not metrics.", 117, 4, 10, 3 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Genres",
                keyColumn: "GenreId",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 100);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 104);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 105);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 106);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 107);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 108);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 109);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 110);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 111);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 112);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 113);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 114);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 115);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 116);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 117);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 118);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 119);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 120);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 121);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 122);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 123);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 124);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 125);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 126);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 127);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 128);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 129);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 130);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 131);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 132);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 133);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 134);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 135);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 136);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 137);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 138);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 139);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 140);

            migrationBuilder.DeleteData(
                table: "LessonContents",
                keyColumn: "ContentId",
                keyValue: 141);

            migrationBuilder.DeleteData(
                table: "SubDisciplines",
                keyColumn: "SubDisciplineId",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "SubDisciplines",
                keyColumn: "SubDisciplineId",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 100);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 104);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 105);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 106);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 107);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 108);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 109);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 110);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 111);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 112);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 113);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 114);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 115);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 116);

            migrationBuilder.DeleteData(
                table: "Lessons",
                keyColumn: "LessonId",
                keyValue: 117);

            migrationBuilder.DeleteData(
                table: "Courses",
                keyColumn: "CourseId",
                keyValue: 100);

            migrationBuilder.DeleteData(
                table: "Courses",
                keyColumn: "CourseId",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "Courses",
                keyColumn: "CourseId",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "Courses",
                keyColumn: "CourseId",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "Genres",
                keyColumn: "GenreId",
                keyValue: 100);

            migrationBuilder.DeleteData(
                table: "Genres",
                keyColumn: "GenreId",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "Genres",
                keyColumn: "GenreId",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "Genres",
                keyColumn: "GenreId",
                keyValue: 104);

            migrationBuilder.DeleteData(
                table: "SubDisciplines",
                keyColumn: "SubDisciplineId",
                keyValue: 100);
        }
    }
}
