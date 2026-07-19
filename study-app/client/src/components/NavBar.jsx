import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/plans", label: "공부 계획" },
  { to: "/records", label: "공부 기록" },
  { to: "/stats", label: "통계" },
  { to: "/weekly-tests", label: "미니테스트" },
  { to: "/mock-exams", label: "모의고사" },
  { to: "/ai-report", label: "AI 리포트" },
];

function NavBar() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        backdropFilter: "blur(18px)",
        background: "rgba(255,255,255,.78)",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      <Toolbar
        sx={{
          minHeight: 72,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background:
                "linear-gradient(135deg,#2563EB,#7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow:
                "0 10px 25px rgba(37,99,235,.25)",
            }}
          >
            <SchoolRoundedIcon />
          </Box>

          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
            >
              AI 자율학습 지원
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              AI 기반 자기주도학습 플랫폼
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
        >
          <Chip
            label="AI"
            color="secondary"
            size="small"
          />

          <Button
            variant="outlined"
            startIcon={<LogoutRoundedIcon />}
            onClick={logout}
          >
            로그아웃
          </Button>
        </Stack>
      </Toolbar>

      <Box
        sx={{
          px: 2,
          pb: 2,
          overflowX: "auto",
          display: "flex",
          gap: 1,

          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.to;

          return (
            <Button
              key={item.to}
              component={Link}
              to={item.to}
              variant={
                active
                  ? "contained"
                  : "text"
              }
              sx={{
                whiteSpace: "nowrap",
                minWidth: 120,
                borderRadius: 999,

                ...(active && {
                  background:
                    "linear-gradient(135deg,#2563EB,#7C3AED)",
                }),
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Box>
    </AppBar>
  );
}

export default NavBar;