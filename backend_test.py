#!/usr/bin/env python3
"""
SMARTREP Portal API Backend Testing Script
Tests all major backend endpoints with different user roles
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://custorbit-1.preview.emergentagent.com/api"

# Test credentials from review request
TEST_USERS = {
    'admin': {'email': 'admin@smartrep.dk', 'password': 'admin123'},
    'customer': {'email': 'kunde@huscompagniet.dk', 'password': 'admin123'},
    'technician': {'email': 'tekniker@smartrep.dk', 'password': 'admin123'}
}

class APITester:
    def __init__(self):
        self.tokens = {}
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_login(self, role):
        """Test login for specific role"""
        try:
            user_creds = TEST_USERS[role]
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=user_creds,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    self.tokens[role] = data['token']
                    user_info = data['user']
                    self.log_result(
                        f"Login ({role})",
                        True,
                        f"Successfully logged in as {user_info.get('name', 'Unknown')}",
                        f"Role: {user_info.get('role')}, Email: {user_info.get('email')}"
                    )
                    return True
                else:
                    self.log_result(f"Login ({role})", False, "Missing token or user in response", str(data))
                    return False
            else:
                self.log_result(f"Login ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Login ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_auth_me(self, role):
        """Test GET /api/auth/me endpoint"""
        if role not in self.tokens:
            self.log_result(f"Auth Me ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/auth/me",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                user_data = response.json()
                self.log_result(
                    f"Auth Me ({role})",
                    True,
                    f"Retrieved user info for {user_data.get('name', 'Unknown')}",
                    f"Role: {user_data.get('role')}, ID: {user_data.get('id')}"
                )
                return True
            else:
                self.log_result(f"Auth Me ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Auth Me ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_tasks(self, role):
        """Test GET /api/tasks endpoint"""
        if role not in self.tokens:
            self.log_result(f"Tasks ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/tasks",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                tasks = response.json()
                self.log_result(
                    f"Tasks ({role})",
                    True,
                    f"Retrieved {len(tasks)} tasks",
                    f"First task: {tasks[0].get('taskNumber') if tasks else 'No tasks'}"
                )
                return True
            else:
                self.log_result(f"Tasks ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Tasks ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_task_counts(self, role):
        """Test GET /api/tasks/counts endpoint"""
        if role not in self.tokens:
            self.log_result(f"Task Counts ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/tasks/counts",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                counts = response.json()
                total = counts.get('total', 0)
                self.log_result(
                    f"Task Counts ({role})",
                    True,
                    f"Retrieved task counts - Total: {total}",
                    f"New: {counts.get('new', 0)}, Active: {counts.get('active', 0)}, Completed: {counts.get('completed', 0)}"
                )
                return True
            else:
                self.log_result(f"Task Counts ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Task Counts ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_companies(self, role):
        """Test GET /api/companies endpoint (admin only)"""
        if role not in self.tokens:
            self.log_result(f"Companies ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/companies",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if role == 'admin':
                if response.status_code == 200:
                    companies = response.json()
                    self.log_result(
                        f"Companies ({role})",
                        True,
                        f"Retrieved {len(companies)} companies",
                        f"First company: {companies[0].get('name') if companies else 'No companies'}"
                    )
                    return True
                else:
                    self.log_result(f"Companies ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                    return False
            else:
                # Non-admin users should get 401
                if response.status_code == 401:
                    self.log_result(
                        f"Companies ({role})",
                        True,
                        "Correctly denied access (401)",
                        "Non-admin user properly restricted"
                    )
                    return True
                else:
                    self.log_result(f"Companies ({role})", False, f"Expected 401, got {response.status_code}", response.text[:200])
                    return False
                
        except Exception as e:
            self.log_result(f"Companies ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_contacts(self, role):
        """Test GET /api/contacts endpoint"""
        if role not in self.tokens:
            self.log_result(f"Contacts ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/contacts",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                contacts = response.json()
                self.log_result(
                    f"Contacts ({role})",
                    True,
                    f"Retrieved {len(contacts)} contacts",
                    f"First contact: {contacts[0].get('name') if contacts else 'No contacts'}"
                )
                return True
            else:
                self.log_result(f"Contacts ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Contacts ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_photoreports_get(self, role):
        """Test GET /api/photoreports endpoint"""
        if role not in self.tokens:
            self.log_result(f"Photo Reports GET ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/photoreports",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                reports = response.json()
                self.log_result(
                    f"Photo Reports GET ({role})",
                    True,
                    f"Retrieved {len(reports)} photo reports",
                    f"First report: {reports[0].get('id') if reports else 'No reports'}"
                )
                return True
            else:
                self.log_result(f"Photo Reports GET ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Photo Reports GET ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_photoreports_post(self, role):
        """Test POST /api/photoreports endpoint"""
        if role not in self.tokens:
            self.log_result(f"Photo Reports POST ({role})", False, "No token available", "Login first")
            return False
            
        try:
            # Create a test photo report
            test_report = {
                "taskId": "test-task-id",
                "companyId": "test-company-id",
                "damages": [
                    {
                        "id": "damage-1",
                        "part": "aluprofil",
                        "quantity": 1,
                        "color": "granit_70",
                        "location": "stue",
                        "notes": "Test damage report"
                    }
                ],
                "notes": "Test photo report created by automated testing"
            }
            
            response = requests.post(
                f"{BASE_URL}/photoreports",
                json=test_report,
                headers={
                    'Authorization': f'Bearer {self.tokens[role]}',
                    'Content-Type': 'application/json'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                report = response.json()
                self.log_result(
                    f"Photo Reports POST ({role})",
                    True,
                    f"Created photo report with ID: {report.get('id')}",
                    f"Status: {report.get('status')}, Created by: {report.get('createdByName')}"
                )
                return True
            else:
                self.log_result(f"Photo Reports POST ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Photo Reports POST ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_options(self, role):
        """Test GET /api/options endpoint"""
        if role not in self.tokens:
            self.log_result(f"Options ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/options",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                options = response.json()
                building_parts = len(options.get('buildingParts', []))
                colors = len(options.get('colors', []))
                locations = len(options.get('locations', []))
                
                self.log_result(
                    f"Options ({role})",
                    True,
                    "Retrieved dropdown options successfully",
                    f"Building parts: {building_parts}, Colors: {colors}, Locations: {locations}"
                )
                return True
            else:
                self.log_result(f"Options ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Options ({role})", False, "Exception occurred", str(e))
            return False
    
    def test_dashboard(self, role):
        """Test GET /api/dashboard endpoint"""
        if role not in self.tokens:
            self.log_result(f"Dashboard ({role})", False, "No token available", "Login first")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/dashboard",
                headers={'Authorization': f'Bearer {self.tokens[role]}'},
                timeout=10
            )
            
            if response.status_code == 200:
                stats = response.json()
                total_tasks = stats.get('totalTasks', 0)
                active_tasks = stats.get('activeTasks', 0)
                completed_tasks = stats.get('completedTasks', 0)
                
                self.log_result(
                    f"Dashboard ({role})",
                    True,
                    "Retrieved dashboard stats successfully",
                    f"Total: {total_tasks}, Active: {active_tasks}, Completed: {completed_tasks}"
                )
                return True
            else:
                self.log_result(f"Dashboard ({role})", False, f"HTTP {response.status_code}", response.text[:200])
                return False
                
        except Exception as e:
            self.log_result(f"Dashboard ({role})", False, "Exception occurred", str(e))
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 80)
        print("SMARTREP Portal API Backend Testing")
        print("=" * 80)
        print(f"Base URL: {BASE_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print()
        
        # Test login for all roles first
        print("🔐 AUTHENTICATION TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_login(role)
        print()
        
        # Test auth/me for all roles
        print("👤 USER INFO TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_auth_me(role)
        print()
        
        # Test tasks endpoints
        print("📋 TASKS TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_tasks(role)
            self.test_task_counts(role)
        print()
        
        # Test companies (admin only)
        print("🏢 COMPANIES TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_companies(role)
        print()
        
        # Test contacts
        print("👥 CONTACTS TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_contacts(role)
        print()
        
        # Test photo reports
        print("📸 PHOTO REPORTS TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_photoreports_get(role)
            self.test_photoreports_post(role)
        print()
        
        # Test options
        print("⚙️ OPTIONS TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_options(role)
        print()
        
        # Test dashboard
        print("📊 DASHBOARD TESTS")
        print("-" * 40)
        for role in TEST_USERS.keys():
            self.test_dashboard(role)
        print()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            print("-" * 40)
            for result in self.test_results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['message']}")
                    if result['details']:
                        print(f"   {result['details']}")
            print()
        
        print(f"Test completed at: {datetime.now().isoformat()}")
        print("=" * 80)
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = APITester()
    try:
        tester.run_all_tests()
        passed, failed = tester.print_summary()
        
        # Exit with error code if any tests failed
        sys.exit(1 if failed > 0 else 0)
        
    except KeyboardInterrupt:
        print("\n\nTesting interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error during testing: {e}")
        sys.exit(1)