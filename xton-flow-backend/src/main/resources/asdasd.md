# XtonFlow Enterprise Backend - Technical Documentation

## 1. Architecture Overview
XtonFlow is a modern, enterprise-grade task management SaaS application built on **Spring Boot 4.1.0** and **Java 26**. It follows a strict **MVC (Model-View-Controller)** architecture with a clear separation of concerns, utilizing a Service-Repository pattern for robust data handling and business logic execution.

### Core Technology Stack
- **Runtime:** Java 26
- **Framework:** Spring Boot 4.1.0
- **Database:** PostgreSQL 18.2 (via Hibernate/JPA)
- **Security:** Spring Security 7.1.0 + JWT (JSON Web Tokens)
- **Real-time:** WebSockets (STOMP protocol via `spring-boot-starter-websocket`)
- **Build Tool:** Maven

---

## 2. Authentication & Authorization (JWT)

### How it Works
XtonFlow uses **Stateless JWT Authentication**. 
1. The client sends credentials to `/api/auth/login`.
2. The server validates them and returns a signed JWT token.
3. The client stores this token and sends it in the `Authorization: Bearer <token>` header for every subsequent request.
4. The `JwtAuthenticationFilter` intercepts every request, validates the token, and loads the user into the Spring Security Context.

### Endpoints

#### `POST /api/auth/register`
- **Description:** Creates a new user account.
- **Payload:** `RegisterRequestDto` (fullName, email, password).
- **Logic:** Checks if email exists. Hashes password using `BCryptPasswordEncoder`. Returns a JWT token.

#### `POST /api/auth/login`
- **Description:** Authenticates an existing user.
- **Payload:** `AuthRequestDto` (email, password).
- **Logic:** Uses Spring's `AuthenticationManager`. If successful, generates and returns a JWT token valid for 24 hours.

---

## 3. Task Management & Real-Time WebSockets

### How it Works
Tasks are the core entity. When a task is created, updated, or deleted, the `TaskService` not only saves it to PostgreSQL but also publishes an event to the `/topic/tasks` WebSocket channel. Any frontend client subscribed to this channel receives the update instantly without refreshing the page.

### Endpoints

#### `POST /api/tasks`
- **Description:** Creates a new task.
- **Payload:** `TaskRequestDto` (title, description, status, priority, boardId, assigneeId).
- **Real-time:** Publishes `CREATED` event.

#### `GET /api/tasks`
- **Description:** Fetches all tasks in the system.

#### `GET /api/tasks/board/{boardId}`
- **Description:** Fetches all tasks belonging to a specific Kanban board.

#### `PUT /api/tasks/{taskId}`
- **Description:** Partially updates a task (e.g., changing title or description).
- **Real-time:** Publishes `UPDATED` event.

#### `PUT /api/tasks/{taskId}/status`
- **Description:** Specifically updates the status of a task (e.g., moving from TODO to IN_PROGRESS).
- **Real-time:** Publishes `STATUS_UPDATED` event.

#### `DELETE /api/tasks/{taskId}`
- **Description:** Permanently removes a task.
- **Real-time:** Publishes `DELETED` event.

---

## 4. Comments System

### How it Works
The Comments system allows users to collaborate on specific tasks. It uses a **Many-to-One** relationship with both the `Task` and the `User` (author). 

### Endpoints

#### `POST /api/comments`
- **Description:** Adds a comment to a task.
- **Security:** Automatically extracts the authenticated user's email from the JWT token to set the author.
- **Payload:** `CommentRequestDto` (content, taskId).

#### `GET /api/comments/task/{taskId}`
- **Description:** Fetches all comments for a specific task, ordered chronologically.

#### `PUT /api/comments/{commentId}`
- **Description:** Edits an existing comment.
- **Security:** Validates that the requesting user is the original author of the comment.

#### `DELETE /api/comments/{commentId}`
- **Description:** Deletes a comment.
- **Security:** Validates that the requesting user is the original author.

---

## 5. File Attachments

### How it Works
Users can upload files (images, PDFs, docs) directly to tasks. Files are stored locally in an `./uploads` directory, and metadata is stored in the `xton_attachments` database table.

### Endpoints

#### `POST /api/attachments/upload`
- **Description:** Uploads a file and links it to a task.
- **Payload:** `multipart/form-data` containing `file` and `taskId`.
- **Logic:** Generates a UUID filename to prevent collisions. Saves file to disk. Creates Attachment entity.

#### `GET /api/attachments/task/{taskId}`
- **Description:** Lists all files attached to a specific task.

#### `GET /api/attachments/download/{fileName}`
- **Description:** Downloads a specific file.
- **Logic:** Streams the file from the local disk with the correct `Content-Disposition` header.

#### `DELETE /api/attachments/{attachmentId}`
- **Description:** Deletes a file attachment.
- **Logic:** Deletes the physical file from the disk and removes the database record.

---

## 6. Security Configuration Deep Dive

### `SecurityConfig.java`
- **CSRF Disabled:** Because we use JWTs (stateless), CSRF tokens are unnecessary and would block API requests.
- **Stateless Sessions:** `SessionCreationPolicy.STATELESS` ensures Spring does not create HTTP sessions. Every request must carry its own JWT.
- **CORS:** Configured to allow requests from the React frontend (`localhost:3000` and `localhost:5173`).
- **Endpoint Protection:** `/api/auth/**` is public. All other `/api/**` endpoints require a valid JWT.

### `JwtAuthenticationFilter.java`
- Extends `OncePerRequestFilter` to ensure it runs exactly once per HTTP request.
- Extracts the token from the `Authorization` header.
- Validates the token signature and expiration using `JwtUtil`.
- If valid, sets the `SecurityContextHolder` so downstream controllers know *who* is making the request.