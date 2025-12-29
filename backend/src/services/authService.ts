// src/services/authService.ts
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { generateToken } from '../utils/jwt';
import { User } from '@prisma/client';

export type UserResponse = Omit<User, 'password'> & {
  equippedOutfit?: {
    id: number;
    name: string;
    image: string;
  } | null;
};

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
        points: true,
        equippedOutfitId: true,
        createdAt: true,
        updatedAt: true,
        password: false,
      }
    });

    // Give the default beaver outfit to new users
    const defaultOutfit = await prisma.outfit.findFirst({
      where: { name: 'Default Beaver' }
    });

    let equippedOutfit = null;
    if (defaultOutfit) {
      await prisma.userOutfit.create({
        data: {
          userId: user.id,
          outfitId: defaultOutfit.id,
          equipped: true,
        }
      });

      // Update user's equipped outfit
      await prisma.user.update({
        where: { id: user.id },
        data: { equippedOutfitId: defaultOutfit.id }
      });

      equippedOutfit = {
        id: defaultOutfit.id,
        name: defaultOutfit.name,
        image: defaultOutfit.image
      };
    }

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return { user: { ...user, equippedOutfit }, token };
  }

  async loginUser(email: string, password: string): Promise<{ user: UserResponse, token: string }> {
    // Find user with equipped outfit
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userOutfits: {
          where: { equipped: true },
          include: { outfit: true }
        }
      }
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

    // Remove password from user object and add equipped outfit
    const { password: _, userOutfits, ...userWithoutPassword } = user;
    const equippedOutfit = userOutfits.length > 0 ? {
      id: userOutfits[0].outfit.id,
      name: userOutfits[0].outfit.name,
      image: userOutfits[0].outfit.image
    } : null;

    return { user: { ...userWithoutPassword, equippedOutfitId: user.equippedOutfitId, equippedOutfit }, token };
  }

  async getUserById(userId: number): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        points: true,
        equippedOutfitId: true,
        createdAt: true,
        updatedAt: true,
        password: false,
      }
    });

    return user;
  }
}