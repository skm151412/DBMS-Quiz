// Enhanced script.js for 100-question database-backed quiz system
document.addEventListener("DOMContentLoaded", function () {
    // Setup variables
    let totalQuestions = 0;
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let quizStarted = false;
    let attemptId = null;
    let quizData = null;
    let correctAnswers = {};

    const quizPassword = "123"; // Default password for the quiz
    const authorPassword = "boat4567"; // Password for showing answers

    // Timer setup - will be set from database
    let timeLeft = 90 * 60; // Default 90 minutes in seconds
    const timerElement = document.getElementById("timer");

    // Navigation buttons
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");
    const resultDiv = document.getElementById("result");
    const progressFill = document.getElementById("progressFill");

    // Question navigation panel
    const rightBox = document.querySelector(".right.box");

    // Show answers control flag
    let showAnswersEnabled = false;

    // API base URL
    const API_BASE = '/api';

    // Subject color mapping
    const subjectColors = {
        1: '#000000', // DBMS - Black
        2: '#FF6B6B', // FEDF - Red
        3: '#4ECDC4', // OOP - Teal
        4: '#45B7D1'  // OS - Blue
    };

    // Device detection
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Internet connectivity detection
    let isOnline = navigator.onLine;
    let connectionStatus = {
        online: isOnline,
        lastChecked: new Date(),
        flightModeRequired: true
    };

    function updateConnectionStatus() {
        const wasOnline = connectionStatus.online;
        connectionStatus.online = navigator.onLine;
        connectionStatus.lastChecked = new Date();
        
        if (wasOnline !== connectionStatus.online) {
            updateFlightModeIndicator();
            updateQuizStartButton();
        }
    }

    function checkInternetConnection() {
        // Check if browser supports navigator.onLine
        if (typeof navigator.onLine !== 'undefined') {
            updateConnectionStatus();
        }
        
        // Also try a network request to verify connectivity
        fetch('/api/ping', { method: 'HEAD', cache: 'no-cache' })
            .then(() => {
                if (!connectionStatus.online) {
                    connectionStatus.online = true;
                    updateFlightModeIndicator();
                    updateQuizStartButton();
                }
            })
            .catch(() => {
                if (connectionStatus.online) {
                    connectionStatus.online = false;
                    updateFlightModeIndicator();
                    updateQuizStartButton();
                }
            });
    }

    function updateFlightModeIndicator() {
        const indicator = document.getElementById('flight-mode-indicator');
        const statusText = document.getElementById('connection-status');
        const startButton = document.querySelector('button[onclick="verifyPasswordAndStart()"]');
        
        if (indicator) {
            if (connectionStatus.online) {
                indicator.className = 'flight-mode-indicator online';
                statusText.textContent = '🌐 Internet Connected - Flight mode required to start quiz';
                indicator.style.borderColor = '#ff4757';
                indicator.style.backgroundColor = '#ff6b7a';
            } else {
                indicator.className = 'flight-mode-indicator offline';
                statusText.textContent = '✈️ Flight mode active - Quiz can be started';
                indicator.style.borderColor = '#2ed573';
                indicator.style.backgroundColor = '#7bed9f';
            }
        }
    }

    function updateQuizStartButton() {
        const startButton = document.querySelector('button[onclick="verifyPasswordAndStart()"]');
        if (startButton) {
            if (connectionStatus.online) {
                startButton.disabled = true;
                startButton.style.backgroundColor = '#ccc';
                startButton.style.cursor = 'not-allowed';
                startButton.textContent = 'Turn off Internet to Start Quiz';
            } else {
                startButton.disabled = false;
                startButton.style.backgroundColor = '';
                startButton.style.cursor = '';
                startButton.textContent = 'Start 100-Question Quiz';
            }
        }
    }

    // Set up event listeners for online/offline events
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    // Periodically check connection status
    setInterval(checkInternetConnection, 3000); // Check every 3 seconds

    // API helper functions
    async function apiCall(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(API_BASE + endpoint, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Initialize quiz
    async function initializeQuiz() {
        try {
            // Show prerequisite screen
            showPrerequisites();
        } catch (error) {
            console.error('Quiz initialization error:', error);
            alert('Failed to initialize quiz. Please refresh the page.');
        }
    }

    // Show prerequisites panel
    function showPrerequisites() {
        const quizContainer = document.querySelector(".container");
        const prerequisiteDiv = document.createElement("div");
        prerequisiteDiv.classList.add("prerequisite");
        prerequisiteDiv.innerHTML = `
            <div class="prerequisite-content">
                <h2>Computer Science Fundamentals Quiz</h2>
                <div class="quiz-details">
                    <p><strong>100 Questions</strong> covering 4 major subjects:</p>
                    <ul style="list-style: none; padding: 0;">
                        <li>🗄️ <strong>DBMS</strong>: Questions 1-25 (Database Management Systems)</li>
                        <li>🌐 <strong>FEDF</strong>: Questions 26-50 (Front-End Development Frameworks)</li>
                        <li>⚙️ <strong>OOP</strong>: Questions 51-75 (Object-Oriented Programming)</li>
                        <li>💻 <strong>OS</strong>: Questions 76-100 (Operating Systems)</li>
                    </ul>
                </div>
                
                <!-- Flight Mode Status Indicator -->
                <div id="flight-mode-indicator" class="flight-mode-indicator">
                    <div class="indicator-icon">✈️</div>
                    <div id="connection-status" class="connection-status">
                        🌐 Checking internet connection...
                    </div>
                </div>
                
                <div class="prerequisites-list">
                    <p><strong>Before starting, please ensure:</strong></p>
                    <ul>
                        <li><strong>❗ Turn OFF internet connection (Enable flight mode)</strong></li>
                        <li>Close all other browser tabs and applications</li>
                        <li>Ensure you have a stable power source</li>
                        <li>Find a quiet environment for concentration</li>
                        <li>Allocate 90 minutes for completion</li>
                    </ul>
                    <p style="color: #ff4757; font-weight: bold; margin-top: 15px;">
                        ⚠️ Quiz cannot be started while internet is connected
                    </p>
                </div>
                <div class="password-section">
                    <label for="quiz-password">Enter Quiz Password:</label>
                    <input type="password" id="quiz-password" placeholder="Enter password">
                    <button onclick="verifyPasswordAndStart()" id="start-quiz-btn">Start 100-Question Quiz</button>
                    <div id="password-error" style="color: red; display: none; margin-top: 10px;"></div>
                </div>
            </div>
        `;
        prerequisiteDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            overflow-y: auto;
        `;

        document.body.appendChild(prerequisiteDiv);

        // Initialize connection status check
        setTimeout(() => {
            checkInternetConnection();
            updateFlightModeIndicator();
            updateQuizStartButton();
        }, 500);

        // Make function global
        window.verifyPasswordAndStart = async function() {
            // Check internet connection first
            if (connectionStatus.online) {
                alert('❗ Please turn off your internet connection (enable flight mode) before starting the quiz.');
                return;
            }

            const password = document.getElementById('quiz-password').value;
            const errorDiv = document.getElementById('password-error');

            try {
                errorDiv.style.display = 'none';
                const response = await apiCall('/quiz/1/verify', 'POST', { password });

                if (response.success) {
                    prerequisiteDiv.remove();
                    await loadQuizData();
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Invalid password';
                errorDiv.style.display = 'block';
            }
        };
    }

    // Load quiz data from backend
    async function loadQuizData() {
        try {
            // Start quiz attempt
            const startResponse = await apiCall('/quiz/1/start', 'POST', { userId: 1 });
            attemptId = startResponse.attempt_id;

            // Load questions and subjects
            const dataResponse = await apiCall('/quiz/1/questions');
            quizData = dataResponse;

            console.log(`Loaded ${dataResponse.total_questions} questions from database`);

            // Process and display questions
            await processQuizData();

            // Start the quiz
            startQuiz();

        } catch (error) {
            console.error('Failed to load quiz data:', error);
            alert('Failed to load quiz data. Please refresh the page.');
        }
    }

    // Process quiz data and generate HTML
    async function processQuizData() {
        const quizForm = document.getElementById('quizForm');
        const loadingDiv = document.getElementById('loading');

        quizForm.innerHTML = '';
        loadingDiv.style.display = 'block';

        // Group questions by subject
        const questionsBySubject = {};
        quizData.questions.forEach(q => {
            if (!questionsBySubject[q.subject_id]) {
                questionsBySubject[q.subject_id] = [];
            }
            questionsBySubject[q.subject_id].push(q);
        });

        // Sort questions by order number
        quizData.questions.sort((a, b) => a.order_num - b.order_num);

        let questionIndex = 0;

        // Generate HTML for all questions
        quizData.questions.forEach((question, index) => {
            const subject = quizData.subjects.find(s => s.id === question.subject_id);
            correctAnswers[`q${question.id}`] = question.options.find(opt => opt.is_correct)?.option_text || '';

            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            questionDiv.style.display = index === 0 ? 'block' : 'none';

            let optionsHTML = '';
            question.options.forEach((option, optIndex) => {
                optionsHTML += `
                    <label>
                        <input type="radio" name="q${question.id}" value="${option.id}" data-question-id="${question.id}">
                        <span>${option.option_text}</span>
                    </label>
                `;
            });

            questionDiv.innerHTML = `
                <div class="question-header">
                    <h3>Question ${question.order_num}</h3>
                    <span class="subject-badge" style="background-color: ${subject.color}">${subject.name}</span>
                </div>
                <p class="question-text">${question.question_text}</p>
                <div class="options">
                    ${optionsHTML}
                </div>
            `;

            quizForm.appendChild(questionDiv);
            questionIndex++;
        });

        totalQuestions = questionIndex;
        loadingDiv.style.display = 'none';

        // Update navigation
        createNavigationButtons();
        updateNavigationButtonStyles();
    }

    // Create navigation buttons in right panel
    function createNavigationButtons() {
        const navigationGrid = document.querySelector('.navigation-grid');
        navigationGrid.innerHTML = '';

        for (let i = 0; i < totalQuestions; i++) {
            const btn = document.createElement('button');
            btn.textContent = i + 1;
            btn.className = 'nav-btn';
            btn.onclick = () => showQuestion(i);
            navigationGrid.appendChild(btn);
        }
    }

    // Start quiz functionality
    function startQuiz() {
        quizStarted = true;
        document.querySelector('.container').style.display = 'block';

        // Set up timer based on quiz configuration (90 minutes for 100 questions)
        timeLeft = 90 * 60;

        updateTimer();
        const timer = setInterval(() => {
            if (!quizStarted) {
                clearInterval(timer);
                return;
            }
            updateTimer();
        }, 1000);

        function updateTimer() {
            if (timeLeft <= 0) {
                clearInterval(timer);
                submitQuiz(true); // Auto-submit when time expires
                return;
            }

            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;

            timerElement.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Change color when time is running low
            if (timeLeft < 300) { // Less than 5 minutes
                timerElement.style.color = '#f44336';
            } else if (timeLeft < 900) { // Less than 15 minutes
                timerElement.style.color = '#ff9800';
            }

            timeLeft--;
        }

        // Set up event listeners
        setupEventListeners();

        // Show first question
        showQuestion(0);
    }

    // Set up event listeners
    function setupEventListeners() {
        // Navigation buttons
        prevBtn.addEventListener("click", () => {
            if (currentQuestionIndex > 0) {
                showQuestion(currentQuestionIndex - 1);
            }
        });

        nextBtn.addEventListener("click", () => {
            if (currentQuestionIndex < totalQuestions - 1) {
                showQuestion(currentQuestionIndex + 1);
            }
        });

        submitBtn.addEventListener("click", () => {
            const answeredCount = Object.keys(userAnswers).length;
            const confirmMessage = answeredCount === totalQuestions 
                ? "Are you sure you want to submit the quiz?" 
                : `You have answered ${answeredCount} out of ${totalQuestions} questions. Are you sure you want to submit?`;

            if (confirm(confirmMessage)) {
                submitQuiz();
            }
        });

        // Answer selection
        document.addEventListener('change', async (e) => {
            if (e.target.type === 'radio' && quizStarted) {
                const questionId = e.target.dataset.questionId;
                const selectedOptionId = e.target.value;
                const questionName = e.target.name;

                // Store locally
                userAnswers[questionName] = selectedOptionId;

                // Update progress
                updateProgress();

                // Visual feedback for selected option
                const labels = e.target.closest('.options').querySelectorAll('label');
                labels.forEach(label => label.classList.remove('selected'));
                e.target.closest('label').classList.add('selected');

                // Send to backend
                try {
                    await apiCall('/quiz/answer', 'POST', {
                        attempt_id: attemptId,
                        question_id: parseInt(questionId),
                        selected_option_id: parseInt(selectedOptionId)
                    });
                } catch (error) {
                    console.error('Failed to save answer:', error);
                }

                updateNavigationButtonStyles();
            }
        });
    }

    // Update progress bar
    function updateProgress() {
        const progress = (Object.keys(userAnswers).length / totalQuestions) * 100;
        progressFill.style.width = `${progress}%`;
    }

    // Show specific question
    function showQuestion(index) {
        const allQuestions = document.querySelectorAll(".question");

        // Hide all questions
        allQuestions.forEach(q => q.style.display = 'none');

        // Show selected question
        if (allQuestions[index]) {
            allQuestions[index].style.display = 'block';
            currentQuestionIndex = index;

            // Restore selected answer if exists
            const questionElement = allQuestions[index];
            const radioInputs = questionElement.querySelectorAll('input[type="radio"]');
            radioInputs.forEach(input => {
                if (userAnswers[input.name] === input.value) {
                    input.checked = true;
                    input.closest('label').classList.add('selected');
                }
            });
        }

        // Update navigation buttons
        prevBtn.disabled = (index === 0);
        nextBtn.disabled = (index === totalQuestions - 1);

        // Update navigation button styles
        updateNavigationButtonStyles();
    }

    // Update navigation button styles
    function updateNavigationButtonStyles() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach((btn, index) => {
            const questionId = quizData.questions[index]?.id;
            const questionName = `q${questionId}`;

            btn.classList.remove('answered', 'current');

            if (userAnswers[questionName]) {
                btn.classList.add('answered');
            }

            if (index === currentQuestionIndex) {
                btn.classList.add('current');
            }
        });
    }

    // Submit quiz
    async function submitQuiz(timeExpired = false) {
        try {
            quizStarted = false;
            const response = await apiCall('/quiz/1/submit', 'POST', {
                attempt_id: attemptId
            });

            showResults(response, timeExpired);

        } catch (error) {
            console.error('Failed to submit quiz:', error);
            alert('Failed to submit quiz. Please try again.');
        }
    }

    // Show quiz results
    function showResults(results, timeExpired = false) {
        const { score, correct_answers, total_questions } = results;

        // Calculate subject-wise scores
        const subjectScores = calculateSubjectScores();

        resultDiv.innerHTML = `
            <div class="result-content">
                <h2>Quiz Completed!</h2>
                <div class="score-display">
                    <div class="score-circle">
                        <span class="score">${score}%</span>
                    </div>
                    <p><strong>Your Score: ${correct_answers}/${total_questions}</strong></p>
                    ${timeExpired ? '<p class="warning">⚠️ Time Expired!</p>' : ''}
                </div>

                <div class="subject-breakdown">
                    ${subjectScores.map(subject => `
                        <div class="subject-score" style="border-left-color: ${subject.color}">
                            <strong>${subject.name}</strong><br>
                            Score: ${subject.score}/${subject.total}
                        </div>
                    `).join('')}
                </div>

                <div class="author-section">
                    <h3>Show Answers (Author Only)</h3>
                    <input type="password" id="author-password" placeholder="Enter author password">
                    <button id="toggle-answers-btn">Show Answers</button>
                    <div id="author-feedback" style="color: red; display: none; margin-top: 10px;">
                        Incorrect author password!
                    </div>
                </div>
            </div>
        `;

        resultDiv.style.display = "block";

        // Set up toggle answers functionality
        setupAnswerToggle();

        // Disable all inputs but keep navigation enabled
        document.querySelectorAll("input[type=radio]").forEach(input => {
            input.disabled = true;
        });

        // Enable navigation for review
        prevBtn.disabled = false;
        nextBtn.disabled = false;
        submitBtn.style.display = 'none';
    }

    // Calculate subject-wise scores
    function calculateSubjectScores() {
        const subjectScores = [];

        quizData.subjects.forEach(subject => {
            const subjectQuestions = quizData.questions.filter(q => q.subject_id === subject.id);
            let correctCount = 0;

            subjectQuestions.forEach(question => {
                const questionName = `q${question.id}`;
                if (userAnswers[questionName]) {
                    const selectedOption = question.options.find(opt => opt.id == userAnswers[questionName]);
                    if (selectedOption && selectedOption.is_correct) {
                        correctCount++;
                    }
                }
            });

            subjectScores.push({
                name: subject.name,
                color: subject.color,
                score: correctCount,
                total: subjectQuestions.length
            });
        });

        return subjectScores;
    }

    // Set up answer toggle functionality
    function setupAnswerToggle() {
        const toggleBtn = document.getElementById("toggle-answers-btn");

        toggleBtn.addEventListener("click", async function () {
            const passwordInput = document.getElementById("author-password");
            const feedback = document.getElementById("author-feedback");

            try {
                feedback.style.display = "none";

                const response = await apiCall('/quiz/1/results', 'POST', {
                    attempt_id: attemptId,
                    author_password: passwordInput.value
                });

                if (response.show_correct_answers) {
                    showAnswersEnabled = !showAnswersEnabled;
                    toggleBtn.textContent = showAnswersEnabled ? "Hide Answers" : "Show Answers";

                    if (showAnswersEnabled) {
                        showCorrectAnswers(response.answers);
                    } else {
                        hideCorrectAnswers();
                    }
                } else {
                    feedback.style.display = "block";
                    passwordInput.value = "";
                }

            } catch (error) {
                feedback.textContent = "Failed to verify password";
                feedback.style.display = "block";
                passwordInput.value = "";
            }
        });
    }

    // Show correct answers in questions
    function showCorrectAnswers(answerData) {
        const allQuestions = document.querySelectorAll(".question");

        answerData.forEach((answer, index) => {
            if (allQuestions[index]) {
                const question = allQuestions[index];

                let answerDisplay = question.querySelector('.correct-answer-display');
                if (!answerDisplay) {
                    answerDisplay = document.createElement('div');
                    answerDisplay.className = 'correct-answer-display';
                    question.appendChild(answerDisplay);
                }

                answerDisplay.innerHTML = `
                    <strong>✅ Correct Answer:</strong> ${answer.correct_option}<br>
                    <strong>📝 Your Answer:</strong> ${answer.selected_option || 'Not answered'}<br>
                    <strong>📊 Result:</strong> ${answer.is_correct ? '<span style="color: #4CAF50;">✓ Correct</span>' : '<span style="color: #f44336;">✗ Incorrect</span>'}
                `;
            }
        });
    }

    // Hide correct answers
    function hideCorrectAnswers() {
        document.querySelectorAll('.correct-answer-display').forEach(display => {
            display.remove();
        });
    }

    // Initialize the quiz when page loads
    initializeQuiz();
});
