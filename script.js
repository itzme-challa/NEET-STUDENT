const db = firebase.firestore();
const rtdb = firebase.database();
const auth = firebase.auth();

function showMessage(message, type = 'success') {
  const msgDiv = document.getElementById('message');
  if (msgDiv) {
    msgDiv.textContent = message;
    msgDiv.className = `text-${type === 'success' ? 'green' : 'red'}-600 font-medium`;
    setTimeout(() => msgDiv.textContent = '', 3000);
  }
}

async function loadChapters() {
  try {
    const response = await fetch('chapters.json');
    return await response.json();
  } catch (err) {
    console.error('Error loading chapters:', err);
    showMessage('Failed to load chapters', 'error');
    return {};
  }
}

function updateProfileLink(user) {
  const profileLink = document.getElementById('profileLink');
  const profileLinkMobile = document.getElementById('profileLinkMobile');
  const userProfile = document.getElementById('userProfile');
  if (user) {
    const username = user.email.split('@')[0];
    profileLink.textContent = username;
    profileLinkMobile.textContent = username;
    userProfile.innerHTML = `<span class="font-medium">${username}</span>`;
  } else {
    profileLink.textContent = 'Login';
    profileLinkMobile.textContent = 'Login';
    userProfile.innerHTML = '<a href="profile.html" class="text-blue-600 hover:underline">Login</a>';
  }
}

auth.onAuthStateChanged(user => {
  updateProfileLink(user);
  if (window.location.pathname.includes('profile.html')) {
    loadProfile(user);
  } else if (window.location.pathname.includes('index.html')) {
    loadHomeData();
  } else if (window.location.pathname.includes('practice.html')) {
    initPractice();
  } else if (window.location.pathname.includes('testAnalysis.html')) {
    initTestAnalysis();
  } else if (window.location.pathname.includes('plan.html')) {
    initPlan();
  } else if (window.location.pathname.includes('track.html')) {
    initTrack();
  }
});

async function loadHomeData() {
  const plansList = document.getElementById('plansList');
  const testsList = document.getElementById('testsList');
  const practiceList = document.getElementById('practiceList');

  try {
    const plansSnapshot = await db.collection('plans').get();
    plansList.innerHTML = '';
    plansSnapshot.forEach(doc => {
      const plan = doc.data();
      plansList.innerHTML += `
        <div class="bg-gray-50 p-4 rounded-md shadow">
          <p class="font-medium">${plan.user}: ${plan.subjects.map(s => `${s.subject}: ${s.content}`).join(', ')}</p>
        </div>`;
    });

    const testsSnapshot = await db.collection('tests').get();
    testsList.innerHTML = '';
    testsSnapshot.forEach(doc => {
      const test = doc.data();
      testsList.innerHTML += `
        <div class="bg-gray-50 p-4 rounded-md shadow">
          <p class="font-medium">${test.user}: ${test.testName} (${test.date}) - Score: ${test.score}</p>
        </div>`;
    });

    const practicesSnapshot = await db.collection('practices').get();
    practiceList.innerHTML = '';
    practicesSnapshot.forEach(doc => {
      const practice = doc.data();
      practiceList.innerHTML += `
        <div class="bg-gray-50 p-4 rounded-md shadow">
          <p class="font-medium">${practice.user}: ${practice.selection} - Correct: ${practice.correct}</p>
        </div>`;
    });
  } catch (err) {
    showMessage('Error loading data', 'error');
  }
}

