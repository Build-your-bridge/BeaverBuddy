"use strict";
// src/utils/validators.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateName = exports.validatePassword = exports.validateEmail = void 0;
const validateEmail = (email) => {
    if (!email) {
        return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email address';
    }
    return null;
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    if (!password) {
        return 'Password is required';
    }
    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    return null;
};
exports.validatePassword = validatePassword;
const validateName = (name) => {
    if (!name) {
        return 'Name is required';
    }
    if (name.trim().length < 2) {
        return 'Name must be at least 2 characters';
    }
    return null;
};
exports.validateName = validateName;
