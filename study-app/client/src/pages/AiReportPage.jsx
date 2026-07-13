import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NavBar from '../components/NavBar.jsx';
import AiReportCard from '../components/AiReportCard.jsx';
import { fetchAiReports, createAiReport } from '../api/ai.api.js';

/**
 * AI 리포트 페이지
 * - 개인정보 최소 수집 정책에 따라 학생에게 어떤 정보도 묻지 않는다.
 * - 버튼을 누르면 서버가 이미 쌓여 있는 공부 계획/기록/미니테스트/모의고사
 *   데이터만으로 FastAPI에 예측을 요청하고, 결과를 리포트로 저장한다.
 */
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
      setError(err.response?.data?.message || 'AI 리포트를 불러오지 못했습니다.');
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
      setError(err.response?.data?.message || 'AI 리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">AI 학습 리포트</Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '분석 중...' : '새 리포트 생성'}
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          별도의 개인정보 입력 없이, 지금까지 기록한 공부 계획·기록·테스트 점수만으로 분석합니다.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : reports.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography>아직 생성된 AI 리포트가 없습니다.</Typography>
            <Typography variant="body2">
              공부 계획/기록/테스트 점수가 어느 정도 쌓였다면 상단 버튼으로 리포트를 받아보세요.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {reports.map((report) => (
              <AiReportCard key={report._id} report={report} />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default AiReportPage;