function initPractice() {
  const studyType = document.getElementById('studyType');
  const selectionOptions = document.getElementById('selectionOptions');
  const practiceForm = document.getElementById('practiceForm');

  async function updateSelectionOptions() {
    const type = studyType.value;
    selectionOptions.innerHTML = '';
    if (type === 'chapter' || type === 'multipleChapters') {
      const chapters = await loadChapters();
      const select = document.createElement('select');
      select.className = 'w-full p-2 border rounded-md';
      select.multiple = type === 'multipleChapters';
      for (const subject in chapters) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = subject;
        chapters[subject].forEach(ch => {
          const option = document.createElement('option');
          option.value = `${subject}:${ch}`;
          option.textContent = ch;
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      }
      selectionOptions.appendChild(select);
    } else if (type === 'subject') {
      const select = document.createElement('select');
      select.className = 'w-full p-2 border rounded-md';
      ['Botany', 'Zoology', 'Physics', 'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'].forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        select.appendChild(option);
      });
      selectionOptions.appendChild(select);
    } else {
      selectionOptions.innerHTML = '<p class="text-gray-600">Full Syllabus Selected</p>';
    }
  }

  studyType.addEventListener('change', updateSelectionOptions);
  updateSelectionOptions();

  practiceForm.addEventListener('submit', async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      showMessage('Please login first', 'error');
      return;
    }
    const selection = selectionOptions.querySelector('select')?.selectedOptions ?
      Array.from(selectionOptions.querySelector('select').selectedOptions).map(opt => opt.value).join(', ') :
      studyType.value === 'fullSyllabus' ? 'Full Syllabus' : selectionOptions.querySelector('select')?.value;
    const practice = {
      user: user.email.split('@')[0],
      selection,
      totalQuestions: parseInt(document.getElementById('totalQuestions').value),
      correct: parseInt(document.getElementById('correct').value),
      incorrect: parseInt(document.getElementById('incorrect').value),
      missed: parseInt(document.getElementById('missed').value),
      mistakes: document.getElementById('mistakes').value,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection('practices').add(practice);
      showMessage('Practice saved');
      practiceForm.reset();
      updateSelectionOptions();
    } catch (err) {
      showMessage('Error saving practice', 'error');
    }
  });
}

function initTestAnalysis() {
  const testForm = document.getElementById('testForm');
  const testList = document.getElementById('testList');

  function calculateScore(correct, wrong, missed) {
    return (correct * 4) + (wrong * -1) + (missed * 0);
  }

  testForm.addEventListener('submit', async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      showMessage('Please login first', 'error');
      return;
    }
    const correct = parseInt(document.getElementById('correct').value);
    const wrong = parseInt(document.getElementById('wrong').value);
    const missed = parseInt(document.getElementById('missed').value);
    const test = {
      user: user.email.split('@')[0],
      testName: document.getElementById('testName').value,
      date: document.getElementById('testDate').value,
      attempted: parseInt(document.getElementById('attemptedQuestions').value),
      correct,
      wrong,
      missed,
      score: calculateScore(correct, wrong, missed),
      mistakes: document.getElementById('testMistakes').value,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection('tests').add(test);
      showMessage('Test saved');
      testForm.reset();
    } catch (err) {
      showMessage('Error saving test', 'error');
    }
  });

  db.collection('tests').where('user', '==', auth.currentUser?.email.split('@')[0])
    .orderBy('timestamp', 'desc').onSnapshot(snapshot => {
      testList.innerHTML = '';
      snapshot.forEach(doc => {
        const test = doc.data();
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md shadow test-item';
        div.innerHTML = `
          <p class="font-medium cursor-pointer">${test.testName} (${test.date}) - Score: ${test.score}</p>
        `;
        div.addEventListener('click', () => {
          testList.querySelectorAll('.test-details').forEach(d => d.remove());
          const details = document.createElement('div');
          details.className = 'test-details p-4 bg-gray-100 rounded-md mt-2';
          details.innerHTML = `
            <p>Attempted: ${test.attempted}</p>
            <p>Correct: ${test.correct}</p>
            <p>Wrong: ${test.wrong}</p>
            <p>Missed: ${test.missed}</p>
            <p>Mistakes: ${test.mistakes || 'None'}</p>
          `;
          div.appendChild(details);
        });
        testList.appendChild(div);
      });
    });
}

