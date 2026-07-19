// src/pages/RecordsPage.jsx

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
import Chip from '@mui/material/Chip';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

import NavBar from '../components/NavBar.jsx';
import RecordCard from '../components/RecordCard.jsx';
import RecordFormDialog from '../components/RecordFormDialog.jsx';

import {
  fetchRecords,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../api/records.api.js';


const todayISO = () =>
  new Date().toISOString().slice(0, 10);



function RecordsPage() {
  const [records, setRecords] = useState([]);

  const [filter, setFilter] = useState('today');

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);



  const loadRecords = useCallback(
    async (currentFilter) => {
      setIsLoading(true);
      setError('');

      try {
        const params =
          currentFilter === 'today'
            ? { date: todayISO() }
            : {};

        const data = await fetchRecords(params);

        setRecords(data);

      } catch (err) {
        setError(
          err.response?.data?.message ||
          '공부 기록을 불러오지 못했습니다.'
        );

      } finally {
        setIsLoading(false);
      }
    },
    []
  );



  useEffect(() => {
    loadRecords(filter);
  }, [filter, loadRecords]);



  const handleFilterChange = (_, value) => {
    if (value) {
      setFilter(value);
    }
  };



  const openCreateDialog = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };



  const openEditDialog = (record) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };



  const handleSubmit = async (payload) => {
    if (editingRecord) {
      await updateRecord(
        editingRecord._id,
        payload
      );
    } else {
      await createRecord(payload);
    }

    await loadRecords(filter);
  };



  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `'${record.subject}' 기록을 삭제할까요?`
    );

    if (!confirmed) return;


    try {
      await deleteRecord(record._id);

      setRecords((prev) =>
        prev.filter(
          (item) =>
            item._id !== record._id
        )
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
        '삭제에 실패했습니다.'
      );
    }
  };



  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      ),
    [records]
  );



  const totalMinutes = useMemo(
    () =>
      sortedRecords.reduce(
        (sum, record) =>
          sum + record.actualMinutes,
        0
      ),
    [sortedRecords]
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

                  <MenuBookRoundedIcon
                    color="primary"
                    sx={{
                      fontSize: 36,
                    }}
                  />


                  <Box>
                    <Typography variant="h6">
                      공부 기록
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      학습 시간을 기록하고 성장 데이터를 만들어보세요.
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



          {!isLoading &&
            sortedRecords.length > 0 && (

              <Card>
                <CardContent
                  sx={{
                    py: 1.5,
                  }}
                >

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >

                    <AccessTimeRoundedIcon
                      color="primary"
                    />

                    <Typography
                      variant="body2"
                    >
                      {filter === 'today'
                        ? '오늘 총'
                        : '전체 총'}
                      {' '}
                      공부시간
                    </Typography>


                    <Chip
                      size="small"
                      color="primary"
                      label={`${totalMinutes}분`}
                    />

                  </Stack>

                </CardContent>
              </Card>

            )}



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


          ) : sortedRecords.length === 0 ? (

            <Card>
              <CardContent
                sx={{
                  py: 6,
                  textAlign: 'center',
                }}
              >

                <Typography>
                  {filter === 'today'
                    ? '오늘 등록된 공부 기록이 없습니다.'
                    : '등록된 공부 기록이 없습니다.'}
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                  }}
                >
                  우측 하단 + 버튼으로 새 기록을 추가해보세요.
                </Typography>

              </CardContent>
            </Card>


          ) : (

            <Stack spacing={1.5}>
              {sortedRecords.map(
                (record) => (
                  <RecordCard
                    key={record._id}
                    record={record}
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
        aria-label="기록 추가"
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



      <RecordFormDialog
        open={dialogOpen}
        initialRecord={editingRecord}
        onClose={() =>
          setDialogOpen(false)
        }
        onSubmit={handleSubmit}
      />

    </Box>
  );
}


export default RecordsPage;