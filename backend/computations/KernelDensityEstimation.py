import math
from typing import List, Dict

class KernelDensityEstimation:
    def __init__(self, bandwidth: float = 0.1, grid_resolution: int = 360):
        self.bandwidth = bandwidth
        self.grid_resolution = grid_resolution
        self.two_pi = 2.0 * math.pi
        self.sessions = []

    def _normal_cdf(self, x: float) -> float:
        """Standard normal CDF via math.erf."""
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

    def _session_density(self, theta: float, start: float, end: float) -> float:
        """
        Contribution of one session interval [start, end] at theta.

        Integrates a Gaussian kernel over the session span, then divides by
        duration so that every session contributes total mass = 1 regardless
        of length.  Long sessions spread their mass thinly; overlapping short
        sessions stack their mass at the same point.
        """
        duration = end - start  # always positive (enforced in fit)
        contrib = 0.0
        for offset in [-self.two_pi, 0, self.two_pi]:
            t = theta + offset
            contrib += (
                self._normal_cdf((t - start) / self.bandwidth)
                - self._normal_cdf((t - end)   / self.bandwidth)
            )
        return contrib / duration

    def fit(self, sessions: List[Dict]):
        """
        Stores each session as a (start, end, quality) interval.
        Duration normalises mass distribution — it no longer amplifies weight.
        """
        # 5-minute floor: prevents micro-sessions from spiking density
        # (dividing by a near-zero duration would produce enormous values)
        MIN_DURATION = 5 * 60 * self.two_pi / 604800

        self.sessions = []
        for session in sessions:
            start = session['theta_start']
            end   = session['theta_end']
            if end < start:         # wrap-around (e.g. Sunday night -> Monday)
                end += self.two_pi
            if end - start < MIN_DURATION:
                continue            # discard micro-sessions entirely
            quality = session.get('quality_score', 1.0)
            self.sessions.append((start, end, quality))

    def _evaluate(self, theta: float) -> float:
        """
        Density = quality-weighted average of per-session contributions.
        Because each session's total mass is 1, density at any point
        is driven by how many sessions cover that time, not how long any
        individual session ran.
        """
        if not self.sessions:
            return 0.0
        total_quality = sum(q for _, _, q in self.sessions)
        if total_quality == 0:
            return 0.0
        density = sum(
            quality * self._session_density(theta, start, end)
            for start, end, quality in self.sessions
        )
        return density / total_quality

    def get_peak_windows(self, prominence_threshold: float = 0.1) -> List[Dict]:
        if not self.sessions:
            return []

        grid = [i * (self.two_pi / self.grid_resolution) for i in range(self.grid_resolution)]
        raw_densities     = [self._evaluate(t) for t in grid]
        max_density       = max(raw_densities)

        if max_density == 0:
            return []

        normalized_densities = [d / max_density for d in raw_densities]

        peaks = []
        for i in range(self.grid_resolution):
            prev_i = (i - 1) % self.grid_resolution
            next_i = (i + 1) % self.grid_resolution

            is_peak = (
                normalized_densities[i] > normalized_densities[prev_i]
                and normalized_densities[i] > normalized_densities[next_i]
            )
            if not is_peak:
                continue

            peak_density = normalized_densities[i]
            if peak_density < prominence_threshold:
                continue

            half_max = peak_density / 2.0

            left_i = i
            for _ in range(self.grid_resolution):
                candidate = (left_i - 1) % self.grid_resolution
                if normalized_densities[candidate] < half_max:
                    break
                left_i = candidate

            right_i = i
            for _ in range(self.grid_resolution):
                candidate = (right_i + 1) % self.grid_resolution
                if normalized_densities[candidate] < half_max:
                    break
                right_i = candidate

            peaks.append({
                "peak_theta":   grid[i],
                "ci_low":       grid[left_i],
                "ci_high":      grid[right_i],
                "peak_density": peak_density,
            })

        return peaks