function initPlan() {
  const planForm = document.getElementById('planForm');
  const subjectsContainer = document.getElementById('subjectsContainer');
  const addSubject = document.getElementById('addSubject');
  const planList = document.getElementById('planList');

  async function updateInputContainer(subjectDiv) {
    const inputType = subjectDiv.querySelector('.inputType').value;
    const inputContainer = subjectDiv.querySelector('.inputContainer');
    inputContainer.innerHTML = '';
    if (inputType === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'w-full p-2 border rounded-md';
      input.placeholder = 'Enter plan';
      inputContainer.appendChild(input);
    } else {
      const chapters = await loadChapters();
      const select = document.createElement('select');
      select.className = 'w-full p-2 border rounded-md';
      select.multiple = true;
      for (const subject in chapters) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = subject;
        chapters[subject].forEach(ch => {
          const option = document.createElement('option');
          option.value = ch;
          option.textContent = ch;
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      }
      inputContainer.appendChild(select);
    }
  }

  addSubject.addEventListener('click', () => {
    const subjectDiv = document.createElement('div');
    subjectDiv.className = 'subject flex flex-col md:flex-row gap-4';
    subjectDiv.innerHTML = `
      <select class="subjectSelect w-full md:w-1/3 p-2 border rounded-md">
        <option value="Botany">Botany</option>
        <option value="Zoology">Zoology</option>
        <option value="Physics">Physics</option>
        <option value="Organic Chemistry">Organic Chemistry</option>
        <option value="Inorganic Chemistry">Inorganic Chemistry</option>
        <option value="Physical Chemistry">Physical Chemistry</option>
      </select>
      <select class="inputType w-full md:w-1/3 p-2 border rounded-md">
        <option value="text">Text</option>
        <option value="chapters">Chapters</option>
      </select>
      <div class="inputContainer w-full md:w-1/3"></div>
    `;
    subjectsContainer.appendChild(subjectDiv);
    updateInputContainer(subjectDiv);
    subjectDiv.querySelector('.inputType').addEventListener('change', () => updateInputContainer(subjectDiv));
  });

  subjectsContainer.querySelector('.inputType').addEventListener('change', () => updateInputContainer(subjectsContainer.querySelector('.subject')));
  updateInputContainer(subjectsContainer.querySelector('.subject'));

  planForm.addEventListener('submit', async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      showMessage('Please login first', 'error');
      return;
    }
    const subjects = Array.from(subjectsContainer.querySelectorAll('.subject')).map(s => {
      const input = s.querySelector('.inputContainer input') || s.querySelector('.inputContainer select');
      return {
        subject: s.querySelector('.subjectSelect').value,
        type: s.querySelector('.inputType').value,
        content: input.multiple ? Array.from(input.selectedOptions).map(opt => opt.value).join(', ') : input.value
      };
    });
    const startDate = new Date('2025-06-15');
    const plan = {
      user: user.email.split('@')[0],
      subjects,
      startDate: firebase.firestore.Timestamp.fromDate(startDate),
      endDate: firebase.firestore.Timestamp.fromDate(new Date(startDate.setDate(startDate.getDate() + 7))),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection('plans').add(plan);
      showMessage('Plan saved');
    } catch (err) {
      showMessage('Error saving plan', 'error');
    }
  });

  db.collection('plans').where('user', '==', auth.currentUser?.email.split('@')[0])
    .orderBy('timestamp', 'desc').onSnapshot(snapshot => {
      planList.innerHTML = '';
      snapshot.forEach(doc => {
        const plan = doc.data();
        const div = document.createElement('div');
        div.className = 'bg-gray-50 p-4 rounded-md shadow plan-item';
        div.innerHTML = `
          <p class="font-medium">From ${plan.startDate.toDate().toISOString().split('T')[0]} to ${plan.endDate.toDate().toISOString().split('T')[0]}</p>
          <p>${plan.subjects.map(s => `${s.subject}: ${s.content}`).join('<br>')}</p>
          <button onclick="editPlan('${doc.id}')" class="bg-yellow-600 text-white p-2 rounded-md hover:bg-yellow-700 mt-2">Edit</button>
        `;
        planList.appendChild(div);
      });
    });
}

