import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import NavBar from '../components/NavBar.jsx';
import WeeklyTestCard from '../components/WeeklyTestCard.jsx';
import WeeklyTestFormDialog from '../components/WeeklyTestFormDialog.jsx';
import {
  fetchWeeklyTests,
  createWeeklyTest,
  updateWeeklyTest,
  deleteWeeklyTest,
} from '../api/weeklyTests.api.js';

/**
 * 미니테스트 페이지
 * - 카드 기반, 최신순 목록
 */
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
      setError(err.response?.data?.message || '미니테스트 목록을 불러오지 못했습니다.');
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
      await updateWeeklyTest(editingTest._id, payload);
    } else {
      await createWeeklyTest(payload);
    }
    await loadTests();
  };

  const handleDelete = async (test) => {
    const confirmed = window.confirm(`'${test.subject}' 테스트 결과를 삭제할까요?`);
    if (!confirmed) return;

    try {
      await deleteWeeklyTest(test._id);
      setTests((prev) => prev.filter((t) => t._id !== test._id));
    } catch (err) {
      setError(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const sortedTests = useMemo(
    () => [...tests].sort((a, b) => new Date(b.testDate) - new Date(a.testDate)),
    [tests]
  );

  const averageScore = useMemo(() => {
    if (sortedTests.length === 0) return null;
    const sum = sortedTests.reduce((acc, t) => acc + t.score, 0);
    return Math.round((sum / sortedTests.length) * 10) / 10;
  }, [sortedTests]);

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">미니테스트</Typography>
        </Stack>

        {!isLoading && sortedTests.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            평균 점수: {averageScore}점 (총 {sortedTests.length}회)
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : sortedTests.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography>등록된 미니테스트 결과가 없습니다.</Typography>
            <Typography variant="body2">우측 하단 + 버튼으로 새 결과를 추가해보세요.</Typography>
          </Box>
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
      </Container>

      <Fab
        color="primary"
        aria-label="테스트 결과 추가"
        onClick={openCreateDialog}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <WeeklyTestFormDialog
        open={dialogOpen}
        initialTest={editingTest}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}

export default WeeklyTestsPage;
