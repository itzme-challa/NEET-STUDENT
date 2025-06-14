import { 
  auth, 
  database, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
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
      authError.textContent = '';
    } catch (error) {
      authError.textContent = error.message;
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
      await set(ref(database, `users/${userCredential.user.uid}`), {
        name: name,
        email: email,
        createdAt: new Date().toISOString()
      });
      
      authError.textContent = '';
    } catch (error) {
      authError.textContent = error.message;
    }
  });
}

// Logout function
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
}

// Load chapters data
async function loadChaptersData() {
  try {
    const response = await fetch('chapters.json');
    chaptersData = await response.json();
  } catch (error) {
    console.error('Error loading chapters data:', error);
  }
}

// Load user data from Firebase
async function loadUserData() {
  if (!currentUser) return;
  
  const userRef = ref(database, `users/${currentUser.uid}`);
  const snapshot = await get(userRef);
  
  if (snapshot.exists()) {
    const userData = snapshot.val();
    // Update UI with user data
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
  const chapterSelection = document.getElementById('chapterSelection');
  const singleChapterSelection = document.getElementById('singleChapterSelection');
  const multipleChapterSelection = document.getElementById('multipleChapterSelection');
  const subjectSelect = document.getElementById('subject');
  const savePracticeBtn = document.getElementById('savePractice');
  
  // Set today's date as default
  document.getElementById('date').valueAsDate = new Date();
  
  // Practice type change handler
  practiceType.addEventListener('change', () => {
    const value = practiceType.value;
    
    chapterSelection.style.display = ['chapter', 'multiple'].includes(value) ? 'block' : 'none';
    singleChapterSelection.style.display = value === 'chapter' ? 'block' : 'none';
    multipleChapterSelection.style.display = value === 'multiple' ? 'block' : 'none';
    
    if (value === '') {
      chapterSelection.style.display = 'none';
    }
  });
  
  // Subject change handler
  subjectSelect.addEventListener('change', () => {
    const subject = subjectSelect.value;
    
    if (practiceType.value === 'chapter') {
      loadChaptersForSubject(subject, 'chapter');
    } else if (practiceType.value === 'multiple') {
      loadChaptersChecklist(subject);
    }
  });
  
  // Save practice session
  if (savePracticeBtn) {
    savePracticeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        alert('Please login to save your practice session');
        return;
      }
      
      const practiceData = {
        type: practiceType.value,
        date: document.getElementById('date').value,
        questionsAttempted: document.getElementById('questionsAttempted').value,
        correct: document.getElementById('correct').value,
        incorrect: document.getElementById('incorrect').value,
        missed: document.getElementById('missed').value,
        mistakes: document.getElementById('mistakes').value,
        createdAt: new Date().toISOString()
      };
      
      if (practiceType.value === 'chapter') {
        practiceData.subject = subjectSelect.value;
        practiceData.chapter = document.getElementById('chapter').value;
      } else if (practiceType.value === 'multiple') {
        practiceData.subject = subjectSelect.value;
        const checkedChapters = Array.from(document.querySelectorAll('#chaptersChecklist input:checked')).map(el => el.value);
        practiceData.chapters = checkedChapters;
      } else if (practiceType.value === 'subject') {
        practiceData.subject = subjectSelect.value;
      }
      
      try {
        const newPracticeRef = push(ref(database, `users/${currentUser.uid}/practiceSessions`));
        await set(newPracticeRef, practiceData);
        alert('Practice session saved successfully!');
        loadPracticeHistory();
      } catch (error) {
        console.error('Error saving practice session:', error);
        alert('Failed to save practice session');
      }
    });
  }
  
  // Load practice history if on practice page
  if (document.getElementById('practiceHistory')) {
    loadPracticeHistory();
    document.getElementById('practiceHistory').style.display = 'block';
  }
}

function initTestAnalysisPage() {
  // Set today's date as default
  document.getElementById('testDate').valueAsDate = new Date();
  
  // Calculate score when inputs change
  const inputs = ['testCorrect', 'testIncorrect', 'testMissed', 'totalQuestions'];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener('input', calculateTestScore);
  });
  
  // Save test analysis
  const saveTestBtn = document.getElementById('saveTest');
  if (saveTestBtn) {
    saveTestBtn.addEventListener('click', async () => {
      if (!currentUser) {
        alert('Please login to save your test analysis');
        return;
      }
      
      const correct = parseInt(document.getElementById('testCorrect').value) || 0;
      const incorrect = parseInt(document.getElementById('testIncorrect').value) || 0;
      const missed = parseInt(document.getElementById('testMissed').value) || 0;
      const total = parseInt(document.getElementById('totalQuestions').value) || 0;
      
      const testData = {
        name: document.getElementById('testName').value,
        date: document.getElementById('testDate').value,
        subject: document.getElementById('testSubject').value,
        totalQuestions: total,
        correct: correct,
        incorrect: incorrect,
        missed: missed,
        score: (correct * 4) - (incorrect * 1),
        percentage: total > 0 ? ((correct / total) * 100).toFixed(2) : 0,
        mistakes: document.getElementById('testMistakes').value,
        createdAt: new Date().toISOString()
      };
      
      try {
        const newTestRef = push(ref(database, `users/${currentUser.uid}/tests`));
        await set(newTestRef, testData);
        alert('Test analysis saved successfully!');
        loadTestHistory();
      } catch (error) {
        console.error('Error saving test analysis:', error);
        alert('Failed to save test analysis');
      }
    });
  }
  
  // Load test history
  loadTestHistory();
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

function initProfilePage() {
  if (!currentUser) return;
  
  // Load profile data
  loadProfileData();
  
  // Initialize chart
  initializePerformanceChart();
}

// Helper Functions
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
    // For chemistry, we need to combine all subcategories
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
    // For chemistry, we can show categories
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

function calculateTestScore() {
  const correct = parseInt(document.getElementById('testCorrect').value) || 0;
  const incorrect = parseInt(document.getElementById('testIncorrect').value) || 0;
  const total = parseInt(document.getElementById('totalQuestions').value) || 1;
  
  const score = (correct * 4) - (incorrect * 1);
  const percentage = ((correct / total) * 100).toFixed(2);
  
  document.getElementById('scoreValue').textContent = score;
  document.getElementById('percentageValue').textContent = `${percentage}%`;
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
          <span>${day}</span>
          <span>${Object.keys(subjects).length} subjects</span>
        `;
        plansList.appendChild(dayItem);
      });
    }
  } catch (error) {
    console.error('Error loading weekly plans:', error);
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
  }
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
  }
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
  }
}

function generateWeeklyPlan() {
  const startDate = document.getElementById('startDate').value;
  if (!startDate) {
    alert('Please select a start date');
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
    if (subject) {
      loadChaptersForPlan(subject, chaptersInput);
    }
  });
  
  // Option change handler
  optionSelect.addEventListener('change', () => {
    const option = optionSelect.value;
    subjectsContainer.querySelector('.plan-input').style.display = option === 'text' ? 'block' : 'none';
    subjectsContainer.querySelector('.plan-chapters').style.display = option === 'chapters' ? 'block' : 'none';
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
  if (removeBtn
