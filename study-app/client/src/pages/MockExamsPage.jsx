import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import NavBar from '../components/NavBar.jsx';
import MockExamCard from '../components/MockExamCard.jsx';
import MockExamFormDialog from '../components/MockExamFormDialog.jsx';
import MockExamBatchImportDialog from '../components/MockExamBatchImportDialog.jsx';
import {
  fetchMockExams,
  createMockExam,
  updateMockExam,
  deleteMockExam,
  bulkCreateMockExams,
} from '../api/mockExams.api.js';

/**
 * 모의고사 결과 페이지
 * - 카드 기반, 최신순 목록
 * - 성적표 사진 한 장으로 전체 과목을 한 번에 인식(OCR, 브라우저 내 처리)해 등록 가능
 * - 과목 1건씩 수기로 추가/수정도 가능
 */
function MockExamsPage() {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMockExams();
      setExams(data);
    } catch (err) {
      setError(err.response?.data?.message || '모의고사 결과를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const openCreateDialog = () => {
    setEditingExam(null);
    setFormDialogOpen(true);
  };

  const openEditDialog = (exam) => {
    setEditingExam(exam);
    setFormDialogOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (editingExam) {
      await updateMockExam(editingExam._id, payload);
    } else {
      await createMockExam(payload);
    }
    await loadExams();
  };

  const handleBatchSubmit = async (payload) => {
    await bulkCreateMockExams(payload);
    await loadExams();
  };

  const handleDelete = async (exam) => {
    const confirmed = window.confirm(`'${exam.subject}' 모의고사 결과를 삭제할까요?`);
    if (!confirmed) return;

    try {
      await deleteMockExam(exam._id);
      setExams((prev) => prev.filter((e) => e._id !== exam._id));
    } catch (err) {
      setError(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => new Date(b.examDate) - new Date(a.examDate)),
    [exams]
  );

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">모의고사 결과</Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={() => setBatchDialogOpen(true)}
          >
            사진으로 전체 과목 인식
          </Button>
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
        ) : sortedExams.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography>등록된 모의고사 결과가 없습니다.</Typography>
            <Typography variant="body2">
              상단 버튼으로 성적표 사진을 올려 전체 과목을 한 번에 등록해보세요.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {sortedExams.map((exam) => (
              <MockExamCard
                key={exam._id}
                exam={exam}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label="모의고사 결과 수기 추가"
        onClick={openCreateDialog}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <MockExamFormDialog
        open={formDialogOpen}
        initialExam={editingExam}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <MockExamBatchImportDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        onSubmit={handleBatchSubmit}
      />
    </Box>
  );
}

export default MockExamsPage;
