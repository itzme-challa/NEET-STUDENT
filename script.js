import { 
  auth, 
  database,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  ref, 
  set, 
  get, 
  update, 
  remove, 
  push, 
  child 
} from './firebase.js';

// DOM Elements
const profileSection = document.getElementById('profileSection');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const toggleAuth = document.getElementById('toggleAuth');
const toggleText = document.getElementById('toggleText');
const nameLabel = document.getElementById('nameLabel');
const nameInput = document.getElementById('name');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const profileView = document.getElementById('profileView');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');

// Global Variables
let currentUser = null;
let chaptersData = {};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  // Load chapters data
  await loadChaptersData();
  
  // Check auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      updateUIForLoggedInUser();
      loadUserData();
    } else {
      currentUser = null;
      updateUIForLoggedOutUser();
    }
  });
  
  // Initialize page specific scripts
  const path = window.location.pathname.split('/').pop();
  if (path === 'index.html' || path === '') {
    initDashboard();
  } else if (path === 'practice.html') {
    initPracticePage();
  } else if (path === 'testAnalysis.html') {
    initTestAnalysisPage();
  } else if (path === 'plan.html') {
    initPlanPage();
  } else if (path === 'track.html') {
    initTrackPage();
  } else if (path === 'profile.html') {
    initProfilePage();
  }
});

// Utility Functions
function showAlert(message, isSuccess = true) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

async function loadChaptersData() {
  try {
    const response = await fetch('chapters.json');
    chaptersData = await response.json();
    console.log('Chapters data loaded:', chaptersData);
  } catch (error) {
    console.error('Error loading chapters data:', error);
    showAlert('Failed to load chapters data', false);
  }
}

// Auth Functions
function updateUIForLoggedInUser() {
  // Update profile section in all pages
  if (profileSection) {
    profileSection.innerHTML = `
      <span class="profile-name">${currentUser.displayName || 'User'}</span>
      <a href="profile.html" class="login-btn">Profile</a>
    `;
  }
  
  // Update profile page
  if (profileView) {
    profileView.style.display = 'block';
    loginForm.style.display = 'none';
    profileName.textContent = currentUser.displayName || 'User';
    profileEmail.textContent = currentUser.email;
  }
}

function updateUIForLoggedOutUser() {
  // Update profile section in all pages
  if (profileSection) {
    profileSection.innerHTML = '<a href="profile.html" class="login-btn">Login</a>';
  }
  
  // Update profile page
  if (profileView) {
    profileView.style.display = 'none';
    loginForm.style.display = 'block';
  }
}

// Toggle between login and signup
if (toggleAuth) {
  toggleAuth.addEventListener('click', () => {
    const isLogin = loginBtn.style.display !== 'none';
    
    if (isLogin) {
      // Switch to signup
      loginBtn.style.display = 'none';
      signupBtn.style.display = 'block';
      nameLabel.style.display = 'block';
      nameInput.style.display = 'block';
      toggleText.textContent = 'Already have an account?';
      toggleAuth.textContent = 'Login';
    } else {
      // Switch to login
      loginBtn.style.display = 'block';
      signupBtn.style.display = 'none';
      nameLabel.style.display = 'none';
      nameInput.style.display = 'none';
      toggleText.textContent = 'Don\'t have an account?';
      toggleAuth.textContent = 'Sign Up';
    }
    
    authError.textContent = '';
  });
}

// Login function
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showAlert('Login successful!');
      authError.textContent = '';
    } catch (error) {
      console.error('Login error:', error);
      authError.textContent = error.message;
      showAlert('Login failed: ' + error.message, false);
    }
  });
}

// Signup function
if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      // Create user data in database
      await set(ref(database, `users/${userCredential.user.uid}/profile`), {
        name: name,
        email: email,
        createdAt: new Date().toISOString()
      });
      
      showAlert('Account created successfully!');
      authError.textContent = '';
    } catch (error) {
      console.error('Signup error:', error);
      authError.textContent = error.message;
      showAlert('Signup failed: ' + error.message, false);
    }
  });
}

// Logout function
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showAlert('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      showAlert('Logout failed: ' + error.message, false);
    }
  });
}

