# Research Pack: Educational Platform Student Registration/Onboarding Methods

**Task ID**: 2026-04-11-student-registration-methods
**Question**: 교육 플랫폼들의 학생 등록/온보딩 방식 중 Padlet 클론에 가장 적합한 방식은 무엇인가?

---

## 1. Google Classroom

### Registration Flow (Step by Step)
1. Teacher creates a class in Google Classroom
2. System generates a **6-8 character alphanumeric class code** (no spaces, no special characters)
3. Teacher shares code via board display, email, or LMS
4. Student goes to classroom.google.com, signs in with Google Workspace account
5. Clicks "Join class", enters code, clicks Join
6. After joining once, no code re-entry needed on any device

### Alternative Methods
- **Invite link**: Teacher shares URL, student clicks and joins (must be signed in)
- **Email invite**: Teacher sends invite from within Classroom; student clicks Join in email or on dashboard
- **SIS roster sync**: Admin connects SIS (PowerSchool, Infinite Campus, Clever) via OneRoster API or CSV. Classes auto-created, students auto-enrolled
- **Domain auto-add**: Admin can pre-populate classes via Azure AD / Google Workspace directory groups

### Authentication
- **Required**: Google Workspace for Education account (school-managed)
- **Method**: Google OAuth (school email + password)
- **No passwordless option** for students

### Teacher Setup
- Create class > share code/link > or use SIS sync (admin-managed)

### Age/Grade Suitability
- Designed for all K-12 and higher ed
- Requires email/account, so younger students need school-managed accounts
- Under-13 accounts managed by school admin under Google Workspace for Education (COPPA-compliant via school consent)

### Pros
- Universal adoption (170M+ users globally)
- Deep integration with Google ecosystem (Docs, Drive, Meet)
- SIS roster sync eliminates manual enrollment
- Free with Google Workspace for Education

### Cons
- Requires Google account (barrier for schools not on Google ecosystem)
- No passwordless/QR option for young students
- Class code is session-agnostic (permanent until reset) -- security concern if leaked
- No anonymous participation option

---

## 2. Padlet (Real Product)

### Registration Flow (Step by Step)
**For anonymous board access:**
1. Teacher creates a padlet and sets visitor permissions to "Writer" or above
2. Teacher copies board link or generates QR code
3. Student opens link or scans QR -- immediately lands on board
4. Student can post anonymously without any login

**For identified access:**
1. Teacher creates padlet and enables "Require visitors to log in"
2. Student opens link, gets prompted to log in or create account
3. Student signs up with email, Google, Microsoft, or Apple
4. Posts display author's name

**For Padlet for Schools (organization):**
1. School admin sets up Padlet for Schools account
2. Enables SSO (Google, Microsoft, ClassLink, Clever, SAML)
3. Students auto-provisioned when they log in with school SSO credentials
4. Alternatively: admin uploads CSV with student list, or sends invite links

### Authentication Methods
- **No login required**: Visitor permissions allow anonymous read/write
- **Optional login**: Email/password, Google, Microsoft, Apple OAuth
- **Organization SSO**: Google, Microsoft, ClassLink, Clever, SAML 2.0
- **Password-protected boards**: Additional password layer on top of link access

### Privacy Levels (as of October 2025 update)
- **No access**: Only creator and invited collaborators
- **Reader**: View only
- **Commenter**: React and comment
- **Writer**: Create new posts
- **Moderator**: Edit padlet, approve/reject posts
- **Admin**: Full control

### QR Code Support
- Built-in QR code generator per board (Share menu > Get QR code)
- Downloads as PNG
- QR links to board URL -- not per-student
- Best for live sessions with mobile devices

### Bulk Enrollment
- CSV upload for Padlet for Schools
- ClassLink rostering (auto-sync)
- Clever SSO integration
- Invite links for self-service join

### Age/Grade Suitability
- Anonymous access works for any age (no account needed)
- Organization accounts can be configured for COPPA compliance
- Ideal for K-12 through higher ed

### Pros
- Zero-friction anonymous access (no signup barrier)
- Multiple sharing methods (link, QR, embed, LMS integration)
- LTI 1.3 integration with major LMSs (Canvas, Moodle, Schoology, Blackboard, itsLearning)
- Granular permission levels
- Works for any age group

