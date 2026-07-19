import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import NavBar from '../components/NavBar.jsx';
import AiReportCard from '../components/AiReportCard.jsx';

import {
  fetchAiReports,
  createAiReport,
} from '../api/ai.api.js';


function AiReportPage() {
  const [reports, setReports] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [error, setError] = useState('');


  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAiReports();
      setReports(data);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'AI 리포트를 불러오지 못했습니다.'
      );

    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    loadReports();
  }, [loadReports]);


  const handleGenerate = async () => {
    setError('');
    setIsGenerating(true);

    try {
      await createAiReport();
      await loadReports();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'AI 리포트 생성 중 오류가 발생했습니다.'
      );

    } finally {
      setIsGenerating(false);
    }
  };


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
          py: 2,
          pb: 8,
        }}
      >

        <Stack spacing={2}>


          <Paper
            sx={{
              p: 2,
              background:
                'linear-gradient(135deg,rgba(37,99,235,.08),rgba(124,58,237,.08))',

              backdropFilter:
                'blur(12px)',
            }}
          >

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1.5}
            >

              <Box sx={{ minWidth: 0 }}>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >

                  <AutoAwesomeIcon
                    color="primary"
                    fontSize="small"
                  />


                  <Typography
                    variant="h6"
                    noWrap
                  >
                    AI 학습 리포트
                  </Typography>

                </Stack>


                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: .5,
                  }}
                >
                  학습 데이터를 기반으로 맞춤 분석을 제공합니다.
                </Typography>

              </Box>


              <Button
                size="small"
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? '분석 중'
                  : '새 리포트'}
              </Button>

            </Stack>

          </Paper>



          <Paper
            sx={{
              p: 2,
            }}
          >

            <Typography
              variant="body2"
              color="text.secondary"
            >
              별도의 개인정보 입력 없이,
              저장된 공부 계획·공부 기록·테스트 점수·
              모의고사 결과만 이용하여 분석합니다.
            </Typography>

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
                p: 4,
              }}
            >

              <Stack alignItems="center">
                <CircularProgress size={28} />
              </Stack>

            </Paper>


          ) : reports.length === 0 ? (

            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
              }}
            >

              <Typography>
                아직 생성된 AI 리포트가 없습니다.
              </Typography>


              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: .5,
                }}
              >
                공부 데이터가 쌓이면 AI 분석 결과를 확인할 수 있습니다.
              </Typography>

            </Paper>


          ) : (

            <Stack spacing={1.5}>

              {reports.map((report) => (
                <AiReportCard
                  key={report._id}
                  report={report}
                />
              ))}

            </Stack>

          )}

        </Stack>

      </Container>

    </Box>
  );
}


export default AiReportPage;