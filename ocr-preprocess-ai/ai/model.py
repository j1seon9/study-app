"""
OCR 전처리용 경량 이미지 복원 모델.

설계 근거 (프로젝트 요구사항에 맞춘 선택):
- 원본 프롬프트는 Restormer/SwinIR 등을 1순위로 추천했지만, 이 프로젝트는
  "GPU 없이 CPU에서 1024x1024 기준 1초 이내 추론"이 하드 제약이다.
  Restormer/SwinIR/MIRNet-v2 계열(Transformer 기반, attention 다수)은 이 제약을
  CPU에서 만족하기 매우 어렵다.
- 따라서 실제 구현체는 "작은 U-Net" (추천 목록 1순위, 난이도/성능/CPU속도 균형이 가장 좋음)
  으로 하되, NAFNet에서 쓰는 SimpleGate / 잔차(residual) 아이디어를 가볍게 차용해
  파라미터 대비 품질을 높였다.
- 문자 형태를 바꾸면 안 되므로 최종 출력은 "입력 + 예측한 보정값(residual)" 구조로,
  모델이 원본에서 크게 벗어나지 않게 유도한다.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class SimpleGate(nn.Module):
    """채널을 반으로 나눠 곱하는 게이트. ReLU/GELU보다 가볍고 NAFNet에서 효과가 검증됨."""

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x1, x2 = x.chunk(2, dim=1)
        return x1 * x2


class ConvBlock(nn.Module):
    """Conv -> GroupNorm -> SimpleGate 잔차 블록. depthwise separable로 연산량을 줄인다."""

    def __init__(self, channels: int):
        super().__init__()
        self.norm = nn.GroupNorm(1, channels)
        self.pw1 = nn.Conv2d(channels, channels * 2, kernel_size=1)
        self.dw = nn.Conv2d(
            channels * 2, channels * 2, kernel_size=3, padding=1, groups=channels * 2
        )
        self.gate = SimpleGate()
        self.pw2 = nn.Conv2d(channels, channels, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = self.norm(x)
        x = self.pw1(x)
        x = self.dw(x)
        x = self.gate(x)
        x = self.pw2(x)
        return residual + x


class Down(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.op = nn.Conv2d(in_ch, out_ch, kernel_size=2, stride=2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.op(x)


class Up(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.op = nn.ConvTranspose2d(in_ch, out_ch, kernel_size=2, stride=2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.op(x)


class OcrRestoreNet(nn.Module):
    """
    성적표 사진 -> OCR 최적화 이미지 복원용 경량 U-Net.

    입력/출력: (N, 3, H, W), H와 W는 8의 배수 권장 (다운샘플 3단계).
    출력은 입력과 동일 해상도, 값 범위 [0, 1].
    """

    def __init__(self, base_channels: int = 24, num_blocks: tuple[int, ...] = (1, 1, 2)):
        super().__init__()
        c1, c2, c3 = base_channels, base_channels * 2, base_channels * 4

        self.stem = nn.Conv2d(3, c1, kernel_size=3, padding=1)

        self.enc1 = nn.Sequential(*[ConvBlock(c1) for _ in range(num_blocks[0])])
        self.down1 = Down(c1, c2)

        self.enc2 = nn.Sequential(*[ConvBlock(c2) for _ in range(num_blocks[1])])
        self.down2 = Down(c2, c3)

        self.bottleneck = nn.Sequential(*[ConvBlock(c3) for _ in range(num_blocks[2])])

        self.up2 = Up(c3, c2)
        self.dec2 = nn.Sequential(*[ConvBlock(c2) for _ in range(num_blocks[1])])

        self.up1 = Up(c2, c1)
        self.dec1 = nn.Sequential(*[ConvBlock(c1) for _ in range(num_blocks[0])])

        self.head = nn.Conv2d(c1, 3, kernel_size=3, padding=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        n, c, h, w = x.shape
        pad_h = (-h) % 8
        pad_w = (-w) % 8
        if pad_h or pad_w:
            x_in = F.pad(x, (0, pad_w, 0, pad_h), mode="reflect")
        else:
            x_in = x

        s = self.stem(x_in)

        e1 = self.enc1(s)
        d1 = self.down1(e1)

        e2 = self.enc2(d1)
        d2 = self.down2(e2)

        b = self.bottleneck(d2)

        u2 = self.up2(b) + e2
        u2 = self.dec2(u2)

        u1 = self.up1(u2) + e1
        u1 = self.dec1(u1)

        residual = self.head(u1)
        out = x_in + residual  # 문자 형태 보존을 위해 residual 구조 사용
        out = out[:, :, :h, :w]
        return torch.clamp(out, 0.0, 1.0)


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == "__main__":
    m = OcrRestoreNet()
    dummy = torch.rand(1, 3, 517, 733)  # 8의 배수가 아닌 크기로 패딩 로직 확인
    out = m(dummy)
    print("output shape:", out.shape)
    print("params:", count_parameters(m))
