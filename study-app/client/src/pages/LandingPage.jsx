import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';

import {
    AutoAwesomeRounded,
    SchoolRounded,
    AnalyticsRounded,
    PsychologyRounded,
    ArrowForwardRounded,
} from '@mui/icons-material';


const FEATURES = [
    {
        icon: SchoolRounded,
        title: '개인 맞춤 학습 관리',
        desc: '학습 계획과 공부 기록을 기반으로 효율적인 학습 습관을 만듭니다.',
    },
    {
        icon: PsychologyRounded,
        title: 'AI 학습 분석',
        desc: '공부 시간, 테스트 결과, 성적 데이터를 분석하여 방향을 제시합니다.',
    },
    {
        icon: AnalyticsRounded,
        title: '성장 데이터 확인',
        desc: '학습 변화와 약점을 한눈에 확인할 수 있습니다.',
    },
];


function LandingPage() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                background:
                    'linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 45%,#EEF2FF 100%)',
            }}
        >
            <Container
                maxWidth="lg"
                sx={{
                    py: 8,
                }}
            >

                <Stack
                    alignItems="center"
                    textAlign="center"
                    spacing={3}
                    sx={{
                        pt: {
                            xs: 4,
                            md: 10,
                        },
                    }}
                >

                    <Chip
                        icon={<AutoAwesomeRounded />}
                        label="AI Study Platform"
                        color="primary"
                    />


                    <Typography
                        variant="h1"
                        sx={{
                            maxWidth: 800,
                            fontSize: {
                                xs: '2.2rem',
                                md: '3.4rem',
                            },
                        }}
                    >
                        AI와 함께 만드는
                        <br />
                        나만의 학습 전략
                    </Typography>


                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                            maxWidth: 620,
                        }}
                    >
                        공부 계획부터 학습 기록, 테스트 분석,
                        <br />
                        AI 기반 맞춤 분석까지 하나의 플랫폼에서 관리하세요.
                    </Typography>


                    <Stack
                        direction={{
                            xs: 'column',
                            sm: 'row',
                        }}
                        spacing={2}
                        sx={{
                            pt: 2,
                        }}
                    >

                        <Button
                            component={Link}
                            to="/register"
                            variant="contained"
                            size="large"
                            endIcon={<ArrowForwardRounded />}
                            sx={{
                                height: 54,
                                px: 4,
                            }}
                        >
                            시작하기
                        </Button>


                        <Button
                            component={Link}
                            to="/login"
                            variant="outlined"
                            size="large"
                            sx={{
                                height: 54,
                                px: 4,
                            }}
                        >
                            로그인
                        </Button>

                    </Stack>

                </Stack>


                <Paper
                    sx={{
                        mt: 8,
                        p: {
                            xs: 2,
                            md: 4,
                        },
                        borderRadius: 4,
                        background:
                            'rgba(255,255,255,.75)',
                        backdropFilter:
                            'blur(20px)',
                    }}
                >

                    <Stack spacing={2}>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                        >
                            AI 학습 대시보드
                        </Typography>


                        <Grid container spacing={2}>

                            {[
                                ['오늘 학습', '120분', '#EFF6FF'],
                                ['AI 학습 점수', '87점', '#F5F3FF'],
                                ['목표 달성률', '92%', '#ECFDF5'],
                            ].map(([title, value, bg]) => (
                                <Grid item xs={12} md={4} key={title}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            background: bg,
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {title}
                                        </Typography>

                                        <Typography variant="h4">
                                            {value}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}

                        </Grid>

                    </Stack>

                </Paper>


                <Grid
                    container
                    spacing={2}
                    sx={{
                        mt: 4,
                    }}
                >

                    {FEATURES.map((item) => {

                        const Icon = item.icon;

                        return (
                            <Grid
                                item
                                xs={12}
                                md={4}
                                key={item.title}
                            >

                                <Paper
                                    sx={{
                                        p: 3,
                                        height: '100%',
                                        borderRadius: 4,
                                    }}
                                >

                                    <Stack spacing={1.5}>

                                        <Icon
                                            color="primary"
                                            sx={{
                                                fontSize: 36,
                                            }}
                                        />

                                        <Typography variant="h6">
                                            {item.title}
                                        </Typography>


                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {item.desc}
                                        </Typography>

                                    </Stack>

                                </Paper>

                            </Grid>
                        );
                    })}

                </Grid>

            </Container>
        </Box>
    );
}


export default LandingPage;