const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Quiz API is running with 100 questions' });
});

// Ping endpoint for connectivity testing
app.head('/api/ping', (req, res) => {
    res.status(200).end();
});

app.get('/api/ping', (req, res) => {
    res.json({ status: 'connected', timestamp: new Date().toISOString() });
});

// Get quiz by ID with password verification
app.post('/api/quiz/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        const [rows] = await pool.execute(
            'SELECT * FROM quizzes WHERE id = ? AND is_active = TRUE',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const quiz = rows[0];

        if (quiz.password && quiz.password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.json({
            success: true,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                time_limit_minutes: quiz.time_limit_minutes,
                passing_score: quiz.passing_score
            }
        });
    } catch (error) {
        console.error('Quiz verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get quiz questions and subjects
app.get('/api/quiz/:id/questions', async (req, res) => {
    try {
        const { id } = req.params;

        // Get subjects for this quiz
        const [subjectRows] = await pool.execute(`
            SELECT s.*, qs.question_count 
            FROM subjects s 
            JOIN quiz_subjects qs ON s.id = qs.subject_id 
            WHERE qs.quiz_id = ?
            ORDER BY s.id
        `, [id]);

        // Get questions with options
        const [questionRows] = await pool.execute(`
            SELECT q.*, qo.id as option_id, qo.option_text, qo.is_correct, qo.order_num as option_order
            FROM questions q
            LEFT JOIN question_options qo ON q.id = qo.question_id
            WHERE q.quiz_id = ?
            ORDER BY q.order_num, qo.order_num
        `, [id]);

        // Group questions with their options
        const questionsMap = {};
        questionRows.forEach(row => {
            if (!questionsMap[row.id]) {
                questionsMap[row.id] = {
                    id: row.id,
                    quiz_id: row.quiz_id,
                    subject_id: row.subject_id,
                    question_text: row.question_text,
                    question_type: row.question_type,
                    points: row.points,
                    order_num: row.order_num,
                    options: []
                };
            }

            if (row.option_id) {
                questionsMap[row.id].options.push({
                    id: row.option_id,
                    option_text: row.option_text,
                    is_correct: row.is_correct,
                    order_num: row.option_order
                });
            }
        });

        const questions = Object.values(questionsMap);

        res.json({
            subjects: subjectRows,
            questions: questions,
            total_questions: questions.length
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start quiz attempt
app.post('/api/quiz/:id/start', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId = 1 } = req.body; // Default to user 1 for demo

        // Create quiz attempt
        const [result] = await pool.execute(
            'INSERT INTO quiz_attempts (user_id, quiz_id, status) VALUES (?, ?, ?)',
            [userId, id, 'in_progress']
        );

        res.json({
            success: true,
            attempt_id: result.insertId
        });
    } catch (error) {
        console.error('Start quiz error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit answer
app.post('/api/quiz/answer', async (req, res) => {
    try {
        const { attempt_id, question_id, selected_option_id } = req.body;

        // Check if option is correct
        const [optionRows] = await pool.execute(
            'SELECT is_correct FROM question_options WHERE id = ?',
            [selected_option_id]
        );

        const isCorrect = optionRows.length > 0 ? optionRows[0].is_correct : false;

        // Insert or update user answer
        await pool.execute(`
            INSERT INTO user_answers (attempt_id, question_id, selected_option_id, is_correct)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            selected_option_id = VALUES(selected_option_id),
            is_correct = VALUES(is_correct),
            answered_at = CURRENT_TIMESTAMP
        `, [attempt_id, question_id, selected_option_id, isCorrect]);

        res.json({ success: true });
    } catch (error) {
        console.error('Submit answer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit quiz
app.post('/api/quiz/:id/submit', async (req, res) => {
    try {
        const { id } = req.params;
        const { attempt_id } = req.body;

        // Calculate score
        const [scoreRows] = await pool.execute(`
            SELECT 
                COUNT(*) as total_questions,
                SUM(CASE WHEN ua.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
            FROM user_answers ua
            WHERE ua.attempt_id = ?
        `, [attempt_id]);

        const { total_questions, correct_answers } = scoreRows[0];
        const score = Math.round((correct_answers / total_questions) * 100);

        // Update quiz attempt
        await pool.execute(`
            UPDATE quiz_attempts 
            SET submitted_at = CURRENT_TIMESTAMP, status = 'completed', 
                score = ?, total_questions = ?
            WHERE id = ?
        `, [score, total_questions, attempt_id]);

        res.json({
            success: true,
            score: score,
            correct_answers: correct_answers,
            total_questions: total_questions
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get quiz results with author verification
app.post('/api/quiz/:id/results', async (req, res) => {
    try {
        const { id } = req.params;
        const { attempt_id, author_password } = req.body;

        // Verify author password
        const [quizRows] = await pool.execute(
            'SELECT author_password FROM quizzes WHERE id = ?',
            [id]
        );

        if (quizRows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const isAuthor = quizRows[0].author_password === author_password;

        // Get user answers with question details
        const [answerRows] = await pool.execute(`
            SELECT 
                ua.question_id,
                ua.selected_option_id,
                ua.is_correct,
                q.question_text,
                q.order_num,
                qo_selected.option_text as selected_option,
                qo_correct.id as correct_option_id,
                qo_correct.option_text as correct_option
            FROM user_answers ua
            JOIN questions q ON ua.question_id = q.id
            LEFT JOIN question_options qo_selected ON ua.selected_option_id = qo_selected.id
            JOIN question_options qo_correct ON q.id = qo_correct.question_id AND qo_correct.is_correct = 1
            WHERE ua.attempt_id = ?
            ORDER BY q.order_num
        `, [attempt_id]);

        const results = {
            answers: answerRows,
            show_correct_answers: isAuthor
        };

        res.json(results);
    } catch (error) {
        console.error('Get results error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get quiz statistics (for admin)
app.get('/api/quiz/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;

        // Get overall stats
        const [statsRows] = await pool.execute(`
            SELECT 
                COUNT(*) as total_attempts,
                AVG(score) as average_score,
                MAX(score) as highest_score,
                MIN(score) as lowest_score
            FROM quiz_attempts 
            WHERE quiz_id = ? AND status = 'completed'
        `, [id]);

        // Get question difficulty (most missed questions)
        const [difficultyRows] = await pool.execute(`
            SELECT 
                q.id,
                q.question_text,
                s.name as subject_name,
                COUNT(ua.id) as total_answers,
                SUM(CASE WHEN ua.is_correct = 0 THEN 1 ELSE 0 END) as wrong_answers,
                ROUND((SUM(CASE WHEN ua.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(ua.id)) * 100, 2) as error_rate
            FROM questions q
            JOIN subjects s ON q.subject_id = s.id
            LEFT JOIN user_answers ua ON q.id = ua.question_id
            WHERE q.quiz_id = ?
            GROUP BY q.id, q.question_text, s.name
            HAVING total_answers > 0
            ORDER BY error_rate DESC
            LIMIT 10
        `, [id]);

        res.json({
            overall_stats: statsRows[0],
            most_difficult_questions: difficultyRows
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
testConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Quiz server running on http://localhost:${PORT}`);
        console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
        console.log(`🎯 100 questions loaded across 4 subjects`);
        console.log(`🔑 Quiz Password: 123`);
        console.log(`🔐 Author Password: boat4567`);
    });
});

module.exports = app;