// Load user data from Firebase
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}`));
    if (snapshot.exists()) {
      const userData = snapshot.val();
      console.log('User data loaded:', userData);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    showAlert('Failed to load user data', false);
  }
}

// Page Specific Functions
function initDashboard() {
  if (!currentUser) return;
  
  // Load weekly plans
  loadWeeklyPlans();
  
  // Load recent tests
  loadRecentTests();
  
  // Load practice sessions
  loadPracticeSessions();
}

function initPracticePage() {
  const practiceType = document.getElementById('practiceType');
  const subjectSelectionWrapper = document.getElementById('subjectSelectionWrapper');
  const singleChapterSelection = document.getElementById('singleChapterSelection');
  const multipleChapterSelection = document.getElementById('multipleChapterSelection');
  const subjectSelect = document.getElementById('subject');
  const savePracticeBtn = document.getElementById('savePractice');

  // Set today's date as default
  document.getElementById('date').valueAsDate = new Date();

  practiceType.addEventListener('change', () => {
    const value = practiceType.value;
    
    // Show/hide sections based on selection
    subjectSelectionWrapper.style.display = ['chapter', 'multiple', 'subject'].includes(value) ? 'block' : 'none';
    singleChapterSelection.style.display = value === 'chapter' ? 'block' : 'none';
    multipleChapterSelection.style.display = value === 'multiple' ? 'block' : 'none';
    
    // Clear previous selections
    if (value !== 'chapter') document.getElementById('chapter').value = '';
    if (value !== 'multiple') {
      const checkboxes = document.querySelectorAll('#chaptersChecklist input[type="checkbox"]');
      checkboxes.forEach(checkbox => checkbox.checked = false);
    }
    if (!['chapter', 'multiple', 'subject'].includes(value)) subjectSelect.value = '';
  });

  subjectSelect.addEventListener('change', () => {
    const subject = subjectSelect.value;
    const practiceTypeValue = practiceType.value;
    
    if (practiceTypeValue === 'chapter') {
      loadChaptersForSubject(subject, 'chapter');
    } else if (practiceTypeValue === 'multiple') {
      loadChaptersChecklist(subject);
    }
  });

  if (savePracticeBtn) {
    savePracticeBtn.addEventListener('click', savePracticeSession);
  }
  
  // Load practice history if on practice page
  if (document.getElementById('practiceHistory')) {
    loadPracticeHistory();
    document.getElementById('practiceHistory').style.display = 'block';
  }
}

async function savePracticeSession() {
  if (!currentUser) {
    showAlert('Please login to save your practice session', false);
    return;
  }
  
  const practiceType = document.getElementById('practiceType').value;
  const questionsAttempted = parseInt(document.getElementById('questionsAttempted').value) || 0;
  const correct = parseInt(document.getElementById('correct').value) || 0;
  const incorrect = parseInt(document.getElementById('incorrect').value) || 0;
  const missed = parseInt(document.getElementById('missed').value) || 0;
  
  if (!practiceType) {
    showAlert('Please select a practice type', false);
    return;
  }
  
  if (questionsAttempted === 0) {
    showAlert('Please enter the number of questions attempted', false);
    return;
  }
  
  if ((correct + incorrect + missed) > questionsAttempted) {
    showAlert('The sum of correct, incorrect and missed questions cannot exceed total questions attempted', false);
    return;
  }
  
  const practiceData = {
    type: practiceType,
    date: document.getElementById('date').value,
    questionsAttempted: questionsAttempted,
    correct: correct,
    incorrect: incorrect,
    missed: missed,
    mistakes: document.getElementById('mistakes').value || '',
    createdAt: new Date().toISOString()
  };
  
  // Add subject/chapter data based on type
  switch(practiceType) {
    case 'chapter':
      practiceData.subject = document.getElementById('subject').value;
      practiceData.chapter = document.getElementById('chapter').value;
      if (!practiceData.chapter) {
        showAlert('Please select a chapter', false);
        return;
      }
      break;
      
    case 'multiple':
      practiceData.subject = document.getElementById('subject').value;
      const checkedChapters = Array.from(
        document.querySelectorAll('#chaptersChecklist input:checked')
      ).map(el => el.value);
      practiceData.chapters = checkedChapters;
      if (checkedChapters.length === 0) {
        showAlert('Please select at least one chapter', false);
        return;
      }
      break;
      
    case 'subject':
      practiceData.subject = document.getElementById('subject').value;
      if (!practiceData.subject) {
        showAlert('Please select a subject', false);
        return;
      }
      break;
      
    case 'syllabus':
      // No additional data needed
      break;
  }
  
  try {
    const newPracticeRef = push(ref(database, `users/${currentUser.uid}/practiceSessions`));
    await set(newPracticeRef, practiceData);
    showAlert('Practice session saved successfully!');
    resetPracticeForm();
    loadPracticeHistory();
  } catch (error) {
    console.error('Error saving practice session:', error);
    showAlert('Failed to save practice session: ' + error.message, false);
  }
}

function resetPracticeForm() {
  document.getElementById('practiceType').value = '';
  document.getElementById('subjectSelectionWrapper').style.display = 'none';
  document.getElementById('singleChapterSelection').style.display = 'none';
  document.getElementById('multipleChapterSelection').style.display = 'none';
  document.getElementById('subject').value = '';
  document.getElementById('chapter').value = '';
  document.querySelectorAll('#chaptersChecklist input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  document.getElementById('questionsAttempted').value = '';
  document.getElementById('correct').value = '';
  document.getElementById('incorrect').value = '';
  document.getElementById('missed').value = '';
  document.getElementById('mistakes').value = '';
}

function loadChaptersForSubject(subject, targetElementId) {
  if (!chaptersData) return;
  
  const chapterSelect = document.getElementById(targetElementId);
  chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
  
  let chapters = [];
  if (subject === 'physics') {
    chapters = chaptersData.physics;
  } else if (subject === 'botany') {
    chapters = chaptersData.botany;
  } else if (subject === 'zoology') {
    chapters = chaptersData.zoology;
  } else if (subject === 'chemistry') {
    chapters = [
      ...chaptersData.chemistry.physical,
      ...chaptersData.chemistry.inorganic,
      ...chaptersData.chemistry.organic
    ];
  }
  
  chapters.forEach(chapter => {
    const option = document.createElement('option');
    option.value = chapter;
    option.textContent = chapter;
    chapterSelect.appendChild(option);
  });
}

function loadChaptersChecklist(subject) {
  if (!chaptersData) return;
  
  const checklist = document.getElementById('chaptersChecklist');
  checklist.innerHTML = '';
  
  let chapters = [];
  if (subject === 'physics') {
    chapters = chaptersData.physics;
  } else if (subject === 'botany') {
    chapters = chaptersData.botany;
  } else if (subject === 'zoology') {
    chapters = chaptersData.zoology;
  } else if (subject === 'chemistry') {
    checklist.innerHTML = `
      <h4>Physical Chemistry</h4>
      ${chaptersData.chemistry.physical.map(chapter => `
        <div class="checklist-item">
          <label>
            <input type="checkbox" value="${chapter}">
            ${chapter}
          </label>
        </div>
      `).join('')}
      <h4>Inorganic Chemistry</h4>
      ${chaptersData.chemistry.inorganic.map(chapter => `
        <div class="checklist-item">
          <label>
            <input type="checkbox" value="${chapter}">
            ${chapter}
          </label>
        </div>
      `).join('')}
      <h4>Organic Chemistry</h4>
      ${chaptersData.chemistry.organic.map(chapter => `
        <div class="checklist-item">
          <label>
            <input type="checkbox" value="${chapter}">
            ${chapter}
          </label>
        </div>
      `).join('')}
    `;
    return;
  }
  
  chapters.forEach(chapter => {
    const item = document.createElement('div');
    item.className = 'checklist-item';
    item.innerHTML = `
      <label>
        <input type="checkbox" value="${chapter}">
        ${chapter}
      </label>
    `;
    checklist.appendChild(item);
  });
}

async function loadPracticeHistory() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/practiceSessions`));
    if (snapshot.exists()) {
      const sessions = snapshot.val();
      const practiceList = document.getElementById('practiceList');
      practiceList.innerHTML = '';
      
      Object.entries(sessions).forEach(([key, session]) => {
        let sessionTitle = '';
        if (session.type === 'chapter') {
          sessionTitle = `${session.subject} - ${session.chapter}`;
        } else if (session.type === 'multiple') {
          sessionTitle = `${session.subject} - Multiple Chapters`;
        } else if (session.type === 'subject') {
          sessionTitle = `Full ${session.subject}`;
        } else {
          sessionTitle = 'Full Syllabus';
        }
        
        const sessionItem = document.createElement('div');
        sessionItem.className = 'history-item';
        sessionItem.innerHTML = `
          <div class="history-item-header">
            <span class="history-item-title">${sessionTitle}</span>
            <span class="history-item-date">${new Date(session.date).toLocaleDateString()}</span>
          </div>
          <div class="history-item-details">
            <p>Questions Attempted: ${session.questionsAttempted}</p>
            <p>Correct: ${session.correct}, Incorrect: ${session.incorrect}, Missed: ${session.missed}</p>
            ${session.mistakes ? `<p>Mistakes: ${session.mistakes}</p>` : ''}
          </div>
        `;
        
        sessionItem.addEventListener('click', () => {
          sessionItem.classList.toggle('active');
        });
        
        practiceList.appendChild(sessionItem);
      });
    }
  } catch (error) {
    console.error('Error loading practice history:', error);
    showAlert('Failed to load practice history', false);
  }
}

