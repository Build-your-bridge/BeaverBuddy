"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
// src/services/authService.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../db/prisma"));
const jwt_1 = require("../utils/jwt");
class AuthService {
    async createUser(name, email, password) {
        // Check if user exists
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            throw new Error('User already exists');
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await prisma_1.default.user.create({
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
        const defaultOutfit = await prisma_1.default.outfit.findFirst({
            where: { name: 'Default Beaver' }
        });
        let equippedOutfit = null;
        if (defaultOutfit) {
            await prisma_1.default.userOutfit.create({
                data: {
                    userId: user.id,
                    outfitId: defaultOutfit.id,
                    equipped: true,
                }
            });
            // Update user's equipped outfit
            await prisma_1.default.user.update({
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
        const token = (0, jwt_1.generateToken)({ userId: user.id, email: user.email });
        return { user: { ...user, equippedOutfit }, token };
    }
    async loginUser(email, password) {
        // Find user with equipped outfit
        const user = await prisma_1.default.user.findUnique({
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
        const isValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }
        // Generate token
        const token = (0, jwt_1.generateToken)({ userId: user.id, email: user.email });
        // Remove password from user object and add equipped outfit
        const { password: _, userOutfits, ...userWithoutPassword } = user;
        const equippedOutfit = userOutfits.length > 0 ? {
            id: userOutfits[0].outfit.id,
            name: userOutfits[0].outfit.name,
            image: userOutfits[0].outfit.image
        } : null;
        return { user: { ...userWithoutPassword, equippedOutfitId: user.equippedOutfitId, equippedOutfit }, token };
    }
    async getUserById(userId) {
        const user = await prisma_1.default.user.findUnique({
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
exports.AuthService = AuthService;
