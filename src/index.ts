import tc = require('@actions/tool-cache');
import core = require('@actions/core');
import exec = require('@actions/exec');
import io = require('@actions/io');
import version = require('./version');
import path = require('path');
import fs = require('fs');
import crypto = require('crypto');

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
    let toolDirectory = undefined;
    try {
        // tc.find(name, '*') skips prereleases, which is how builds are cached
        const latest = version.LatestCacheVersion(tc.findAllVersions(ovrPlatformUtil));
        if (latest) {
            toolDirectory = tc.find(ovrPlatformUtil, latest);
        }
    } catch (error) {
        core.debug(`Failed to find ${ovrPlatformUtil} in cache: ${error.message}`);
    }
    let tool = undefined;
    if (!toolDirectory) {
        const url = getDownloadUrl();
        const archiveDownloadPath = path.resolve(getTempDirectory(), `${ovrPlatformUtil}-${crypto.randomUUID()}`, toolPath);
        core.debug(`Attempting to download ${ovrPlatformUtil} from ${url} to ${archiveDownloadPath}`);
        const archivePath = await tc.downloadTool(url, archiveDownloadPath);
        core.debug(`Successfully downloaded ${ovrPlatformUtil} to ${archivePath}`);
        if (IS_MAC || IS_LINUX) {
            await fs.promises.chmod(archivePath, 0o755);
        }
        const downloadVersion = await getVersion(archivePath);
        core.debug(`Setting tool cache: ${archivePath} | ${toolPath} | ${ovrPlatformUtil} | ${downloadVersion}`);
        toolDirectory = await tc.cacheFile(archivePath, toolPath, ovrPlatformUtil, version.CacheVersion(downloadVersion));
        await fs.promises.rm(path.dirname(archivePath), { recursive: true, force: true });
        tool = await getExecutable(toolDirectory);
    } else {
        tool = await getExecutable(toolDirectory);
        const selfUpdate = (core.getInput('self-update') || 'true') === 'true';
        if (selfUpdate) {
            await exec.exec(tool, ['self-update']);
            await checkToolAccess(tool);
            toolDirectory = await recacheIfUpdated(tool, toolDirectory);
            tool = await getExecutable(toolDirectory);
        }
    }
    core.debug(`${ovrPlatformUtil} -> ${toolDirectory}`)
    core.addPath(toolDirectory);
    const toolVersion = await getVersion(tool);
    core.info(`OVR_PLATFORM_UTIL_PATH -> ${tool}`);
    core.exportVariable('OVR_PLATFORM_UTIL_PATH', tool);
    core.setOutput('path', tool);
    core.setOutput('version', toolVersion);
    await exec.exec(ovrPlatformUtil, ['help']);
}

async function recacheIfUpdated(tool: string, toolDirectory: string): Promise<string> {
    // toolDirectory is <tool-cache>/<name>/<version>/<arch>
    const versionDirectory = path.dirname(toolDirectory);
    const cachedVersion = path.basename(versionDirectory);
    const updatedVersion = await getVersion(tool);
    const updatedCacheVersion = version.CacheVersion(updatedVersion);
    if (updatedCacheVersion === cachedVersion) {
        return toolDirectory;
    }
    core.info(`${ovrPlatformUtil} updated from ${cachedVersion} to ${updatedVersion}`);
    const updatedToolDirectory = await tc.cacheFile(tool, toolPath, ovrPlatformUtil, updatedCacheVersion);
    await io.rmRF(versionDirectory);
    await io.rmRF(`${versionDirectory}.complete`);
    return updatedToolDirectory;
}

async function checkToolAccess(tool: string, retries = 5): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
        await fs.promises.access(tool, fs.constants.X_OK);
    } catch (error) {
        if (error.code === 'EBUSY') {
            if (retries <= 0) {
                throw Error(`Failed to access ${tool}, it is still busy after self-update`);
            }
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
    let output = '';
    await exec.exec(tool, ['version'], {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            }
        }
    });
    return version.ParseVersion(output);
}
