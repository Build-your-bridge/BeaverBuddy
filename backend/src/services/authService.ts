// src/services/authService.ts
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { generateToken } from '../utils/jwt';
import { User } from '@prisma/client';

export type UserResponse = Omit<User, 'password'>;

export class AuthService {
  async createUser(name: string, email: string, password: string): Promise<{ user: UserResponse, token: string }> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        password: false,
      }
    });

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return { user, token };
  }

  async loginUser(email: string, password: string): Promise<{ user: UserResponse, token: string }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async getUserById(userId: number): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        password: false,
      }
    });

    return user;
  }
}