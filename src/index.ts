import tc = require('@actions/tool-cache');
import core = require('@actions/core');
import exec = require('@actions/exec');
import semver = require('semver');
import path = require('path');
import fs = require('fs');

const ovrPlatformUtil = 'ovr-platform-util';
const IS_WINDOWS = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin'
const IS_LINUX = process.platform === 'linux'
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

async function setup_ovrPlatformUtil(): Promise<void> {
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
        tool = await getExecutable(toolDirectory);
    } else {
        tool = await getExecutable(toolDirectory);
        const selfUpdate = (core.getInput('self-update') || 'true') === 'true';
        if (selfUpdate) {
            await exec.exec(tool, ['self-update']);
            await checkToolAccess(tool);
        }
    }
    core.debug(`${ovrPlatformUtil} -> ${toolDirectory}`)
    core.addPath(toolDirectory);
    await exec.exec(ovrPlatformUtil, ['help']);
}

async function checkToolAccess(tool: string, retries = 5): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
        await fs.promises.access(tool, fs.constants.X_OK);
    } catch (error) {
        if (error.code === 'EBUSY') {
            core.warning(`Failed to access ${tool}, retrying...`);
            await checkToolAccess(tool, retries - 1);
        } else {
            throw error;
        }
    }
}

function getDownloadUrl(): string {
    if (IS_MAC) {
        return 'https://www.oculus.com/download_app/?id=1462426033810370';
    } else if (IS_WINDOWS) {
        return 'https://www.oculus.com/download_app/?id=1076686279105243';
    } else if (IS_LINUX) {
        return 'https://www.oculus.com/download_app/?id=5159709737372459';
    } else {
        throw Error(`${ovrPlatformUtil} not available for ${process.platform}`);
    }
}

function getTempDirectory(): string {
    return process.env['RUNNER_TEMP'] || ''
}

async function getExecutable(directory: string): Promise<string> {
    const tool = path.join(directory, toolPath);
    await fs.promises.access(tool, fs.constants.X_OK);
    core.debug(`Found ${tool} in ${directory}`);
    return tool;
}

async function getVersion(tool: string): Promise<string> {
    const semVerRegEx = new RegExp(/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)?/);
    let output = '';
    await exec.exec(tool, ['version'], {
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
