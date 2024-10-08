# setup-ovr-platform-utility

A GitHub Action to setup the [`ovr-platform-utility`](https://developer.oculus.com/resources/publish-reference-platform-command-line-utility) tool command alias.

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
      - uses: RageAgainstThePixel/setup-ovr-platform-util@v1
        # run commands
      - run: 'ovr-platform-util version'
```

### inputs

| Name | Description | Required |
| ---- | ----------- | -------- |
| `self-update` | Automatically update the ovr-platform-util tool. | Defaults to `true`. |

## Related actions

- [upload-meta-quest-build](https://github.com/RageAgainstThePixel/upload-meta-quest-build)
