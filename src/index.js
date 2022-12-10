const os = require('os');
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

            if (osPlatform == 'darwin') {
                url = 'https://www.oculus.com/download_app/?id=1462426033810370';
            } else if (osPlatform == 'win32') {
                url = 'https://www.oculus.com/download_app/?id=1076686279105243';
            } else {
                throw Error(`ovr-platform-util not available for ${osPlatform}`);
            }

            core.info(`Attempting to download ovr-platform-util from ${url}`);

            try {
                downloadPath = await tc.downloadTool(url);
            } catch (error) {
                throw error;
            }

            core.info(`Successfully downloaded ovr-platform-util to ${downloadPath}`);

            targetFile = path.resolve(downloadPath, 'ovr-platform-util');
            core.info(`Setting tool cache ${downloadPath} | ${targetFile} | ovr-platform-util`);
            pathToCLI = tc.cacheFile(downloadPath, targetFile, 'ovr-platform-util', '1.0.0');
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
