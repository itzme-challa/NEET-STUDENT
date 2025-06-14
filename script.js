const db = firebase.database();
const auth = firebase.auth();

function showMessage(message, type = 'success') {
  const msgDiv = document.getElementById('message');
  if (msgDiv) {
    msgDiv.textContent = message;
    msgDiv.className = type;
    setTimeout(() => msgDiv.textContent = '', 3000);
  }
}

function loadChapters() {
  return fetch('chapters.json')
    .then(response => response.json())
    .catch(err => {
      console.error('Error loading chapters:', err);
      return {};
    });
}

function updateProfileLink(user) {
  const profileLink = document.getElementById('profileLink');
  if (user) {
    profileLink.textContent = user.email.split('@')[0];
    document.getElementById('userProfile').innerHTML = `<span>${user.email.split('@')[0]}</span>`;
  } else {
    profileLink.textContent = 'Login';
    document.getElementById('userProfile').innerHTML = '<a href="profile.html">Login</a>';
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

function loadHomeData() {
  const plansList = document.getElementById('plansList');
  const testsList = document.getElementById('testsList');
  const practiceList = document.getElementById('practiceList');

  db.ref('plans').on('value', snapshot => {
    plansList.innerHTML = '';
    snapshot.forEach(child => {
      const plan = child.val();
      plansList.innerHTML += `<p>${plan.user}: ${plan.subjects.map(s => `${s.subject}: ${s.content}`).join(', ')}</p>`;
    });
  });

  db.ref('tests').on('value', snapshot => {
    testsList.innerHTML = '';
    snapshot.forEach(child => {
      const test = child.val();
      testsList.innerHTML += `<p>${test.user}: ${test.testName} (${test.date}) - Score: ${test.score}</p>`;
    });
  });

  db.ref('practices').on('value', snapshot => {
    practiceList.innerHTML = '';
    snapshot.forEach(child => {
      const practice = child.val();
      practiceList.innerHTML += `<p>${practice.user}: ${practice.selection} - Correct: ${practice.correct}</p>`;
    });
  });
}

function initPractice() {
  const studyType = document.getElementById('studyType');
  const selectionOptions = document.getElementById('selectionOptions');
  const practiceForm = document.getElementById('practiceForm');

  function updateSelectionOptions() {
    const type = studyType.value;
    selectionOptions.innerHTML = '';
    if (type === 'chapter' || type === 'multipleChapters') {
      loadChapters().then(chapters => {
        const select = document.createElement('select');
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
      });
    } else if (type === 'subject') {
      const select = document.createElement('select');
      ['Botany', 'Zoology', 'Physics', 'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'].forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        select.appendChild(option);
      });
      selectionOptions.appendChild(select);
    }
  }

  studyType.addEventListener('change', updateSelectionOptions);
  updateSelectionOptions();

  practiceForm.addEventListener('submit', e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      showMessage('Please login first', 'error');
      return;
    }
    const selection = selectionOptions.querySelector('select').selectedOptions ?
      Array.from(selectionOptions.querySelector('select').selectedOptions).map(opt => opt.value).join(',') :
      selectionOptions.querySelector('select').value;
    const practice = {
      user: user.email.split('@')[0],
      selection,
      totalQuestions: document.getElementById('totalQuestions').value,
      correct: document.getElementById('correct').value,
      incorrect: document.getElementById('incorrect').value,
      missed: document.getElementById('missed').value,
      mistakes: document.getElementById('mistakes').value,
      date: new Date().toISOString()
    };
    db.ref('practices').push(practice)
      .then(() => showMessage('Practice saved'))
      .catch(err => showMessage('Error saving practice', 'error'));
    practiceForm.reset();
    updateSelectionOptions();
  });
}

