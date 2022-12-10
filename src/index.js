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
        let pathToToolDir = tc.find(ovrPlatformUtil, '1.0.0');

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

            core.info(`Attempting to download ${ovrPlatformUtil} from ${url} to ${downloadPath}`);

            try {
                downloadPath = await tc.downloadTool(url, downloadPath);
            } catch (error) {
                throw error;
            }

            core.info(`Successfully downloaded ${ovrPlatformUtil} to ${downloadPath}`);

            if (IS_MAC) {
                await exec.exec(`chmod +x ${downloadPath}`);
            }

            let output = '';
            const options = {};
            options.listeners = {
              stdout: (data) => {
                output += data.toString();
              }
            };

            await exec.exec(downloadPath, 'version', options);
            const semVerPattern = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?/;
            const semVerRegEx = new RegExp(semVerPattern);
            const matches = semVerRegEx.match(output);
            let downloadedVersion = semver.clean(matches[0]);

            if (!downloadedVersion){
                throw Error("Failed to find a valid version");
            }

            core.info(`Setting tool cache: ${downloadPath} | ${fileName} | ${ovrPlatformUtil} | ${downloadedVersion}`);
            pathToToolDir = await tc.cacheFile(downloadPath, fileName, ovrPlatformUtil, downloadedVersion);
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