function initTestAnalysisPage() {
  // Set today's date as default
  document.getElementById('testDate').valueAsDate = new Date();
  
  const testSubject = document.getElementById('testSubject');
  const testChapterSelection = document.getElementById('testChapterSelection');
  
  // Show/hide chapter selection based on subject
  testSubject.addEventListener('change', () => {
    const subject = testSubject.value;
    if (subject && subject !== 'full') {
      testChapterSelection.style.display = 'block';
      loadChaptersChecklistForTest(subject);
    } else {
      testChapterSelection.style.display = 'none';
    }
  });
  
  // Calculate score when inputs change
  const inputs = ['testCorrect', 'testIncorrect', 'testMissed', 'totalQuestions'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', calculateTestScore);
  });
  
  // Save test analysis
  const saveTestBtn = document.getElementById('saveTest');
  if (saveTestBtn) {
    saveTestBtn.addEventListener('click', saveTestAnalysis);
  }
  
  // Load test history
  loadTestHistory();
}

function loadChaptersChecklistForTest(subject) {
  if (!chaptersData) return;
  
  const checklist = document.getElementById('testChaptersChecklist');
  checklist.innerHTML = '';
  
  let chapters = [];
  if (subject === 'physics') {
    chapters = chaptersData.physics;
  } else if (subject === 'botany') {
    chapters = chaptersData.botany;
  } else if (subject === 'zoology') {
    chapters = chaptersData.zoology;
  } else if (subject === 'chemistry') {
    chapters = [
      ...chaptersData.chemistry.physical,
      ...chaptersData.chemistry.inorganic,
      ...chaptersData.chemistry.organic
    ];
  }
  
  chapters.forEach(chapter => {
    const item = document.createElement('div');
    item.className = 'checklist-item';
    item.innerHTML = `
      <label>
        <input type="checkbox" value="${chapter}">
        ${chapter}
      </label>
    `;
    checklist.appendChild(item);
  });
}

