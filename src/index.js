const os = require('os');
const fs = require('fs');
const { readdir } = require('fs/promises');
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
            core.info(`Setting tool cache ${downloadPath} | ${fileName} | ${ovrPlatformUtil}`);

            pathToToolDir = await tc.cacheFile(downloadPath, fileName, ovrPlatformUtil, '1.0.0');
            pathToModule = getExecutable(pathToToolDir);

            if (osPlatform == 'darwin') {
                core.info(`Change the access permissions of the utility for it to execute`);
                exec.exec(`chmod +x ${pathToModule}`);
            }
        } else {
            pathToModule = getExecutable(pathToToolDir);
            exec.exec(pathToModule, 'self-update');
        }

        core.info(`pathToToolDir: ${pathToToolDir}`);
        core.addPath(pathToToolDir);
        core.exportVariable(ovrPlatformUtil, pathToModule);

        exec.exec(ovrPlatformUtil, 'version');
        exec.exec(ovrPlatformUtil, 'help');
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