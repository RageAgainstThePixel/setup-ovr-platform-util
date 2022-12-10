const os = require('os');
const fs = require('fs');
const { readdir } = require('fs/promises');
const path = require('path');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const exec = require('@actions/exec');

const main = async () => {
    try {
        let osPlatform = os.platform();
        let targetFile = undefined;
        let pathToCLI = tc.find('ovr-platform-util', '1.0.0');

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
                throw Error(`ovr-platform-util not available for ${osPlatform}`);
            }

            core.info(`Attempting to download ovr-platform-util from ${url}`);

            try {
                downloadPath = await tc.downloadTool(url, path.resolve(_getTempDirectory(), 'ovr-platform-util'));
            } catch (error) {
                throw error;
            }

            core.info(`Successfully downloaded ovr-platform-util to ${downloadPath}`);

            const files = await readdir(downloadPath);

            for (const file in files) {
                core.info(file);
            }

            let fileName =  `ovr-platform-util${fileEx}`;
            targetFile = path.resolve(downloadPath, fileName);
            let fsStat = fs.statSync(targetFile);

            if (!fsStat.isFile()) {
                throw Error(`failed to find ${fileName}`);
            }

            core.info(`Setting tool cache ${downloadPath} | ${targetFile} | ovr-platform-util`);
            pathToCLI = await tc.cacheFile(downloadPath, targetFile, 'ovr-platform-util', '1.0.0');
            core.info(`pathToCLI: ${pathToCLI}`);

            if (osPlatform == 'darwin') {
                core.info(`Change the access permissions of the utility for it to execute`);
                exec.exec(`chmod +x ${pathToCLI}`);
            }
        } else {
            exec.exec(pathToCLI, 'self-update');
        }

        core.addPath(pathToCLI);
        core.exportVariable('ovr-platform-util', pathToCLI);

        exec.exec('ovr-platform-util', 'version');
        exec.exec('ovr-platform-util', 'help');
    } catch (error) {
        core.setFailed(error);
    }
}

main();

function _getTempDirectory() {
    const tempDirectory = process.env['RUNNER_TEMP'] || ''
    return tempDirectory
}