function calculateTestScore() {
  const correct = parseInt(document.getElementById('testCorrect').value) || 0;
  const incorrect = parseInt(document.getElementById('testIncorrect').value) || 0;
  const total = parseInt(document.getElementById('totalQuestions').value) || 1;
  
  const score = (correct * 4) - (incorrect * 1);
  const percentage = ((correct / total) * 100).toFixed(2);
  
  document.getElementById('scoreValue').textContent = score;
  document.getElementById('percentageValue').textContent = `${percentage}%`;
}

async function saveTestAnalysis() {
  if (!currentUser) {
    showAlert('Please login to save your test analysis', false);
    return;
  }
  
  const testName = document.getElementById('testName').value.trim();
  const testDate = document.getElementById('testDate').value;
  const testSubjectValue = document.getElementById('testSubject').value;
  const totalQuestions = parseInt(document.getElementById('totalQuestions').value) || 0;
  const correct = parseInt(document.getElementById('testCorrect').value) || 0;
  const incorrect = parseInt(document.getElementById('testIncorrect').value) || 0;
  const missed = parseInt(document.getElementById('testMissed').value) || 0;
  
  // Validation
  if (!testName) {
    showAlert('Please enter test name', false);
    return;
  }
  
  if (!testDate) {
    showAlert('Please select test date', false);
    return;
  }
  
  if (!testSubjectValue) {
    showAlert('Please select subject', false);
    return;
  }
  
  if (totalQuestions <= 0) {
    showAlert('Please enter total number of questions', false);
    return;
  }
  
  if ((correct + incorrect + missed) > totalQuestions) {
    showAlert('The sum of correct, incorrect and missed questions cannot exceed total questions', false);
    return;
  }
  
  const testData = {
    name: testName,
    date: testDate,
    subject: testSubjectValue,
    totalQuestions: totalQuestions,
    correct: correct,
    incorrect: incorrect,
    missed: missed,
    score: (correct * 4) - (incorrect * 1),
    percentage: totalQuestions > 0 ? ((correct / totalQuestions) * 100).toFixed(2) : 0,
    mistakes: document.getElementById('testMistakes').value || '',
    createdAt: new Date().toISOString()
  };
  
  // Add chapters if selected
  if (testSubjectValue && testSubjectValue !== 'full') {
    const checkedChapters = Array.from(
      document.querySelectorAll('#testChaptersChecklist input:checked')
    ).map(el => el.value);
    if (checkedChapters.length > 0) {
      testData.chapters = checkedChapters;
    }
  }
  
  try {
    const newTestRef = push(ref(database, `users/${currentUser.uid}/tests`));
    await set(newTestRef, testData);
    showAlert('Test analysis saved successfully!');
    resetTestForm();
    loadTestHistory();
  } catch (error) {
    console.error('Error saving test analysis:', error);
    showAlert('Failed to save test analysis: ' + error.message, false);
  }
}

function resetTestForm() {
  document.getElementById('testName').value = '';
  document.getElementById('testDate').valueAsDate = new Date();
  document.getElementById('testSubject').value = '';
  document.getElementById('testChapterSelection').style.display = 'none';
  document.getElementById('totalQuestions').value = '';
  document.getElementById('testCorrect').value = '';
  document.getElementById('testIncorrect').value = '';
  document.getElementById('testMissed').value = '';
  document.getElementById('testMistakes').value = '';
  document.getElementById('scoreValue').textContent = '0';
  document.getElementById('percentageValue').textContent = '0%';
}

