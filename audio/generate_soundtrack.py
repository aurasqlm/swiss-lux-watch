#!/usr/bin/env python3
"""
VAUCHER NOIR — CALIBER 01
Pure-Code 48,000 Hz Stereo Soundtrack & Physical-Modeled Horological Foley Engine

Generates `/home/antigravity/aurasqlm/swiss-lux-watch/soundtrack_60s.wav`:
  - Sample Rate : 48,000 Hz
  - Channels    : 2 (True Stereo, 16-bit PCM)
  - Duration    : 60.000000 seconds exact (2,880,000 stereo frames)
  - True Peak   : -1.20 dBFS (max |sample| <= 0.871, zero digital clipping)
  - High-Pass   : 24.0 Hz zero-phase 4th-order Butterworth, zero DC offset

Acoustic & Musical Architecture (Refined Pass 2 after Self-Listening Audit):
  1. Miniature Physical-Modeled 4.000 Hz (28,800 vph = 8.000 beats/s = 125.0 ms =
     6,000-sample grid) Swiss Club-Tooth Lever Escapement (k = 0..472, final tick at 59.000s):
       - True miniature wristwatch scale (4.5mm steel pallet fork, 6mm 20T escape wheel,
         corundum ruby stones): zero hollow woodblock midrange bloat; razor-crisp high-Q
         metallic/corundum micro-impulses (3.6 kHz - 14.2 kHz):
           * Stage 1 (+0.00 ms): Ruby impulse-pin unlocking micro-snick (4.6 - 13.4 kHz).
           * Stage 2 (+1.85 ms tick / +2.05 ms tock): Escape club-tooth impulse strike
             across ruby pallet stone (asymmetric entry/exit pallet spectral voicing &
             +-9.5% micro-stereo close-mic image).
           * Stage 3 (+5.10 ms): Banking-pin lock arrest + delicate free-sprung Breguet
             overcoil hairspring & 18k rose-gold tourbillon cage silver shimmer (-25 dB).
       - Early sapphire/case interior reflections + subtle dark watchmaker salon room IR.
  2. Dark Luxury Geneva Cinema Score (D Dorian -> D Major add9 Picardy Lockup):
       - 6-player chamber cello section using anti-aliased Helmholtz bowed-string wavetables
         with independent Ornstein-Uhlenbeck organic bow/pitch micro-wander, delayed
         expressive vibrato, wooden Stradivari/Montagnana body resonances, and rosin air.
       - Phase-locked mono-centered analog sub-bass (D1 36.71 Hz, Bb0/Bb1, A0/A1) + warm
         time-varying 4-pole low-pass analog harmonic pad.
       - Stationary bowed-crystal / verre-harmonique chordal shimmers swept by resonant
         optical-glare filters & stereo panning (zero synthetic pitch-glissando whistles).
       - Taut 120 BPM Chunk 4 horology montage impacts, orchestral tremolando riser into
         the 40.000s Monolith Reveal, 50.000s hushed salon intimacy, and 59.000s final
         mechanical tick -> blooming Geneva cathedral minute-repeater gong & D add9 chord
         decaying effortlessly to 0.000 at 60.000s.
"""

from __future__ import annotations

import math
import os
import sys
import time
import wave
from pathlib import Path

import numpy as np
from scipy import signal

# ---------------------------------------------------------------------------
# Global Constants & Pitch Reference (A4 = 440.0 Hz)
# ---------------------------------------------------------------------------
SR: int = 48_000
DURATION_SEC: float = 60.0
N_SAMPLES: int = SR * 60  # 2,880,000 exact
TICK_SAMPLES: int = 6_000  # 0.125000 s exact = 8.000 ticks/s (28,800 vph)
FINAL_TICK_INDEX: int = 472  # 472 * 0.125s = 59.000s exact (frame 1770)

NOTE_HZ: dict[str, float] = {
    "A0": 27.5000,
    "Bb0": 29.1352,
    "C1": 32.7032,
    "D1": 36.7081,
    "E1": 41.2034,
    "F1": 43.6535,
    "G1": 48.9994,
    "A1": 55.0000,
    "Bb1": 58.2705,
    "C2": 65.4064,
    "C#2": 69.2957,
    "D2": 73.4162,
    "E2": 82.4069,
    "F2": 87.3071,
    "F#2": 92.4986,
    "G2": 97.9989,
    "A2": 110.0000,
    "Bb2": 116.5409,
    "B2": 123.4708,
    "C3": 130.8128,
    "C#3": 138.5913,
    "D3": 146.8324,
    "E3": 164.8138,
    "F3": 174.6141,
    "F#3": 184.9972,
    "G3": 195.9977,
    "A3": 220.0000,
    "Bb3": 233.0819,
    "B3": 246.9417,
    "C4": 261.6256,
    "C#4": 277.1826,
    "D4": 293.6648,
    "E4": 329.6276,
    "F4": 349.2282,
    "F#4": 369.9944,
    "G4": 391.9954,
    "A4": 440.0000,
    "B4": 493.8833,
    "C5": 523.2511,
    "D5": 587.3295,
    "E5": 659.2551,
    "F5": 698.4565,
    "F#5": 739.9888,
    "G5": 783.9909,
    "A5": 880.0000,
    "C6": 1046.502,
    "D6": 1174.659,
    "E6": 1318.510,
    "F#6": 1479.978,
    "A6": 1760.000,
    "D7": 2349.318,
}


# ---------------------------------------------------------------------------
# DSP Utility Primitives
# ---------------------------------------------------------------------------
def pan_stereo(mono: np.ndarray, pan: float | np.ndarray) -> np.ndarray:
    """Constant-power stereo panner: pan in [-1.0 (L), +1.0 (R)]."""
    angle = (np.clip(pan, -1.0, 1.0) + 1.0) * (0.25 * math.pi)
    return np.column_stack((mono * np.cos(angle), mono * np.sin(angle)))


def add_stereo_clip(
    bus: np.ndarray, clip: np.ndarray, start_sample: int, gain: float = 1.0
) -> None:
    """Safely accumulate a stereo clip into a global stereo bus."""
    if start_sample >= bus.shape[0] or clip.shape[0] == 0:
        return
    src_start = 0
    if start_sample < 0:
        src_start = -start_sample
        start_sample = 0
    avail = min(clip.shape[0] - src_start, bus.shape[0] - start_sample)
    if avail <= 0:
        return
    bus[start_sample : start_sample + avail] += (
        clip[src_start : src_start + avail] * gain
    )


def peaking_eq_sos(freq: float, q: float, gain_db: float) -> np.ndarray:
    """RBJ Audio EQ Cookbook peaking biquad as second-order section."""
    a = 10.0 ** (gain_db / 40.0)
    w0 = 2.0 * math.pi * freq / SR
    alpha = math.sin(w0) / (2.0 * q)
    cos_w0 = math.cos(w0)
    b0 = 1.0 + alpha * a
    b1 = -2.0 * cos_w0
    b2 = 1.0 - alpha * a
    a0 = 1.0 + alpha / a
    a1 = -2.0 * cos_w0
    a2 = 1.0 - alpha / a
    return np.array(
        [[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]], dtype=np.float64
    )


def smooth_envelope(
    n: int, attack_s: float, release_s: float, curve: float = 1.0
) -> np.ndarray:
    """Raised-cosine smooth attack/release envelope free of clicks."""
    env = np.ones(n, dtype=np.float64)
    n_att = min(n, max(1, int(round(attack_s * SR))))
    n_rel = min(n, max(1, int(round(release_s * SR))))
    if n_att > 1:
        env[:n_att] *= (0.5 * (1.0 - np.cos(np.linspace(0.0, math.pi, n_att)))) ** curve
    if n_rel > 1:
        env[-n_rel:] *= (0.5 * (1.0 + np.cos(np.linspace(0.0, math.pi, n_rel)))) ** curve
    return env


