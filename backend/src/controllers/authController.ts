// src/controllers/authController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateEmail, validatePassword, validateName } from '../utils/validators';

const authService = new AuthService();

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    const nameError = validateName(name);
    if (nameError) {
      return res.status(422).json({ error: nameError });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(422).json({ error: emailError });
    }

    const passwordError = validatePassword(password);
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
  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.message === 'User already exists') {
      return res.status(422).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    const emailError = validateEmail(email);
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
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};