function initTestAnalysis() {
  const testForm = document.getElementById('testForm');
  const testList = document.getElementById('testList');

  function calculateScore(correct, wrong, missed) {
    return (correct * 4) + (wrong * -1) + (missed * 0);
  }

  testForm.addEventListener('submit', e => {
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
      attempted: document.getElementById('attemptedQuestions').value,
      correct,
      wrong,
      missed,
      score: calculateScore(correct, wrong, missed),
      mistakes: document.getElementById('testMistakes').value
    };
    db.ref('tests').push(test)
      .then(() => showMessage('Test saved'))
      .catch(err => showMessage('Error saving test', 'error'));
    testForm.reset();
  });

  db.ref('tests').orderByChild('user').equalTo(auth.currentUser?.email.split('@')[0]).on('value', snapshot => {
    testList.innerHTML = '';
    snapshot.forEach(child => {
      const test = child.val();
      const div = document.createElement('div');
      div.className = 'test-item';
      div.innerHTML = `<p><strong>${test.testName}</strong> (${test.date}) - Score: ${test.score}</p>`;
      div.addEventListener('click', () => {
        testList.querySelectorAll('.test-details').forEach(d => d.remove());
        const details = document.createElement('div');
        details.className = 'test-details';
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

  function updateInputContainer(subjectDiv) {
    const inputType = subjectDiv.querySelector('.inputType').value;
    const inputContainer = subjectDiv.querySelector('.inputContainer');
    inputContainer.innerHTML = '';
    if (inputType === 'text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Enter plan';
      inputContainer.appendChild(input);
    } else {
      loadChapters().then(chapters => {
        const select = document.createElement('select');
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
      });
    }
  }

  addSubject.addEventListener('click', () => {
    const subjectDiv = document.createElement('div');
    subjectDiv.className = 'subject';
    subjectDiv.innerHTML = `
      <select class="subjectSelect">
        <option value="Botany">Botany</option>
        <option value="Zoology">Zoology</option>
        <option value="Physics">Physics</option>
        <option value="Organic Chemistry">Organic Chemistry</option>
        <option value="Inorganic Chemistry">Inorganic Chemistry</option>
        <option value="Physical Chemistry">Physical Chemistry</option>
      </select>
      <select class="inputType">
        <option value="text">Text</option>
        <option value="chapters">Chapters</option>
      </select>
      <div class="inputContainer"></div>
    `;
    subjectsContainer.appendChild(subjectDiv);
    updateInputContainer(subjectDiv);
    subjectDiv.querySelector('.inputType').addEventListener('change', () => updateInputContainer(subjectDiv));
  });

  subjectsContainer.querySelector('.inputType').addEventListener('change', () => updateInputContainer(subjectsContainer.querySelector('.subject')));
  updateInputContainer(subjectsContainer.querySelector('.subject'));

  planForm.addEventListener('submit', e => {
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
      startDate: startDate.toISOString(),
      endDate: new Date(startDate.setDate(startDate.getDate() + 7)).toISOString()
    };
    db.ref('plans').push(plan)
      .then(() => showMessage('Plan saved'))
      .catch(err => showMessage('Error saving plan', 'error'));
  });

  db.ref('plans').orderByChild('user').equalTo(auth.currentUser?.email.split('@')[0]).on('value', snapshot => {
    planList.innerHTML = '';
    snapshot.forEach(child => {
      const plan = child.val();
      const div = document.createElement('div');
      div.className = 'plan-item';
      div.innerHTML = `
        <p>From ${plan.startDate.split('T')[0]} to ${plan.endDate.split('T')[0]}</p>
        <p>${plan.subjects.map(s => `${s.subject}: ${s.content}`).join('<br>')}</p>
        <button onclick="editPlan('${child.key}')">Edit</button>
      `;
      planList.appendChild(div);
    });
  });
}

function editPlan(planId) {
  db.ref(`plans/${planId}`).once('value').then(snapshot => {
    const plan = snapshot.val();
    const subjectsContainer = document.getElementById('subjectsContainer');
    subjectsContainer.innerHTML = '';
    plan.subjects.forEach(s => {
      const subjectDiv = document.createElement('div');
      subjectDiv.className = 'subject';
      subjectDiv.innerHTML = `
        <select class="subjectSelect">
          <option value="Botany" ${s.subject === 'Botany' ? 'selected' : ''}>Botany</option>
          <option value="Zoology" ${s.subject === 'Zoology' ? 'selected' : ''}>Zoology</option>
          <option value="Physics" ${s.subject === 'Physics' ? 'selected' : ''}>Physics</option>
          <option value="Organic Chemistry" ${s.subject === 'Organic Chemistry' ? 'selected' : ''}>Organic Chemistry</option>
          <option value="Inorganic Chemistry" ${s.subject === 'Inorganic Chemistry' ? 'selected' : ''}>Inorganic Chemistry</option>
          <option value="Physical Chemistry" ${s.subject === 'Physical Chemistry' ? 'selected' : ''}>Physical Chemistry</option>
        </select>
        <select class="inputType">
          <option value="text" ${s.type === 'text' ? 'selected' : ''}>Text</option>
          <option value="chapters" ${s.type === 'chapters' ? 'selected' : ''}>Chapters</option>
        </select>
        <div class="inputContainer"></div>
      `;
      subjectsContainer.appendChild(subjectDiv);
      const inputContainer = subjectDiv.querySelector('.inputContainer');
      if (s.type === 'text') {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = s.content;
        inputContainer.appendChild(input);
      } else {
        loadChapters().then(chapters => {
          const select = document.createElement('select');
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
          }
          inputContainer.appendChild(select);
        });
      }
      subjectDiv.querySelector('.inputType').addEventListener('change', () => updateInputContainer(subjectDiv));
    });
  });
}

function initTrack() {
  const chaptersList = document.getElementById('chaptersList');
  const resetChapters = document.getElementById('resetChapters');

  loadChapters().then(chapters => {
    for (const subject in chapters) {
      const section = document.createElement('div');
      section.innerHTML = `<h2>${subject}</h2>`;
      const list = document.createElement('div');
      chapters[subject].forEach(ch => {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.innerHTML = `
          <span onclick="editChapter('${subject}', '${ch}')">${ch}</span>
          <label>Lectures <input type="checkbox" onchange="updateChapter('${subject}', '${ch}', 'lectures', this.checked)"></label>
          <label>DPP <input type="checkbox" onchange="updateChapter('${subject}', '${ch}', 'dpp', this.checked)"></label>
        `;
        list.appendChild(div);
      });
      section.appendChild(list);
      chaptersList.appendChild(section);
    }
  });

  db.ref('progress').orderByChild('user').equalTo(auth.currentUser?.email.split('@')[0]).on('value', snapshot => {
    snapshot.forEach(child => {
      const progress = child.val();
      const lectureCheckbox = document.querySelector(`input[onchange*="updateChapter('${progress.subject}', '${progress.chapter}', 'lectures'"]`);
      const dppCheckbox = document.querySelector(`input[onchange*="updateChapter('${progress.subject}', '${progress.chapter}', 'dpp'"]`);
      if (lectureCheckbox) {
        lectureCheckbox.checked = progress.lectures;
        lectureCheckbox.disabled = progress.lectures;
        lectureCheckbox.parentElement.style.background = progress.lectures ? 'lightgreen' : '';
      }
      if (dppCheckbox) {
        dppCheckbox.checked = progress.dpp;
        dppCheckbox.disabled = progress.dpp;
        dppCheckbox.parentElement.style.background = progress.dpp ? 'lightgreen' : '';
      }
    });
  });

  resetChapters.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all progress?')) {
      db.ref('progress').orderByChild('user').equalTo(auth.currentUser?.email.split('@')[0]).once('value').then(snapshot => {
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
  db.ref('progress').push({
    user: user.email.split('@')[0],
    subject,
    chapter,
    [type]: checked
  }).then(() => showMessage(`${type} updated for ${chapter}`));
}

function editChapter(subject, chapter) {
  if (confirm(`Edit completion status for ${chapter}?`)) {
    db.ref('progress').orderByChild('user').equalTo(auth.currentUser.email.split('@')[0]).once('value').then(snapshot => {
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
    authSection.style.display = 'none';
    profileSection.style.display = 'block';
    document.getElementById('profileName').textContent = user.email.split('@')[0];

    db.ref('progress').orderByChild('user').equalTo(user.email.split('@')[0]).on('value', snapshot => {
      let lectures = 0, dpp = 0;
      snapshot.forEach(child => {
        if (child.val().lectures) lectures++;
        if (child.val().dpp) dpp++;
      });
      document.getElementById('lecturesCompleted').textContent = lectures;
      document.getElementById('dppCompleted').textContent = dpp;
    });

    db.ref('tests').orderByChild('user').equalTo(user.email.split('@')[0]).on('value', snapshot => {
      const labels = [], scores = [];
      snapshot.forEach(child => {
        const test = child.val();
        labels.push(test.testName);
        scores.push(test.score);
      });
      new Chart(document.getElementById('testChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Test Scores', data: scores, borderColor: 'blue', fill: false }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    });
  } else {
    authSection.style.display = 'block';
    profileSection.style.display = 'none';
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
  const navLinks = document.querySelector('.nav-links');
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
});
