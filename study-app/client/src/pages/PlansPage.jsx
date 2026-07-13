import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import NavBar from '../components/NavBar.jsx';
import PlanCard from '../components/PlanCard.jsx';
import PlanFormDialog from '../components/PlanFormDialog.jsx';
import {
  fetchPlans,
  createPlan,
  updatePlan,
  togglePlanComplete,
  deletePlan,
} from '../api/plans.api.js';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * 공부 계획 관리 페이지
 * - "오늘" / "전체" 필터
 * - 카드 기반, 모바일 우선 레이아웃
 */
function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [filter, setFilter] = useState('today'); // 'today' | 'all'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const loadPlans = useCallback(async (currentFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const params = currentFilter === 'today' ? { date: todayISO() } : {};
      const data = await fetchPlans(params);
      setPlans(data);
    } catch (err) {
      setError(err.response?.data?.message || '공부 계획을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans(filter);
  }, [filter, loadPlans]);

  const handleFilterChange = (_e, value) => {
    if (value) setFilter(value);
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const openEditDialog = (plan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (editingPlan) {
      await updatePlan(editingPlan._id, payload);
    } else {
      await createPlan(payload);
    }
    await loadPlans(filter);
  };

  const handleToggle = async (plan) => {
    // 낙관적 업데이트: 서버 응답을 기다리지 않고 먼저 화면을 갱신한다.
    setPlans((prev) =>
      prev.map((p) => (p._id === plan._id ? { ...p, isCompleted: !p.isCompleted } : p))
    );
    try {
      await togglePlanComplete(plan._id);
    } catch (err) {
      setError(err.response?.data?.message || '완료 상태 변경에 실패했습니다.');
      loadPlans(filter);
    }
  };

  const handleDelete = async (plan) => {
    const confirmed = window.confirm(`'${plan.subject}' 계획을 삭제할까요?`);
    if (!confirmed) return;

    try {
      await deletePlan(plan._id);
      setPlans((prev) => prev.filter((p) => p._id !== plan._id));
    } catch (err) {
      setError(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return new Date(a.planDate) - new Date(b.planDate);
      }),
    [plans]
  );

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">공부 계획</Typography>
          <ToggleButtonGroup
            size="small"
            value={filter}
            exclusive
            onChange={handleFilterChange}
          >
            <ToggleButton value="today">오늘</ToggleButton>
            <ToggleButton value="all">전체</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : sortedPlans.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography>
              {filter === 'today' ? '오늘 등록된 공부 계획이 없습니다.' : '등록된 공부 계획이 없습니다.'}
            </Typography>
            <Typography variant="body2">우측 하단 + 버튼으로 새 계획을 추가해보세요.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {sortedPlans.map((plan) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                onToggle={handleToggle}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label="계획 추가"
        onClick={openCreateDialog}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <PlanFormDialog
        open={dialogOpen}
        initialPlan={editingPlan}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}

export default PlansPage;
