import { db } from "./db/index.js";
import { users, posts, tags, postsTags, postLikes, comments } from "./db/schema.js";

await db.delete(postLikes);
await db.delete(postsTags);
await db.delete(comments);
await db.delete(posts);
await db.delete(tags);
await db.delete(users);

const insertedUsers = await db.insert(users).values([
  { name: "Alice Johnson", email: "alice@example.com", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice", googleId: "seed-alice" },
  { name: "Bob Smith", email: "bob@example.com", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob", googleId: "seed-bob" },
  { name: "Carol Davis", email: "carol@example.com", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol", googleId: "seed-carol" },
]).returning();

const insertedTags = await db.insert(tags).values([
  { name: "Technology", slug: "technology" },
  { name: "Programming", slug: "programming" },
  { name: "Web Dev", slug: "web-dev" },
  { name: "JavaScript", slug: "javascript" },
  { name: "TypeScript", slug: "typescript" },
  { name: "Database", slug: "database" },
  { name: "DevOps", slug: "devops" },
  { name: "Design", slug: "design" },
  { name: "Tutorial", slug: "tutorial" },
  { name: "Opinion", slug: "opinion" },
]).returning();

const now = new Date();
function daysAgo(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() - days);
  return r;
}

const postsData = [
  { title: "Getting Started with Bun", slug: "getting-started-bun", content: "Bun is an all-in-one JavaScript runtime built from scratch. It bundles a transpiler, package manager, and native TypeScript support into a single binary. This makes it one of the fastest runtimes available for modern web development.", published: true, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 30) },
  { title: "Why TypeScript Matters", slug: "why-typescript-matters", content: "TypeScript adds static type checking to JavaScript, catching entire classes of bugs before they reach production. With features like generics, union types, and conditional types, it scales from small scripts to large enterprise applications.", published: true, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 28) },
  { title: "A Guide to Modern CSS", slug: "guide-modern-css", content: "CSS has evolved far beyond simple styling. With Grid, Flexbox, custom properties, and container queries, modern CSS can handle complex layouts without preprocessors. This guide covers the features every developer should know.", published: true, authorId: insertedUsers[2]!.id, createdAt: daysAgo(now, 26) },
  { title: "Understanding Async Await", slug: "understanding-async-await", content: "JavaScript's async/await syntax makes asynchronous code read like synchronous code. Under the hood it works with Promises and the event loop. Mastering this pattern is essential for modern JavaScript development.", published: true, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 24) },
  { title: "Introduction to SQLite", slug: "intro-to-sqlite", content: "SQLite is a self-contained, serverless database engine that requires zero configuration. It is one of the most widely deployed database engines in the world, powering everything from mobile apps to embedded systems.", published: true, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 22) },
  { title: "Building REST APIs with Hono", slug: "building-rest-apis-hono", content: "Hono is a lightweight web framework designed for modern runtimes like Bun, Deno, and Cloudflare Workers. Its middleware system and type-safe routing make building REST APIs fast and enjoyable.", published: true, authorId: insertedUsers[2]!.id, createdAt: daysAgo(now, 20) },
  { title: "Docker for Beginners", slug: "docker-for-beginners", content: "Docker simplifies application deployment by packaging code and dependencies into containers. Containers are lightweight, portable, and consistent across environments. This guide walks through the core concepts every developer needs.", published: true, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 18) },
  { title: "The State of WebAssembly", slug: "state-of-wasm", content: "WebAssembly is changing how we build for the web by allowing languages like Rust, Go, and C to run in the browser at near-native speed. Its ecosystem is maturing rapidly with new tools and frameworks.", published: false, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 16) },
  { title: "Functional Programming in JS", slug: "fp-in-javascript", content: "Functional programming focuses on pure functions, immutability, and declarative code. JavaScript supports FP patterns through first-class functions, array methods like map and reduce, and libraries like Ramda.", published: true, authorId: insertedUsers[2]!.id, createdAt: daysAgo(now, 14) },
  { title: "Testing Strategies for Web Apps", slug: "testing-strategies", content: "Good tests give you confidence to ship. Unit tests verify individual functions, integration tests check component interactions, and end-to-end tests simulate real user flows. A balanced strategy uses all three.", published: false, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 12) },
  { title: "GraphQL vs REST", slug: "graphql-vs-rest", content: "Both GraphQL and REST have strengths. REST uses multiple endpoints for different resources while GraphQL provides a single endpoint with flexible queries. The right choice depends on your use case and team.", published: true, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 10) },
  { title: "Mastering Git", slug: "mastering-git", content: "Git is the most widely used version control system. Beyond basic commit and push, features like interactive rebase, bisect, and worktrees can dramatically improve your workflow.", published: true, authorId: insertedUsers[2]!.id, createdAt: daysAgo(now, 8) },
  { title: "CI/CD Pipelines Explained", slug: "cicd-pipelines-explained", content: "Continuous integration and delivery automate the build, test, and deployment process. A well-designed pipeline catches issues early and deploys reliably. Tools like GitHub Actions make this accessible.", published: true, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 6) },
  { title: "Web Accessibility Basics", slug: "web-accessibility-basics", content: "Making the web accessible for everyone is both a moral imperative and legal requirement in many regions. Semantic HTML, ARIA attributes, and keyboard navigation are foundational skills.", published: false, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 5) },
  { title: "Microservices Architecture", slug: "microservices-architecture", content: "Microservices break applications into small, independent services that communicate over a network. This architecture enables independent scaling, deployment, and team ownership.", published: true, authorId: insertedUsers[2]!.id, createdAt: daysAgo(now, 4) },
  { title: "Learning Rust in 2026", slug: "learning-rust-2026", content: "Rust continues to gain popularity for systems programming. Its ownership model guarantees memory safety without a garbage collector. The growing ecosystem makes it viable for web assembly, CLI tools, and more.", published: true, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 3) },
  { title: "Designing RESTful APIs", slug: "designing-restful-apis", content: "Good API design is crucial for developer experience. Consistent naming, proper status codes, pagination, and versioning make APIs intuitive to use and maintain over time.", published: false, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 2) },
  { title: "Performance Optimization Tips", slug: "perf-optimization-tips", content: "Speed matters for user experience and SEO. Optimizing bundle size, leveraging caching, lazy loading, and profiling with tools like Lighthouse are essential skills for frontend developers.", published: true, authorId: insertedUsers[2]!.id, createdAt: daysAgo(now, 1) },
  { title: "Open Source Contribution Guide", slug: "open-source-guide", content: "Contributing to open source is rewarding and builds your skills. Start by finding projects with good first issues, understand their contribution guidelines, and communicate clearly with maintainers.", published: true, authorId: insertedUsers[0]!.id, createdAt: daysAgo(now, 0) },
  { title: "The Future of AI in Development", slug: "future-ai-development", content: "AI tools like GitHub Copilot and Claude are transforming how we write code. They excel at boilerplate, testing, and documentation but still require human judgment for architecture and design decisions.", published: true, authorId: insertedUsers[1]!.id, createdAt: daysAgo(now, 0) },
];

