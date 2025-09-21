import express from 'express';
import connectDatabase from './config/db.js';
import { check, validationResult } from 'express-validator';
import User from './models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize express application
const app = express();

// Connect to the Database
connectDatabase();

// Configure Middleware
app.use(express.json({ extended: false }));

// API endpoints
/**
 * @route GET /
 * @desc Test endpoint
 */
app.get('/', (req, res) =>
    res.send('http get request sent to root api endpoint')
);

/**
 * @route Post api/users
 * @desc Register user
 */
app.post('/api/users', [
    check('name', 'Please enter your name').not().isEmpty(),
    check('email', 'Please enter a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters' ).isLength({ min: 6})
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            // Check if user already exists
            let user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                return res.status(400).json({
                    errors: [{ msg: 'User with this email already exists' }]
                });
            }

            // Create new user instance
            user = new User({
                name,
                email: email.toLowerCase(),
                password
            });

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            // Save user to database
            await user.save();

            // Create JWT payload
            const payload = {
                user: {
                    id: user.id
                }
            };

            // Generate JWT token
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({
                        msg: 'User registered successfully',
                        token
                    });
                }
            );

        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    }
);

/**
 * @route   POST api/auth
 * @desc    Login user
 */
app.post('/api/auth', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            // Check if user exists
            let user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return res.status(400).json({
                    errors: [{ msg: 'Invalid credentials' }]
                });
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    errors: [{ msg: 'Invalid credentials' }]
                });
            }

            // Create JWT payload
            const payload = {
                user: {
                    id: user.id
                }
            };

            // Generate JWT token
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1h' },
                (err, token) => {
                    if (err) throw err;
                    res.json({
                        msg: 'User logged in successfully',
                        token
                    });
                }
            );

        } catch (error) {
            console.error(error.message);
            res.status(500).send('Server error');
        }
    }
);


// Connection Listener
app.listen(3000, () => console.log('Express server running on port 3000'));
