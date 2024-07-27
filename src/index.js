const semver = require('semver');
const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const fs = require('fs').promises;

const ovrPlatformUtil = 'ovr-platform-util';
const IS_WINDOWS = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin'
const toolExtension = IS_WINDOWS ? '.exe' : '';
const toolPath = `${ovrPlatformUtil}${toolExtension}`;

const main = async () => {
    try {
        core.info(`Setting up ${ovrPlatformUtil}...`);
        await setup_ovrPlatformUtil();
    } catch (error) {
        core.setFailed(error);
    }
}

main();

async function setup_ovrPlatformUtil() {
    let toolDirectory = tc.find(ovrPlatformUtil, '*');
    let tool = undefined;
    if (!toolDirectory) {
        const url = getDownloadUrl();
        const archiveDownloadPath = path.resolve(getTempDirectory(), toolPath);
        core.debug(`Attempting to download ${ovrPlatformUtil} from ${url} to ${archiveDownloadPath}`);
        const archivePath = await tc.downloadTool(url, archiveDownloadPath);
        core.debug(`Successfully downloaded ${ovrPlatformUtil} to ${archivePath}`);
        if (IS_MAC) {
            await exec.exec(`chmod +x ${archivePath}`);
        }
        const downloadVersion = await getVersion(archivePath);
        core.debug(`Setting tool cache: ${archivePath} | ${toolPath} | ${ovrPlatformUtil} | ${downloadVersion}`);
        toolDirectory = await tc.cacheFile(archivePath, toolPath, ovrPlatformUtil, downloadVersion);
        tool = getExecutable(toolDirectory);
    } else {
        tool = getExecutable(toolDirectory);
        fs.access(tool);
        core.debug(`Found ${tool} in ${toolDirectory}`);
        await exec.exec(tool, 'self-update');
    }
    core.debug(`${ovrPlatformUtil} -> ${toolDirectory}`)
    core.addPath(toolDirectory);
    await exec.exec(ovrPlatformUtil, 'help');
}

function getDownloadUrl() {
    if (IS_MAC) {
        return 'https://www.oculus.com/download_app/?id=1462426033810370';
    } else if (IS_WINDOWS) {
        return 'https://www.oculus.com/download_app/?id=1076686279105243';
    } else {
        throw Error(`${ovrPlatformUtil} not available for ${process.platform}`);
    }
}

function getTempDirectory() {
    const tempDirectory = process.env['RUNNER_TEMP'] || ''
    return tempDirectory
}

function getExecutable(directory) {
    return path.resolve(directory, toolPath);
}

async function getVersion(tool) {
    const semVerRegEx = new RegExp(/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)?/);
    let output = '';

    await exec.exec(tool, 'version', {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        }
    });
    const match = output.match(semVerRegEx)[0];
    if (!match) {
        throw Error("Failed to find a valid version match");
    }
    const lastPeriodIndex = match.lastIndexOf('.');
    const semVerStr = match.substring(0, lastPeriodIndex) + '+' + match.substring(lastPeriodIndex + 1);
    const version = semver.clean(semVerStr);
    if (!version) {
        throw Error("Failed to find a valid version");
    }
    return version
}
