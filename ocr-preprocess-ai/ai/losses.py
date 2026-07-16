"""
학습 손실 함수: L1 + SSIM + Edge.

원본 프롬프트는 L1 + SSIM + Perceptual(VGG) + Edge를 제안했지만,
Perceptual Loss(VGG16 등)는:
  1) 사전학습 가중치 다운로드가 필요해 오프라인/사설 환경에서 깨지기 쉽고,
  2) 문서/텍스트 이미지에는 자연이미지용 VGG feature가 크게 도움되지 않는 경우가 많고,
  3) 학습 속도를 크게 늦춘다.
텍스트 선명도에는 Edge Loss가 더 직접적으로 기여하므로, 여기서는
L1 + SSIM + Edge 조합만 기본값으로 사용한다. (필요하면 나중에 kornia 등으로
Perceptual Loss를 추가할 수 있도록 구조는 분리해 둔다.)
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


def _gaussian_window(window_size: int, sigma: float, channels: int) -> torch.Tensor:
    coords = torch.arange(window_size, dtype=torch.float32) - window_size // 2
    g = torch.exp(-(coords**2) / (2 * sigma**2))
    g = (g / g.sum()).unsqueeze(1)
    window_2d = g @ g.t()
    window = window_2d.expand(channels, 1, window_size, window_size).contiguous()
    return window


class SSIMLoss(nn.Module):
    """1 - SSIM. 값이 작을수록 두 이미지가 구조적으로 유사함."""

    def __init__(self, window_size: int = 11, channels: int = 3):
        super().__init__()
        self.window_size = window_size
        self.channels = channels
        self.register_buffer("window", _gaussian_window(window_size, 1.5, channels))

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        window = self.window.to(pred.dtype)
        pad = self.window_size // 2
        mu_p = F.conv2d(pred, window, padding=pad, groups=self.channels)
        mu_t = F.conv2d(target, window, padding=pad, groups=self.channels)

        mu_p_sq, mu_t_sq, mu_pt = mu_p * mu_p, mu_t * mu_t, mu_p * mu_t

        sigma_p_sq = F.conv2d(pred * pred, window, padding=pad, groups=self.channels) - mu_p_sq
        sigma_t_sq = F.conv2d(target * target, window, padding=pad, groups=self.channels) - mu_t_sq
        sigma_pt = F.conv2d(pred * target, window, padding=pad, groups=self.channels) - mu_pt

        c1, c2 = 0.01**2, 0.03**2
        ssim_map = ((2 * mu_pt + c1) * (2 * sigma_pt + c2)) / (
            (mu_p_sq + mu_t_sq + c1) * (sigma_p_sq + sigma_t_sq + c2)
        )
        return 1.0 - ssim_map.mean()


class EdgeLoss(nn.Module):
    """Sobel edge map 사이의 L1 거리. 작은 글씨/숫자의 윤곽 선명도를 직접적으로 학습시킨다."""

    def __init__(self, channels: int = 3):
        super().__init__()
        kx = torch.tensor([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=torch.float32)
        ky = kx.t()
        self.register_buffer("kx", kx.view(1, 1, 3, 3).repeat(channels, 1, 1, 1))
        self.register_buffer("ky", ky.view(1, 1, 3, 3).repeat(channels, 1, 1, 1))
        self.channels = channels

    def _sobel(self, x: torch.Tensor) -> torch.Tensor:
        gx = F.conv2d(x, self.kx.to(x.dtype), padding=1, groups=self.channels)
        gy = F.conv2d(x, self.ky.to(x.dtype), padding=1, groups=self.channels)
        return torch.sqrt(gx**2 + gy**2 + 1e-6)

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        return F.l1_loss(self._sobel(pred), self._sobel(target))


class OcrRestoreLoss(nn.Module):
    """L1 + SSIM + Edge 가중합. 기본 가중치는 텍스트 선명도(edge)를 중시하도록 설정."""

    def __init__(
        self,
        l1_weight: float = 1.0,
        ssim_weight: float = 0.5,
        edge_weight: float = 0.5,
        channels: int = 3,
    ):
        super().__init__()
        self.l1_weight = l1_weight
        self.ssim_weight = ssim_weight
        self.edge_weight = edge_weight
        self.ssim = SSIMLoss(channels=channels)
        self.edge = EdgeLoss(channels=channels)

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> dict[str, torch.Tensor]:
        l1 = F.l1_loss(pred, target)
        ssim = self.ssim(pred, target)
        edge = self.edge(pred, target)
        total = self.l1_weight * l1 + self.ssim_weight * ssim + self.edge_weight * edge
        return {"total": total, "l1": l1, "ssim": ssim, "edge": edge}


if __name__ == "__main__":
    loss_fn = OcrRestoreLoss()
    a = torch.rand(2, 3, 64, 64)
    b = torch.rand(2, 3, 64, 64)
    print({k: v.item() for k, v in loss_fn(a, b).items()})
    print("identical -> total loss:", loss_fn(a, a)["total"].item())