### Cons
- Anonymous posts lose accountability
- QR codes are per-board, not per-student (no individual tracking via QR)
- Free tier limited (3 padlets per account as of 2025)
- Organization plans are paid ($99-$399/year)

---

## 3. ClassDojo

### Registration Flow (Step by Step)

**Class QR Code method (in-classroom, shared devices):**
1. Teacher displays Class QR code on projector/board
2. Student opens ClassDojo app or goes to dojo.me
3. Student scans Class QR code
4. Student selects their name from the class list
5. Student is logged into their account

**Individual QR Code method (1:1 devices, at-home):**
1. Teacher goes to class > clicks "Get Printouts"
2. Downloads PDF containing each student's unique QR code + individual link
3. Prints and distributes (one per student) or sends to parents digitally
4. Student scans their personal QR code
5. Student is directly logged into their personal account (no name selection needed)

**Text Code method (no camera):**
1. Teacher displays or shares 6-digit Class Text Code
2. Student goes to dojo.me, enters code
3. Student selects their name from class list
4. Code expires after 4 hours

**Google Login method:**
1. Teacher enables Google sign-in for the class
2. Student clicks "Log in with Google"
3. Student uses their Google email/password

**Individual Link method (1:1 computers):**
1. Teacher downloads/shares individual login links
2. Student bookmarks their unique link
3. Clicking link logs them directly into their account

### Authentication
- **Passwordless**: QR codes (class or individual), text codes
- **No email required** for QR/text code methods
- **Optional**: Google login, individual link
- **Parent toggle**: Parents can switch to child's account from their own app

### How QR Codes Work Technically
- **Class QR**: Encodes a URL that routes to the class; student must select name from list
- **Individual QR**: Encodes a unique URL with embedded authentication token; directly authenticates the student
- Each individual QR/link is generated server-side and tied to the student's account
- Teacher can regenerate codes if compromised
- Individual codes can also be shared as copyable links (for pasting into browser)
- PDF output: one page per student with QR code + text link + instructions

### Teacher Setup
1. Create class, add student names
2. Choose distribution method: "Get Printouts" (PDF download) or "Send to parents"
3. If sending to parents: ClassDojo messages all connected parents with their child's individual login info
4. If parent not connected: teacher can "Share another way" to copy/paste the info

### Age/Grade Suitability
- **Designed for K-8** (primary target: elementary)
- No email needed for young students
- QR codes perfect for pre-readers (just scan, no typing)
- Class QR + name selection works for shared iPad/Chromebook classrooms

### Pros
- Extremely low friction for young students (scan QR, done)
- Individual QR provides accountability without passwords
- Teacher controls account creation (no student self-signup)
- Free for teachers
- Parent connection built-in

### Cons
- Individual QR codes can be shared/photographed by other students (security risk)
- Class text codes expire after 4 hours (must regenerate for each session)
- No bulk CSV enrollment
- Primarily designed for behavior management, not content collaboration
- Limited to K-8 use case

---

## 4. Seesaw

### Registration Flow (Step by Step)

**Class QR Code Sign-In (PreK-3, shared devices):**
1. Teacher creates class and selects "Class Code" sign-in mode
2. System generates a class QR code and a 6-digit text code
3. Teacher displays QR code on screen or prints it
4. Student opens Seesaw app or app.seesaw.me
5. Student taps "I'm a Student", scans QR code (or enters 6-digit text code)
6. Student selects their name from the class list
7. Student can only add items to their own journal
8. Text codes valid for 1 hour; QR code valid longer

