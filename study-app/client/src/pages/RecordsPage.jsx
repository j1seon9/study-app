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
import RecordCard from '../components/RecordCard.jsx';
import RecordFormDialog from '../components/RecordFormDialog.jsx';
import { fetchRecords, createRecord, updateRecord, deleteRecord } from '../api/records.api.js';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * 공부 기록 페이지
 * - "오늘" / "전체" 필터
 * - 카드 기반, 모바일 우선 레이아웃
 */
function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('today'); // 'today' | 'all'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const loadRecords = useCallback(async (currentFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const params = currentFilter === 'today' ? { date: todayISO() } : {};
      const data = await fetchRecords(params);
      setRecords(data);
    } catch (err) {
      setError(err.response?.data?.message || '공부 기록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords(filter);
  }, [filter, loadRecords]);

  const handleFilterChange = (_e, value) => {
    if (value) setFilter(value);
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
      await updateRecord(editingRecord._id, payload);
    } else {
      await createRecord(payload);
    }
    await loadRecords(filter);
  };

  const handleDelete = async (record) => {
    const confirmed = window.confirm(`'${record.subject}' 기록을 삭제할까요?`);
    if (!confirmed) return;

    try {
      await deleteRecord(record._id);
      setRecords((prev) => prev.filter((r) => r._id !== record._id));
    } catch (err) {
      setError(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records]
  );

  const totalMinutes = useMemo(
    () => sortedRecords.reduce((sum, r) => sum + r.actualMinutes, 0),
    [sortedRecords]
  );

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">공부 기록</Typography>
          <ToggleButtonGroup size="small" value={filter} exclusive onChange={handleFilterChange}>
            <ToggleButton value="today">오늘</ToggleButton>
            <ToggleButton value="all">전체</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {!isLoading && sortedRecords.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {filter === 'today' ? '오늘 총' : '전체 총'} 공부시간: {totalMinutes}분
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
        ) : sortedRecords.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography>
              {filter === 'today' ? '오늘 등록된 공부 기록이 없습니다.' : '등록된 공부 기록이 없습니다.'}
            </Typography>
            <Typography variant="body2">우측 하단 + 버튼으로 새 기록을 추가해보세요.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {sortedRecords.map((record) => (
              <RecordCard
                key={record._id}
                record={record}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label="기록 추가"
        onClick={openCreateDialog}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <RecordFormDialog
        open={dialogOpen}
        initialRecord={editingRecord}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}

export default RecordsPage;
