import semver = require('semver');

const versionRegEx = /(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/;

/**
 * Parses the version printed by `ovr-platform-util version`.
 * 3 part versions (208.0.0) stay as a.b.c, 4 part versions (1.2.3.4) become a.b.c+d.
 */
export function ParseVersion(output: string): string {
    const match = output.match(versionRegEx);
    if (!match) {
        throw Error(`Failed to find a valid version match in:\n${output}`);
    }
    const [, major, minor, patch, build] = match;
    const semVerStr = build ? `${major}.${minor}.${patch}+${build}` : `${major}.${minor}.${patch}`;
    const version = semver.valid(semVerStr);
    if (!version) {
        throw Error(`Failed to find a valid version in: ${match[0]}`);
    }
    return semVerStr;
}
