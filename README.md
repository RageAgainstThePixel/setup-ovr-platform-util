# setup-ovr-platform-util

A GitHub Action to setup the [`ovr-platform-util`](https://developers.meta.com/horizon/resources/publish-reference-platform-command-line-utility/) tool command alias.

## How to use

```yaml
jobs:
  validate:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
        # download and setup ovr platform util
      - uses: RageAgainstThePixel/setup-ovr-platform-util@v2
        # run commands
      - run: 'ovr-platform-util version'
```

### inputs

| Name | Description | Required |
| ---- | ----------- | -------- |
| `self-update` | Automatically update the ovr-platform-util tool when it is restored from the runner tool cache. A fresh download is already the latest version. Defaults to `true`. | false |

### outputs

- `path`: The full path to the ovr-platform-util executable.
- `version`: The installed ovr-platform-util version.

### environment variables

- `OVR_PLATFORM_UTIL_PATH`: The full path to the ovr-platform-util executable.

## Related actions

- [upload-meta-quest-build](https://github.com/RageAgainstThePixel/upload-meta-quest-build)

