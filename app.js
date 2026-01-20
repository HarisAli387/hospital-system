require('dotenv').config(); // Sab se upar ye lazmi hai
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(express.static('public')); 
app.use(cors());

// --- TiDB Cloud Configuration ---
// Ab hum passwords seedha nahi likh rahe, .env se utha rahe hain
const db = mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '3kSxUAZkpfyzos2.root',
    password: process.env.DB_PASSWORD, 
    database: 'test',
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect(err => {
    if (err) console.error("TiDB Connection Error: " + err.message);
    else console.log("TiDB Cloud Database connected successfully.");
});

// --- ADMIN LOGIN ROUTE (Naya) ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    // Password .env file se check ho raha hai
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, message: "Login Successful" });
    } else {
        res.status(401).json({ success: false, message: "Ghalat Password!" });
    }
});

// 1. Doctors list
app.get('/api/doctors-list', (req, res) => {
    db.query("SELECT * FROM doctors", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. Admin Dashboard Data
app.get('/api/admin/bookings', (req, res) => {
    const sql = `
        SELECT a.id, p.name as pName, p.email, p.gender, p.age, d.name as dName, a.appointment_date, a.appointment_time, a.status 
        FROM appointments a 
        JOIN patients p ON a.patient_id = p.id 
        JOIN doctors d ON a.doctor_id = d.id
        ORDER BY a.id DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 3. Mukammal Booking
app.post('/api/full-booking', (req, res) => {
    const { name, phone, email, dob, age, gender, doctor_id, date, time } = req.body;
    
    const pSql = "INSERT INTO patients (name, phone, email, dob, age, gender) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(pSql, [name, phone, email, dob, age, gender], (err, pResult) => {
        if (err) {
            console.error("Patient Insert Error:", err);
            return res.status(500).json({ message: "Patient data could not be saved." });
        }
        
        const appSql = "INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status) VALUES (?, ?, ?, ?, 'Pending')";
        db.query(appSql, [pResult.insertId, doctor_id, date, time], (err) => {
            if (err) {
                console.error("Appointment Insert Error:", err);
                return res.status(500).json({ message: "could not create Appointment." });
            }
            res.json({ message: "Appointment created successfully." });
        });
    });
});

// 4. Status Update Route
app.post('/api/admin/update-status', (req, res) => {
    const { id, status } = req.body;
    const query = "UPDATE appointments SET status = ? WHERE id = ?";
    db.query(query, [status, id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database update failed" });
        }
        res.json({ message: `Appointment successfully ${status}!` });
    });
});

// 5. DELETE Route
app.delete('/api/admin/delete-booking/:id', (req, res) => {
    const id = req.params.id;
    const query = "DELETE FROM appointments WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Database delete failed" });
        }
        res.json({ message: "Appointment successfully deleted!" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));