async function loadTestHistory() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/tests`));
    if (snapshot.exists()) {
      const tests = snapshot.val();
      const testList = document.getElementById('testList');
      testList.innerHTML = '';
      
      Object.entries(tests).forEach(([key, test]) => {
        const testItem = document.createElement('div');
        testItem.className = 'history-item';
        testItem.innerHTML = `
          <div class="history-item-header">
            <span class="history-item-title">${test.name}</span>
            <span class="history-item-date">${new Date(test.date).toLocaleDateString()}</span>
          </div>
          <div class="history-item-details">
            <p>Subject: ${test.subject}</p>
            <p>Score: ${test.score} (${test.percentage}%)</p>
            <p>Correct: ${test.correct}, Incorrect: ${test.incorrect}, Missed: ${test.missed}</p>
            ${test.mistakes ? `<p>Mistakes: ${test.mistakes}</p>` : ''}
          </div>
        `;
        
        testItem.addEventListener('click', () => {
          testItem.classList.toggle('active');
        });
        
        testList.appendChild(testItem);
      });
    }
  } catch (error) {
    console.error('Error loading test history:', error);
    showAlert('Failed to load test history', false);
  }
}

function initPlanPage() {
  // Set today's date as default
  document.getElementById('startDate').valueAsDate = new Date();
  
  // Generate plan button
  const generatePlanBtn = document.getElementById('generatePlan');
  if (generatePlanBtn) {
    generatePlanBtn.addEventListener('click', generateWeeklyPlan);
  }
  
  // Save plan button
  const savePlanBtn = document.getElementById('savePlan');
  if (savePlanBtn) {
    savePlanBtn.addEventListener('click', saveWeeklyPlan);
  }
  
  // Load current plan if exists
  loadCurrentPlan();
}

function generateWeeklyPlan() {
  const startDate = document.getElementById('startDate').value;
  if (!startDate) {
    showAlert('Please select a start date', false);
    return;
  }
  
  const planDays = document.getElementById('planDays');
  planDays.innerHTML = '';
  
  const start = new Date(startDate);
  
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'plan-day';
    dayElement.innerHTML = `
      <h3>${dayDate.toLocaleDateString('en-US', { weekday: 'long' })} (${dayDate.toLocaleDateString()})</h3>
      <div class="plan-subjects" id="day${i}Subjects">
        <div class="plan-subject">
          <select class="subject-select form-control">
            <option value="">Select Subject</option>
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="botany">Botany</option>
            <option value="zoology">Zoology</option>
          </select>
          <div class="plan-options">
            <select class="option-select form-control">
              <option value="text">Enter Text</option>
              <option value="chapters">Select Chapters</option>
            </select>
            <div class="plan-input" style="display: none;">
              <input type="text" class="text-input form-control" placeholder="Enter what to study">
            </div>
            <div class="plan-chapters" style="display: none;">
              <select class="chapter-select form-control" multiple size="4">
                <!-- Chapters will be loaded here -->
              </select>
            </div>
          </div>
          <button class="btn btn-secondary add-subject">+ Add Subject</button>
        </div>
      </div>
    `;
    
    planDays.appendChild(dayElement);
    
    // Initialize day controls
    initializeDayControls(dayElement, i);
  }
  
  document.getElementById('planForm').style.display = 'block';
}

function initializeDayControls(dayElement, dayIndex) {
  const subjectsContainer = dayElement.querySelector(`#day${dayIndex}Subjects`);
  const subjectSelect = subjectsContainer.querySelector('.subject-select');
  const optionSelect = subjectsContainer.querySelector('.option-select');
  const textInput = subjectsContainer.querySelector('.text-input');
  const chaptersInput = subjectsContainer.querySelector('.chapter-select');
  const addSubjectBtn = subjectsContainer.querySelector('.add-subject');
  
  // Subject change handler
  subjectSelect.addEventListener('change', () => {
    const subject = subjectSelect.value;
    if (subject && optionSelect.value === 'chapters') {
      loadChaptersForPlan(subject, chaptersInput);
    }
  });
  
  // Option change handler
  optionSelect.addEventListener('change', () => {
    const option = optionSelect.value;
    subjectsContainer.querySelector('.plan-input').style.display = option === 'text' ? 'block' : 'none';
    subjectsContainer.querySelector('.plan-chapters').style.display = option === 'chapters' ? 'block' : 'none';
    
    // Load chapters if subject is selected and option is chapters
    if (option === 'chapters' && subjectSelect.value) {
      loadChaptersForPlan(subjectSelect.value, chaptersInput);
    }
  });
  
  // Add subject button
  addSubjectBtn.addEventListener('click', () => {
    const newSubject = document.createElement('div');
    newSubject.className = 'plan-subject';
    newSubject.innerHTML = `
      <select class="subject-select form-control">
        <option value="">Select Subject</option>
        <option value="physics">Physics</option>
        <option value="chemistry">Chemistry</option>
        <option value="botany">Botany</option>
        <option value="zoology">Zoology</option>
      </select>
      <div class="plan-options">
        <select class="option-select form-control">
          <option value="text">Enter Text</option>
          <option value="chapters">Select Chapters</option>
        </select>
        <div class="plan-input" style="display: none;">
          <input type="text" class="text-input form-control" placeholder="Enter what to study">
        </div>
        <div class="plan-chapters" style="display: none;">
          <select class="chapter-select form-control" multiple size="4">
            <!-- Chapters will be loaded here -->
          </select>
        </div>
      </div>
      <button class="btn btn-danger remove-subject">Remove</button>
    `;
    
    subjectsContainer.insertBefore(newSubject, addSubjectBtn);
    initializeDayControls(dayElement, dayIndex);
  });
  
  // Remove subject button if exists
  const removeBtn = subjectsContainer.querySelector('.remove-subject');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      subjectsContainer.removeChild(removeBtn.parentElement);
    });
  }
}

async function saveWeeklyPlan() {
  if (!currentUser) {
    showAlert('Please login to save your weekly plan', false);
    return;
  }
  
  const startDate = document.getElementById('startDate').value;
  if (!startDate) {
    showAlert('Please select a start date', false);
    return;
  }
  
  const planDays = document.querySelectorAll('.plan-day');
  const planData = {
    startDate: startDate,
    days: {},
    notes: document.getElementById('planNotes').value || '',
    createdAt: new Date().toISOString()
  };
  
  const start = new Date(startDate);
  
  planDays.forEach((dayElement, index) => {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + index);
    const dateStr = dayDate.toISOString().split('T')[0];
    
    planData.days[dateStr] = {};
    
    const subjects = dayElement.querySelectorAll('.plan-subject');
    subjects.forEach((subjectElement, subIndex) => {
      const subject = subjectElement.querySelector('.subject-select').value;
      const option = subjectElement.querySelector('.option-select').value;
      
      if (subject) {
        if (option === 'text') {
          const text = subjectElement.querySelector('.text-input').value;
          if (text) {
            planData.days[dateStr][`subject${subIndex}`] = {
              subject: subject,
              type: 'text',
              content: text
            };
          }
        } else {
          const selectedChapters = Array.from(
            subjectElement.querySelector('.chapter-select').selectedOptions
          ).map(opt => opt.value);
          
          if (selectedChapters.length > 0) {
            planData.days[dateStr][`subject${subIndex}`] = {
              subject: subject,
              type: 'chapters',
              chapters: selectedChapters
            };
          }
        }
      }
    });
  });

  try {
    const newPlanRef = push(ref(database, `users/${currentUser.uid}/weeklyPlans`));
    await set(newPlanRef, planData);
    showAlert('Weekly plan saved successfully!');
    loadCurrentPlan();
  } catch (error) {
    console.error('Error saving weekly plan:', error);
    showAlert('Failed to save weekly plan: ' + error.message, false);
  }
}

