import express from 'express';

const router = express.Router();

/**
 * 대시보드 요약 데이터
 * GET /api/dashboard/summary
 */
router.get('/summary', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                todayStudyMinutes: 0,
                weeklyStudyMinutes: 0,
                achievementRate: 0,
                averageScore: 0,
                completedPlans: 0,
                totalPlans: 0,
            },
        });
    } catch (error) {
        console.error('[DASHBOARD SUMMARY ERROR]', error);

        res.status(500).json({
            success: false,
            message: '대시보드 데이터를 불러오는데 실패했습니다.',
        });
    }
});

export default router;