# Manual Smoke Test Plan

All requests go through the shared proxy at `http://localhost:80/api`.
Use `-c cookies.txt -b cookies.txt` to persist the cookie jar across commands.
Replace IDs (e.g. `$CHANNEL_ID`, `$POST_ID`) with real values from prior steps.

---

## 1. Health Check

```bash
curl -s http://localhost:80/api/healthz
```

**Expected**: `200 OK` — `{"status":"ok"}` (or similar healthy response)

---

## 2. Auth — Login (valid credentials)

```bash
curl -s -c cookies.txt -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portal.local","password":"admin1234"}'
```

**Expected**: `200 OK` — JSON user object with `id`, `email`, `role: "admin"`

---

## 3. Auth — Login (wrong password)

```bash
curl -s -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portal.local","password":"wrongpass"}'
```

**Expected**: `401 Unauthorized` — `{"error":"Invalid credentials"}`

---

## 4. Auth — Login (missing fields — validation)

```bash
curl -s -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portal.local"}'
```

**Expected**: `400 Bad Request` — `{"error":"Validation failed","details":[{"field":"password","message":"Required"}]}`

---

## 5. Auth — Get Current User

```bash
curl -s -b cookies.txt http://localhost:80/api/auth/me
```

**Expected**: `200 OK` — JSON user object

---

## 6. Channels — List Channels

```bash
curl -s -b cookies.txt http://localhost:80/api/channels
```

**Expected**: `200 OK` — JSON array of channel objects with `id`, `name`, `adminsOnly`

Note the first channel's `id` for use as `$CHANNEL_ID` below.

---

## 7. Posts — Create Post

```bash
CHANNEL_ID=1  # replace with id from step 6
curl -s -b cookies.txt -X POST "http://localhost:80/api/channels/$CHANNEL_ID/posts" \
  -H "Content-Type: application/json" \
  -d '{"body":"Hello from smoke test"}'
```

**Expected**: `201 Created` — JSON post object with `id`, `body`, `authorId`

Note the returned `id` as `$POST_ID`.

---

## 8. Posts — List Posts by Channel

```bash
curl -s -b cookies.txt "http://localhost:80/api/channels/$CHANNEL_ID/posts"
```

**Expected**: `200 OK` — JSON array containing the post from step 7

---

## 9. Posts — Pin Post (admin only)

```bash
POST_ID=<id from step 7>
curl -s -b cookies.txt -X POST "http://localhost:80/api/posts/$POST_ID/pin"
```

**Expected**: `200 OK` — `{"ok":true}`

---

## 10. Comments — Create Comment

```bash
curl -s -b cookies.txt -X POST "http://localhost:80/api/posts/$POST_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"Test comment"}'
```

**Expected**: `201 Created` — JSON comment object with `id`, `body`, `authorId`

Note the returned `id` as `$COMMENT_ID`.

---

## 11. Comments — List Comments for Post

```bash
curl -s -b cookies.txt "http://localhost:80/api/posts/$POST_ID/comments"
```

**Expected**: `200 OK` — JSON array containing the comment from step 10

---

## 12. Comments — Delete Comment

```bash
COMMENT_ID=<id from step 10>
curl -s -b cookies.txt -X DELETE "http://localhost:80/api/comments/$COMMENT_ID"
```

**Expected**: `204 No Content`

---

## 13. School — List Segments

```bash
curl -s -b cookies.txt http://localhost:80/api/school/segments
```

**Expected**: `200 OK` — JSON array of segment objects with `id`, `title`

Note the first segment's `id` as `$SEGMENT_ID`.

---

## 14. School — List Subsections

```bash
SEGMENT_ID=<id from step 13>
curl -s -b cookies.txt "http://localhost:80/api/school/segments/$SEGMENT_ID/subsections"
```

**Expected**: `200 OK` — JSON array of subsection objects

Note the first subsection's `id` as `$SUBSECTION_ID`.

---

## 15. School — List Lessons

```bash
SUBSECTION_ID=<id from step 14>
curl -s -b cookies.txt "http://localhost:80/api/school/subsections/$SUBSECTION_ID/lessons"
```

**Expected**: `200 OK` — JSON array of lesson objects with `id`, `title`, `type`

Note the first lesson's `id` as `$LESSON_ID`.

---

## 16. School — Get Lesson Detail

```bash
LESSON_ID=<id from step 15>
curl -s -b cookies.txt "http://localhost:80/api/school/lessons/$LESSON_ID"
```

**Expected**: `200 OK` — JSON lesson object including `isCompleted` boolean

---

## 17. Progress — Toggle Lesson Complete

```bash
curl -s -b cookies.txt -X POST "http://localhost:80/api/progress/lessons/$LESSON_ID" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

**Expected**: `200 OK` — `{"lessonId":<id>,"completed":true}`

---

## 18. Progress — Toggle Lesson Incomplete

```bash
curl -s -b cookies.txt -X POST "http://localhost:80/api/progress/lessons/$LESSON_ID" \
  -H "Content-Type: application/json" \
  -d '{"completed":false}'
```

**Expected**: `200 OK` — `{"lessonId":<id>,"completed":false}`

---

## 19. Admin — Create User

```bash
curl -s -b cookies.txt -X POST http://localhost:80/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"email":"testmember@portal.local","name":"Test Member","role":"member"}'
```

**Expected**: `201 Created` — JSON with `user` object and `tempPassword` string

---

## 20. Auth — Logout

```bash
curl -s -b cookies.txt -X POST http://localhost:80/api/auth/logout
```

**Expected**: `200 OK` — `{"ok":true}`

Verify session is gone:

```bash
curl -s -b cookies.txt http://localhost:80/api/auth/me
```

**Expected**: `401 Unauthorized`