async function loadCurrentPlan() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/weeklyPlans`));
    if (snapshot.exists()) {
      const plans = snapshot.val();
      const currentPlan = document.getElementById('planDisplay');
      currentPlan.innerHTML = '';
      
      // Get the most recent plan
      const recentPlanKey = Object.keys(plans).pop();
      const recentPlan = plans[recentPlanKey];
      
      Object.entries(recentPlan.days).forEach(([date, subjects]) => {
        const dayElement = document.createElement('div');
        dayElement.className = 'plan-day-display';
        dayElement.innerHTML = `
          <h3>${new Date(date).toLocaleDateString('en-US', { weekday: 'long' })} (${new Date(date).toLocaleDateString()})</h3>
          <div class="day-subjects">
            ${Object.values(subjects).map(subject => `
              <div class="day-subject">
                <strong>${subject.subject}</strong>: 
                ${subject.type === 'text' ? subject.content : subject.chapters.join(', ')}
              </div>
            `).join('')}
          </div>
        `;
        
        currentPlan.appendChild(dayElement);
      });
      
      document.getElementById('currentPlan').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading current plan:', error);
    showAlert('Failed to load current plan', false);
  }
}

function loadChaptersForPlan(subject, targetElement) {
  if (!chaptersData) return;
  
  targetElement.innerHTML = '';
  
  let chapters = [];
  if (subject === 'physics') {
    chapters = chaptersData.physics;
  } else if (subject === 'botany') {
    chapters = chaptersData.botany;
  } else if (subject === 'zoology') {
    chapters = chaptersData.zoology;
  } else if (subject === 'chemistry') {
    chapters = [
      ...chaptersData.chemistry.physical,
      ...chaptersData.chemistry.inorganic,
      ...chaptersData.chemistry.organic
    ];
  }
  
  chapters.forEach(chapter => {
    const option = document.createElement('option');
    option.value = chapter;
    option.textContent = chapter;
    targetElement.appendChild(option);
  });
}

function initTrackPage() {
  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadChaptersProgress(btn.dataset.subject);
    });
  });
  
  // Load initial subject
  loadChaptersProgress('physics');
  
  // Reset progress button
  const resetBtn = document.getElementById('resetProgress');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
        resetProgress();
      }
    });
  }
}

async function loadChaptersProgress(subject) {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/progress/${subject}`));
    const progressData = snapshot.exists() ? snapshot.val() : {};
    
    const chaptersContainer = document.getElementById('chaptersProgress');
    chaptersContainer.innerHTML = '';
    
    let chapters = [];
    if (subject === 'physics') {
      chapters = chaptersData.physics;
    } else if (subject === 'botany') {
      chapters = chaptersData.botany;
    } else if (subject === 'zoology') {
      chapters = chaptersData.zoology;
    } else if (subject === 'chemistry') {
      chapters = [
        ...chaptersData.chemistry.physical,
        ...chaptersData.chemistry.inorganic,
        ...chaptersData.chemistry.organic
      ];
    }
    
    chapters.forEach(chapter => {
      const chapterItem = document.createElement('div');
      chapterItem.className = 'chapter-item';
      
      const chapterProgress = progressData[chapter] || { lectures: false, dpp: false };
      
      chapterItem.innerHTML = `
        <div class="chapter-name">${chapter}</div>
        <div class="checkbox-container">
          <input type="checkbox" ${chapterProgress.lectures ? 'checked' : ''} 
                 data-chapter="${chapter}" data-type="lectures">
        </div>
        <div class="checkbox-container">
          <input type="checkbox" ${chapterProgress.dpp ? 'checked' : ''} 
                 data-chapter="${chapter}" data-type="dpp">
        </div>
      `;
      
      // Add event listeners to checkboxes
      const lecturesCheckbox = chapterItem.querySelector('input[data-type="lectures"]');
      const dppCheckbox = chapterItem.querySelector('input[data-type="dpp"]');
      
      lecturesCheckbox.addEventListener('change', () => {
        updateChapterProgress(subject, chapter, 'lectures', lecturesCheckbox.checked);
      });
      
      dppCheckbox.addEventListener('change', () => {
        updateChapterProgress(subject, chapter, 'dpp', dppCheckbox.checked);
      });
      
      chaptersContainer.appendChild(chapterItem);
    });
    
    // Update progress stats
    updateProgressStats(subject);
  } catch (error) {
    console.error('Error loading chapters progress:', error);
    showAlert('Failed to load chapters progress', false);
  }
}

