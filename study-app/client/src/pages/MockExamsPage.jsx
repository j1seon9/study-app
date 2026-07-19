import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
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
      setError(
        err.response?.data?.message ||
        '모의고사 결과를 불러오지 못했습니다.'
      );

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
      await updateMockExam(
        editingExam._id,
        payload
      );
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
    const confirmed = window.confirm(
      `'${exam.subject}' 모의고사 결과를 삭제할까요?`
    );

    if (!confirmed) return;


    try {
      await deleteMockExam(exam._id);

      setExams((prev) =>
        prev.filter(
          (item) => item._id !== exam._id
        )
      );

    } catch (err) {
      setError(
        err.response?.data?.message ||
        '삭제에 실패했습니다.'
      );
    }
  };


  const sortedExams = useMemo(
    () =>
      [...exams].sort(
        (a, b) =>
          new Date(b.examDate) -
          new Date(a.examDate)
      ),
    [exams]
  );


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 100%)',
      }}
    >

      <NavBar />


      <Container
        maxWidth="sm"
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
              backdropFilter: 'blur(18px)',
              background:
                'rgba(255,255,255,.85)',
            }}
          >

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              justifyContent="space-between"
              alignItems={{
                xs: 'stretch',
                sm: 'center',
              }}
              spacing={1.5}
            >

              <Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  모의고사 결과
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  AI 분석을 위한 시험 결과 관리
                </Typography>

              </Box>



              <Button
                fullWidth
                size="small"
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={() =>
                  setBatchDialogOpen(true)
                }
                sx={{
                  whiteSpace: 'nowrap',
                }}
              >
                사진 인식
              </Button>


            </Stack>

          </Paper>



          {error && (
            <Alert
              severity="error"
              onClose={() => setError('')}
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
                <CircularProgress size={32} />
              </Stack>

            </Paper>



          ) : sortedExams.length === 0 ? (

            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 3,
              }}
            >

              <Typography
                fontWeight={600}
              >
                등록된 모의고사 결과가 없습니다.
              </Typography>


              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  lineHeight: 1.7,
                }}
              >
                성적표 사진을 업로드하면
                <br />
                전체 과목을 한번에 등록할 수 있습니다.
              </Typography>

            </Paper>



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


        </Stack>


      </Container>



      <Fab
        color="primary"
        aria-label="모의고사 결과 추가"
        onClick={openCreateDialog}
        sx={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          boxShadow: 6,
        }}
      >
        <AddIcon />
      </Fab>



      <MockExamFormDialog
        open={formDialogOpen}
        initialExam={editingExam}
        onClose={() =>
          setFormDialogOpen(false)
        }
        onSubmit={handleSubmit}
      />



      <MockExamBatchImportDialog
        open={batchDialogOpen}
        onClose={() =>
          setBatchDialogOpen(false)
        }
        onSubmit={handleBatchSubmit}
      />


    </Box>
  );
}


export default MockExamsPage;