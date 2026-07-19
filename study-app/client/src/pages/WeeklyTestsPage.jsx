// src/pages/WeeklyTestsPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

import NavBar from '../components/NavBar.jsx';
import WeeklyTestCard from '../components/WeeklyTestCard.jsx';
import WeeklyTestFormDialog from '../components/WeeklyTestFormDialog.jsx';

import {
  fetchWeeklyTests,
  createWeeklyTest,
  updateWeeklyTest,
  deleteWeeklyTest,
} from '../api/weeklyTests.api.js';


function WeeklyTestsPage() {
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);


  const loadTests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchWeeklyTests();
      setTests(data);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        '미니테스트 목록을 불러오지 못했습니다.'
      );

    } finally {
      setIsLoading(false);
    }

  }, []);


  useEffect(() => {
    loadTests();
  }, [loadTests]);


  const openCreateDialog = () => {
    setEditingTest(null);
    setDialogOpen(true);
  };


  const openEditDialog = (test) => {
    setEditingTest(test);
    setDialogOpen(true);
  };


  const handleSubmit = async (payload) => {
    if (editingTest) {
      await updateWeeklyTest(
        editingTest._id,
        payload
      );
    } else {
      await createWeeklyTest(payload);
    }

    await loadTests();
  };


  const handleDelete = async (test) => {
    const confirmed = window.confirm(
      `'${test.subject}' 테스트 결과를 삭제할까요?`
    );

    if (!confirmed) return;


    try {
      await deleteWeeklyTest(test._id);

      setTests((prev) =>
        prev.filter(
          (item) => item._id !== test._id
        )
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
        '삭제에 실패했습니다.'
      );
    }
  };


  const sortedTests = useMemo(
    () =>
      [...tests].sort(
        (a, b) =>
          new Date(b.testDate) -
          new Date(a.testDate)
      ),
    [tests]
  );


  const averageScore = useMemo(() => {
    if (!sortedTests.length) return null;

    const sum = sortedTests.reduce(
      (acc, test) =>
        acc + test.score,
      0
    );

    return Math.round(
      (sum / sortedTests.length) * 10
    ) / 10;

  }, [sortedTests]);


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 50%,#EEF2FF 100%)',
      }}
    >

      <NavBar />


      <Container
        maxWidth="md"
        sx={{
          py: 2.5,
          pb: 12,
        }}
      >

        <Stack spacing={2}>


          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              background:
                'linear-gradient(135deg,rgba(37,99,235,.08),rgba(124,58,237,.08))',
              backdropFilter: 'blur(18px)',
            }}
          >

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              alignItems={{
                xs: 'stretch',
                sm: 'center',
              }}
              spacing={1.5}
            >

              <QuizRoundedIcon
                color="primary"
                sx={{
                  fontSize: 32,
                }}
              />


              <Box flex={1}>

                <Typography
                  variant="h6"
                  fontWeight={700}
                >
                  미니테스트
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.7,
                  }}
                >
                  학습 결과를 기록하고 AI 분석에 활용하세요.
                </Typography>

              </Box>


              {sortedTests.length > 0 && (
                <Chip
                  color="primary"
                  icon={<TrendingUpRoundedIcon />}
                  label={`${averageScore}점`}
                  sx={{
                    width: 'fit-content',
                  }}
                />
              )}

            </Stack>

          </Paper>



          {error && (
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}




          {isLoading ? (

            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
              }}
            >

              <Stack
                alignItems="center"
              >
                <CircularProgress size={28} />
              </Stack>

            </Paper>



          ) : sortedTests.length === 0 ? (

            <Paper
              sx={{
                p: 3,
                borderRadius: 3,
                textAlign: 'center',
              }}
            >

              <Typography
                fontWeight={600}
              >
                등록된 미니테스트 결과가 없습니다.
              </Typography>


              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  lineHeight: 1.7,
                }}
              >
                우측 하단 + 버튼으로
                <br />
                새 결과를 추가해보세요.
              </Typography>

            </Paper>



          ) : (

            <Stack spacing={1.5}>

              {sortedTests.map((test) => (
                <WeeklyTestCard
                  key={test._id}
                  test={test}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                />
              ))}

            </Stack>

          )}


        </Stack>


      </Container>



      <Fab
        color="primary"
        aria-label="테스트 결과 추가"
        onClick={openCreateDialog}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          boxShadow: 5,
        }}
      >

        <AddRoundedIcon />

      </Fab>



      <WeeklyTestFormDialog
        open={dialogOpen}
        initialTest={editingTest}
        onClose={() =>
          setDialogOpen(false)
        }
        onSubmit={handleSubmit}
      />


    </Box>
  );
}


export default WeeklyTestsPage;