async function updateChapterProgress(subject, chapter, type, completed) {
  if (!currentUser) return;
  
  try {
    await update(ref(database, `users/${currentUser.uid}/progress/${subject}/${chapter}`), {
      [type]: completed
    });
    
    // Reload progress to update UI
    loadChaptersProgress(subject);
  } catch (error) {
    console.error('Error updating chapter progress:', error);
    showAlert('Failed to update progress', false);
  }
}

async function updateProgressStats(subject) {
  if (!currentUser || !chaptersData) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/progress/${subject}`));
    const progressData = snapshot.exists() ? snapshot.val() : {};
    
    let chapters = [];
    if (subject === 'physics') {
      chapters = chaptersData.physics;
    } else if (subject === 'botany') {
      chapters = chaptersData.botany;
    } else if (subject === 'zoology') {
      chapters = chaptersData.zoology;
    } else if (subject === 'chemistry') {
      chapters = [
        ...chaptersData.chemistry.physical,
        ...chaptersData.chemistry.inorganic,
        ...chaptersData.chemistry.organic
      ];
    }
    
    let lecturesCompleted = 0;
    let dppCompleted = 0;
    
    chapters.forEach(chapter => {
      const progress = progressData[chapter] || { lectures: false, dpp: false };
      if (progress.lectures) lecturesCompleted++;
      if (progress.dpp) dppCompleted++;
    });
    
    const totalChapters = chapters.length;
    const lecturesPercentage = Math.round((lecturesCompleted / totalChapters) * 100);
    const dppPercentage = Math.round((dppCompleted / totalChapters) * 100);
    const totalPercentage = Math.round(((lecturesCompleted + dppCompleted) / (totalChapters * 2)) * 100);
    
    document.getElementById('lecturesCompleted').textContent = `${lecturesCompleted}/${totalChapters}`;
    document.getElementById('dppCompleted').textContent = `${dppCompleted}/${totalChapters}`;
    document.getElementById('totalProgress').textContent = `${totalPercentage}%`;
    
    document.getElementById('lecturesPercentage').textContent = `${lecturesPercentage}%`;
    document.getElementById('dppPercentage').textContent = `${dppPercentage}%`;
    
    document.getElementById('lecturesProgressBar').style.width = `${lecturesPercentage}%`;
    document.getElementById('dppProgressBar').style.width = `${dppPercentage}%`;
    document.getElementById('totalProgressBar').style.width = `${totalPercentage}%`;
  } catch (error) {
    console.error('Error updating progress stats:', error);
    showAlert('Failed to update progress stats', false);
  }
}

async function resetProgress() {
  if (!currentUser) return;
  
  try {
    await remove(ref(database, `users/${currentUser.uid}/progress`));
    showAlert('Progress reset successfully');
    loadChaptersProgress(document.querySelector('.tab-btn.active').dataset.subject);
  } catch (error) {
    console.error('Error resetting progress:', error);
    showAlert('Failed to reset progress', false);
  }
}

function initProfilePage() {
  if (!currentUser) return;
  
  // Load profile data
  loadProfileData();
  
  // Initialize chart
  initializePerformanceChart();
}

async function loadProfileData() {
  if (!currentUser) return;
  
  try {
    // Load progress data for all subjects
    const physicsSnapshot = await get(ref(database, `users/${currentUser.uid}/progress/physics`));
    const chemistrySnapshot = await get(ref(database, `users/${currentUser.uid}/progress/chemistry`));
    const botanySnapshot = await get(ref(database, `users/${currentUser.uid}/progress/botany`));
    const zoologySnapshot = await get(ref(database, `users/${currentUser.uid}/progress/zoology`));
    
    // Calculate progress percentages
    const physicsProgress = calculateSubjectProgress(physicsSnapshot, 'physics');
    const chemistryProgress = calculateSubjectProgress(chemistrySnapshot, 'chemistry');
    const botanyProgress = calculateSubjectProgress(botanySnapshot, 'botany');
    const zoologyProgress = calculateSubjectProgress(zoologySnapshot, 'zoology');
    
    // Update progress bars
    document.getElementById('physicsProgress').style.width = `${physicsProgress}%`;
    document.getElementById('chemistryProgress').style.width = `${chemistryProgress}%`;
    document.getElementById('botanyProgress').style.width = `${botanyProgress}%`;
    document.getElementById('zoologyProgress').style.width = `${zoologyProgress}%`;
    
    document.getElementById('physicsPercentage').textContent = `${physicsProgress}%`;
    document.getElementById('chemistryPercentage').textContent = `${chemistryProgress}%`;
    document.getElementById('botanyPercentage').textContent = `${botanyProgress}%`;
    document.getElementById('zoologyPercentage').textContent = `${zoologyProgress}%`;
    
    // Calculate overall progress
    const totalProgress = Math.round((physicsProgress + chemistryProgress + botanyProgress + zoologyProgress) / 4);
    document.getElementById('overallProgress').textContent = `${totalProgress}%`;
    document.getElementById('overallProgressBar').style.width = `${totalProgress}%`;
    
    // Load test data
    const testsSnapshot = await get(ref(database, `users/${currentUser.uid}/tests`));
    if (testsSnapshot.exists()) {
      const tests = testsSnapshot.val();
      document.getElementById('testsTaken').textContent = Object.keys(tests).length;
      
      // Calculate trend (simple implementation)
      if (Object.keys(tests).length > 1) {
        const testValues = Object.values(tests);
        const lastScore = testValues[testValues.length - 1].score;
        const prevScore = testValues[testValues.length - 2].score;
        const trend = ((lastScore - prevScore) / prevScore) * 100;
        
        const trendElement = document.getElementById('testTrend');
        trendElement.querySelector('span').textContent = `${Math.abs(trend.toFixed(1))}%`;
        
        if (trend > 0) {
          trendElement.querySelector('i').className = 'fas fa-arrow-up trend-up';
        } else {
          trendElement.querySelector('i').className = 'fas fa-arrow-down trend-down';
        }
      }
    }
    
    // Load practice data
    const practiceSnapshot = await get(ref(database, `users/${currentUser.uid}/practiceSessions`));
    if (practiceSnapshot.exists()) {
      document.getElementById('practiceSessions').textContent = Object.keys(practiceSnapshot.val()).length;
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
    showAlert('Failed to load profile data', false);
  }
}

function calculateSubjectProgress(snapshot, subject) {
  if (!snapshot.exists()) return 0;
  
  const progressData = snapshot.val();
  let chapters = [];
  
  if (subject === 'physics') {
    chapters = chaptersData.physics;
  } else if (subject === 'chemistry') {
    chapters = [
      ...chaptersData.chemistry.physical,
      ...chaptersData.chemistry.inorganic,
      ...chaptersData.chemistry.organic
    ];
  } else if (subject === 'botany') {
    chapters = chaptersData.botany;
  } else if (subject === 'zoology') {
    chapters = chaptersData.zoology;
  }
  
  let completed = 0;
  
  chapters.forEach(chapter => {
    const progress = progressData[chapter] || { lectures: false, dpp: false };
    if (progress.lectures && progress.dpp) completed++;
  });
  
  return Math.round((completed / chapters.length) * 100);
}

function initializePerformanceChart() {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  
  // This would be replaced with actual data from Firebase
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      datasets: [{
        label: 'Test Scores',
        data: [65, 59, 80, 81, 56, 72],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // In a real app, you would load actual test data and update the chart
}

async function loadWeeklyPlans() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/weeklyPlans`));
    if (snapshot.exists()) {
      const plans = snapshot.val();
      const plansList = document.getElementById('weeklyPlansList');
      const plansCount = document.getElementById('weeklyPlansCount');
      
      plansCount.textContent = Object.keys(plans).length;
      plansList.innerHTML = '';
      
      // Get the most recent plan
      const recentPlanKey = Object.keys(plans).pop();
      const recentPlan = plans[recentPlanKey];
      
      Object.entries(recentPlan.days).forEach(([day, subjects]) => {
        const dayItem = document.createElement('div');
        dayItem.className = 'stat-list-item';
        dayItem.innerHTML = `
          <span>${new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <span>${Object.keys(subjects).length} tasks</span>
        `;
        plansList.appendChild(dayItem);
      });
    }
  } catch (error) {
    console.error('Error loading weekly plans:', error);
    showAlert('Failed to load weekly plans', false);
  }
}

