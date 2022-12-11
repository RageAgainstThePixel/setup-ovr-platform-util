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
        let version = core.getInput('version') || '1.0.0';
        let pathToToolDir = tc.find(ovrPlatformUtil, version);

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

            core.info(`Setting tool cache: ${downloadPath} | ${fileName} | ${ovrPlatformUtil} | ${downloadVersion}`);
            pathToToolDir = await tc.cacheFile(downloadPath, fileName, ovrPlatformUtil, downloadVersion);
            pathToModule = getExecutable(pathToToolDir);
        } else {
            pathToModule = getExecutable(pathToToolDir);
            await exec.exec(pathToModule, 'self-update');
        }

        core.info(`pathToToolDir: ${pathToToolDir}`);
        core.info(`pathToModule: ${pathToModule}`);

        core.addPath(pathToToolDir);
        core.exportVariable(ovrPlatformUtil, pathToModule);

        await exec.exec(pathToModule, 'version');
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

    const matches = output.match(semVerRegEx);

    if (!matches) {
        throw Error("Failed to find a valid version match");
    }

    const version = semver.clean(matches[0]);

    if (!version) {
        throw Error("Failed to find a valid version");
    }

    return version
}