import { now } from './now';

/**
 * @param {string | null} installDateIso
 * @returns {boolean}
 */
export function isThemeGracePeriodActive(installDateIso) {
  if (!installDateIso) return false;
  const installedAt = new Date(installDateIso);
  if (Number.isNaN(installedAt.getTime())) return false;
  const diffMs = now().getTime() - installedAt.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days < 90;
}

/**
 * @param {string} featureLaunchDateIso
 * @param {string | null} installDateIso
 * @returns {boolean}
 */
export function isFeatureInGracePeriod(featureLaunchDateIso, installDateIso) {
  if (!installDateIso) return false;
  const installedAt = new Date(installDateIso);
  const launchedAt = new Date(featureLaunchDateIso);
  if (Number.isNaN(installedAt.getTime())) return false;
  if (Number.isNaN(launchedAt.getTime())) return false;
  return installedAt.getTime() < launchedAt.getTime();
}