async function loadRecentTests() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/tests`));
    if (snapshot.exists()) {
      const tests = snapshot.val();
      const testsList = document.getElementById('recentTestsList');
      const testsCount = document.getElementById('recentTestsCount');
      
      testsCount.textContent = Object.keys(tests).length;
      testsList.innerHTML = '';
      
      // Get the 3 most recent tests
      const recentTests = Object.entries(tests).slice(-3).reverse();
      
      recentTests.forEach(([key, test]) => {
        const testItem = document.createElement('div');
        testItem.className = 'stat-list-item';
        testItem.innerHTML = `
          <span>${test.name}</span>
          <span>${test.score}</span>
        `;
        testsList.appendChild(testItem);
      });
    }
  } catch (error) {
    console.error('Error loading recent tests:', error);
    showAlert('Failed to load recent tests', false);
  }
}

async function loadPracticeSessions() {
  if (!currentUser) return;
  
  try {
    const snapshot = await get(ref(database, `users/${currentUser.uid}/practiceSessions`));
    if (snapshot.exists()) {
      const sessions = snapshot.val();
      const sessionsList = document.getElementById('practiceSessionsList');
      const sessionsCount = document.getElementById('practiceSessionsCount');
      
      sessionsCount.textContent = Object.keys(sessions).length;
      sessionsList.innerHTML = '';
      
      // Get the 3 most recent sessions
      const recentSessions = Object.entries(sessions).slice(-3).reverse();
      
      recentSessions.forEach(([key, session]) => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'stat-list-item';
        
        let sessionTitle = '';
        if (session.type === 'chapter') {
          sessionTitle = `${session.subject} - ${session.chapter}`;
        } else if (session.type === 'multiple') {
          sessionTitle = `${session.subject} - Multiple Chapters`;
        } else if (session.type === 'subject') {
          sessionTitle = `Full ${session.subject}`;
        } else {
          sessionTitle = 'Full Syllabus';
        }
        
        sessionItem.innerHTML = `
          <span>${sessionTitle}</span>
          <span>${session.correct}/${session.questionsAttempted}</span>
        `;
        sessionsList.appendChild(sessionItem);
      });
    }
  } catch (error) {
    console.error('Error loading practice sessions:', error);
    showAlert('Failed to load practice sessions', false);
  }
}