async function editPlan(planId) {
  const doc = await db.collection('plans').doc(planId).get();
  const plan = doc.data();
  const subjectsContainer = document.getElementById('subjectsContainer');
  subjectsContainer.innerHTML = '';
  plan.subjects.forEach(s => {
    const subjectDiv = document.createElement('div');
    subjectDiv.className = 'subject flex flex-col md:flex-row gap-4';
    subjectDiv.innerHTML = `
      <select class="subjectSelect w-full md:w-1/3 p-2 border rounded-md">
        <option value="Botany" ${s.subject === 'Botany' ? 'selected' : ''}>Botany</option>
        <option value="Zoology" ${s.subject === 'Zoology' ? 'selected' : ''}>Zoology</option>
        <option value="Physics" ${s.subject === 'Physics' ? 'selected' : ''}>Physics</option>
        <option value="Organic Chemistry" ${s.subject === 'Organic Chemistry' ? 'selected' : ''}>Organic Chemistry</option>
        <option value="Inorganic Chemistry" ${s.subject === 'Inorganic Chemistry' ? 'selected' : ''}>Inorganic Chemistry</option>
        <option value="Physical Chemistry" ${s.subject === 'Physical Chemistry' ? 'selected' : ''}>Physical Chemistry</option>
      </select>
      <select class="inputType w-full md:w-1/3 p-2 border rounded-md">
        <option value="text" ${s.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="chapters" ${s.type === 'chapters' ? 'selected' : ''}>Chapters</option>
      </select>
      <div class="inputContainer w-full md:w-1/3"></div>
    `;
    subjectsContainer.appendChild(subjectDiv);
    const inputContainer = subjectDiv.querySelector('.inputContainer');
    if (s.type === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'w-full p-2 border rounded-md';
      input.value = s.content;
      inputContainer.appendChild(input);
    } else {
      loadChapters().then(chapters => {
        const select = document.createElement('select');
        select.className = 'w-full p-2 border rounded-md';
        select.multiple = true;
        for (const subject in chapters) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = subject;
          chapters[subject].forEach(ch => {
            const option = document.createElement('option');
            option.value = ch;
            option.textContent = ch;
            option.selected = s.content.split(', ').includes(ch);
            optgroup.appendChild(option);
          });
          select.appendChild(optgroup);
        });
        inputContainer.appendChild(select);
      });
    }
    subjectDiv.querySelector('.inputType').addEventListener('change', () => updateInputContainer(subjectDiv));
  });
}

function initTrack() {
  const chaptersList = document.getElementById('chaptersList');
  const resetChapters = document.getElementById('resetChapters');

  loadChapters().then(chapters => {
    for (const subject in chapters) {
      const section = document.createElement('div');
      section.className = 'bg-white p-4 rounded-md shadow mb-4';
      section.innerHTML = `<h2 class="text-xl font-semibold mb-2">${subject}</h2>`;
      const list = document.createElement('div');
      list.className = 'space-y-2';
      chapters[subject].forEach(ch => {
        const div = document.createElement('div');
        div.className = 'chapter-item flex items-center gap-4 p-2 bg-gray-50 rounded-md';
        div.innerHTML = `
          <span class="font-medium cursor-pointer hover:underline" onclick="editChapter('${subject}', '${ch}')">${ch}</span>
          <label class="flex items-center gap-2">Lectures <input type="checkbox" onchange="updateChapter('${subject}', '${ch}', 'lectures', this.checked)"></label>
          <label class="flex items-center gap-2">DPP <input type="checkbox" onchange="updateChapter('${subject}', '${ch}', 'dpp', this.checked)"></label>
        `;
        list.appendChild(div);
      });
      section.appendChild(list);
      chaptersList.appendChild(section);
    }
  });

  rtdb.ref('progress').orderByChild('user').equalTo(auth.currentUser?.email.split('@')[0]).on('value', snapshot => {
    snapshot.forEach(child => {
      const progress = child.val();
      const lectureCheckbox = document.querySelector(`input[onchange*="updateChapter('${progress.subject}', '${progress.chapter}', 'lectures'"]`);
      const dppCheckbox = document.querySelector(`input[onchange*="updateChapter('${progress.subject}', '${progress.chapter}', 'dpp'"]`);
      if (lectureCheckbox) {
        lectureCheckbox.checked = progress.lectures;
        lectureCheckbox.disabled = progress.lectures;
        lectureCheckbox.parentElement.style.background = progress.lectures ? '#d1fae5' : '';
      }
      if (dppCheckbox) {
        dppCheckbox.checked = progress.dpp;
        dppCheckbox.disabled = progress.dpp;
        dppCheckbox.parentElement.style.background = progress.dpp ? '#d1fae5' : '';
      }
    });
  });

  resetChapters.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress?')) {
      rtdb.ref('progress').orderByChild('user').equalTo(auth.currentUser?.email.split('@')[0]).once('value').then(snapshot => {
        snapshot.forEach(child => child.ref.remove());
        showMessage('Progress reset');
      });
    }
  });
}

