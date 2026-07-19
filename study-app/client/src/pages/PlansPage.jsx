// src/pages/PlansPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';

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


const todayISO = () =>
  new Date().toISOString().slice(0, 10);



function PlansPage() {
  const [plans, setPlans] = useState([]);

  const [filter, setFilter] = useState('today');

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingPlan, setEditingPlan] = useState(null);



  const loadPlans = useCallback(
    async (currentFilter) => {
      setIsLoading(true);
      setError('');

      try {
        const params =
          currentFilter === 'today'
            ? { date: todayISO() }
            : {};

        const data = await fetchPlans(params);

        setPlans(data);

      } catch (err) {
        setError(
          err.response?.data?.message ||
          '공부 계획을 불러오지 못했습니다.'
        );

      } finally {
        setIsLoading(false);
      }
    },
    []
  );



  useEffect(() => {
    loadPlans(filter);
  }, [filter, loadPlans]);



  const handleFilterChange = (_, value) => {
    if (value) {
      setFilter(value);
    }
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
      await updatePlan(
        editingPlan._id,
        payload
      );
    } else {
      await createPlan(payload);
    }

    await loadPlans(filter);
  };



  const handleToggle = async (plan) => {
    setPlans((prev) =>
      prev.map((item) =>
        item._id === plan._id
          ? {
            ...item,
            isCompleted:
              !item.isCompleted,
          }
          : item
      )
    );


    try {
      await togglePlanComplete(plan._id);

    } catch (err) {

      setError(
        err.response?.data?.message ||
        '완료 상태 변경에 실패했습니다.'
      );

      loadPlans(filter);
    }
  };



  const handleDelete = async (plan) => {
    const confirmed = window.confirm(
      `'${plan.subject}' 계획을 삭제할까요?`
    );

    if (!confirmed) return;


    try {
      await deletePlan(plan._id);

      setPlans((prev) =>
        prev.filter(
          (item) =>
            item._id !== plan._id
        )
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
        '삭제에 실패했습니다.'
      );
    }
  };



  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) => {

          if (
            a.isCompleted !==
            b.isCompleted
          ) {
            return a.isCompleted ? 1 : -1;
          }

          return (
            new Date(a.planDate) -
            new Date(b.planDate)
          );
        }
      ),
    [plans]
  );



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


          {/* Header */}
          <Card>
            <CardContent>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >

                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >

                  <AssignmentRoundedIcon
                    color="primary"
                    sx={{
                      fontSize: 36,
                    }}
                  />


                  <Box>

                    <Typography variant="h6">
                      공부 계획
                    </Typography>


                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      오늘의 목표를 설정하고 학습 루틴을 관리하세요.
                    </Typography>

                  </Box>

                </Stack>



                <ToggleButtonGroup
                  size="small"
                  value={filter}
                  exclusive
                  onChange={handleFilterChange}
                >

                  <ToggleButton value="today">
                    오늘
                  </ToggleButton>


                  <ToggleButton value="all">
                    전체
                  </ToggleButton>

                </ToggleButtonGroup>

              </Stack>

            </CardContent>
          </Card>



          {error && (
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{
                borderRadius: 3,
              }}
            >
              {error}
            </Alert>
          )}



          {isLoading ? (

            <Card>

              <Stack
                alignItems="center"
                sx={{
                  py: 6,
                }}
              >
                <CircularProgress size={28} />
              </Stack>

            </Card>


          ) : sortedPlans.length === 0 ? (

            <Card>

              <CardContent
                sx={{
                  py: 6,
                  textAlign: 'center',
                }}
              >

                <Typography>
                  {filter === 'today'
                    ? '오늘 등록된 공부 계획이 없습니다.'
                    : '등록된 공부 계획이 없습니다.'}
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                  }}
                >
                  우측 하단 + 버튼으로 새 계획을 추가해보세요.
                </Typography>


              </CardContent>

            </Card>


          ) : (

            <Stack spacing={1.5}>

              {sortedPlans.map(
                (plan) => (

                  <PlanCard
                    key={plan._id}
                    plan={plan}
                    onToggle={handleToggle}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />

                )
              )}

            </Stack>

          )}


        </Stack>

      </Container>



      <Fab
        color="primary"
        aria-label="계획 추가"
        onClick={openCreateDialog}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          boxShadow: 5,
        }}
      >
        <AddRoundedIcon />
      </Fab>



      <PlanFormDialog
        open={dialogOpen}
        initialPlan={editingPlan}
        onClose={() =>
          setDialogOpen(false)
        }
        onSubmit={handleSubmit}
      />

    </Box>
  );
}


export default PlansPage;