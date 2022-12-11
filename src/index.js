const os = require('os');
const semver = require('semver');
const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');

const ovrPlatformUtil = 'ovr-platform-util';
const IS_WINDOWS = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin'

const main = async () => {
    try {
        const fileEx = IS_WINDOWS ? '.exe' : '';
        let osPlatform = os.platform();
        let pathToModule = undefined;
        let pathToToolDir = tc.find(ovrPlatformUtil, '1.81.0');

        if (!pathToToolDir) {
            let url = undefined;
            let downloadPath = undefined;

            if (IS_MAC) {
                url = 'https://www.oculus.com/download_app/?id=1462426033810370';
            } else if (IS_WINDOWS) {
                url = 'https://www.oculus.com/download_app/?id=1076686279105243';
            } else {
                throw Error(`${ovrPlatformUtil} not available for ${osPlatform}`);
            }

            let fileName =  `${ovrPlatformUtil}${fileEx}`;
            downloadPath = path.resolve(getTempDirectory(), fileName);

            core.debug(`Attempting to download ${ovrPlatformUtil} from ${url} to ${downloadPath}`);

            try {
                downloadPath = await tc.downloadTool(url, downloadPath);
            } catch (error) {
                throw error;
            }

            core.debug(`Successfully downloaded ${ovrPlatformUtil} to ${downloadPath}`);

            if (IS_MAC) {
                await exec.exec(`chmod +x ${downloadPath}`);
            }

            const downloadVersion = await getVersion(downloadPath);
            core.debug(`Setting tool cache: ${downloadPath} | ${fileName} | ${ovrPlatformUtil} | ${downloadVersion}`);
            pathToToolDir = await tc.cacheFile(downloadPath, fileName, ovrPlatformUtil, downloadVersion);
            pathToModule = getExecutable(pathToToolDir);
        } else {
            pathToModule = getExecutable(pathToToolDir);
            await exec.exec(pathToModule, 'self-update');
        }

        core.debug(`${ovrPlatformUtil} -> ${pathToModule}`);
        core.addPath(pathToToolDir);
        core.exportVariable(ovrPlatformUtil, pathToModule);

        await exec.exec(pathToModule, 'help');
    } catch (error) {
        core.setFailed(error);
    }
}

main();

function getTempDirectory() {
    const tempDirectory = process.env['RUNNER_TEMP'] || ''
    return tempDirectory
}

function getExecutable(dir) {
    const fileEx = IS_WINDOWS ? '.exe' : '';
    const moduleName = `${ovrPlatformUtil}${fileEx}`;
    return path.resolve(dir, moduleName);
}

async function getVersion(module) {
    const semVerRegEx = new RegExp(/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)?/);
    let output = '';

    await exec.exec(module, 'version', {
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