function updateChapter(subject, chapter, type, checked) {
  const user = auth.currentUser;
  if (!user) {
    showMessage('Please login first', 'error');
    return;
  }
  if (checked && !confirm(`Mark ${type} for ${chapter} as completed?`)) {
    event.target.checked = false;
    return;
  }
  rtdb.ref('progress').push({
    user: user.email.split('@')[0],
    subject,
    chapter,
    [type]: checked,
    timestamp: Date.now()
  }).then(() => showMessage(`${type} updated for ${chapter}`));
}

function editChapter(subject, chapter) {
  if (confirm(`Edit completion status for ${chapter}?`)) {
    rtdb.ref('progress').orderByChild('user').equalTo(auth.currentUser.email.split('@')[0]).once('value').then(snapshot => {
      snapshot.forEach(child => {
        if (child.val().subject === subject && child.val().chapter === chapter) {
          child.ref.remove();
          showMessage('Chapter status reset for editing');
        }
      });
    });
  }
}

function loadProfile(user) {
  const authSection = document.getElementById('authSection');
  const profileSection = document.getElementById('profileSection');
  const authForm = document.getElementById('authForm');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');

  if (user) {
    authSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    document.getElementById('profileName').textContent = user.email.split('@')[0];

    rtdb.ref('progress').orderByChild('user').equalTo(user.email.split('@')[0]).on('value', snapshot => {
      let lectures = 0, dpp = 0;
      snapshot.forEach(child => {
        if (child.val().lectures) lectures++;
        if (child.val().dpp) dpp++;
      });
      document.getElementById('lecturesCompleted').textContent = lectures;
      document.getElementById('dppCompleted').textContent = dpp;
    });

    db.collection('tests').where('user', '==', user.email.split('@')[0])
      .orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        const labels = [], scores = [];
        snapshot.forEach(doc => {
          const test = doc.data();
          labels.push(test.testName);
          scores.push(test.score);
        });
        new Chart(document.getElementById('testChart'), {
          type: 'line',
          data: {
            labels,
            datasets: [{ label: 'Test Scores', data: scores, borderColor: '#2563eb', fill: false }]
          },
          options: { scales: { y: { beginAtZero: true } } }
        });
      });
  } else {
    authSection.classList.remove('hidden');
    profileSection.classList.add('hidden');
  }

  authForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
      .then(() => showMessage('Logged in'))
      .catch(err => showMessage('Login failed: ' + err.message, 'error'));
  });

  signupBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => showMessage('Signed up'))
      .catch(err => showMessage('Signup failed: ' + err.message, 'error'));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinksMobile = document.querySelector('.nav-links-mobile');
  hamburger.addEventListener('click', () => {
    navLinksMobile.classList.toggle('hidden');
  });
});