**Home Learning Codes (remote/at-home, individual):**
1. Teacher accesses Home Learning Codes from class settings
2. System generates per-student individualized QR code + 16-letter text code
3. Teacher downloads as PDF (one page per student) or CSV
4. Distributes to families (print, email, or LMS)
5. Student opens Seesaw app or app.seesaw.me
6. Taps "I'm a Student"
7. Scans individual QR code or enters 16-letter text code
8. Directly authenticated to their own account
9. Valid for up to 1 year
10. Students can only see their own work (cannot see classmates' work)

**Email/SSO Sign-In (older students):**
1. Teacher creates class and selects "Email/SSO" sign-in mode
2. Teacher provides a Join Code (text code, valid 7 days)
3. Student enters Join Code on first login only
4. Signs in with email or SSO (Google, Microsoft, Okta, ClassLink, Clever)
5. Stays connected to class; only needs SSO credentials going forward

### Authentication
- **Passwordless**: Class QR, text codes (6-digit and 16-letter)
- **No email required** for QR/code methods
- **SSO options**: Google, Microsoft, Okta, ClassLink, Clever
- Session persistence: up to 1 year

### Individual QR (Home Learning Codes) -- Technical Details
- Each student gets a unique QR code + 16-letter text code
- Available as PDF (one page per student) or CSV export
- Codes are valid for 1 year
- Students can have up to 50 valid Home Learning Codes
- When used at home, students CANNOT see other students' work (privacy isolation)
- Does not change classroom sign-in settings
- Teacher can regenerate if needed

### Teacher Setup
- Class setup wizard lets teacher choose sign-in mode
- Can switch between modes at any time
- Home Learning Codes downloadable as PDF or CSV
- Can generate for individual class or all classes at once

### Age/Grade Suitability
- **PreK-6** primary target
- QR code mode designed specifically for pre-readers
- Home Learning Codes designed for remote/home access without parental help
- Email/SSO mode for older students who can manage credentials

### Pros
- Best-in-class design for young students (PreK-3)
- Individual Home Learning Codes provide accountability + privacy
- 1-year validity reduces teacher maintenance burden
- Students cannot see each other's work when using Home Learning Codes (privacy)
- Multiple SSO options for older students
- Teacher can switch sign-in modes flexibly

### Cons
- 6-digit text codes expire after 1 hour (inconvenient for longer sessions)
- 16-letter text codes are long to type for young students (QR scan preferred)
- No direct bulk CSV enrollment of students (teacher adds names manually)
- Primarily portfolio-focused, not real-time collaboration

---

## 5. Kahoot

### Registration Flow (Step by Step)

**Live Game (teacher-paced):**
1. Teacher opens kahoot and clicks "Play" > "Teach" mode
2. System generates a 6-10 digit numerical PIN
3. Teacher displays PIN on projector
4. Student opens kahoot.it in browser or Kahoot app
5. Enters the game PIN
6. If nickname generator enabled: spins a wheel for random nickname (up to 3 spins)
7. If nickname generator disabled: types a nickname
8. Clicks "OK, go!" to join the lobby
9. No account, no email, no password needed

**Student-Paced Assignment:**
1. Teacher opens kahoot and clicks "Assign"
2. Sets deadline and optional settings (nickname generator, etc.)
3. System generates a PIN + shareable link + QR code
4. Teacher shares via link, PIN, or QR
5. Student joins using any method, enters nickname
6. Plays at their own pace before deadline

### Authentication
- **Zero authentication**: No account, no email, no login
- **Identification**: Nickname only (can be anonymous or real name)
- **Optional**: Teacher can enable nickname generator (random two-word combinations) to prevent inappropriate names
- **Player identifier**: Optional setting that links results to specific students

### Teacher Setup
- Create/select kahoot > Play or Assign
- Toggle nickname generator on/off
- Choose sharing method (display PIN, share link, QR code)
- For assignments: set deadline

### Age/Grade Suitability
- **All ages** (K-12, higher ed, corporate)
- Extremely simple for young students (enter numbers, pick name)
- Gamified interface appeals to all ages

### Pros
- Absolute lowest friction of all platforms (no account, 10 seconds to join)
- PIN is ephemeral (only valid during active session)
- QR code option for mobile users
- Nickname generator prevents inappropriate names
- Works on any device with a browser

### Cons
- Fully anonymous -- no persistent student identity
- PIN only valid during active game/assignment
- No way to track individual student progress across sessions (without Kahoot accounts)
- Results lost if teacher doesn't save them
- Game-only format -- not suitable for persistent classroom membership

---

## 6. Nearpod

### Registration Flow (Step by Step)

**Live Lesson (teacher-paced):**
1. Teacher launches lesson and selects "Live Participation" mode
2. System generates a 5-character alphanumeric code
3. Teacher displays code on screen
4. Student goes to nearpod.com/student or opens Nearpod app
5. Enters 5-character code
6. Either: validates name via Google/Microsoft SSO, OR clicks "Join as a Guest"
7. Student's device becomes synced to teacher's presentation

**Student-Paced Lesson:**
1. Teacher launches lesson and selects "Student-Paced" mode
2. Same 5-character code or shareable link generated
3. Student joins and progresses independently

### Authentication
- **No account required**: Guest join available
- **Optional name validation**: Teacher can require Google or Microsoft SSO to verify student identity
- If SSO name validation enabled, "Join as a Guest" option is hidden
- Only first name and last name stored (no other PII)

### Teacher Setup
- Launch lesson > share code
- Toggle "Enable student names to autofill" setting to require SSO verification
- Can hide student names from other students while keeping them in teacher reports
- Available via LMS integration (Canvas, Schoology, Google Classroom)

### Age/Grade Suitability
- **K-12** (all grades)
- Guest join works for any age
- SSO validation for schools with managed accounts

### Pros
- Very low friction (5-character code, no account)
- Optional identity verification via SSO without requiring Nearpod account
- Teacher can hide student names (anonymous for peers, identified for teacher)
- LMS integration available

### Cons
- Codes are per-lesson, not per-class (no persistent enrollment)
- No individual QR codes
- No bulk enrollment
- Ephemeral sessions (no persistent student membership)

---

## 7. Quizlet

### Registration Flow (Step by Step)
1. Teacher creates Quizlet account and creates a class (up to 8 free, unlimited with Teacher plan)
2. Teacher gets a join link for the class
3. Teacher shares join link with students
4. Student clicks link, is prompted to log in or create a Quizlet account
5. Student signs up with email + password (or Google/Apple sign-in)
6. Student clicks "Join Class" button
7. Alternatively: student can search for teacher's username > find class > "Request to join"

**Google Classroom Integration:**
1. Teacher connects Quizlet to Google Classroom
2. All students in Google Classroom get email with link to sign up/sign in and join Quizlet class

### Authentication
- **Account required**: Email + password or Google/Apple OAuth
- **Email required**: Yes
- No passwordless option
- No QR codes

### Teacher Setup
- Create class > share join link
- Or integrate with Google Classroom for automatic sync

### Age/Grade Suitability
- **13+ only** (requires email account)
- Not suitable for elementary students
- Best for middle school through college

### Pros
- Persistent class membership across the school year
- Google Classroom integration
- Study materials shared automatically with class members

### Cons
- Requires account creation (high friction)
- Email required (excludes young students)
- Age 13+ requirement
- No passwordless option
- No QR or code-based quick join
- Limited free tier (8 classes max)

---

## 8. Microsoft Teams for Education

### Registration Flow (Step by Step)

**Join Code method:**
1. Teacher creates a class team in Microsoft Teams
2. Gets a join code from team settings
3. Shares code with students
4. Student opens Teams, clicks "Join or create a team", enters code
5. Student must be signed in with school Microsoft 365 account

**Admin-Added method:**
1. Teacher opens class team settings
2. Clicks "Add member"
3. Types student names or email addresses
4. Students appear in class team on their next Teams login

**School Data Sync (SDS) -- bulk/automatic:**
1. IT admin sets up School Data Sync
2. Connects to SIS via OneRoster API or CSV upload
3. SDS creates Microsoft 365 Groups, class teams, and OneNote Class notebooks automatically
4. Students are auto-enrolled based on SIS roster data
5. Ongoing sync keeps rosters updated

**PowerShell/Graph API (programmatic):**
1. IT admin uses PowerShell scripts or Microsoft Graph API
2. Bulk creates teams and assigns memberships
3. Used for large-scale deployments

### Authentication
- **Required**: Microsoft 365 Education account (school-managed)
- **Method**: Microsoft/Azure AD SSO (school email + password)
- No passwordless option for students

### Teacher Setup
- Create class team > add students manually, via code, or rely on SDS auto-sync
- IT admin handles SDS configuration

### Age/Grade Suitability
- All K-12 and higher ed (with school-managed accounts)
- Under-13 accounts managed by school admin under Azure AD
- Not suitable for unmanaged/personal accounts

### Pros
- Deep integration with Microsoft 365 ecosystem
- School Data Sync automates everything at scale
- PowerShell/Graph API for programmatic management
- Built-in video conferencing, file sharing, assignments

### Cons
- Requires Microsoft 365 Education license (free but requires school registration)
- No passwordless/QR option
- Heavy IT admin dependency for initial setup
- Not suitable for ad-hoc/quick classroom creation
- High complexity for small deployments

---

## 9. Clever

### Registration Flow (Step by Step)

**For Schools (district-level):**
1. District admin connects SIS to Clever via Auto Sync or SFTP CSV upload
2. Clever normalizes roster data (students, teachers, sections, enrollments)
3. Applications integrated with Clever receive roster data via Clever API
4. Student accounts are auto-provisioned in all connected apps
5. Student goes to clever.com/login or school's Clever portal
6. Signs in with school credentials (SSO)
7. Sees dashboard of all connected apps
8. Clicks app icon -- automatically authenticated via Clever SSO

**For Younger Students (Clever Badges):**
1. District/teacher generates Clever Badges (QR-code style cards)
2. Printed and distributed to students
3. Student holds badge up to device camera
4. Automatically logged into Clever portal and all connected apps

**For Individual Teachers (Clever Library):**
1. Teacher finds app in Clever Library
2. Clicks "Get for my class"
3. Enters class info and student names
4. Students access via teacher-managed link
5. No district admin involvement needed

### Authentication
- **SSO**: District IdP (Google, Microsoft, SAML, LDAP, etc.)
- **Clever Badges**: QR-code cards for young students (no typing needed)
- **Instant Login Links**: Embeddable links that auto-authenticate
- **"Log in with Clever" button**: OAuth-style button on app websites

### Technical Architecture
- Acts as middleware between SIS and educational apps
- REST API with paginated responses (100 records/page)
- Data: districts, schools, users, sections, courses, terms, contacts/guardians
- Supports 100+ SIS systems
- OneRoster API standard support
- SFTP for SIS that don't have direct API integration
- 2 in 3 connections go live within 24 hours

### Integration Types
1. **Secure Sync**: Full roster data access (requires Clever Complete subscription)
2. **LMS Connect**: Roster + grade passback + LTI 1.3
3. **SSO Only**: Authentication with limited user profile data
4. **AnySchool Rostering**: For non-Clever schools
5. **Library**: Teacher-managed, no subscription needed

### Age/Grade Suitability
- **All K-12** (used by 110,000+ schools)
- Clever Badges specifically designed for pre-readers (K-2)
- SSO for all ages

### Pros
- Eliminates per-app enrollment entirely
- One-click access to all apps from single portal
- Clever Badges perfect for youngest students
- Scales to entire districts (thousands of students)
- Free for schools
- Standardizes data format across diverse SIS systems

### Cons
- Requires district-level buy-in and IT admin setup
- App developers must integrate Clever API (development cost)
- Paid for app partners
- Not suitable for ad-hoc classroom creation by individual teachers
- Dependency on Clever as middleman
- Data sync delays possible (usually same-day)

---

## 10. Korean Platforms

### Classting (클래스팅)

**Registration Flow:**
1. School admin enables "학생 아이디 가입" (student ID signup) feature
2. Teacher creates a class (클래스) in Classting
3. Teacher generates class invite code (클래스 초대 코드)
4. Teacher distributes invite code to students/parents
5. Student installs Classting app
6. Student enters student code (학생코드) to authenticate
7. Student creates an account with an ID (username) -- **no email required**
8. Student enters class invite code to join the class

**Authentication:**
- Student code (학생코드) issued by teacher -- verifies identity without email
- Username + password (email not required)
- No SSO options

**Stats:** 8.9M+ cumulative users, 3,500+ schools (as of 2025)

**Age/Grade Suitability:** K-12 (Korea)

**Pros:** No email needed, Korean-language native, AI-powered LMS features
**Cons:** Korea-only ecosystem, no international SSO, limited API

### HiClass (하이클래스 by i-Scream Media)

**Registration Flow:**
1. Teacher creates student accounts (아이디/비밀번호) in HiClass system
2. Teacher distributes IDs and passwords to students
3. Student goes to hiclass.net or opens HiClass app
4. Student clicks "학생로그인" (Student Login)
5. Selects "선생님이 만들어주신 아이디로 시작하기" (Start with teacher-created ID)
6. Enters ID and password

**Alternative:** Student can search for school and teacher to request class join via app

**Authentication:**
- Teacher-created username + password
- No email required
- No SSO

**Age/Grade Suitability:** Elementary school (초등학교) -- Korea

**Pros:** No email needed, teacher controls all accounts, simple for young students
**Cons:** Teacher must manually create each account, Korea-only, no QR/passwordless option

---

## 11. COPPA/FERPA Compliance for Student Registration

### COPPA (Children's Online Privacy Protection Act)

**Key Requirements (updated 2025):**
- Applies to children under 13
- Requires verifiable parental consent before collecting personal information
- 2025 amendments shifted default from opt-out to **opt-in consent**
- Now covers biometric identifiers (voiceprints, facial recognition)
- Full compliance required by **April 22, 2026**
- Requires formal, written security programs

**School Consent Exception (Critical for EdTech):**
- Schools CAN consent on behalf of parents in educational context
- Limited to educational use only (cannot use data for advertising)
- Operator must provide school with all COPPA-required notices
- School must be able to review, delete, and prevent further collection
- This is how most EdTech apps operate legally with under-13 students

**Verifiable Consent Methods:**
- Must be "reasonably calculated" to ensure the consenting person is the parent/educator
- Methods: signed consent form, credit card verification, video call, knowledge-based authentication
- Schools acting as agents can use simpler verification (institutional authority)

### FERPA (Family Educational Rights and Privacy Act)

**Key Requirements:**
- Applies to educational institutions receiving federal funding
- Protects education records
- Parents/eligible students have right to access and request correction
- Schools need written consent before disclosing PII from education records
- **"School official" exception**: schools can share with EdTech vendors if they have "legitimate educational interest" and are under school's control
- Requires data security and breach notification

### Best Practices for EdTech Registration

1. **Minimize PII collection**: Collect only what's needed (name, grade -- not address, SSN)
2. **School consent pathway**: Let schools/teachers create accounts (school acts as parent's agent)
3. **No direct child registration**: Don't let under-13 students self-register without school/parent involvement
4. **Data Privacy Agreements**: Sign DPAs with each school/district
5. **Passwordless options**: Reduce PII collection by using QR codes, access codes instead of email/password
6. **Data retention limits**: Delete data when no longer needed for educational purpose
7. **Transparency**: Privacy policy in clear language, accessible to parents
8. **Security**: AES-256 encryption, formal security program, designated security coordinators
9. **Safe Harbor certification**: Consider iKeepSafe or other COPPA Safe Harbor programs

---

## 12. Cross-Platform Analysis: Registration Method Taxonomy

### Method 1: Ephemeral Session Codes (Kahoot, Nearpod pattern)
- **How**: Teacher generates temporary code; student enters code + nickname
- **Duration**: Single session only
- **Identity**: Anonymous or self-reported nickname
- **Account**: None
- **Best for**: Quick engagement activities, polls, quizzes
- **Implementation complexity**: Low
- **COPPA risk**: Minimal (no PII collected)

### Method 2: Shared Class Code/QR (ClassDojo class QR, Seesaw class QR pattern)
- **How**: Teacher displays one code/QR for entire class; student scans and picks name
- **Duration**: Class-level persistence
- **Identity**: Student selects from pre-populated name list
- **Account**: Minimal (teacher pre-registers names)
- **Best for**: Shared device classrooms, young students
- **Implementation complexity**: Low-Medium
- **COPPA risk**: Low (school consent, minimal PII)

### Method 3: Individual QR/Code per Student (ClassDojo individual QR, Seesaw Home Learning Code pattern)
- **How**: Each student gets unique QR code or text code that directly authenticates them
- **Duration**: Long-lived (weeks to 1 year)
- **Identity**: Verified (linked to specific student account)
- **Account**: Teacher-created, student uses token
- **Best for**: 1:1 devices, at-home access, young students
- **Implementation complexity**: Medium
- **COPPA risk**: Low (school consent, teacher manages accounts)

### Method 4: Link + Anonymous Access (Padlet pattern)
- **How**: Teacher shares board link; anyone with link can participate
- **Duration**: Persistent (board lifetime)
- **Identity**: Anonymous or optional login
- **Account**: None required
- **Best for**: Open collaboration, brainstorming, any age
- **Implementation complexity**: Low
- **COPPA risk**: Minimal if truly anonymous

### Method 5: Account-Based Join (Google Classroom, Quizlet, MS Teams pattern)
- **How**: Student has managed account, joins via code/link/invite
- **Duration**: Persistent (semester/year)
- **Identity**: Fully identified
- **Account**: Required (school-managed or self-created)
- **Best for**: Formal coursework, graded assignments, older students
- **Implementation complexity**: Medium-High
- **COPPA risk**: Moderate (requires school consent for under-13, or parental consent)

### Method 6: Rostering/SSO Middleware (Clever, SDS pattern)
- **How**: District SIS syncs roster data to apps via API; students auto-provisioned
- **Duration**: Persistent (school year)
- **Identity**: Fully identified
- **Account**: Auto-created from SIS data
- **Best for**: District-wide deployments, eliminating per-app enrollment
- **Implementation complexity**: High
- **COPPA risk**: Low (school consent via DPA)

---

## 13. Individual QR Code Per Student -- Deep Dive

This is the ClassDojo/Seesaw pattern that deserves special attention for our Padlet clone.

### How It Works Technically

1. **Account Creation**: Teacher creates class and adds student names (first name only, or first + last)
2. **Token Generation**: Server generates a unique, cryptographically random token per student (e.g., UUID v4 or similar)
3. **URL Construction**: Token is embedded in a URL (e.g., `https://app.example.com/login?token=abc123xyz`)
4. **QR Encoding**: URL is encoded as a QR code using standard QR library
5. **PDF Generation**: System creates a PDF with one page per student containing:
   - Student name
   - QR code image
   - Text version of the URL or code
   - Instructions for parents
6. **Distribution**: Teacher downloads PDF, prints, and cuts/distributes to students
7. **Authentication**: When student scans QR or visits URL, server validates token and creates an authenticated session
8. **Session Persistence**: Session cookie/token stored on device, valid for extended period (days to 1 year)

### Security Considerations
- Tokens should be long enough to prevent brute-force (128+ bits of entropy)
- Tokens should be revocable (teacher can regenerate)
- Tokens should be rate-limited on validation endpoint
- Physical QR code printouts are the main security risk (can be photographed/shared)
- Mitigations: limit concurrent sessions, notify teacher of unusual login patterns
- Do NOT embed PII in the QR code itself -- only a token that maps to the account server-side

### Implementation for Our Padlet Clone

**Minimal Implementation:**
```
1. Teacher creates board + adds student roster (names only)
2. System generates UUID token per student
3. System generates QR codes (use `qrcode` npm package)
4. System generates printable PDF (use `@react-pdf/renderer` or `pdfkit`)
5. Teacher downloads, prints, distributes
6. Student scans QR -> GET /auth/token/:token -> set session cookie -> redirect to board
7. Board shows student's name on their posts
```

**Database Schema (conceptual):**
```
student_tokens {
  id: uuid
  board_id: uuid
  student_name: string
  token: string (unique, indexed)
  created_at: timestamp
  expires_at: timestamp
  last_used_at: timestamp
  is_active: boolean
}
```

---

## 14. Passwordless Methods for Young Students (K-6) -- Summary

| Method | Typing Required | Camera Required | Age Suitability | Persistence | Privacy |
|--------|----------------|-----------------|-----------------|-------------|---------|
| Class QR scan | No | Yes | PreK+ | Session | Shared class |
| Individual QR scan | No | Yes | PreK+ | Long-term | Individual |
| 6-digit code | Minimal | No | K+ | Session | Shared class |
| 16-letter code | Moderate | No | 3rd grade+ | Long-term | Individual |
| Game PIN (numbers) | Minimal | No | K+ | Session | Anonymous |
| Clever Badges | No | Yes | PreK+ | Long-term | Individual |
| Teacher-created ID/PW | Moderate | No | 3rd grade+ | Long-term | Individual |
| Link click (bookmarked) | No | No | Any | Long-term | Individual |

---

## 15. Bulk Enrollment Methods -- Summary

| Method | Platforms Using It | Scale | Setup Effort | Maintenance |
|--------|-------------------|-------|-------------|-------------|
| CSV upload | Padlet, MS Teams (SDS), Discovery Ed | Medium-Large | Medium | Manual re-upload |
| SIS API sync (OneRoster) | Google Classroom, MS Teams, Clever | Large (district) | High initial | Auto-maintained |
| SFTP CSV sync | Clever | Large (district) | Medium | Semi-auto |
| Google Classroom sync | Quizlet, various apps | Medium | Low | Auto |
| ClassLink rostering | Padlet, Seesaw, others | Large | Medium | Auto |
| Clever rostering | Padlet, Seesaw, hundreds of apps | Large | Medium | Auto |
| Manual add (teacher types names) | ClassDojo, Seesaw, most apps | Small | Low | Manual |
| Invite link (self-join) | Padlet, Quizlet, most apps | Medium | Low | Self-service |
| Azure AD / Google Workspace groups | MS Teams, Google Classroom | Large | Medium | Admin-managed |
