// src/controllers/streakController.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

// Check and update user streak
export const checkStreak = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLoginDate = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

    let currentStreak = user.currentStreak || 0;
    let shouldShowPopup = false;
    let pointsAwarded = 0;

    console.log('🔍 STREAK CHECK:', {
      userId,
      lastLoginDate: lastLoginDate?.toISOString(),
      currentStreak: user.currentStreak,
      today: today.toISOString()
    });

    // Calculate streak rewards (5, 10, 15, 20, 25, 30, 35 for days 1-7)
    const getStreakReward = (streak: number): number => {
      const day = ((streak - 1) % 7) + 1;
      return day * 5;
    };

    if (!lastLoginDate) {
      // First time login ever
      currentStreak = 1;
      shouldShowPopup = true;
      pointsAwarded = getStreakReward(currentStreak);
    } else {
      const lastLogin = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate());
      const diffTime = today.getTime() - lastLogin.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 0) {
        // Same day - already logged in today, don't show popup
        shouldShowPopup = false;
      } else if (diffDays === 1) {
        // Consecutive day - increment streak
        currentStreak = currentStreak === 7 ? 1 : currentStreak + 1;
        shouldShowPopup = true;
        pointsAwarded = getStreakReward(currentStreak);
      } else {
        // Streak broken - reset to 1
        currentStreak = 1;
        shouldShowPopup = true;
        pointsAwarded = getStreakReward(currentStreak);
      }
    }

    // Update user in database
    if (shouldShowPopup) {
      console.log('✅ UPDATING STREAK:', {
        currentStreak,
        pointsAwarded,
        shouldShowPopup
      });
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: currentStreak,
          lastLoginDate: today,
          points: { increment: pointsAwarded }
        }
      });
    } else {
      console.log('⏭️ SKIPPING STREAK UPDATE - Same day login');
    }

    console.log('📤 RETURNING:', {
      currentStreak,
      shouldShowPopup,
      pointsAwarded,
      todayPrize: getStreakReward(currentStreak)
    });

    return res.status(200).json({
      currentStreak,
      shouldShowPopup,
      pointsAwarded,
      todayPrize: getStreakReward(currentStreak)
    });

  } catch (error: any) {
    console.error('Check streak error:', error);
    return res.status(500).json({
      error: 'Failed to check streak',
    });
  }
};

// Get current streak info
export const getStreakInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        lastLoginDate: true,
        points: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      currentStreak: user.currentStreak || 0,
      lastLoginDate: user.lastLoginDate,
      points: user.points
    });

  } catch (error: any) {
    console.error('Get streak info error:', error);
    return res.status(500).json({
      error: 'Failed to get streak info',
    });
  }
};