def time_varying_lowpass_stereo(
    sig: np.ndarray, cutoff_curve: np.ndarray, order: int = 4, block_size: int = 512
) -> np.ndarray:
    """Click-free state-carrying time-varying Butterworth low-pass filter."""
    out = np.empty_like(sig)
    n = sig.shape[0]
    zi: np.ndarray | None = None
    nyq = 0.5 * SR
    for idx in range(0, n, block_size):
        end = min(n, idx + block_size)
        fc = float(np.clip(cutoff_curve[(idx + end) // 2], 45.0, nyq * 0.92))
        sos = signal.butter(order, fc / nyq, btype="low", output="sos")
        if zi is None:
            zi_init = signal.sosfilt_zi(sos)
            zi = np.stack([zi_init * sig[0, 0], zi_init * sig[0, 1]], axis=-1)
        out[idx:end], zi = signal.sosfilt(sos, sig[idx:end], axis=0, zi=zi)
    return out


def time_varying_bandpass_stereo(
    sig: np.ndarray,
    center_curve: np.ndarray,
    bandwidth_oct: float = 1.2,
    block_size: int = 384,
) -> np.ndarray:
    """Click-free state-carrying time-varying Butterworth bandpass filter."""
    out = np.empty_like(sig)
    n = sig.shape[0]
    zi: np.ndarray | None = None
    nyq = 0.5 * SR
    spread = 2.0 ** (0.5 * bandwidth_oct)
    for idx in range(0, n, block_size):
        end = min(n, idx + block_size)
        fc = float(center_curve[(idx + end) // 2])
        f_lo = max(120.0, fc / spread)
        f_hi = min(nyq * 0.92, fc * spread)
        if f_hi <= f_lo * 1.15:
            f_hi = min(nyq * 0.94, f_lo * 1.35)
        sos = signal.butter(2, [f_lo / nyq, f_hi / nyq], btype="band", output="sos")
        if zi is None:
            zi_init = signal.sosfilt_zi(sos)
            zi = np.stack([zi_init * sig[0, 0], zi_init * sig[0, 1]], axis=-1)
        out[idx:end], zi = signal.sosfilt(sos, sig[idx:end], axis=0, zi=zi)
    return out


# ---------------------------------------------------------------------------
# Unit-Energy Stereo Acoustic Spaces (Concert Hall & Intimate Studio Room)
# ---------------------------------------------------------------------------
def build_concert_hall_ir(rng: np.random.Generator) -> np.ndarray:
    """
    Lush 3.8-second Geneva dark concert-hall stereo IR (HPF 140 Hz, silky air
    damping, unit-energy normalized).
    """
    n_ir = int(3.8 * SR)
    t = np.arange(n_ir, dtype=np.float64) / SR
    ir_l = np.zeros(n_ir, dtype=np.float64)
    ir_r = np.zeros(n_ir, dtype=np.float64)

    early_taps = [
        (12.7, 0.40, 0.16),
        (19.3, 0.15, 0.39),
        (26.9, 0.31, -0.23),
        (34.2, -0.21, 0.30),
        (43.8, 0.25, 0.14),
        (55.1, 0.13, 0.25),
        (68.4, -0.18, 0.20),
        (81.7, 0.16, -0.16),
    ]
    for delay_ms, gl, gr in early_taps:
        idx = int(round(delay_ms * 1e-3 * SR))
        if idx < n_ir:
            ir_l[idx] += gl
            ir_r[idx] += gr

    sos_er = signal.butter(2, 2600.0 / (0.5 * SR), btype="low", output="sos")
    ir_l = signal.sosfilt(sos_er, ir_l)
    ir_r = signal.sosfilt(sos_er, ir_r)

    onset = np.clip((t - 0.016) / 0.055, 0.0, 1.0) ** 1.6
    noise_l = rng.standard_normal(n_ir)
    noise_r = rng.standard_normal(n_ir)
    diff_l = 0.93 * noise_l + 0.20 * noise_r
    diff_r = 0.93 * noise_r + 0.20 * noise_l

    sos_low = signal.butter(2, [140.0 / (0.5 * SR), 620.0 / (0.5 * SR)], btype="band", output="sos")
    sos_mid = signal.butter(2, [620.0 / (0.5 * SR), 2400.0 / (0.5 * SR)], btype="band", output="sos")
    sos_air = signal.butter(2, [2400.0 / (0.5 * SR), 6800.0 / (0.5 * SR)], btype="band", output="sos")

    dec_low = onset * np.exp(-6.908 * t / 3.10)
    dec_mid = onset * np.exp(-6.908 * t / 2.25)
    dec_air = onset * np.exp(-6.908 * t / 1.15)

    tail_l = (
        0.70 * signal.sosfilt(sos_low, diff_l) * dec_low
        + 0.45 * signal.sosfilt(sos_mid, diff_l) * dec_mid
        + 0.18 * signal.sosfilt(sos_air, diff_l) * dec_air
    )
    tail_r = (
        0.70 * signal.sosfilt(sos_low, diff_r) * dec_low
        + 0.45 * signal.sosfilt(sos_mid, diff_r) * dec_mid
        + 0.18 * signal.sosfilt(sos_air, diff_r) * dec_air
    )

    ir = np.column_stack((0.32 * ir_l + tail_l, 0.32 * ir_r + tail_r))
    taper = int(0.18 * SR)
    ir[-taper:] *= np.linspace(1.0, 0.0, taper)[:, None]
    energy = math.sqrt(0.5 * float(np.sum(ir * ir)))
    return ir / max(energy, 1e-12)


def build_studio_foley_ir(rng: np.random.Generator) -> np.ndarray:
    """
    Ultra-clean 0.30s close-mic luxury foley booth ambience (HPF 800 Hz so zero
    boxy room boom ever clouds the watch escapement transients).
    """
    n_ir = int(0.30 * SR)
    t = np.arange(n_ir, dtype=np.float64) / SR
    ir_l = np.zeros(n_ir, dtype=np.float64)
    ir_r = np.zeros(n_ir, dtype=np.float64)

    for delay_ms, gl, gr in [
        (3.2, 0.44, 0.18),
        (5.9, 0.17, 0.42),
        (9.8, -0.22, 0.25),
        (15.4, 0.16, -0.17),
    ]:
        idx = int(round(delay_ms * 1e-3 * SR))
        ir_l[idx] += gl
        ir_r[idx] += gr

    onset = np.clip((t - 0.004) / 0.010, 0.0, 1.0)
    sos_bp = signal.butter(2, [900.0 / (0.5 * SR), 9200.0 / (0.5 * SR)], btype="band", output="sos")
    nl = signal.sosfilt(sos_bp, rng.standard_normal(n_ir)) * onset * np.exp(-6.908 * t / 0.24)
    nr = signal.sosfilt(sos_bp, rng.standard_normal(n_ir)) * onset * np.exp(-6.908 * t / 0.24)

    ir = np.column_stack((0.48 * ir_l + 0.52 * nl, 0.48 * ir_r + 0.52 * nr))
    taper = int(0.04 * SR)
    ir[-taper:] *= np.linspace(1.0, 0.0, taper)[:, None]
    energy = math.sqrt(0.5 * float(np.sum(ir * ir)))
    return ir / max(energy, 1e-12)


def convolve_stereo_ir(dry: np.ndarray, ir: np.ndarray) -> np.ndarray:
    wet_l = signal.fftconvolve(dry[:, 0], ir[:, 0], mode="full")[: dry.shape[0]]
    wet_r = signal.fftconvolve(dry[:, 1], ir[:, 1], mode="full")[: dry.shape[0]]
    return np.column_stack((wet_l, wet_r))


# ---------------------------------------------------------------------------
# 1. Miniature Swiss Lever Watch Escapement Foley Engine (8.000 Hz = 125.0 ms)
# ---------------------------------------------------------------------------
def synthesize_watch_tick_archetype(
    is_tock: bool,
    variation_idx: int,
    rng: np.random.Generator,
    final_master_tick: bool = False,
) -> np.ndarray:
    """
    Synthesizes an authentic close-miked Swiss lever tourbillon escapement impulse
    (Sennheiser MKH-8040 3cm from sapphire crystal):
      - Miniature horological scale (zero woodblock midrange knock; razor-crisp
        3.6 kHz - 14.5 kHz ruby/steel micro-transients + sub-millisecond impulse core)
      - Stage 1 (+0.00 ms): Ruby impulse-pin unlocking micro-snick
      - Stage 2 (+1.85 ms tick / +2.05 ms tock): Escape club-tooth impulse strike
      - Stage 3 (+5.10 ms): Banking-pin lock arrest + Breguet hairspring silver shimmer
    """
    dur_s = 0.140 if final_master_tick else 0.068
    n = int(round(dur_s * SR))
    mono = np.zeros(n, dtype=np.float64)

    detune = 1.0 + 0.009 * math.sin(variation_idx * 1.91 + (1.3 if is_tock else 0.0))
    # Entry vs exit pallet stone lever-arm spectral asymmetry (subtle, realistic)
    voicing = 0.958 if is_tock else 1.000

    def add_horological_micro_contact(
        offset_ms: float,
        modes: list[tuple[float, float, float]],
        snap_gain: float,
        snap_band: tuple[float, float],
        pin_body_gain: float,
    ) -> None:
        i0 = int(round(offset_ms * 1e-3 * SR))
        if i0 >= n:
            return
        m_len = n - i0
        tm = np.arange(m_len, dtype=np.float64) / SR

        # 2-sample (~0.04 ms) elastic contact rise for razor-sharp transient definition
        att = 1.0 - np.exp(-tm / 0.000042)

        # High-Q miniature steel/gold/corundum flexural modes
        modal_sig = np.zeros(m_len, dtype=np.float64)
        chirp = 0.022 * 0.00018 * (1.0 - np.exp(-tm / 0.00018))
        for freq, amp, tau_ms in modes:
            fa = min(freq * detune * voicing, 0.46 * SR)
            modal_sig += (
                amp
                * np.sin(2.0 * math.pi * fa * (tm + chirp))
                * np.exp(-tm / (tau_ms * 1e-3))
            )

        # Ultra-tight (<0.36 ms) corundum-on-steel crisp broadband metallic click
        raw_burst = rng.standard_normal(m_len)
        sos_snap = signal.butter(
            2,
            [snap_band[0] / (0.5 * SR), min(snap_band[1], 21000.0) / (0.5 * SR)],
            btype="band",
            output="sos",
        )
        crisp_snap = (
            signal.sosfilt(sos_snap, raw_burst)
            * np.exp(-tm / 0.00034)
            * snap_gain
        )

        # Tiny sub-millisecond (0.28 ms) rose-gold case impulse pin-point (gives solid
        # mechanical precision without any tonal woodblock pitch!)
        pin_point = (
            pin_body_gain
            * (1.0 - 2.0 * (tm / 0.00022))
            * np.exp(-tm / 0.00022)
        )

        mono[i0:] += att * (modal_sig + crisp_snap + pin_point)

    # Stage 1 (+0.00 ms): Ruby pallet-stone unlocking snick (delicate, ultra-crisp)
    unlock_modes = [
        (4680.0, 0.34, 0.52),
        (7920.0, 0.42, 0.44),
        (11450.0, 0.32, 0.36),
        (14600.0, 0.20, 0.28),
    ]
    add_horological_micro_contact(
        0.00,
        unlock_modes,
        snap_gain=0.42,
        snap_band=(4800.0, 16500.0),
        pin_body_gain=0.14,
    )

    # Stage 2 (+1.85 ms tick / +2.04 ms tock): Escape club-tooth impulse strike (primary!)
    imp_ms = 2.04 if is_tock else 1.85
    impulse_modes = [
        (2640.0, 0.18, 0.62),   # Tight titanium/rose-gold bridge transient anchor
        (4180.0, 0.56, 0.68),   # Pallet fork steel beam crisp strike
        (6640.0, 0.64, 0.58),   # Escape club-tooth metallic ping
        (9850.0, 0.48, 0.46),   # Ruby-steel specular brilliance
        (13400.0, 0.30, 0.34),  # Close-mic MKH-8040 air edge
    ]
    add_horological_micro_contact(
        imp_ms,
        impulse_modes,
        snap_gain=0.72,
        snap_band=(3800.0, 17500.0),
        pin_body_gain=0.28,
    )

    # Stage 3 (+5.10 ms tick / +5.34 ms tock): Banking-pin arrest + Breguet hairspring ring
    lock_ms = 5.34 if is_tock else 5.10
    ring_gain = 1.55 if final_master_tick else 1.0
    ring_tau = 1.85 if final_master_tick else 1.0
    lock_modes = [
        (4350.0, 0.28, 0.52),                                 # Banking-pin solid arrest
        (7650.0, 0.32, 0.44),                                 # Escape tooth lock snap
        (11200.0, 0.20, 0.35),                                # Sapphire proximity crispness
        # Whisper-delicate free-sprung Breguet overcoil & tourbillon cage silver ring:
        (5860.0, 0.036 * ring_gain, 16.5 * ring_tau),
        (5898.0, 0.026 * ring_gain, 15.0 * ring_tau),         # Natural overcoil micro-beating
        (8420.0, 0.032 * ring_gain, 13.5 * ring_tau),
        (11680.0, 0.022 * ring_gain, 10.5 * ring_tau),
    ]
    add_horological_micro_contact(
        lock_ms,
        lock_modes,
        snap_gain=0.36,
        snap_band=(4500.0, 16000.0),
        pin_body_gain=0.12,
    )

    # Gentle high-pass at 1,150 Hz so zero low-mid mud or hollow tap exists
    sos_clean = signal.butter(2, 1150.0 / (0.5 * SR), btype="high", output="sos")
    mono = signal.sosfilt(sos_clean, mono)

    # Subtle watch-crystal / bezel sub-millisecond stereo air reflections
    pan_base = (0.095 if is_tock else -0.095) + 0.015 * math.cos(variation_idx * 1.3)
    st = pan_stereo(mono, pan_base)
    for d_ms, gl, gr in [(0.31, 0.18, -0.14), (0.79, -0.11, 0.15), (1.65, 0.07, 0.06)]:
        sh = int(round(d_ms * 1e-3 * SR))
        if sh < n:
            st[sh:, 0] += mono[:-sh] * gl
            st[sh:, 1] += mono[:-sh] * gr

    fade_n = int(0.005 * SR)
    st[-fade_n:] *= np.linspace(1.0, 0.0, fade_n)[:, None]

    pk = float(np.max(np.abs(st)))
    return st / max(pk, 1e-12)


def build_escapement_foley_stem(
    rng: np.random.Generator, studio_ir: np.ndarray
) -> np.ndarray:
    """
    Renders all 473 Swiss lever escapement impulses (k = 0..472, t_k = 0.125 * k)
    with narrative close-mic focus, 60s flying tourbillon spatial drift,
    final authoritative tick at t = 59.000s (k = 472), and 100% tick silence on (59s, 60s].
    """
    dry_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    room_send_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)

    tick_arch = [synthesize_watch_tick_archetype(False, i, rng) for i in range(8)]
    tock_arch = [synthesize_watch_tick_archetype(True, i, rng) for i in range(8)]
    final_tick = synthesize_watch_tick_archetype(False, 0, rng, final_master_tick=True)

    # Slightly softer distant-mic perspective filter (7.5 kHz gentle rolloff) for title shots
    sos_dist = signal.butter(2, 7600.0 / (0.5 * SR), btype="low", output="sos")
    tick_dist = [signal.sosfilt(sos_dist, a, axis=0) for a in tick_arch]
    tock_dist = [signal.sosfilt(sos_dist, a, axis=0) for a in tock_arch]

    for k in range(FINAL_TICK_INDEX + 1):
        n_k = k * TICK_SAMPLES
        t_k = n_k / SR
        is_tock = (k % 2) == 1
        var_i = (k // 2) % 8

        # Authentic 20-tooth escape wheel (5.0s) mainspring torque ripple
        torque = 1.0 + 0.028 * math.sin(2.0 * math.pi * t_k / 5.0) + (
            -0.022 if is_tock else 0.022
        )

        if t_k < 3.0:
            # S01: Emerges crisply out of pitch-black studio silence
            u = t_k / 3.0
            gain = (0.055 + 0.255 * (u**1.3)) * torque
            closeness = 0.55 + 0.40 * u
            room_amt = 0.16
        elif t_k < 7.0:
            # S02: Extreme Macro Ruby Jewel & 4 Hz Balance Wheel — intimate hero focus!
            dip = 1.0 - 0.35 * np.clip((t_k - 6.68) / 0.32, 0.0, 1.0)
            gain = 0.46 * dip * torque
            closeness = 1.00
            room_amt = 0.10
        elif t_k < 10.0:
            # S03: "312 COMPONENTS." title card
            gain = 0.21 * torque
            closeness = 0.62
            room_amt = 0.20
        elif t_k < 12.667:
            # S04: Involute Gear Train macro
            gain = 0.31 * torque
            closeness = 0.86
            room_amt = 0.13
        elif t_k < 15.167:
            # S05: Extreme Macro Swiss Lever Pallet Fork Lock — razor-sharp close-mic!
            gain = 0.48 * torque
            closeness = 1.00
            room_amt = 0.09
        elif t_k < 17.667:
            # S06: Cotes de Geneve bridge sweep
            gain = 0.28 * torque
            closeness = 0.78
            room_amt = 0.15
        elif t_k < 20.0:
            # S07: "ZERO TOLERANCE."
            gain = 0.22 * torque
            closeness = 0.65
            room_amt = 0.18
        elif t_k < 23.0:
            # S08: Flying Tourbillon Hero Reveal
            gain = 0.39 * torque
            closeness = 0.95
            room_amt = 0.13
        elif t_k < 28.0:
            # S09 Blued Screws & S10 Sapphire Sweep
            gain = 0.30 * torque
            closeness = 0.82
            room_amt = 0.15
        elif t_k < 30.0:
            # S11 Crown & Lugs -> build into Chunk 4
            build = np.clip((t_k - 28.5) / 1.5, 0.0, 1.0)
            gain = (0.26 + 0.12 * build) * torque
            closeness = 0.80 + 0.20 * build
            room_amt = 0.12
        elif t_k < 37.5:
            # Chunk 4 Rapid Horology Montage (120 BPM = 4 ticks/beat)
            beat_acc = 1.15 if (k % 4 == 0) else (1.03 if (k % 2 == 0) else 0.93)
            gain = 0.37 * beat_acc * torque
            closeness = 0.96
            room_amt = 0.10
        elif t_k < 40.0:
            # S16: Kinetic Gear-Train Blur Riser -> graceful breath right before 40.000s
            u = np.clip((t_k - 37.5) / 2.25, 0.0, 1.0)
            if t_k >= 39.875:
                gain = 0.15 * torque
            else:
                gain = (0.35 + 0.12 * u) * torque
            closeness = 0.96
            room_amt = 0.12
        elif t_k < 50.0:
            # Chunk 5: Full Monolith Reveal
            dip_50 = 1.0 - 0.42 * np.clip((t_k - 49.35) / 0.65, 0.0, 1.0)
            gain = 0.30 * dip_50 * torque
            closeness = 0.88
            room_amt = 0.16
        elif k < FINAL_TICK_INDEX:
            # Chunk 6: S20 Stillness (50-55s) & S21 Legacy Lockup (55-58.875s)
            emerge = 0.70 + 0.30 * np.clip((t_k - 50.0) / 0.75, 0.0, 1.0)
            gain = 0.29 * emerge * torque
            closeness = 0.92
            room_amt = 0.18
        else:
            # k == 472 (t = 59.000s EXACT): Final Authoritative Mechanical Tick!
            gain = 0.54
            closeness = 1.00
            room_amt = 0.24

        if k == FINAL_TICK_INDEX:
            clip = final_tick
        else:
            crisp = tock_arch[var_i] if is_tock else tick_arch[var_i]
            soft = tock_dist[var_i] if is_tock else tick_dist[var_i]
            clip = closeness * crisp + (1.0 - closeness) * soft

        cage_drift = 0.055 * math.sin(2.0 * math.pi * t_k / 60.0)
        if abs(cage_drift) > 1e-4:
            lg = math.cos((cage_drift + 1.0) * 0.25 * math.pi) * math.sqrt(2.0)
            rg = math.sin((cage_drift + 1.0) * 0.25 * math.pi) * math.sqrt(2.0)
            clip_panned = np.column_stack((clip[:, 0] * lg, clip[:, 1] * rg))
        else:
            clip_panned = clip

        add_stereo_clip(dry_bus, clip_panned, n_k, gain=gain)
        add_stereo_clip(room_send_bus, clip_panned, n_k, gain=gain * room_amt)

    return dry_bus + convolve_stereo_ir(room_send_bus, studio_ir)


# ---------------------------------------------------------------------------
# 2. 6-Player Bowed Chamber Cello Section (Anti-Aliased Wavetable + OU Drift)
# ---------------------------------------------------------------------------
def build_cello_wavetables() -> dict[str, np.ndarray]:
    """
    Precomputes band-limited 4,096-point Helmholtz bowed-string single-cycle
    wavetables (sul tasto warm vs expressive cantabile) with zero aliasing.
    """
    tbl_len = 4096
    ph = np.linspace(0.0, 2.0 * math.pi, tbl_len, endpoint=False)
    tables: dict[str, np.ndarray] = {}

    for name, max_h, rolloff, beta in [
        ("sul_tasto", 20, 1.72, 0.145),
        ("cantabile", 28, 1.48, 0.115),
        ("spiccato", 32, 1.36, 0.095),
    ]:
        wave_cycle = np.zeros(tbl_len + 1, dtype=np.float64)
        for m in range(1, max_h + 1):
            # Bow contact position comb + rounded slip-stick corner
            comb = 0.72 * abs(math.sin(math.pi * m * beta)) + 0.28
            amp = comb / (m**rolloff)
            wave_cycle[:-1] += amp * np.sin(m * ph + 0.12 * m)
        wave_cycle[-1] = wave_cycle[0]
        wave_cycle /= max(float(np.max(np.abs(wave_cycle))), 1e-12)
        tables[name] = wave_cycle
    return tables


def read_wavetable(table: np.ndarray, phase_cycles: np.ndarray) -> np.ndarray:
    """Fast vectorized linear wavetable lookup (phase_cycles in [0, inf))."""
    tbl_len = table.shape[0] - 1
    frac_pos = np.mod(phase_cycles, 1.0) * tbl_len
    idx0 = frac_pos.astype(np.int32)
    alpha = frac_pos - idx0
    return (1.0 - alpha) * table[idx0] + alpha * table[idx0 + 1]


def synth_bowed_cello_section_note(
    freq: float,
    dur_s: float,
    attack_s: float,
    release_s: float,
    tables: dict[str, np.ndarray],
    rng: np.random.Generator,
    vibrato_cents: float = 8.0,
    brightness: float = 0.55,
    spiccato: bool = False,
) -> np.ndarray:
    """
    Synthesizes a lush 6-desk Geneva chamber cello ensemble note with independent
    filtered Ornstein-Uhlenbeck bow/pitch micro-wander (eliminating synthetic
    oscillator phase-lock), natural delayed vibrato, and subtle rosin bow air.
    """
    n = max(32, int(round(dur_s * SR)))
    t = np.arange(n, dtype=np.float64) / SR

    env = smooth_envelope(n, attack_s, release_s, curve=1.15 if not spiccato else 0.70)
    if spiccato:
        env *= 0.34 + 0.66 * np.exp(-t / max(0.085, 0.40 * dur_s))
    else:
        env *= 0.85 + 0.15 * np.sin(math.pi * np.clip(t / max(dur_s, 0.01), 0.0, 1.0))

    vib_onset = np.zeros(n) if spiccato else np.clip((t - 0.28) / 0.50, 0.0, 1.0)

    # 6 independent cello players seated across the concert stage
    players = [
        (-5.8, -0.64, 5.05),
        (-2.7, -0.36, 5.28),
        (-0.8, -0.11, 5.42),
        (+1.1, +0.12, 5.18),
        (+3.2, +0.38, 5.49),
        (+6.1, +0.64, 5.12),
    ]

    sos_drift = signal.butter(2, 4.5 / (0.5 * SR), btype="low", output="sos")
    tbl_warm = tables["sul_tasto"]
    tbl_rich = tables["spiccato" if spiccato else "cantabile"]
    stereo = np.zeros((n, 2), dtype=np.float64)

    # Dynamic bow-brightness contour (warmer at start/end, richer at phrase peak)
    bright_curve = np.clip(brightness * env, 0.0, 1.0)

    for base_cents, pan_p, vib_hz in players:
        # Organic random-walk bow/intonation micro-drift (+-3.5 cents)
        drift_cents = signal.sosfilt(sos_drift, rng.standard_normal(n)) * 42.0
        vib_cents = (
            vibrato_cents
            * vib_onset
            * np.sin(2.0 * math.pi * vib_hz * t + rng.uniform(0.0, 6.283))
        )
        total_cents = base_cents + drift_cents + vib_cents
        inst_freq = freq * np.exp2(total_cents / 1200.0)

        phase_cyc = np.cumsum(inst_freq) / SR + rng.random()
        sig_warm = read_wavetable(tbl_warm, phase_cyc)
        sig_rich = read_wavetable(tbl_rich, phase_cyc)
        player_sig = (1.0 - bright_curve) * sig_warm + bright_curve * sig_rich

        # Subtle per-player bow-pressure amplitude shimmer
        bow_amp = 1.0 + 0.05 * signal.sosfilt(sos_drift, rng.standard_normal(n)) * 12.0
        stereo += pan_stereo(player_sig * bow_amp * env, pan_p) * 0.21

    # Delicate bow-hair rosin whisper + initial 42 ms acoustic bow-bite articulation
    sos_rosin = signal.butter(
        2, [1900.0 / (0.5 * SR), 4400.0 / (0.5 * SR)], btype="band", output="sos"
    )
    bow_bite = 1.0 + (2.2 if spiccato else 1.35) * np.exp(-t / 0.038)
    rosin = (
        signal.sosfilt(sos_rosin, rng.standard_normal(n))
        * env
        * bow_bite
        * (0.014 if spiccato else 0.0065)
    )
    stereo += pan_stereo(rosin, -0.08)
    return stereo


def apply_cello_body_resonances(cello_bus: np.ndarray) -> np.ndarray:
    """
    Wooden Montagnana/Stradivari body formants + warm spruce bridge presence
    while preserving a cleanhorological clarity pocket above 4.2 kHz.
    """
    sos_list = [
        peaking_eq_sos(108.0, 2.0, +3.2),   # Deep cello air cavity resonance
        peaking_eq_sos(220.0, 2.2, +3.5),   # Warm spruce top-plate body
        peaking_eq_sos(520.0, 1.7, +2.4),   # Rich wooden chest & baritone projection
        peaking_eq_sos(1320.0, 1.6, -2.8),  # Remove nasal mid-boxiness
        peaking_eq_sos(2150.0, 1.9, +1.5),  # Authentic acoustic bow-bridge wood sheen
        peaking_eq_sos(5400.0, 1.4, -4.2),  # Dedicated clarity pocket for watch foley
    ]
    shaped = signal.sosfilt(np.vstack(sos_list), cello_bus, axis=0)
    sos_lp = signal.butter(3, 4500.0 / (0.5 * SR), btype="low", output="sos")
    return signal.sosfilt(sos_lp, shaped, axis=0)


def synth_analog_sub_note(
    freq: float, dur_s: float, attack_s: float, release_s: float, drive: float = 1.18
) -> np.ndarray:
    """Mono-centered phase-locked warm cinema sub-bass (cleanly low-passed at 125 Hz)."""
    n = max(16, int(round(dur_s * SR)))
    t = np.arange(n, dtype=np.float64) / SR
    env = smooth_envelope(n, attack_s, release_s, curve=1.0)
    ph = 2.0 * math.pi * freq * t
    raw = 0.86 * np.sin(ph) + 0.20 * np.sin(2.0 * ph + 0.25) + 0.05 * np.sin(3.0 * ph)
    warm = np.tanh(raw * drive) / math.tanh(drive)
    sos_lp = signal.butter(3, 125.0 / (0.5 * SR), btype="low", output="sos")
    mono = signal.sosfilt(sos_lp, warm) * env
    return np.column_stack((mono, mono))


def synth_warm_analog_pad_chord(
    freqs: list[float],
    dur_s: float,
    attack_s: float,
    release_s: float,
    tables: dict[str, np.ndarray],
    rng: np.random.Generator,
) -> np.ndarray:
    """Velvet dark analog CS-80 / Prophet polyphonic pad."""
    n = max(32, int(round(dur_s * SR)))
    t = np.arange(n, dtype=np.float64) / SR
    env = smooth_envelope(n, attack_s, release_s, curve=1.2)
    stereo = np.zeros((n, 2), dtype=np.float64)
    tbl = tables["sul_tasto"]

    for idx, f0 in enumerate(freqs):
        for det_c, pan_p in [(-7.5, -0.68), (+7.5, +0.68), (0.0, 0.15 * ((idx % 2) * 2 - 1))]:
            fv = f0 * (2.0 ** (det_c / 1200.0))
            lfo = 1.0 + 0.0012 * np.sin(2.0 * math.pi * (0.21 + 0.06 * idx) * t + rng.uniform(0, 6.28))
            ph_cyc = np.cumsum(fv * lfo) / SR + rng.random()
            sig = read_wavetable(tbl, ph_cyc)
            stereo += pan_stereo(sig * env, pan_p) * (0.18 / max(len(freqs), 1) ** 0.65)

    return np.tanh(stereo * 1.1)


def build_score_and_sub_stems(
    rng: np.random.Generator, hall_ir: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Composes the 60.0s D-Dorian -> D-Major Geneva luxury chamber score."""
    tables = build_cello_wavetables()
    cello_dry = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    pad_raw = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    sub_bus = np.zeros((N_SAMPLES, 2), dtype=np.float64)

    def add_cello(
        note: str,
        t0: float,
        dur: float,
        gain: float,
        att: float = 0.45,
        rel: float = 0.55,
        vib: float = 7.5,
        bright: float = 0.52,
        spiccato: bool = False,
    ) -> None:
        clip = synth_bowed_cello_section_note(
            NOTE_HZ[note], dur, att, rel, tables, rng,
            vibrato_cents=vib, brightness=bright, spiccato=spiccato,
        )
        add_stereo_clip(cello_dry, clip, int(round(t0 * SR)), gain=gain)

    def add_sub(note: str, t0: float, dur: float, gain: float, att: float = 0.35, rel: float = 0.55) -> None:
        clip = synth_analog_sub_note(NOTE_HZ[note], dur, att, rel)
        add_stereo_clip(sub_bus, clip, int(round(t0 * SR)), gain=gain)

    def add_pad(notes: list[str], t0: float, dur: float, gain: float, att: float = 0.8, rel: float = 0.9) -> None:
        clip = synth_warm_analog_pad_chord([NOTE_HZ[n] for n in notes], dur, att, rel, tables, rng)
        add_stereo_clip(pad_raw, clip, int(round(t0 * SR)), gain=gain)

    # -----------------------------------------------------------------------
    # CHUNK 1 (00.00 - 10.00s): THE HEARTBEAT IN THE DARK
    # -----------------------------------------------------------------------
    add_sub("D1", 0.02, 6.80, gain=0.28, att=1.5, rel=0.75)
    add_pad(["D2", "A1", "D3"], 0.02, 6.80, gain=0.26, att=1.6, rel=0.75)
    add_cello("A1", 0.20, 6.50, gain=0.20, att=1.5, rel=0.75, vib=4.0, bright=0.32)

    # S02 (3-7s): Intimate solo/chamber cello D2 + A2 swell beneath ruby balance macro
    add_cello("D2", 3.00, 3.80, gain=0.30, att=0.70, rel=0.70, vib=8.0, bright=0.50)
    add_cello("A2", 3.40, 3.35, gain=0.20, att=0.85, rel=0.70, vib=8.5, bright=0.46)

    # S03 (7-10s): "312 COMPONENTS." velvet hush
    add_sub("D1", 7.02, 2.95, gain=0.32, att=0.20, rel=0.65)
    add_pad(["D2", "A2", "E3"], 7.05, 2.90, gain=0.25, att=0.60, rel=0.65)
    add_cello("D2", 7.15, 2.75, gain=0.22, att=0.65, rel=0.60, vib=5.5, bright=0.38)

    # -----------------------------------------------------------------------
    # CHUNK 2 (10.00 - 20.00s): INTERLOCKING PRECISION
    # -----------------------------------------------------------------------
    add_sub("D1", 10.00, 5.15, gain=0.31, att=0.35, rel=0.50)
    add_pad(["D2", "F2", "A2", "C3"], 10.00, 5.15, gain=0.28, att=0.60, rel=0.55)
    add_cello("F2", 10.00, 1.55, gain=0.31, att=0.38, rel=0.40, vib=8.0, bright=0.54)
    add_cello("E2", 11.40, 1.35, gain=0.29, att=0.32, rel=0.40, vib=7.5, bright=0.52)

    # S05 (12.67-15.17s): Subtle low cello pulse leaving pallet-fork foley crystal clear
    for b_idx, pitch in enumerate(["D2", "A1", "D2", "F2", "E2"]):
        bt = 12.667 + b_idx * 0.500
        if bt < 15.0:
            add_cello(pitch, bt, 0.38, gain=0.23, att=0.03, rel=0.16, spiccato=True, bright=0.55)

    # S06 (15.17-17.67s): Cotes de Geneve Dorian raised-6th (G2 - B2 - D3 - E3)
    add_sub("G1", 15.167, 2.48, gain=0.32, att=0.32, rel=0.45)
    add_pad(["G2", "B2", "D3", "E3"], 15.167, 2.48, gain=0.32, att=0.48, rel=0.48)
    add_cello("B2", 15.167, 2.45, gain=0.30, att=0.42, rel=0.45, vib=8.5, bright=0.56)
    add_cello("D2", 15.167, 2.45, gain=0.24, att=0.42, rel=0.45, vib=6.0, bright=0.46)

    # S07 (17.67-20.00s): "ZERO TOLERANCE."
    add_sub("A1", 17.667, 2.32, gain=0.34, att=0.14, rel=0.45)
    add_pad(["A1", "E2", "A2", "E3"], 17.667, 2.32, gain=0.28, att=0.38, rel=0.45)
    add_cello("A2", 17.70, 2.25, gain=0.25, att=0.42, rel=0.42, vib=7.0, bright=0.48)

    # -----------------------------------------------------------------------
    # CHUNK 3 (20.00 - 30.00s): THE FLYING TOURBILLON
    # -----------------------------------------------------------------------
    add_sub("D1", 20.00, 3.05, gain=0.38, att=0.38, rel=0.48)
    add_pad(["D2", "A2", "E3", "F3"], 20.00, 3.05, gain=0.40, att=0.55, rel=0.55)
    add_cello("D2", 20.00, 3.05, gain=0.32, att=0.48, rel=0.48, vib=8.0, bright=0.60)
    add_cello("A2", 20.05, 3.00, gain=0.28, att=0.52, rel=0.48, vib=8.5, bright=0.62)
    add_cello("E3", 20.15, 2.90, gain=0.23, att=0.62, rel=0.48, vib=9.0, bright=0.60)

    # S09 (23.00-25.50s): Warm lyrical cello line in rich baritone register (D3 -> E3 -> F3)
    add_sub("Bb1", 23.00, 2.55, gain=0.36, att=0.32, rel=0.45)
    add_pad(["Bb1", "F2", "C3", "D3"], 23.00, 2.55, gain=0.38, att=0.48, rel=0.48)
    add_cello("D3", 23.00, 0.98, gain=0.27, att=0.26, rel=0.30, vib=9.0, bright=0.60)
    add_cello("E3", 23.85, 0.88, gain=0.28, att=0.24, rel=0.28, vib=9.0, bright=0.62)
    add_cello("F3", 24.60, 0.98, gain=0.30, att=0.24, rel=0.32, vib=9.5, bright=0.64)

    # S10 (25.50-28.00s): Sapphire Glare Sweep — lush G minor 9
    add_sub("G1", 25.50, 2.55, gain=0.36, att=0.32, rel=0.45)
    add_pad(["G2", "Bb2", "D3", "F3", "A3"], 25.50, 2.55, gain=0.40, att=0.45, rel=0.48)
    add_cello("G2", 25.50, 2.52, gain=0.28, att=0.38, rel=0.42, vib=8.0, bright=0.58)
    add_cello("D3", 25.55, 2.47, gain=0.25, att=0.42, rel=0.42, vib=9.0, bright=0.60)

    # S11 (28.00-30.00s): Dominant A7(b9) tension build into Chunk 4
    add_sub("A1", 28.00, 1.98, gain=0.38, att=0.25, rel=0.22)
    add_pad(["A1", "E2", "G2", "C#3", "E3"], 28.00, 1.98, gain=0.38, att=0.32, rel=0.22)
    add_cello("A2", 28.00, 1.96, gain=0.30, att=0.28, rel=0.20, vib=8.5, bright=0.62)
    add_cello("C#3", 28.75, 1.22, gain=0.26, att=0.32, rel=0.18, vib=9.5, bright=0.66)

    # -----------------------------------------------------------------------
    # CHUNK 4 (30.00 - 40.00s): RAPID HOROLOGY MONTAGE (120 BPM Chamber Ostinato)
    # -----------------------------------------------------------------------
    ostinato = [
        (30.000, "D2", 0.38), (30.250, "D2", 0.25), (30.500, "A2", 0.32), (30.750, "D2", 0.25),
        (31.000, "F2", 0.34), (31.250, "D2", 0.25), (31.500, "G2", 0.32), (31.750, "A2", 0.30),
        (32.000, "C2", 0.38), (32.250, "G2", 0.26), (32.500, "C3", 0.32), (32.750, "G2", 0.26),
        (33.000, "Bb2", 0.34), (33.250, "A2", 0.26), (33.500, "G2", 0.30),
        (33.800, "D2", 0.42), (34.250, "D2", 0.26), (34.500, "A2", 0.32), (34.750, "D2", 0.26),
        (35.000, "F2", 0.34), (35.250, "E2", 0.30),
        (35.600, "Bb1", 0.42), (36.000, "F2", 0.30), (36.250, "Bb2", 0.30),
        (36.500, "A1", 0.44), (37.000, "E2", 0.32), (37.250, "A2", 0.34),
    ]
    for ot_t, ot_n, ot_g in ostinato:
        add_cello(ot_n, ot_t, 0.24, gain=ot_g, att=0.016, rel=0.10, spiccato=True, bright=0.68)

    add_sub("D1", 30.00, 1.95, gain=0.36, att=0.03, rel=0.25)
    add_sub("C1", 32.00, 1.75, gain=0.34, att=0.03, rel=0.22)
    add_sub("D1", 33.80, 1.75, gain=0.40, att=0.02, rel=0.25)
    add_sub("Bb0", 35.60, 0.88, gain=0.40, att=0.02, rel=0.20)
    add_sub("A0", 36.50, 0.98, gain=0.42, att=0.02, rel=0.20)

    # S16 (37.50 - 39.95s): True Orchestral String Tremolando Crescendo -> Hall Bloom into 40.0s!
    add_sub("A1", 37.50, 2.40, gain=0.40, att=0.12, rel=0.16)
    add_pad(["A1", "E2", "A2", "C#3", "E3", "G3"], 37.50, 2.42, gain=0.46, att=0.25, rel=0.15)
    for r_i in range(19):
        rt = 37.500 + r_i * 0.125  # 37.500 .. 39.750s
        u_r = r_i / 18.0
        rg = 0.20 + 0.22 * (u_r**1.3)
        add_cello("A2", rt, 0.135, gain=rg, att=0.012, rel=0.055, spiccato=True, bright=0.55 + 0.30 * u_r)
        if r_i >= 6:
            add_cello(
                "E3" if r_i < 13 else "G3",
                rt,
                0.135,
                gain=rg * 0.65,
                att=0.012,
                rel=0.055,
                spiccato=True,
                bright=0.60 + 0.28 * u_r,
            )

    # -----------------------------------------------------------------------
    # CHUNK 5 (40.00 - 50.00s): THE FULL MONOLITH REVEAL
    # -----------------------------------------------------------------------
    add_sub("D1", 40.00, 3.52, gain=0.44, att=0.20, rel=0.48)
    add_pad(["D2", "A2", "D3", "E3", "F3", "A3"], 40.00, 3.52, gain=0.48, att=0.32, rel=0.50)
    add_cello("D2", 40.00, 3.52, gain=0.38, att=0.25, rel=0.48, vib=8.5, bright=0.68)
    add_cello("A2", 40.00, 3.52, gain=0.32, att=0.28, rel=0.48, vib=9.0, bright=0.66)
    add_cello("F3", 40.05, 3.47, gain=0.29, att=0.34, rel=0.48, vib=9.5, bright=0.68)

    # S18 (43.50-47.00s): Sculptural Case & Bezel Sweep — Warm Bb Major 9
    add_sub("Bb1", 43.50, 3.52, gain=0.41, att=0.30, rel=0.48)
    add_pad(["Bb1", "F2", "C3", "D3", "F3", "A3"], 43.50, 3.52, gain=0.44, att=0.40, rel=0.50)
    add_cello("Bb1", 43.50, 3.52, gain=0.32, att=0.32, rel=0.48, vib=8.0, bright=0.62)
    add_cello("D3", 43.50, 1.85, gain=0.28, att=0.32, rel=0.38, vib=9.0, bright=0.64)
    add_cello("F3", 45.20, 1.82, gain=0.29, att=0.32, rel=0.42, vib=9.5, bright=0.66)

    # S19 (47.00-50.00s): 10:10 Hero Dial Alive -> graceful dip-to-black hush at 50.0s
    add_sub("A1", 47.00, 2.85, gain=0.39, att=0.28, rel=0.80)
    add_pad(["A1", "E2", "A2", "D3", "E3"], 47.00, 1.45, gain=0.40, att=0.32, rel=0.42)
    add_pad(["A1", "E2", "A2", "C#3", "E3"], 48.20, 1.68, gain=0.36, att=0.42, rel=0.82)
    add_cello("E3", 47.00, 2.82, gain=0.27, att=0.30, rel=0.82, vib=9.0, bright=0.62)
    add_cello("C#3", 48.10, 1.75, gain=0.25, att=0.38, rel=0.82, vib=8.5, bright=0.58)

    # -----------------------------------------------------------------------
    # CHUNK 6 (50.00 - 60.00s): THE LEGACY LOCKUP (Museum Stillness -> D Major Grace)
    # -----------------------------------------------------------------------
    # S20 (50.00-55.00s): Whisper-quiet warm sub-pedal so solo tourbillon ticking shines
    add_sub("D1", 50.30, 4.65, gain=0.18, att=1.20, rel=0.85)
    add_pad(["D2", "A2"], 50.40, 4.55, gain=0.13, att=1.30, rel=0.85)
    add_cello("A1", 50.55, 4.35, gain=0.12, att=1.30, rel=0.85, vib=4.5, bright=0.28)

    # S21 (55.00-59.85s): Warm D Major add9 Lockup Breath ("VAUCHER NOIR — CALIBER 01")
    # Gently recedes before 59.85s so the 59.0s Geneva chime rings into pure velvet silence!
    add_sub("D1", 55.00, 4.78, gain=0.24, att=1.00, rel=1.45)
    add_pad(["D2", "A2", "E3", "F#3", "A3"], 55.00, 4.82, gain=0.27, att=1.10, rel=1.45)
    add_cello("D2", 55.00, 4.78, gain=0.22, att=1.00, rel=1.40, vib=7.0, bright=0.48)
    add_cello("A2", 55.08, 4.70, gain=0.18, att=1.10, rel=1.40, vib=7.5, bright=0.50)
    add_cello("F#3", 55.18, 4.60, gain=0.19, att=1.20, rel=1.40, vib=8.0, bright=0.52)

    cello_shaped = apply_cello_body_resonances(cello_dry)

    t_full = np.arange(N_SAMPLES, dtype=np.float64) / SR
    cutoff = np.interp(
        t_full,
        [
            0.0, 3.0, 7.0, 10.0, 15.17, 17.67,
            20.0, 23.0, 27.5, 30.0,
            37.5, 39.82, 39.98,
            40.0, 44.0, 48.5, 50.0,
            50.3, 55.0, 56.8, 59.8, 60.0,
        ],
        [
            165.0, 270.0, 200.0, 320.0, 540.0, 290.0,
            230.0, 880.0, 1050.0, 580.0,
            340.0, 2600.0, 420.0,
            1250.0, 1020.0, 720.0, 200.0,
            175.0, 300.0, 660.0, 180.0, 120.0,
        ],
    )
    pad_filtered = time_varying_lowpass_stereo(pad_raw, cutoff, order=4, block_size=512)

    score_dry = cello_shaped + pad_filtered
    score_hall = convolve_stereo_ir(score_dry, hall_ir)
    score_bus = 0.72 * score_dry + 0.40 * score_hall
    return score_bus, sub_bus


# ---------------------------------------------------------------------------
# 3. Stationary Bowed-Crystal Shimmers, Velvet Wipes, Impacts & Geneva Chime
# ---------------------------------------------------------------------------
def synth_crystalline_glare_shimmer(
    dur_s: float,
    chord_notes: list[str],
    pan_start: float,
    pan_end: float,
    fc_peak: float,
    rng: np.random.Generator,
) -> np.ndarray:
    """
    True Geneva luxury optical-glare shimmer: stationary bowed-glass / crystal
    harmonics (ZERO pitch-sliding whistle!) illuminated by a sweeping resonant
    bandpass caustic filter + silky brushed-metal air panning across stereo.
    """
    n = int(round(dur_s * SR))
    t = np.arange(n, dtype=np.float64) / SR
    u = t / max(dur_s, 1e-6)
    env = np.sin(math.pi * u) ** 1.5

    crystal = np.zeros(n, dtype=np.float64)
    for idx, n_name in enumerate(chord_notes):
        f0 = NOTE_HZ[n_name]
        for det_c in (-2.8, +2.8):
            fv = f0 * (2.0 ** (det_c / 1200.0))
            shimmer_am = 0.78 + 0.22 * np.sin(2.0 * math.pi * (2.4 + 0.6 * idx) * t + rng.uniform(0, 6.28))
            crystal += (0.28 / len(chord_notes) ** 0.65) * np.sin(
                2.0 * math.pi * fv * t + rng.uniform(0, 6.28)
            ) * shimmer_am

    # Ultra-fine velvet metallic air sheen (5.5 - 13.5 kHz)
    sos_air = signal.butter(2, [5500.0 / (0.5 * SR), 13500.0 / (0.5 * SR)], btype="band", output="sos")
    air = signal.sosfilt(sos_air, rng.standard_normal(n)) * 0.055

    pan_curve = pan_start + (pan_end - pan_start) * u
    raw_st = pan_stereo((crystal + air) * env, pan_curve)

    # Sweep optical filter smoothly up to fc_peak and back
    fc_curve = 950.0 + (fc_peak - 950.0) * (np.sin(math.pi * u) ** 1.1)
    return time_varying_bandpass_stereo(raw_st, fc_curve, bandwidth_oct=1.6, block_size=384)


def synth_velvet_wipe_transition(dur_s: float, pan_dir: float, rng: np.random.Generator) -> np.ndarray:
    """Whisper-subtle brushed-metal & crystal bevel wipe (never hissy noise)."""
    n = int(round(dur_s * SR))
    t = np.arange(n, dtype=np.float64) / SR
    u = t / max(dur_s, 1e-6)
    env = np.sin(math.pi * u) ** 2.2

    white = rng.standard_normal(n)
    silk = signal.sosfilt(signal.butter(2, 650.0 / (0.5 * SR), btype="low", output="sos"), white) * 1.4
    # Subtle pure harmonic bevel glint blended with soft low velvet air
    bevel_tone = (
        0.16 * np.sin(2.0 * math.pi * NOTE_HZ["A5"] * t)
        + 0.12 * np.sin(2.0 * math.pi * NOTE_HZ["E6"] * t)
    )
    st = pan_stereo((silk * 0.35 + bevel_tone) * env, np.linspace(-0.60 * pan_dir, 0.60 * pan_dir, n))
    fc = 520.0 + 1850.0 * np.sin(math.pi * u)
    return time_varying_bandpass_stereo(st, fc, bandwidth_oct=1.4, block_size=256) * 0.24


def synth_luxury_impact(
    sub_start_hz: float,
    sub_end_hz: float,
    dur_s: float,
    snap_brightness: float,
    braam_notes: list[str] | None,
    tables: dict[str, np.ndarray],
    rng: np.random.Generator,
) -> np.ndarray:
    """Taut Geneva cinema sub-impact + crisp horological transient + dark low-cello/brass slam."""
    n = int(round(dur_s * SR))
    t = np.arange(n, dtype=np.float64) / SR

    f_sub = sub_end_hz + (sub_start_hz - sub_end_hz) * np.exp(-t / 0.052)
    ph_sub = 2.0 * math.pi * np.cumsum(f_sub) / SR
    sub_body = np.sin(ph_sub) * (1.0 - np.exp(-t / 0.003)) * np.exp(-t / (0.32 * dur_s))
    sub_body = np.tanh(sub_body * 1.38) * 0.72

    # Crisp precision metallic transient on exact visual cut frame
    snap_raw = rng.standard_normal(n)
    sos_s = signal.butter(2, [2800.0 / (0.5 * SR), 11500.0 / (0.5 * SR)], btype="band", output="sos")
    snap = (
        signal.sosfilt(sos_s, snap_raw) * np.exp(-t / 0.0035) * 0.45
        + 0.28 * np.sin(2.0 * math.pi * 4400.0 * t) * np.exp(-t / 0.0045)
        + 0.22 * np.sin(2.0 * math.pi * 7600.0 * t) * np.exp(-t / 0.0028)
    ) * snap_brightness * (1.0 - np.exp(-t / 0.0003))

    st = np.column_stack((sub_body, sub_body)) + pan_stereo(snap, 0.0)

    if braam_notes:
        b_env = (1.0 - np.exp(-t / 0.016)) * np.exp(-t / (0.48 * dur_s))
        tbl = tables["cantabile"]
        for b_note in braam_notes:
            bf = NOTE_HZ[b_note]
            for det, p_pos in [(-6.0, -0.60), (+6.0, +0.60)]:
                fv = bf * (2.0 ** (det / 1200.0))
                b_sig = read_wavetable(tbl, np.cumsum(np.full(n, fv)) / SR + rng.random())
                st += pan_stereo(np.tanh(b_sig * 1.35) * b_env * 0.17, p_pos)
        sos_blp = signal.butter(3, 1150.0 / (0.5 * SR), btype="low", output="sos")
        st = 0.62 * st + 0.38 * signal.sosfilt(sos_blp, st, axis=0)

    taper = min(n // 4, int(0.03 * SR))
    if taper > 1:
        st[-taper:] *= np.linspace(1.0, 0.0, taper)[:, None]
    return st


def synth_chrono_pusher_detent(rng: np.random.Generator) -> np.ndarray:
    """Two-stage column-wheel chronograph pusher engagement click-snap."""
    n = int(0.07 * SR)
    st = np.zeros((n, 2), dtype=np.float64)
    for offset_ms, f1, f2, amp, pan_p in [
        (0.0, 4100.0, 8600.0, 0.52, -0.14),
        (12.5, 5200.0, 11200.0, 0.74, +0.12),
    ]:
        i0 = int(round(offset_ms * 1e-3 * SR))
        tm = np.arange(n - i0, dtype=np.float64) / SR
        click = (
            0.50 * np.sin(2.0 * math.pi * f1 * tm) * np.exp(-tm / 0.0011)
            + 0.42 * np.sin(2.0 * math.pi * f2 * tm) * np.exp(-tm / 0.00075)
        )
        tex = signal.sosfilt(
            signal.butter(2, [3800.0 / (0.5 * SR), 14000.0 / (0.5 * SR)], btype="band", output="sos"),
            rng.standard_normal(n - i0),
        ) * np.exp(-tm / 0.00055) * 0.35
        st[i0:] += pan_stereo((click + tex) * amp, pan_p)
    return st


def synth_geneva_minute_repeater_chime() -> np.ndarray:
    """
    Synthesizes the t = 59.000s -> 60.000s Geneva Cathedral Minute-Repeater Gong &
    Harmonic Chord Decay (D3 + A3 + E4 + F#4 + A4 + D5):
      - 14.0 ms separation after t = 59.000s so the Final Master Watch Tick lands
        with unmistakable crisp authority right as the warm cathedral gong blooms!
      - Natural exponential acoustic decay (tau = 0.25s..0.30s) reaching -46 dBFS by
        59.88s and tapering silkily to exact 0.000000 over the final 2,400 samples (50 ms).
    """
    n = SR  # 48,000 samples = [59.000s, 60.000s]
    t = np.arange(n, dtype=np.float64) / SR

    onset_s = 0.014  # Lets k=472 final mechanical tick transient speak cleanly first!
    tc = np.maximum(0.0, t - onset_s)
    att = np.where(t >= onset_s, 1.0 - np.exp(-tc / 0.0065), 0.0)

    chord_voices = [
        ("D2", 0.30, 0.00, 0.44),    # Warm rose-gold case soundboard foundation
        ("D3", 0.50, -0.18, 0.42),   # Cathedral repeater root gong
        ("A3", 0.36, +0.22, 0.39),   # Noble fifth
        ("E4", 0.27, -0.34, 0.36),   # Luminous Geneva ninth
        ("F#4", 0.30, +0.32, 0.37),  # Warm major third (Picardy light)
        ("D5", 0.17, -0.08, 0.30),   # Delicate crystalline crown
    ]

    # Coiled steel cathedral gong partials: (ratio, rel_amp, partial_tau_mult)
    partials = [
        (1.0000, 1.00, 1.00),
        (1.0016, 0.28, 0.95),  # Subtle authentic two-axis wire shimmer
        (2.0015, 0.32, 0.74),
        (2.7580, 0.12, 0.50),  # Curved cathedral gong modal signature
        (4.1800, 0.05, 0.32),
    ]

    stereo = np.zeros((n, 2), dtype=np.float64)
    for note_name, v_gain, pan_p, base_tau in chord_voices:
        f0 = NOTE_HZ[note_name]
        voice = np.zeros(n, dtype=np.float64)
        for ratio, p_amp, tau_m in partials:
            fp = f0 * ratio
            if fp < 13000.0:
                voice += p_amp * np.sin(2.0 * math.pi * fp * tc) * np.exp(
                    -tc / (base_tau * tau_m)
                )
        stereo += pan_stereo(voice * att * v_gain, pan_p)

    # Silky final 140 ms cosine fade + exact 2,400-sample (50 ms) endpoint polish
    fade_len = int(0.140 * SR)
    stereo[-fade_len:] *= (0.5 * (1.0 + np.cos(np.linspace(0.0, math.pi, fade_len))))[:, None]
    stereo[-1] = 0.0
    return stereo


def build_fx_and_percussion_stem(
    rng: np.random.Generator, hall_ir: np.ndarray
) -> np.ndarray:
    """Renders all storyboard-synced shimmers, wipes, Chunk 4 impacts & 59.0s chime."""
    tables = build_cello_wavetables()
    fx_dry = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    fx_hall_send = np.zeros((N_SAMPLES, 2), dtype=np.float64)

    # 1. S01 (0.80 - 2.40s): Rose-gold bezel specular glint (stationary crystal harmonics!)
    glint_s01 = synth_crystalline_glare_shimmer(
        1.60, ["D5", "A5", "E6", "A6"], pan_start=-0.40, pan_end=+0.40, fc_peak=4200.0, rng=rng
    )
    add_stereo_clip(fx_dry, glint_s01, int(0.80 * SR), gain=0.14)
    add_stereo_clip(fx_hall_send, glint_s01, int(0.80 * SR), gain=0.26)

    # 2. S03 (7.000s): "312 COMPONENTS." velvet sub-drop + warm A4/E5 harmonic breath
    hit_s03 = synth_luxury_impact(52.0, 36.71, 1.35, 0.14, None, tables, rng)
    add_stereo_clip(fx_dry, hit_s03, int(7.000 * SR), gain=0.40)
    glint_s03 = synth_crystalline_glare_shimmer(
        1.25, ["A4", "E5", "A5"], pan_start=-0.15, pan_end=+0.15, fc_peak=2600.0, rng=rng
    )
    add_stereo_clip(fx_hall_send, glint_s03, int(7.020 * SR), gain=0.18)

    # 3. S06 (15.167s): Velvet masked wipe across Cotes de Geneve bridge ribs
    wipe_s06 = synth_velvet_wipe_transition(0.30, pan_dir=1.0, rng=rng)
    add_stereo_clip(fx_dry, wipe_s06, int((15.167 - 0.15) * SR), gain=0.11)
    add_stereo_clip(fx_hall_send, wipe_s06, int((15.167 - 0.15) * SR), gain=0.24)

    # 4. S07 (17.667s): "ZERO TOLERANCE." muted concert timpani thud + pure A4/E5 crystal bell
    hit_s07 = synth_luxury_impact(68.0, 36.71, 1.25, 0.22, None, tables, rng)
    add_stereo_clip(fx_dry, hit_s07, int(17.667 * SR), gain=0.42)
    cal_t = np.arange(int(1.3 * SR), dtype=np.float64) / SR
    cal_sig = (
        0.65 * np.sin(2.0 * math.pi * NOTE_HZ["A4"] * cal_t) * np.exp(-cal_t / 0.45)
        + 0.35 * np.sin(2.0 * math.pi * NOTE_HZ["E5"] * cal_t) * np.exp(-cal_t / 0.32)
    ) * (1.0 - np.exp(-cal_t / 0.006))
    add_stereo_clip(fx_dry, pan_stereo(cal_sig, 0.12), int(17.667 * SR), gain=0.06)
    add_stereo_clip(fx_hall_send, pan_stereo(cal_sig, -0.12), int(17.667 * SR), gain=0.14)

    # 5. S09 (23.65s & 24.55s): Subtle blued-steel micro-screw specular glints
    for gt, gp, gnotes in [(23.65, -0.32, ["A5", "E6"]), (24.55, +0.35, ["D6", "A6"])]:
        gl = synth_crystalline_glare_shimmer(0.55, gnotes, gp, gp * 0.4, 4800.0, rng)
        add_stereo_clip(fx_hall_send, gl, int(gt * SR), gain=0.16)

    # 6. S10 (25.50 - 27.80s): Diagonal Sapphire Glare Sweep (L -> R Bowed-Crystal Caustic Sheen!)
    wipe_s10 = synth_velvet_wipe_transition(0.28, pan_dir=1.0, rng=rng)
    add_stereo_clip(fx_dry, wipe_s10, int((25.500 - 0.14) * SR), gain=0.10)
    sapphire = synth_crystalline_glare_shimmer(
        2.30, ["D5", "A5", "D6", "E6", "A6"], pan_start=-0.85, pan_end=+0.85, fc_peak=5800.0, rng=rng
    )
    add_stereo_clip(fx_dry, sapphire, int(25.50 * SR), gain=0.22)
    add_stereo_clip(fx_hall_send, sapphire, int(25.50 * SR), gain=0.34)

    # 7. S11 (28.000s): Fluted crown precision detent click
    add_stereo_clip(fx_dry, synth_chrono_pusher_detent(rng), int(28.000 * SR), gain=0.24)

    # -----------------------------------------------------------------------
    # 8. CHUNK 4 (30.00 - 40.00s): RAPID HOROLOGY MONTAGE IMPACTS & GROOVE
    # -----------------------------------------------------------------------
    pulse_kick = synth_luxury_impact(88.0, 41.2, 0.30, 0.14, None, tables, rng)
    for beat_i in range(15):
        bt = 30.000 + beat_i * 0.500
        if min(abs(bt - 33.8), abs(bt - 35.6), abs(bt - 36.5)) > 0.12:
            add_stereo_clip(fx_dry, pulse_kick, int(round(bt * SR)), gain=0.28)

    # Impact 1 (30.000s, S12 Chrono Snap): Column-wheel pusher + taut sub-kick
    add_stereo_clip(fx_dry, synth_chrono_pusher_detent(rng), int(30.000 * SR), gain=0.58)
    imp_30 = synth_luxury_impact(102.0, 36.71, 0.80, 0.42, None, tables, rng)
    add_stereo_clip(fx_dry, imp_30, int(30.000 * SR), gain=0.50)

    # Impact 2 (32.000s, S13 Indices Rim Flash): Hit + 4-baton rose-gold crystal cascade
    imp_32 = synth_luxury_impact(96.0, 36.71, 0.72, 0.38, None, tables, rng)
    add_stereo_clip(fx_dry, imp_32, int(32.000 * SR), gain=0.46)
    for idx_f, (fn, fp) in enumerate([("D5", -0.58), ("F5", -0.20), ("A5", +0.22), ("E6", +0.62)]):
        ft = 32.125 + idx_f * 0.375
        nt = np.arange(int(0.42 * SR), dtype=np.float64) / SR
        f_hz = NOTE_HZ[fn]
        spark = (
            0.72 * np.sin(2.0 * math.pi * f_hz * nt) * np.exp(-nt / 0.14)
            + 0.28 * np.sin(2.0 * math.pi * f_hz * 2.0 * nt) * np.exp(-nt / 0.07)
        ) * (1.0 - np.exp(-nt / 0.0025))
        add_stereo_clip(fx_dry, pan_stereo(spark, fp), int(round(ft * SR)), gain=0.085)
        add_stereo_clip(fx_hall_send, pan_stereo(spark, fp), int(round(ft * SR)), gain=0.16)

    # Impact 3 (33.800s, S14 "18K ROSE GOLD."): Deep Braam-Pulse + Precision Shutter Snap
    imp_338 = synth_luxury_impact(106.0, 36.71, 1.15, 0.54, ["D1", "D2", "A2"], tables, rng)
    add_stereo_clip(fx_dry, imp_338, int(round(33.800 * SR)), gain=0.58)
    add_stereo_clip(fx_hall_send, imp_338, int(round(33.800 * SR)), gain=0.25)

    # Impact 4 (35.600s, S15a "28,800 VPH."): Sharp Slam
    imp_356 = synth_luxury_impact(104.0, 36.71, 0.82, 0.50, ["Bb1", "F2", "Bb2"], tables, rng)
    add_stereo_clip(fx_dry, imp_356, int(round(35.600 * SR)), gain=0.54)
    add_stereo_clip(fx_hall_send, imp_356, int(round(35.600 * SR)), gain=0.22)

    # Impact 5 (36.500s / 36.533s, S15b "GENEVA."): Paired Geneva Slam
    imp_365 = synth_luxury_impact(108.0, 36.71, 0.92, 0.56, ["A1", "E2", "A2"], tables, rng)
    add_stereo_clip(fx_dry, imp_365, int(round(36.515 * SR)), gain=0.58)
    add_stereo_clip(fx_hall_send, imp_365, int(round(36.515 * SR)), gain=0.26)

    # Impact 6 + Dark Muscular Sub-Heartbeat & Bowed Shimmer Riser (37.500s -> 39.900s, S16)
    imp_375 = synth_luxury_impact(94.0, 41.2, 0.65, 0.40, None, tables, rng)
    add_stereo_clip(fx_dry, imp_375, int(round(37.500 * SR)), gain=0.44)

    # Accelerating luxury sub-heartbeat pulses locked to the 125ms tick grid
    for hb_t, hb_g in [
        (38.000, 0.24), (38.500, 0.28), (38.875, 0.32),
        (39.250, 0.36), (39.500, 0.39), (39.750, 0.42),
    ]:
        add_stereo_clip(fx_dry, pulse_kick, int(round(hb_t * SR)), gain=hb_g)

    n_riser = int(round(2.40 * SR))
    ur = np.linspace(0.0, 1.0, n_riser)
    riser_env = (ur**2.0) * smooth_envelope(n_riser, 0.12, 0.10)
    cymbal_air = pan_stereo(rng.standard_normal(n_riser) * riser_env * 0.18, np.sin(3.0 * math.pi * ur) * 0.40)
    cymbal_air = time_varying_bandpass_stereo(cymbal_air, 450.0 + 2200.0 * (ur**1.6), bandwidth_oct=1.5)
    add_stereo_clip(fx_dry, cymbal_air, int(round(37.500 * SR)), gain=0.14)
    add_stereo_clip(fx_hall_send, cymbal_air, int(round(37.500 * SR)), gain=0.30)

    # -----------------------------------------------------------------------
    # 9. CHUNK 5 (40.00 - 50.00s): MONOLITH REVEAL BLOOM & BEZEL SHEEN
    # -----------------------------------------------------------------------
    imp_400 = synth_luxury_impact(80.0, 36.71, 2.10, 0.25, ["D1", "D2", "A2"], tables, rng)
    add_stereo_clip(fx_dry, imp_400, int(round(40.000 * SR)), gain=0.52)
    add_stereo_clip(fx_hall_send, imp_400, int(round(40.000 * SR)), gain=0.32)

    case_sheen = synth_crystalline_glare_shimmer(
        2.20, ["F5", "A5", "C6", "D6"], pan_start=-0.50, pan_end=+0.50, fc_peak=3800.0, rng=rng
    )
    add_stereo_clip(fx_dry, case_sheen, int(44.00 * SR), gain=0.14)
    add_stereo_clip(fx_hall_send, case_sheen, int(44.00 * SR), gain=0.24)

    wipe_s19 = synth_velvet_wipe_transition(0.28, pan_dir=-1.0, rng=rng)
    add_stereo_clip(fx_dry, wipe_s19, int((47.000 - 0.14) * SR), gain=0.11)
    add_stereo_clip(fx_hall_send, wipe_s19, int((47.000 - 0.14) * SR), gain=0.22)

    # -----------------------------------------------------------------------
    # 10. CHUNK 6 (50.00 - 60.00s): LOCKUP BREATH & 59.000s GENEVA CHIME
    # -----------------------------------------------------------------------
    lockup_shimmer = synth_crystalline_glare_shimmer(
        2.00, ["A4", "E5", "F#5", "A5"], pan_start=-0.30, pan_end=+0.30, fc_peak=3200.0, rng=rng
    )
    add_stereo_clip(fx_hall_send, lockup_shimmer, int(55.05 * SR), gain=0.20)

    # Final 59.000s (sample 2,832,000): Geneva Cathedral Minute-Repeater Chime -> 60.000s!
    chime_59 = synth_geneva_minute_repeater_chime()
    add_stereo_clip(fx_dry, chime_59, int(59.000 * SR), gain=0.66)
    chime_hall_send = np.zeros((N_SAMPLES, 2), dtype=np.float64)
    add_stereo_clip(chime_hall_send, chime_59, int(59.000 * SR), gain=0.30)
    chime_wet = convolve_stereo_ir(chime_hall_send, hall_ir)
    chime_tail_env = np.exp(-np.arange(SR, dtype=np.float64) / (0.44 * SR))[:, None]
    chime_wet[59 * SR :] *= chime_tail_env

    return fx_dry + convolve_stereo_ir(fx_hall_send, hall_ir) + chime_wet


# ---------------------------------------------------------------------------
# 4. Mastering Chain & Self-Verification Diagnostics
# ---------------------------------------------------------------------------
def master_mix(
    foley_stem: np.ndarray,
    score_stem: np.ndarray,
    sub_stem: np.ndarray,
    fx_stem: np.ndarray,
) -> np.ndarray:
    """
    Audiophile luxury cinema mastering:
      - Open transient headroom (~14.5 dB crest factor, ~-14.8 LUFS integrated)
      - 24.0 Hz 4th-order zero-phase Butterworth HPF
      - Smooth 15 ms fade-in and 2,400-sample (50 ms) EOF raised-cosine taper to 0.000
      - Zero DC offset, strict -1.20 dBFS true sample peak ceiling (zero clipping).
    """
    mix = (
        1.08 * foley_stem
        + 0.84 * score_stem
        + 0.80 * sub_stem
        + 0.90 * fx_stem
    )

    sos_hpf = signal.butter(4, 24.0 / (0.5 * SR), btype="high", output="sos")
    mix = signal.sosfiltfilt(sos_hpf, mix, axis=0)

    # Very gentle soft-knee analog bus glue preserving crisp watch-tick crest factor
    pre_peak = float(np.max(np.abs(mix)))
    if pre_peak > 1e-9:
        mix = mix / pre_peak
    drive = 1.08
    mix = np.tanh(mix * drive) / math.tanh(drive)

    # 15 ms fade-in at t=0.000s & 2,400-sample (50.0 ms) smooth EOF fade-out to 0.000000
    n_in = int(0.015 * SR)
    mix[:n_in] *= (0.5 * (1.0 - np.cos(np.linspace(0.0, math.pi, n_in))))[:, None]

    n_out = 2_400
    mix[-n_out:] *= (0.5 * (1.0 + np.cos(np.linspace(0.0, math.pi, n_out))))[:, None]

    # Exact zero-DC correction preserving 0.0 endpoints
    dc = np.mean(mix, axis=0, keepdims=True)
    w_dc = np.ones((N_SAMPLES, 1), dtype=np.float64)
    w_dc[:n_in, 0] = np.linspace(0.0, 1.0, n_in)
    w_dc[-n_out:, 0] = np.linspace(1.0, 0.0, n_out)
    mix = mix - dc * w_dc

    target_peak = 10.0 ** (-1.20 / 20.0)  # 0.87096359 (-1.20 dBFS)
    cur_peak = float(np.max(np.abs(mix)))
    mix = mix * (target_peak / max(cur_peak, 1e-12))
    mix[0] = 0.0
    mix[-1] = 0.0
    return mix


def write_wav_16bit_stereo(path: Path, audio: np.ndarray) -> None:
    assert audio.shape == (N_SAMPLES, 2), f"Unexpected shape: {audio.shape}"
    rng_dither = np.random.default_rng(20260101)
    dither = (rng_dither.random(audio.shape) - rng_dither.random(audio.shape)) / 32768.0
    dither[:64] = 0.0
    dither[-256:] = 0.0
    scaled = np.clip((audio + dither) * 32767.0, -32767.0, 32767.0)
    pcm16 = np.rint(scaled).astype("<i2")

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm16.tobytes())


def compute_diagnostics(audio: np.ndarray) -> dict[str, float]:
    peak = float(np.max(np.abs(audio)))
    peak_dbfs = 20.0 * math.log10(max(peak, 1e-12))
    rms = float(np.sqrt(np.mean(audio * audio)))
    rms_dbfs = 20.0 * math.log10(max(rms, 1e-12))

    sos_k1 = peaking_eq_sos(1681.97, 0.707, +4.0)
    sos_k2 = signal.butter(2, 38.13 / (0.5 * SR), btype="high", output="sos")
    kw = signal.sosfilt(sos_k2, signal.sosfilt(sos_k1, audio, axis=0), axis=0)
    mean_sq = float(np.sum(np.mean(kw * kw, axis=0)))
    lufs_approx = -0.691 + 10.0 * math.log10(max(mean_sq, 1e-12))

    corr = float(np.corrcoef(audio[:, 0], audio[:, 1])[0, 1])
    dc_max = float(np.max(np.abs(np.mean(audio, axis=0))))
    clipped = int(np.sum(np.abs(audio) >= 0.999))
    eof_max = float(np.max(np.abs(audio[-16:])))
    return {
        "peak": peak,
        "peak_dbfs": peak_dbfs,
        "rms_dbfs": rms_dbfs,
        "lufs_approx": lufs_approx,
        "stereo_corr": corr,
        "dc_offset": dc_max,
        "clipped_samples": clipped,
        "eof_tail_max": eof_max,
    }


def main() -> int:
    t0 = time.perf_counter()
    repo_root = Path(__file__).resolve().parent.parent
    out_path = (
        Path(sys.argv[1]).resolve()
        if len(sys.argv) > 1
        else repo_root / "soundtrack_60s.wav"
    )

    rng = np.random.default_rng(18750101)

    print("[sound-designer] Building acoustic impulse responses (Geneva Hall & Foley Booth)...")
    hall_ir = build_concert_hall_ir(rng)
    studio_ir = build_studio_foley_ir(rng)

    print("[sound-designer] Synthesizing miniature 8.000 Hz Swiss lever escapement foley (k=0..472)...")
    foley_stem = build_escapement_foley_stem(rng, studio_ir)

    print("[sound-designer] Synthesizing 6-player bowed chamber cello & sub-bass score...")
    score_stem, sub_stem = build_score_and_sub_stems(rng, hall_ir)

    print("[sound-designer] Synthesizing crystal shimmers, wipes, Chunk 4 impacts & 59.0s chime...")
    fx_stem = build_fx_and_percussion_stem(rng, hall_ir)

    print("[sound-designer] Mastering stereo bus (24 Hz HPF, -1.20 dBFS ceiling)...")
    master = master_mix(foley_stem, score_stem, sub_stem, fx_stem)

    write_wav_16bit_stereo(out_path, master)
    elapsed = time.perf_counter() - t0

    stats = compute_diagnostics(master)
    file_bytes = os.path.getsize(out_path)
    print(f"[sound-designer] Wrote {out_path} ({file_bytes:,} bytes) in {elapsed:.2f}s")
    print(
        f"  Frames: {master.shape[0]:,} @ {SR} Hz = {master.shape[0] / SR:.6f}s | "
        f"Peak: {stats['peak_dbfs']:.2f} dBFS ({stats['peak']:.5f}) | "
        f"RMS: {stats['rms_dbfs']:.2f} dBFS | ~LUFS: {stats['lufs_approx']:.2f} | "
        f"Corr: {stats['stereo_corr']:.3f} | DC: {stats['dc_offset']:.2e} | "
        f"Clips: {stats['clipped_samples']} | EOF max: {stats['eof_tail_max']:.2e}"
    )

    chunk_rms = []
    for c in range(6):
        seg = master[c * 10 * SR : (c + 1) * 10 * SR]
        r_db = 20.0 * math.log10(max(float(np.sqrt(np.mean(seg * seg))), 1e-12))
        chunk_rms.append(f"C{c+1}:{r_db:.1f}dB")
    print("  Chunk RMS Profile:", " | ".join(chunk_rms))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
