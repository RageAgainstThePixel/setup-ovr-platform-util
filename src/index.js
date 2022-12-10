const os = require('os');
const fs = require('fs');
const { readdir } = require('fs/promises');
const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');
const ovrPlatformUtil = 'ovr-platform-util';

const main = async () => {
    try {
        let osPlatform = os.platform();
        let pathToCLI = tc.find(ovrPlatformUtil, '1.0.0');

        if (!pathToCLI) {
            let url = undefined;
            let downloadPath = undefined;
            let fileEx = '';

            if (osPlatform == 'darwin') {
                url = 'https://www.oculus.com/download_app/?id=1462426033810370';
            } else if (osPlatform == 'win32') {
                url = 'https://www.oculus.com/download_app/?id=1076686279105243';
                fileEx = '.exe';
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
            pathToCLI = await tc.cacheFile(downloadPath, fileName, ovrPlatformUtil, '1.0.0');
            core.info(`pathToCLI: ${pathToCLI}`);

            const files = await readdir(pathToCLI);

            for (const file of files) {
                const item = path.resolve(pathToCLI, file);
                core.info(item);
            }

            if (osPlatform == 'darwin') {
                core.info(`Change the access permissions of the utility for it to execute`);
                exec.exec(`chmod +x ${pathToCLI}`);
            }
        } else {
            exec.exec(pathToCLI, 'self-update');
        }

        core.addPath(pathToCLI);
        core.exportVariable(ovrPlatformUtil, pathToCLI);

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