const insertedPosts = await db.insert(posts).values(
  postsData.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
).returning();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const postTagLinks = insertedPosts.flatMap((post, i) => {
  const count = (i % 3) + 1;
  const tagIds = shuffle(insertedTags.map((t) => t.id)).slice(0, count);
  return tagIds.map((tagId) => ({ postId: post.id, tagId }));
});

await db.insert(postsTags).values(postTagLinks);

const likeLinks = insertedPosts.flatMap((post, i) => {
  const count = i % 3;
  const likers = shuffle(insertedUsers.map((u) => u.id)).slice(0, count);
  return likers.map((userId) => ({ postId: post.id, userId }));
});

if (likeLinks.length > 0) {
  await db.insert(postLikes).values(likeLinks);
}

const commentData = insertedPosts.slice(0, 5).flatMap((post, i) => {
  const user = insertedUsers[i % insertedUsers.length]!;
  return [
    { postId: post.id, userId: user.id, authorName: user.name, authorEmail: user.email, content: `Great post about ${post.title}!` },
    { postId: post.id, userId: insertedUsers[(i + 1) % insertedUsers.length]!.id, authorName: insertedUsers[(i + 1) % insertedUsers.length]!.name, authorEmail: insertedUsers[(i + 1) % insertedUsers.length]!.email, content: `Thanks for sharing this.` },
  ];
});

await db.insert(comments).values(commentData);

console.log(`Seeded: ${insertedUsers.length} users, ${insertedTags.length} tags, ${insertedPosts.length} posts, ${postTagLinks.length} tag links, ${commentData.length} comments, ${likeLinks.length} likes`);
process.exit(0);
