"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.signup = void 0;
const authService_1 = require("../services/authService");
const validators_1 = require("../utils/validators");
const authService = new authService_1.AuthService();
const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Validation
        const nameError = (0, validators_1.validateName)(name);
        if (nameError) {
            return res.status(422).json({ error: nameError });
        }
        const emailError = (0, validators_1.validateEmail)(email);
        if (emailError) {
            return res.status(422).json({ error: emailError });
        }
        const passwordError = (0, validators_1.validatePassword)(password);
        if (passwordError) {
            return res.status(422).json({ error: passwordError });
        }
        // Create user
        const { user, token } = await authService.createUser(name, email, password);
        res.status(201).json({
            message: 'User created successfully',
            token,
            user,
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        if (error.message === 'User already exists') {
            return res.status(422).json({ error: error.message });
        }
        res.status(500).json({ error: 'Something went wrong' });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        const emailError = (0, validators_1.validateEmail)(email);
        if (emailError) {
            return res.status(422).json({ error: emailError });
        }
        if (!password) {
            return res.status(422).json({ error: 'Password is required' });
        }
        // Login user
        const { user, token } = await authService.loginUser(email, password);
        res.status(200).json({
            message: 'Login successful',
            token,
            user,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error.message === 'Invalid credentials') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Something went wrong' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await authService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
exports.getProfile = getProfile;
