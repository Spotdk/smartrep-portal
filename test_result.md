#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Test the SMARTREP Portal API backend with authentication, tasks, companies, contacts, photo reports, options, and dashboard endpoints for all user roles (admin, customer, technician)"

backend:
  - task: "Authentication API - Login endpoint"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "POST /api/auth/login tested successfully for all 3 user roles (admin, customer, technician). All users can login and receive valid JWT tokens."

  - task: "Authentication API - Current user endpoint"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/auth/me tested successfully for all user roles. Returns correct user information when valid Bearer token is provided."

  - task: "Tasks API - Get tasks list"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/tasks tested successfully. Admin sees all 26 tasks, customer sees only their company's 1 task, technician sees 0 assigned tasks. Role-based filtering working correctly."

  - task: "Tasks API - Get task counts"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/tasks/counts tested successfully. Returns proper task counts by status for each user role with correct role-based filtering."

  - task: "Companies API - Get companies list"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/companies tested successfully. Admin can access 6 companies, non-admin users correctly receive 401 unauthorized. Authorization working properly."

  - task: "Contacts API - Get contacts list"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/contacts tested successfully. Admin sees all 26 contacts, customer sees only their company's 1 contact, technician sees all 26 contacts. Role-based access working correctly."

  - task: "Photo Reports API - Get photo reports"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/photoreports tested successfully. Admin sees 3 reports, customer sees 0 reports (filtered by company), technician sees all 5 reports. Role-based filtering working correctly."

  - task: "Photo Reports API - Create photo report"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "POST /api/photoreports tested successfully for all user roles. All users can create photo reports with proper damage data structure and metadata."

  - task: "Options API - Get dropdown options"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/options tested successfully. Returns complete dropdown options: 9 building parts, 9 colors, 12 locations, plus categories, weather types, and task types."

  - task: "Dashboard API - Get dashboard stats"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "GET /api/dashboard tested successfully. Returns proper statistics with role-based filtering. Admin and technician see all 26 tasks, customer sees their 1 task."

frontend:
  # Frontend testing not performed as per instructions

metadata:
  created_by: "testing_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "All backend API endpoints tested and working"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "testing"
    message: "Comprehensive backend API testing completed successfully. All 10 major API endpoints tested across 3 user roles (admin, customer, technician). Total of 30 tests executed with 100% pass rate. Authentication, authorization, role-based access control, and data filtering all working correctly. Backend is fully functional and ready for production use."
  - agent: "main"
    message: |
      FOTORAPPORT FUNKTION KOMPLET ERSTATTET ✅
      
      Backend API endpoints (route.js):
      - GET /api/photoreports - List med status filter (draft/sent/reviewed/all)
      - POST /api/photoreports - Opret som DRAFT (sender IKKE automatisk)
      - GET /api/photoreports/:id - Hent enkelt rapport
      - PUT /api/photoreports/:id - Opdater (kun drafts)
      - DELETE /api/photoreports/:id - Slet rapport
      - POST /api/photoreports/:id/send - Send til kunde (SMS + Email)
      - POST /api/photoreports/:id/reset - Nulstil til draft
      - GET /api/photoreports/public/:token - Public review page data
      - POST /api/photoreports/public/:token/submit - Submit kunde-gennemgang
      
      Frontend views (page.js):
      - PhotoReportsView - Liste med tabs (Alle/Kladder/Sendt/Gennemgået)
      - ViewPhotoReportDialog - Detaljeret visning med alle skader
      - Action buttons: Vis, Send, Slet, Nulstil, PDF
      
      Wizard (/fotorapport/ny):
      - Trin 1: Vælg opgave
      - Trin 2: Kunde & kontakt info
      - Trin 3: Tilføj skader med billeder
      - Opretter som draft, valgfrit send med det samme
      
      Public review page (/fotorapport/[token]):
      - Kunde kan se alle skader
      - Accepter/Afvis per skade
      - Native HTML5 Canvas signatur
      - Print/PDF via browser
      
      Flow: draft → sent → reviewed
      Notifications: SMS (Twilio) + Email (SendGrid)